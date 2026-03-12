import React, { useState, useEffect } from 'react';
import { enumerateDevices } from '../services/webrtc';
import { FiMic, FiCamera, FiVolume2, FiSettings, FiX } from 'react-icons/fi';

const RESOLUTION_OPTIONS = [
  { value: 'low', label: '240p - Low bandwidth' },
  { value: 'medium', label: '480p - Standard' },
  { value: 'high', label: '720p - High quality' },
  { value: 'hd', label: '1080p - Full HD' },
];

export default function DeviceSettings({ isOpen, onClose, onSave }) {
  const [devices, setDevices] = useState({ audioinput: [], audiooutput: [], videoinput: [] });
  const [audioInput, setAudioInput] = useState('');
  const [audioOutput, setAudioOutput] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [resolution, setResolution] = useState(() => localStorage.getItem('voicelink_resolution') || 'high');
  const [noiseSuppression, setNoiseSuppression] = useState(() => localStorage.getItem('voicelink_noise') !== 'false');
  const [echoCancellation, setEchoCancellation] = useState(() => localStorage.getItem('voicelink_echo') !== 'false');

  useEffect(() => {
    if (isOpen) {
      enumerateDevices().then((d) => {
        setDevices(d);
        // Set defaults to first available device
        if (d.audioinput.length && !audioInput) setAudioInput(d.audioinput[0].deviceId);
        if (d.audiooutput.length && !audioOutput) setAudioOutput(d.audiooutput[0].deviceId);
        if (d.videoinput.length && !videoInput) setVideoInput(d.videoinput[0].deviceId);
      });
    }
  }, [isOpen, audioInput, audioOutput, videoInput]);

  const handleSave = () => {
    localStorage.setItem('voicelink_resolution', resolution);
    localStorage.setItem('voicelink_noise', String(noiseSuppression));
    localStorage.setItem('voicelink_echo', String(echoCancellation));
    localStorage.setItem('voicelink_audio_input', audioInput);
    localStorage.setItem('voicelink_audio_output', audioOutput);
    localStorage.setItem('voicelink_video_input', videoInput);
    if (onSave) {
      onSave({ audioInput, audioOutput, videoInput, resolution, noiseSuppression, echoCancellation });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <div className="settings-header">
          <h2><FiSettings size={20} /> Call Settings</h2>
          <button className="btn-close" onClick={onClose}><FiX size={20} /></button>
        </div>

        <div className="settings-body">
          <div className="settings-group">
            <label><FiMic size={16} /> Microphone</label>
            <select value={audioInput} onChange={(e) => setAudioInput(e.target.value)}>
              {devices.audioinput.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label><FiVolume2 size={16} /> Speaker</label>
            <select value={audioOutput} onChange={(e) => setAudioOutput(e.target.value)}>
              {devices.audiooutput.length === 0 ? (
                <option value="">Default</option>
              ) : (
                devices.audiooutput.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Speaker ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="settings-group">
            <label><FiCamera size={16} /> Camera</label>
            <select value={videoInput} onChange={(e) => setVideoInput(e.target.value)}>
              {devices.videoinput.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-group">
            <label>Video Resolution</label>
            <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
              {RESOLUTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="settings-group toggle-group">
            <label>Noise Suppression</label>
            <button
              className={`toggle-btn ${noiseSuppression ? 'active' : ''}`}
              onClick={() => setNoiseSuppression((v) => !v)}
            >
              {noiseSuppression ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="settings-group toggle-group">
            <label>Echo Cancellation</label>
            <button
              className={`toggle-btn ${echoCancellation ? 'active' : ''}`}
              onClick={() => setEchoCancellation((v) => !v)}
            >
              {echoCancellation ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
