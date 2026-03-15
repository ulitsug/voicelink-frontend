import { callsAPI } from './api';

// Default fallback ICE config if server fetch fails
const FALLBACK_ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Video resolution presets
const VIDEO_PRESETS = {
  low:    { width: { ideal: 320 },  height: { ideal: 240 },  frameRate: { ideal: 15, max: 15 } },
  medium: { width: { ideal: 640 },  height: { ideal: 480 },  frameRate: { ideal: 24, max: 24 } },
  high:   { width: { ideal: 1280 }, height: { ideal: 720 },  frameRate: { ideal: 30, max: 30 } },
  hd:     { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
};

async function fetchIceConfig() {
  try {
    const { data } = await callsAPI.getIceConfig();
    return { iceServers: data.iceServers || data.ice_servers || [] };
  } catch {
    console.warn('Failed to fetch ICE config, using fallback');
    return FALLBACK_ICE_CONFIG;
  }
}

/**
 * List available media devices.
 * Returns { audioinput: [], audiooutput: [], videoinput: [] }
 */
export async function enumerateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioinput:  devices.filter((d) => d.kind === 'audioinput'),
      audiooutput: devices.filter((d) => d.kind === 'audiooutput'),
      videoinput:  devices.filter((d) => d.kind === 'videoinput'),
    };
  } catch {
    return { audioinput: [], audiooutput: [], videoinput: [] };
  }
}

export class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;

    // ICE candidate queue — buffer candidates arriving before remote description is set
    this._pendingCandidates = [];
    this._remoteDescriptionSet = false;

    // Callbacks
    this.onTrack = null;
    this.onIceCandidate = null;
    this.onConnectionStateChange = null;
    this.onNegotiationNeeded = null;

    // Connection quality stats
    this._statsInterval = null;
    this._prevStats = null;
    this.onStatsUpdate = null;

    // Adaptive bitrate state
    this._adaptiveEnabled = true;
    this._currentResolution = 'high';
    this._consecutivePoorCount = 0;
    this._consecutiveGoodCount = 0;

    // Reconnection state
    this._disconnectTimeout = null;
    this._iceRestartAttempts = 0;
    this._maxIceRestarts = 15;
    this._totalReconnectDeadline = null; // absolute timestamp for 120s hard limit
    this.onIceRestart = null; // callback to signal ice restart offer
  }

  // ─── Media acquisition ───────────────────────────────────────

  /**
   * Get media stream with optional device selection and resolution preset.
   * @param {boolean} video - Whether to include video
   * @param {object} opts - { audioDeviceId, videoDeviceId, resolution: 'low'|'medium'|'high'|'hd' }
   */
  async getMediaStream(video = true, opts = {}) {
    const {
      audioDeviceId, videoDeviceId, resolution = 'high',
      noiseSuppression = true, echoCancellation = true,
    } = opts;

    const audioConstraint = {
      echoCancellation,
      noiseSuppression,
      autoGainControl: true,
    };
    if (audioDeviceId) audioConstraint.deviceId = { exact: audioDeviceId };

    const constraints = { audio: audioConstraint };

    if (video) {
      const preset = VIDEO_PRESETS[resolution] || VIDEO_PRESETS.high;
      constraints.video = {
        ...preset,
        facingMode: 'user',
      };
      if (videoDeviceId) constraints.video.deviceId = { exact: videoDeviceId };
    }

    this._currentResolution = resolution;
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  /**
   * Switch audio output device on the given audio element (setSinkId).
   */
  async setAudioOutput(audioElement, deviceId) {
    if (audioElement && typeof audioElement.setSinkId === 'function') {
      await audioElement.setSinkId(deviceId);
    }
  }

  // ─── Peer connection setup ───────────────────────────────────

  async createPeerConnection() {
    const config = await fetchIceConfig();
    this.peerConnection = new RTCPeerConnection(config);
    this._remoteDescriptionSet = false;
    this._pendingCandidates = [];

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Remote track handling
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onTrack) this.onTrack(event);
    };

    // ICE candidate trickle
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] Connection state:', state);

      if (state === 'connected') {
        // Connection recovered — clear any pending disconnect timeout and reset attempt counters
        this._iceRestartAttempts = 0;
        this._totalReconnectDeadline = null;
        if (this._disconnectTimeout) {
          clearTimeout(this._disconnectTimeout);
          this._disconnectTimeout = null;
        }
      } else if (state === 'disconnected') {
        // Start reconnection grace period — exponential backoff ICE restarts
        // within 120-second hard limit
        if (!this._totalReconnectDeadline) {
          this._totalReconnectDeadline = Date.now() + 120000;
        }
        if (!this._disconnectTimeout) {
          const delay = Math.min(3000 * Math.pow(1.5, this._iceRestartAttempts), 15000);
          this._disconnectTimeout = setTimeout(() => {
            this._disconnectTimeout = null;
            if (this.peerConnection?.connectionState === 'disconnected' ||
                this.peerConnection?.connectionState === 'failed') {
              if (Date.now() < this._totalReconnectDeadline) {
                console.log('[WebRTC] Still disconnected, attempting ICE restart');
                this._attemptIceRestart();
              } else {
                console.warn('[WebRTC] 120s reconnection deadline exceeded');
                if (this.onConnectionStateChange) {
                  this.onConnectionStateChange('failed');
                }
              }
            }
          }, delay);
        }
      } else if (state === 'failed') {
        if (this._disconnectTimeout) {
          clearTimeout(this._disconnectTimeout);
          this._disconnectTimeout = null;
        }
        // Check 120-second hard limit — only truly fail if exceeded
        if (!this._totalReconnectDeadline) {
          this._totalReconnectDeadline = Date.now() + 120000;
        }
        if (Date.now() < this._totalReconnectDeadline) {
          this._attemptIceRestart();
        } else {
          console.warn('[WebRTC] 120s reconnection deadline exceeded on failure');
        }
      }

      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    // ICE connection state — attempt restart on failure
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);
      if (state === 'failed') {
        this._attemptIceRestart();
      }
    };

    // ICE gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering state:', this.peerConnection?.iceGatheringState);
    };

    // Negotiation needed (for renegotiation when tracks change)
    this.peerConnection.onnegotiationneeded = () => {
      if (this.onNegotiationNeeded) {
        this.onNegotiationNeeded();
      }
    };

    // Start stats polling
    this._startStatsPolling();

    return this.peerConnection;
  }

  // ─── Offer / Answer / ICE ───────────────────────────────────

  async createOffer() {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this._remoteDescriptionSet = true;
    await this._drainPendingCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    this._remoteDescriptionSet = true;
    await this._drainPendingCandidates();
  }

  async addIceCandidate(candidate) {
    if (!this.peerConnection) return;

    if (this._remoteDescriptionSet) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Failed to add ICE candidate:', e);
      }
    } else {
      // Queue until remote description is set
      this._pendingCandidates.push(candidate);
    }
  }

  async _drainPendingCandidates() {
    for (const candidate of this._pendingCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Failed to add queued ICE candidate:', e);
      }
    }
    this._pendingCandidates = [];
  }

  // ─── Renegotiation (add/remove video mid-call) ──────────────

  async createRenegotiationOffer() {
    if (!this.peerConnection) return null;
    this._remoteDescriptionSet = false;
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleRenegotiationOffer(offer) {
    if (!this.peerConnection) return null;
    this._remoteDescriptionSet = false;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this._remoteDescriptionSet = true;
    await this._drainPendingCandidates();
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleRenegotiationAnswer(answer) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    this._remoteDescriptionSet = true;
    await this._drainPendingCandidates();
  }

  // ─── ICE restart ────────────────────────────────────────────

  async _attemptIceRestart() {
    if (!this.peerConnection) return;

    // Hard 120-second limit
    if (this._totalReconnectDeadline && Date.now() >= this._totalReconnectDeadline) {
      console.warn('[WebRTC] 120s reconnection deadline exceeded, giving up');
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('failed');
      }
      return;
    }

    if (this._iceRestartAttempts >= this._maxIceRestarts) {
      console.warn('[WebRTC] Max ICE restart attempts reached, giving up');
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('failed');
      }
      return;
    }

    this._iceRestartAttempts++;
    console.log(`[WebRTC] ICE restart attempt ${this._iceRestartAttempts}/${this._maxIceRestarts}`);

    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      // Signal the restart offer to remote peer via onIceRestart callback
      if (this.onIceRestart) {
        this.onIceRestart(offer);
      } else if (this.onNegotiationNeeded) {
        this.onNegotiationNeeded();
      }

      // Schedule next attempt with exponential backoff if still not connected
      const delay = Math.min(3000 * Math.pow(1.5, this._iceRestartAttempts), 15000);
      this._disconnectTimeout = setTimeout(() => {
        this._disconnectTimeout = null;
        const currentState = this.peerConnection?.connectionState;
        if (currentState === 'disconnected' || currentState === 'failed') {
          this._attemptIceRestart();
        }
      }, delay);
    } catch (e) {
      console.error('ICE restart failed:', e);
      // Retry after a delay even on error
      const delay = Math.min(5000 * Math.pow(1.5, this._iceRestartAttempts), 15000);
      this._disconnectTimeout = setTimeout(() => {
        this._disconnectTimeout = null;
        this._attemptIceRestart();
      }, delay);
    }
  }

  // ─── Track management ───────────────────────────────────────

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // true = muted
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Add a video track mid-call (e.g., upgrading from voice to video).
   * Returns the new local stream.
   */
  async addVideoTrack() {
    if (!this.peerConnection || !this.localStream) return null;

    // Check if video track already exists
    if (this.localStream.getVideoTracks().length > 0) {
      this.localStream.getVideoTracks()[0].enabled = true;
      return this.localStream;
    }

    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
    const videoTrack = videoStream.getVideoTracks()[0];
    this.localStream.addTrack(videoTrack);
    this.peerConnection.addTrack(videoTrack, this.localStream);
    return this.localStream;
  }

  // ─── Screen sharing ────────────────────────────────────────

  async startScreenShare() {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: true,
    });

    const screenTrack = this.screenStream.getVideoTracks()[0];

    // Replace video track in peer connection
    if (this.peerConnection) {
      const sender = this.peerConnection.getSenders().find(
        (s) => s.track?.kind === 'video'
      );
      if (sender) {
        await sender.replaceTrack(screenTrack);
      } else {
        this.peerConnection.addTrack(screenTrack, this.screenStream);
      }
    }

    // Auto-restore when user clicks browser stop-sharing button
    screenTrack.onended = () => {
      this.stopScreenShare();
    };

    return this.screenStream;
  }

  async stopScreenShare() {
    if (!this.screenStream) return;

    this.screenStream.getTracks().forEach((track) => track.stop());
    this.screenStream = null;

    // Restore camera video track
    if (this.localStream && this.peerConnection) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const sender = this.peerConnection.getSenders().find(
          (s) => s.track?.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
    }
  }

  // ─── Connection quality stats ──────────────────────────────

  _startStatsPolling() {
    this._stopStatsPolling();
    this._statsInterval = setInterval(() => this._pollStats(), 2000);
  }

  _stopStatsPolling() {
    if (this._statsInterval) {
      clearInterval(this._statsInterval);
      this._statsInterval = null;
    }
    this._prevStats = null;
  }

  async _pollStats() {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      const result = {
        bytesReceived: 0,
        bytesSent: 0,
        packetsLost: 0,
        packetsReceived: 0,
        rtt: 0,
        jitter: 0,
        quality: 'good',
        timestamp: Date.now(),
      };

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && !report.isRemote) {
          result.bytesReceived += report.bytesReceived || 0;
          result.packetsLost += report.packetsLost || 0;
          result.packetsReceived += report.packetsReceived || 0;
          if (report.jitter) result.jitter = report.jitter;
        }
        if (report.type === 'outbound-rtp' && !report.isRemote) {
          result.bytesSent += report.bytesSent || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          result.rtt = report.currentRoundTripTime
            ? Math.round(report.currentRoundTripTime * 1000)
            : 0;
        }
      });

      // Calculate packet loss ratio & quality
      const totalPackets = result.packetsReceived + result.packetsLost;
      const lossRatio = totalPackets > 0 ? result.packetsLost / totalPackets : 0;

      if (lossRatio > 0.1 || result.rtt > 500) {
        result.quality = 'poor';
      } else if (lossRatio > 0.03 || result.rtt > 200) {
        result.quality = 'fair';
      } else {
        result.quality = 'good';
      }

      // Calculate bitrate if we have previous stats
      if (this._prevStats) {
        const elapsed = (result.timestamp - this._prevStats.timestamp) / 1000;
        if (elapsed > 0) {
          result.bitrateIn = Math.round(
            ((result.bytesReceived - this._prevStats.bytesReceived) * 8) / elapsed
          );
          result.bitrateOut = Math.round(
            ((result.bytesSent - this._prevStats.bytesSent) * 8) / elapsed
          );
        }
      }
      this._prevStats = { ...result };

      if (this.onStatsUpdate) {
        this.onStatsUpdate(result);
      }

      // Adaptive bitrate — adjust video quality based on connection quality
      if (this._adaptiveEnabled) {
        this._adaptBitrate(result);
      }
    } catch {
      // Connection may have closed
    }
  }

  /**
   * Auto-adjust video encoding parameters based on measured quality.
   */
  _adaptBitrate(stats) {
    if (!this.peerConnection) return;

    if (stats.quality === 'poor') {
      this._consecutivePoorCount++;
      this._consecutiveGoodCount = 0;
      if (this._consecutivePoorCount >= 3 && this._currentResolution !== 'low') {
        this._applyBandwidthLimit(250_000); // 250 kbps
        this._currentResolution = 'low';
        this._consecutivePoorCount = 0;
      }
    } else if (stats.quality === 'fair') {
      this._consecutivePoorCount = 0;
      this._consecutiveGoodCount = 0;
      if (this._currentResolution === 'high' || this._currentResolution === 'hd') {
        this._applyBandwidthLimit(800_000); // 800 kbps
        this._currentResolution = 'medium';
      }
    } else {
      // good
      this._consecutivePoorCount = 0;
      this._consecutiveGoodCount++;
      if (this._consecutiveGoodCount >= 5 && this._currentResolution !== 'high') {
        this._applyBandwidthLimit(2_500_000); // 2.5 Mbps
        this._currentResolution = 'high';
        this._consecutiveGoodCount = 0;
      }
    }
  }

  _applyBandwidthLimit(maxBitrate) {
    if (!this.peerConnection) return;
    const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) return;

    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = maxBitrate;
      sender.setParameters(params).catch(() => {});
    } catch {
      // Some browsers may not support setParameters
    }
  }

  async getStats() {
    if (!this.peerConnection) return null;
    const stats = await this.peerConnection.getStats();
    let result = { bytesReceived: 0, bytesSent: 0, packetsLost: 0, rtt: 0 };

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        result.bytesReceived = report.bytesReceived || 0;
        result.packetsLost = report.packetsLost || 0;
      }
      if (report.type === 'outbound-rtp' && report.kind === 'audio') {
        result.bytesSent = report.bytesSent || 0;
      }
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        result.rtt = report.currentRoundTripTime
          ? Math.round(report.currentRoundTripTime * 1000)
          : 0;
      }
    });

    return result;
  }

  // ─── Audio level detection ─────────────────────────────────

  getAudioLevel(stream) {
    if (!stream) return null;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    return {
      analyser,
      audioCtx,
      getLevel: () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        return sum / dataArray.length / 255; // 0‒1 normalised
      },
      cleanup: () => {
        source.disconnect();
        audioCtx.close();
      },
    };
  }

  // ─── Cleanup ───────────────────────────────────────────────

  cleanup() {
    this._stopStatsPolling();

    if (this._disconnectTimeout) {
      clearTimeout(this._disconnectTimeout);
      this._disconnectTimeout = null;
    }
    this._totalReconnectDeadline = null;
    this._iceRestartAttempts = 0;

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this._pendingCandidates = [];
    this._remoteDescriptionSet = false;
  }
}

export default WebRTCService;
