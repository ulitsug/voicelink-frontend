import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { WebRTCService } from '../services/webrtc';
import { callsAPI } from '../services/api';
import { startRingtone, stopRingtone } from '../services/ringtone';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { socket, user } = useAuth();
  const [callState, setCallState] = useState('idle'); // idle, calling, incoming, active
  const [callType, setCallType] = useState('voice'); // voice, video
  const [remoteUser, setRemoteUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callId, setCallId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState(null);
  const [callError, setCallError] = useState(null);

  const webrtcRef = useRef(null);
  const timerRef = useRef(null);
  // Stable ref to track current remote user inside socket callbacks
  const remoteUserRef = useRef(null);
  const callIdRef = useRef(null);
  const callStateRef = useRef('idle');

  // Keep refs in sync with state
  useEffect(() => { remoteUserRef.current = remoteUser; }, [remoteUser]);
  useEffect(() => { callIdRef.current = callId; }, [callId]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // ─── Helpers ──────────────────────────────────────────────

  const getDevicePrefs = useCallback(() => ({
    audioDeviceId: localStorage.getItem('voicelink_audio_input') || undefined,
    videoDeviceId: localStorage.getItem('voicelink_video_input') || undefined,
    resolution: localStorage.getItem('voicelink_resolution') || 'high',
    noiseSuppression: localStorage.getItem('voicelink_noise') !== 'false',
    echoCancellation: localStorage.getItem('voicelink_echo') !== 'false',
  }), []);

  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const cleanup = useCallback(() => {
    stopRingtone();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    setCallState('idle');
    setRemoteUser(null);
    setIsMuted(false);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setCallDuration(0);
    setCallId(null);
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionQuality(null);
    setCallError(null);
  }, []);

  // ─── Wire up a WebRTCService instance ────────────────────

  const wireWebRTC = useCallback((webrtc, targetId) => {
    webrtc.onIceCandidate = (candidate) => {
      socket.emit('ice_candidate', { target_id: targetId, candidate });
    };
    webrtc.onTrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
    webrtc.onConnectionStateChange = (state) => {
      if (state === 'failed') {
        // Only end call on hard failure — disconnected state has a grace period
        // handled by the WebRTC service with ICE restart attempts
        const ru = remoteUserRef.current;
        const ci = callIdRef.current;
        if (ru && socket) {
          socket.emit('end_call', { target_id: ru.id, call_id: ci });
        }
        if (ci) {
          callsAPI.updateLog(ci, { status: 'ended' }).catch(() => {});
        }
        setCallError('Connection lost. Call ended.');
        setTimeout(() => cleanup(), 2000);
      }
    };
    // ICE restart signaling — send ice restart offer to remote peer
    webrtc.onIceRestart = (offer) => {
      const ru = remoteUserRef.current;
      if (ru && socket) {
        socket.emit('renegotiate_offer', { target_id: ru.id, offer });
      }
    };
    webrtc.onStatsUpdate = (stats) => {
      setConnectionQuality(stats);
    };
    webrtc.onNegotiationNeeded = async () => {
      // Only handle renegotiation when call is active
      if (callStateRef.current !== 'active') return;
      try {
        const offer = await webrtc.createRenegotiationOffer();
        if (offer) {
          socket.emit('renegotiate_offer', {
            target_id: remoteUserRef.current?.id,
            offer,
          });
        }
      } catch (e) {
        console.error('Renegotiation offer failed:', e);
      }
    };
  }, [socket, cleanup]);

  // ─── Socket event handlers ───────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = async (data) => {
      console.log('[CALL] incoming_call event received:', data);
      // If already in a call, auto-reject
      if (callStateRef.current !== 'idle') {
        socket.emit('call_rejected', { caller_id: data.caller_id, call_id: data.call_id });
        return;
      }

      try {
        const webrtc = new WebRTCService();
        webrtcRef.current = webrtc;

        const isVideo = data.call_type === 'video';
        const prefs = getDevicePrefs();
        const stream = await webrtc.getMediaStream(isVideo, prefs);
        setLocalStream(stream);
        setIsVideoOn(isVideo);

        await webrtc.createPeerConnection();
        wireWebRTC(webrtc, data.caller_id);

        // Handle the offer and create answer (stored in localDescription)
        await webrtc.handleOffer(data.offer);

        // Set caller info from backend (includes display_name)
        const callerInfo = data.caller || { id: data.caller_id };
        setRemoteUser(callerInfo);
        setCallType(data.call_type || 'voice');
        setCallId(data.call_id);
        startRingtone();
        setCallState('incoming');
      } catch (e) {
        console.error('Failed to handle incoming call:', e);
        const msg = e.name === 'NotAllowedError' ? 'Microphone/camera permission denied'
          : e.name === 'NotFoundError' ? 'No microphone or camera found'
          : e.name === 'NotReadableError' ? 'Device is already in use by another app'
          : 'Failed to access media devices';
        setCallError(msg);
        socket.emit('call_rejected', { caller_id: data.caller_id, call_id: data.call_id });
        setTimeout(() => cleanup(), 3000);
      }
    };

    const onCallAccepted = async (data) => {
      if (!webrtcRef.current) return;
      try {
        await webrtcRef.current.handleAnswer(data.answer);
        // Update remote user with callee info from backend
        if (data.callee) {
          setRemoteUser((prev) => ({ ...prev, ...data.callee }));
        }
        setCallState('active');
        startTimer();
      } catch (e) {
        console.error('Failed to handle call accepted:', e);
        cleanup();
      }
    };

    const onCallRejected = () => {
      cleanup();
    };

    const onIceCandidate = async (data) => {
      if (webrtcRef.current) {
        await webrtcRef.current.addIceCandidate(data.candidate);
      }
    };

    const onCallEnded = () => {
      cleanup();
    };

    const onCallError = (data) => {
      console.log('[CALL] call_error event received:', data);
      setCallError(data.error);
      // Auto-clear error and reset after delay
      setTimeout(() => {
        cleanup();
      }, 3000);
    };

    const onRenegotiateOffer = async (data) => {
      if (!webrtcRef.current) return;
      try {
        const answer = await webrtcRef.current.handleRenegotiationOffer(data.offer);
        if (answer) {
          socket.emit('renegotiate_answer', {
            target_id: data.from_id,
            answer,
          });
        }
      } catch (e) {
        console.error('Renegotiation answer failed:', e);
      }
    };

    const onRenegotiateAnswer = async (data) => {
      if (!webrtcRef.current) return;
      try {
        await webrtcRef.current.handleRenegotiationAnswer(data.answer);
      } catch (e) {
        console.error('Renegotiation response failed:', e);
      }
    };

    console.log('[CALL] Registering socket event listeners, socket connected:', socket.connected, 'socket id:', socket.id);

    socket.on('incoming_call', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('call_rejected', onCallRejected);
    socket.on('ice_candidate', onIceCandidate);
    socket.on('call_ended', onCallEnded);
    socket.on('call_error', onCallError);
    socket.on('renegotiate_offer', onRenegotiateOffer);
    socket.on('renegotiate_answer', onRenegotiateAnswer);

    return () => {
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('call_rejected', onCallRejected);
      socket.off('ice_candidate', onIceCandidate);
      socket.off('call_ended', onCallEnded);
      socket.off('call_error', onCallError);
      socket.off('renegotiate_offer', onRenegotiateOffer);
      socket.off('renegotiate_answer', onRenegotiateAnswer);
    };
  }, [socket, wireWebRTC, cleanup, startTimer, getDevicePrefs]);

  // ─── Actions ─────────────────────────────────────────────

  const initiateCall = useCallback(async (targetUser, type = 'voice') => {
    if (callStateRef.current !== 'idle') return;

    try {
      const webrtc = new WebRTCService();
      webrtcRef.current = webrtc;

      const isVideo = type === 'video';
      const prefs = getDevicePrefs();
      const stream = await webrtc.getMediaStream(isVideo, prefs);
      setLocalStream(stream);
      setIsVideoOn(isVideo);

      await webrtc.createPeerConnection();
      wireWebRTC(webrtc, targetUser.id);

      const offer = await webrtc.createOffer();

      // Create call log
      let logId = null;
      try {
        const { data } = await callsAPI.createLog({
          callee_id: targetUser.id,
          call_type: type,
        });
        logId = data.call?.id;
        setCallId(logId);
      } catch (e) {
        console.error('Failed to create call log:', e);
      }

      console.log('[CALL] Emitting call_user:', { target_id: targetUser.id, call_type: type, call_id: logId, socketConnected: socket.connected });
      socket.emit('call_user', {
        target_id: targetUser.id,
        call_type: type,
        offer,
        call_id: logId,
      });

      setRemoteUser(targetUser);
      setCallType(type);
      setCallState('calling');
    } catch (e) {
      console.error('Failed to initiate call:', e);
      const msg = e.name === 'NotAllowedError' ? 'Microphone/camera permission denied. Please allow access in your browser settings.'
        : e.name === 'NotFoundError' ? 'No microphone or camera found on this device'
        : e.name === 'NotReadableError' ? 'Media device is in use by another application'
        : 'Failed to start call. Please check your device settings.';
      setCallError(msg);
      setTimeout(() => cleanup(), 4000);
    }
  }, [socket, wireWebRTC, cleanup, getDevicePrefs]);

  const acceptCall = useCallback(() => {
    if (!webrtcRef.current || !webrtcRef.current.peerConnection) return;
    stopRingtone();

    const answer = webrtcRef.current.peerConnection.localDescription;
    socket.emit('call_accepted', {
      caller_id: remoteUser?.id,
      answer,
      call_id: callId,
    });

    setCallState('active');
    startTimer();
  }, [socket, remoteUser, callId, startTimer]);

  const rejectCall = useCallback(() => {
    if (remoteUser) {
      socket.emit('call_rejected', { caller_id: remoteUser.id, call_id: callId });
    }
    cleanup();
  }, [socket, remoteUser, callId, cleanup]);

  const endCall = useCallback(() => {
    if (remoteUser && socket) {
      socket.emit('end_call', { target_id: remoteUser.id, call_id: callId });
    }
    if (callId) {
      callsAPI.updateLog(callId, { status: 'ended' }).catch(() => {});
    }
    cleanup();
  }, [socket, remoteUser, callId, cleanup]);

  const toggleMute = useCallback(() => {
    if (webrtcRef.current) {
      const muted = webrtcRef.current.toggleMute();
      setIsMuted(muted);
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    if (!webrtcRef.current) return;

    // If we started with voice-only and need to add video track
    if (!isVideoOn && callState === 'active') {
      const videoTracks = webrtcRef.current.localStream?.getVideoTracks() || [];
      if (videoTracks.length === 0) {
        try {
          const updatedStream = await webrtcRef.current.addVideoTrack();
          if (updatedStream) {
            setLocalStream(updatedStream);
            setIsVideoOn(true);
          }
        } catch (e) {
          console.error('Failed to add video track:', e);
        }
        return;
      }
    }

    const videoOn = webrtcRef.current.toggleVideo();
    setIsVideoOn(videoOn);
  }, [isVideoOn, callState]);

  const toggleScreenShare = useCallback(async () => {
    if (!webrtcRef.current) return;

    if (isScreenSharing) {
      await webrtcRef.current.stopScreenShare();
      setIsScreenSharing(false);
      if (socket && remoteUser) {
        socket.emit('screen_share_stopped', { target_id: remoteUser.id });
      }
    } else {
      try {
        await webrtcRef.current.startScreenShare();
        setIsScreenSharing(true);
        if (socket && remoteUser) {
          socket.emit('screen_share_started', { target_id: remoteUser.id });
        }
      } catch (e) {
        console.error('Screen share failed:', e);
      }
    }
  }, [isScreenSharing, socket, remoteUser]);

  const value = {
    callState,
    callType,
    remoteUser,
    isMuted,
    isVideoOn,
    isScreenSharing,
    callDuration,
    localStream,
    remoteStream,
    connectionQuality,
    callError,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
}
