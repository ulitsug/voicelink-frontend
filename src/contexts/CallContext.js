import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { WebRTCService } from '../services/webrtc';
import { callsAPI } from '../services/api';
import { startRingtone, stopRingtone } from '../services/ringtone';
import { showLocalNotification } from '../services/serviceWorker';

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
  const [remoteMediaState, setRemoteMediaState] = useState({ muted: false, video_on: false, screen_sharing: false });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(0);

  const webrtcRef = useRef(null);
  const timerRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const reconnectDeadlineRef = useRef(null);
  const reconnectCountdownRef = useRef(null);
  // Stable ref to track current remote user inside socket callbacks
  const remoteUserRef = useRef(null);
  const callIdRef = useRef(null);
  const callStateRef = useRef('idle');
  const sessionIdRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => { remoteUserRef.current = remoteUser; }, [remoteUser]);
  useEffect(() => { callIdRef.current = callId; }, [callId]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // ─── beforeunload — warn user before closing/refreshing during a call ──
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (callStateRef.current === 'active' || callStateRef.current === 'calling' || callStateRef.current === 'incoming') {
        e.preventDefault();
        e.returnValue = 'You have an active call. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ─── Resume call session on page load (refresh recovery) ──
  useEffect(() => {
    if (!socket || !user) return;
    // Wait for socket to connect, then check for active session
    const checkSession = () => {
      if (callStateRef.current === 'idle') {
        console.log('[CALL] Page loaded — checking for active call session');
        socket.emit('call_session_check', {});
      }
    };
    if (socket.connected) {
      // Small delay to let authentication complete first
      const t = setTimeout(checkSession, 1500);
      return () => clearTimeout(t);
    }
    // If not connected yet, wait for connect event
    socket.once('authenticated', () => {
      setTimeout(checkSession, 500);
    });
  }, [socket, user]);

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
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (reconnectCountdownRef.current) {
      clearInterval(reconnectCountdownRef.current);
      reconnectCountdownRef.current = null;
    }
    reconnectDeadlineRef.current = null;
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    sessionIdRef.current = null;
    // Clear persisted session
    try { sessionStorage.removeItem('voicelink_call_session'); } catch {}
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
    setRemoteMediaState({ muted: false, video_on: false, screen_sharing: false });
    setIsReconnecting(false);
    setReconnectCountdown(0);
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
      if (state === 'disconnected' || state === 'failed') {
        // Start reconnection mode — do NOT end call
        const ru = remoteUserRef.current;
        if (ru && socket) {
          socket.emit('call_reconnecting', { target_id: ru.id });
        }
        setIsReconnecting(true);

        // Start a 120-second countdown if not already started
        if (!reconnectDeadlineRef.current) {
          reconnectDeadlineRef.current = Date.now() + 120000;
          // Update countdown display every second
          if (reconnectCountdownRef.current) clearInterval(reconnectCountdownRef.current);
          reconnectCountdownRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((reconnectDeadlineRef.current - Date.now()) / 1000));
            setReconnectCountdown(remaining);
            if (remaining <= 0) {
              // 120 seconds expired — truly end the call
              clearInterval(reconnectCountdownRef.current);
              reconnectCountdownRef.current = null;
              reconnectDeadlineRef.current = null;
              const rUser = remoteUserRef.current;
              const cId = callIdRef.current;
              if (rUser && socket) {
                socket.emit('end_call', { target_id: rUser.id, call_id: cId, reason: 'network_timeout' });
              }
              if (cId) {
                callsAPI.updateLog(cId, { status: 'ended', end_reason: 'network' }).catch(() => {});
              }
              setCallError('Connection lost for over 2 minutes. The call has been ended.');
              setTimeout(() => cleanup(), 5000);
            }
          }, 1000);
        }
      }
      if (state === 'connected') {
        // Connection recovered — clear reconnection state
        setIsReconnecting(false);
        setReconnectCountdown(0);
        if (reconnectCountdownRef.current) {
          clearInterval(reconnectCountdownRef.current);
          reconnectCountdownRef.current = null;
        }
        reconnectDeadlineRef.current = null;
        const ru = remoteUserRef.current;
        if (ru && socket) {
          socket.emit('call_reconnected', { target_id: ru.id });
        }
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

        // Show browser notification when tab is not focused
        if (document.hidden) {
          const callerName = callerInfo.display_name || callerInfo.username || 'Someone';
          const typeLabel = data.call_type === 'video' ? 'Video' : 'Voice';
          showLocalNotification(`Incoming ${typeLabel} Call`, `${callerName} is calling you`, {
            tag: 'incoming-call',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
          });
        }
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
      // Clear ring timeout once accepted
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      try {
        await webrtcRef.current.handleAnswer(data.answer);
        // Update remote user with callee info from backend
        if (data.callee) {
          setRemoteUser((prev) => ({ ...prev, ...data.callee }));
        }
        // Store session ID for resilience
        if (data.session_id) {
          sessionIdRef.current = data.session_id;
        }
        setCallState('active');
        startTimer();
        // Persist call session to sessionStorage for tab recovery
        try {
          sessionStorage.setItem('voicelink_call_session', JSON.stringify({
            sessionId: data.session_id,
            partnerId: data.callee_id || data.callee?.id,
            callType: callType,
            callId: callIdRef.current,
            startedAt: Date.now(),
          }));
        } catch {}
      } catch (e) {
        console.error('Failed to handle call accepted:', e);
        cleanup();
      }
    };

    const onCallRejected = () => {
      const name = remoteUserRef.current?.display_name || remoteUserRef.current?.username || 'User';
      setCallError(`${name} declined the call.`);
      setTimeout(() => cleanup(), 5000);
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
      setTimeout(() => {
        cleanup();
      }, 5000);
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

    const onRemoteMediaState = (data) => {
      setRemoteMediaState({
        muted: data.muted || false,
        video_on: data.video_on || false,
        screen_sharing: data.screen_sharing || false,
      });
    };

    const onCallReconnecting = () => {
      setIsReconnecting(true);
    };

    const onCallReconnected = () => {
      setIsReconnecting(false);
      setReconnectCountdown(0);
      if (reconnectCountdownRef.current) {
        clearInterval(reconnectCountdownRef.current);
        reconnectCountdownRef.current = null;
      }
      reconnectDeadlineRef.current = null;
    };

    // Peer disconnected during call — backend gives 120s grace
    const onCallPeerDisconnected = (data) => {
      if (callStateRef.current !== 'active') return;
      setIsReconnecting(true);
      const graceSeconds = data.grace_seconds || 120;
      reconnectDeadlineRef.current = Date.now() + graceSeconds * 1000;
      if (reconnectCountdownRef.current) clearInterval(reconnectCountdownRef.current);
      reconnectCountdownRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((reconnectDeadlineRef.current - Date.now()) / 1000));
        setReconnectCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(reconnectCountdownRef.current);
          reconnectCountdownRef.current = null;
          // Backend will handle the actual call end via grace expiry
        }
      }, 1000);
    };

    // Peer reconnected after disconnect
    const onCallPeerReconnected = () => {
      setIsReconnecting(false);
      setReconnectCountdown(0);
      if (reconnectCountdownRef.current) {
        clearInterval(reconnectCountdownRef.current);
        reconnectCountdownRef.current = null;
      }
      reconnectDeadlineRef.current = null;
    };

    // Session restore after our own reconnection
    const onCallSessionRestore = async (data) => {
      console.log('[CALL] Session restore received:', data);
      if (callStateRef.current !== 'idle') return;

      try {
        const webrtc = new WebRTCService();
        webrtcRef.current = webrtc;

        const isVideo = data.call_type === 'video';
        const prefs = getDevicePrefs();
        const stream = await webrtc.getMediaStream(isVideo, prefs);
        setLocalStream(stream);
        setIsVideoOn(isVideo);

        await webrtc.createPeerConnection();
        wireWebRTC(webrtc, data.partner_id);

        // Create a new offer to re-establish WebRTC
        const offer = await webrtc.createOffer();
        socket.emit('call_session_rejoin', {
          session_id: data.session_id,
          offer,
        });

        setRemoteUser(data.partner);
        setCallType(data.call_type);
        setCallId(data.call_id);
        sessionIdRef.current = data.session_id;
        setCallState('active');

        // Resume timer from where it was
        const elapsed = Math.floor(data.elapsed || 0);
        const sessionStart = data.started_at;
        const totalElapsed = sessionStart ? Math.floor((Date.now() / 1000) - sessionStart) : elapsed;
        setCallDuration(totalElapsed);
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (e) {
        console.error('[CALL] Session restore failed:', e);
        setCallError('Failed to restore call after reconnection.');
        setTimeout(() => cleanup(), 5000);
      }
    };

    // Handle rejoin offer from partner (they are restoring their session)
    const onCallRejoinOffer = async (data) => {
      if (!webrtcRef.current) return;
      try {
        // Create a fresh peer connection for the rejoined call
        const webrtc = webrtcRef.current;
        const answer = await webrtc.handleRenegotiationOffer(data.offer);
        if (answer) {
          socket.emit('call_rejoin_answer', {
            target_id: data.from_id,
            answer,
            session_id: data.session_id,
          });
        }
      } catch (e) {
        console.error('[CALL] Rejoin offer handling failed:', e);
      }
    };

    // Handle rejoin answer (response to our rejoin offer)
    const onCallRejoinAnswer = async (data) => {
      if (!webrtcRef.current) return;
      try {
        await webrtcRef.current.handleAnswer(data.answer);
        setIsReconnecting(false);
        setReconnectCountdown(0);
      } catch (e) {
        console.error('[CALL] Rejoin answer handling failed:', e);
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
    socket.on('remote_media_state', onRemoteMediaState);
    socket.on('call_reconnecting', onCallReconnecting);
    socket.on('call_reconnected', onCallReconnected);
    socket.on('call_peer_disconnected', onCallPeerDisconnected);
    socket.on('call_peer_reconnected', onCallPeerReconnected);
    socket.on('call_session_restore', onCallSessionRestore);
    socket.on('call_rejoin_offer', onCallRejoinOffer);
    socket.on('call_rejoin_answer', onCallRejoinAnswer);

    // On socket reconnect, check for active call sessions
    const onSocketReconnect = () => {
      // Delay slightly so authenticate fires first
      setTimeout(() => {
        if (callStateRef.current === 'idle') {
          socket.emit('call_session_check', {});
        }
      }, 1000);
    };
    socket.on('connect', onSocketReconnect);

    // Handle session existence response (from call_session_check)
    const onCallSessionExists = async (data) => {
      if (!data.session_id) return; // No active session
      if (callStateRef.current !== 'idle') return; // Already in a call
      console.log('[CALL] Active session found after reconnect/refresh:', data);

      try {
        const webrtc = new WebRTCService();
        webrtcRef.current = webrtc;

        const isVideo = data.call_type === 'video';
        const prefs = getDevicePrefs();
        const stream = await webrtc.getMediaStream(isVideo, prefs);
        setLocalStream(stream);
        setIsVideoOn(isVideo);

        await webrtc.createPeerConnection();
        wireWebRTC(webrtc, data.partner_id);

        const offer = await webrtc.createOffer();
        socket.emit('call_session_rejoin', {
          session_id: data.session_id,
          offer,
        });

        setRemoteUser(data.partner);
        setCallType(data.call_type);
        setCallId(data.call_id);
        sessionIdRef.current = data.session_id;
        setCallState('active');

        // Resume timer
        const sessionStart = data.started_at;
        const totalElapsed = sessionStart ? Math.floor((Date.now() / 1000) - sessionStart) : 0;
        setCallDuration(totalElapsed);
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);

        // Persist session
        try {
          sessionStorage.setItem('voicelink_call_session', JSON.stringify({
            sessionId: data.session_id,
            partnerId: data.partner_id,
            callType: data.call_type,
            callId: data.call_id,
            startedAt: sessionStart,
          }));
        } catch {}
      } catch (e) {
        console.error('[CALL] Session resume failed:', e);
      }
    };
    socket.on('call_session_exists', onCallSessionExists);

    return () => {
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('call_rejected', onCallRejected);
      socket.off('ice_candidate', onIceCandidate);
      socket.off('call_ended', onCallEnded);
      socket.off('call_error', onCallError);
      socket.off('renegotiate_offer', onRenegotiateOffer);
      socket.off('renegotiate_answer', onRenegotiateAnswer);
      socket.off('remote_media_state', onRemoteMediaState);
      socket.off('call_reconnecting', onCallReconnecting);
      socket.off('call_reconnected', onCallReconnected);
      socket.off('call_peer_disconnected', onCallPeerDisconnected);
      socket.off('call_peer_reconnected', onCallPeerReconnected);
      socket.off('call_session_restore', onCallSessionRestore);
      socket.off('call_rejoin_offer', onCallRejoinOffer);
      socket.off('call_rejoin_answer', onCallRejoinAnswer);
      socket.off('connect', onSocketReconnect);
      socket.off('call_session_exists', onCallSessionExists);
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

      // Ring timeout — auto-cancel if no answer within 45 seconds
      ringTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'calling') {
          socket.emit('end_call', { target_id: targetUser.id, call_id: logId });
          if (logId) {
            callsAPI.updateLog(logId, { status: 'missed', end_reason: 'no_answer' }).catch(() => {});
          }
          setCallError('No answer. The call was not picked up.');
          setTimeout(() => cleanup(), 5000);
        }
      }, 45000);
    } catch (e) {
      console.error('Failed to initiate call:', e);
      const msg = e.name === 'NotAllowedError' ? 'Microphone/camera permission denied. Please allow access in your browser settings.'
        : e.name === 'NotFoundError' ? 'No microphone or camera found on this device.'
        : e.name === 'NotReadableError' ? 'Media device is in use by another application.'
        : e.name === 'OverconstrainedError' ? 'Selected camera or microphone is not available.'
        : 'Failed to start call. Please check your device settings.';
      setCallError(msg);
      setTimeout(() => cleanup(), 5000);
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
      callsAPI.updateLog(callId, { status: 'ended', end_reason: 'normal' }).catch(() => {});
    }
    cleanup();
  }, [socket, remoteUser, callId, cleanup]);

  const toggleMute = useCallback(() => {
    if (webrtcRef.current) {
      const muted = webrtcRef.current.toggleMute();
      setIsMuted(muted);
      if (socket && remoteUserRef.current) {
        socket.emit('media_state_changed', {
          target_id: remoteUserRef.current.id,
          muted,
          video_on: isVideoOn,
          screen_sharing: isScreenSharing,
        });
      }
    }
  }, [socket, isVideoOn, isScreenSharing]);

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
            if (socket && remoteUserRef.current) {
              socket.emit('media_state_changed', {
                target_id: remoteUserRef.current.id,
                muted: isMuted,
                video_on: true,
                screen_sharing: isScreenSharing,
              });
            }
          }
        } catch (e) {
          console.error('Failed to add video track:', e);
        }
        return;
      }
    }

    const videoOn = webrtcRef.current.toggleVideo();
    setIsVideoOn(videoOn);
    if (socket && remoteUserRef.current) {
      socket.emit('media_state_changed', {
        target_id: remoteUserRef.current.id,
        muted: isMuted,
        video_on: videoOn,
        screen_sharing: isScreenSharing,
      });
    }
  }, [isVideoOn, callState, socket, isMuted, isScreenSharing]);

  const toggleScreenShare = useCallback(async () => {
    if (!webrtcRef.current) return;

    if (isScreenSharing) {
      await webrtcRef.current.stopScreenShare();
      setIsScreenSharing(false);
      if (socket && remoteUser) {
        socket.emit('screen_share_stopped', { target_id: remoteUser.id });
        socket.emit('media_state_changed', {
          target_id: remoteUser.id,
          muted: isMuted,
          video_on: isVideoOn,
          screen_sharing: false,
        });
      }
    } else {
      try {
        await webrtcRef.current.startScreenShare();
        setIsScreenSharing(true);
        if (socket && remoteUser) {
          socket.emit('screen_share_started', { target_id: remoteUser.id });
          socket.emit('media_state_changed', {
            target_id: remoteUser.id,
            muted: isMuted,
            video_on: isVideoOn,
            screen_sharing: true,
          });
        }
      } catch (e) {
        console.error('Screen share failed:', e);
      }
    }
  }, [isScreenSharing, socket, remoteUser, isMuted, isVideoOn]);

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
    remoteMediaState,
    isReconnecting,
    reconnectCountdown,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    cleanup,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
}
