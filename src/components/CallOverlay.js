import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useCall } from '../contexts/CallContext';
import DeviceSettings from './DeviceSettings';
import {
  FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff,
  FiMonitor, FiX, FiCheck, FiWifi, FiWifiOff, FiSettings,
  FiAlertTriangle,
} from 'react-icons/fi';

const QUALITY_ICON = { good: <FiWifi />, fair: <FiWifi />, poor: <FiWifiOff /> };
const QUALITY_COLOR = { good: '#4caf50', fair: '#ff9800', poor: '#f44336' };

export default function CallOverlay() {
  const {
    callState, callType, remoteUser, isMuted, isVideoOn, isScreenSharing,
    callDuration, localStream, remoteStream, connectionQuality, callError,
    remoteMediaState, isReconnecting, reconnectCountdown,
    acceptCall, rejectCall, endCall, toggleMute, toggleVideo, toggleScreenShare,
    cleanup,
  } = useCall();

  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Use callback ref for local video so srcObject is set the instant it mounts
  const localVideoRef = useCallback((node) => {
    if (node && localStream) {
      node.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream — re-run when callState changes too,
  // because the <video> element mounts only when state becomes 'active'
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callState]);

  if (callState === 'idle' && !callError) return null;

  const displayName = remoteUser?.display_name || remoteUser?.username || 'Unknown';

  // -- Error-only screen (call failed before connecting) --
  if (callError && (callState === 'idle' || callState === 'calling')) {
    return (
      <div className="call-overlay error-screen">
        <div className="call-overlay-content">
          <div className="call-error-card">
            <div className="call-error-icon">
              <FiAlertTriangle size={36} />
            </div>
            <h3 className="call-error-title">Call Failed</h3>
            {remoteUser && <p className="call-error-user">{displayName}</p>}
            <p className="call-error-message">{callError}</p>
            <button className="call-error-dismiss" onClick={() => cleanup()}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const hasLocalVideo = localStream && localStream.getVideoTracks().some((t) => t.enabled);
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled);

  return (
    <div className={`call-overlay ${callState}`}>
      {/* Always-mounted audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />
      <div className="call-overlay-content">

        {/* Error banner (during active call) */}
        {callError && callState === 'active' && (
          <div className="call-error-banner">
            <FiAlertTriangle size={16} />
            <span>{callError}</span>
          </div>
        )}

        {/* Reconnecting banner */}
        {isReconnecting && callState === 'active' && (
          <div className="call-reconnecting-banner">
            <FiWifiOff size={16} />
            <span>
              Reconnecting...{reconnectCountdown > 0 && ` (${reconnectCountdown}s)`}
            </span>
          </div>
        )}

        {/* Incoming call */}
        {callState === 'incoming' && (
          <div className="call-incoming">
            <div className="call-avatar-large">
              <FiPhone size={32} className="ringing" />
            </div>
            <h2>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</h2>
            <p>{displayName}</p>
            {hasLocalVideo && (
              <div className="local-video-preview">
                <video ref={localVideoRef} autoPlay playsInline muted />
              </div>
            )}
            <div className="call-incoming-actions">
              <button className="btn-accept" onClick={acceptCall}>
                <FiCheck size={24} />
                <span>Accept</span>
              </button>
              <button className="btn-reject" onClick={rejectCall}>
                <FiX size={24} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}

        {/* Calling (outgoing) */}
        {callState === 'calling' && (
          <div className="call-outgoing">
            <div className="call-avatar-large pulsing">
              <FiPhone size={32} />
            </div>
            <h2>Calling {displayName}...</h2>
            <p>{callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
            {hasLocalVideo && (
              <div className="local-video-preview">
                <video ref={localVideoRef} autoPlay playsInline muted />
              </div>
            )}
            <button className="btn-end-call" onClick={endCall}>
              <FiPhoneOff size={24} />
              <span>Cancel</span>
            </button>
          </div>
        )}

        {/* Active call */}
        {callState === 'active' && (
          <div className="call-active">
            <div className="video-area">
              <div className="remote-video-container">
                <video ref={remoteVideoRef} autoPlay playsInline />
                {!hasRemoteVideo && (
                  <div className="video-placeholder">
                    <div className="placeholder-avatar">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                {/* Remote user media state indicators */}
                <div className="remote-media-indicators">
                  {remoteMediaState.muted && (
                    <span className="remote-indicator muted" title={`${displayName} is muted`}>
                      <FiMicOff size={14} />
                    </span>
                  )}
                  {!remoteMediaState.video_on && callType === 'video' && (
                    <span className="remote-indicator cam-off" title={`${displayName}'s camera is off`}>
                      <FiVideoOff size={14} />
                    </span>
                  )}
                  {remoteMediaState.screen_sharing && (
                    <span className="remote-indicator screen" title={`${displayName} is sharing screen`}>
                      <FiMonitor size={14} />
                    </span>
                  )}
                </div>
              </div>
              {(hasLocalVideo || isScreenSharing) && (
                <div className="local-video-container">
                  <video ref={localVideoRef} autoPlay playsInline muted />
                </div>
              )}
            </div>

            <div className="call-info-bar">
              <span className="call-with">{displayName}</span>
              <span className="call-timer">{formatDuration(callDuration)}</span>
              {connectionQuality && (
                <span
                  className="call-quality"
                  style={{ color: QUALITY_COLOR[connectionQuality.quality] || '#fff' }}
                  title={`RTT: ${connectionQuality.rtt}ms | Loss: ${connectionQuality.packetsLost}`}
                >
                  {QUALITY_ICON[connectionQuality.quality]}
                  <small>{connectionQuality.rtt}ms</small>
                </span>
              )}
            </div>

            <div className="call-controls">
              <button
                className={`btn-control ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
              >
                {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                className={`btn-control ${isVideoOn ? 'active' : ''}`}
                onClick={toggleVideo}
              >
                {isVideoOn ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
                <span>{isVideoOn ? 'Cam On' : 'Cam Off'}</span>
              </button>

              <button
                className={`btn-control ${isScreenSharing ? 'active' : ''}`}
                onClick={toggleScreenShare}
              >
                <FiMonitor size={20} />
                <span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
              </button>

              <button className="btn-end-call" onClick={endCall}>
                <FiPhoneOff size={20} />
                <span>End</span>
              </button>

              <button
                className="btn-control"
                onClick={() => setSettingsOpen(true)}
              >
                <FiSettings size={20} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <DeviceSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(settings) => {
          // Settings are persisted in localStorage by DeviceSettings
          console.log('[SETTINGS] Saved:', settings);
        }}
      />
    </div>
  );
}
