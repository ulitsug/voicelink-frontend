import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiWifiOff, FiX } from 'react-icons/fi';

/* ─── Install Prompt ─── */
let deferredPrompt = null;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Don't show if already dismissed this session
      if (!sessionStorage.getItem('pwa-install-dismissed')) {
        setShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
      deferredPrompt = null;
    });

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setShow(false);
    deferredPrompt = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  if (!show || installed) return null;

  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-content">
        <FiDownload className="pwa-install-icon" />
        <div>
          <strong>Install VoiceLink</strong>
          <span>Add to your home screen for the best experience</span>
        </div>
      </div>
      <div className="pwa-install-actions">
        <button className="pwa-install-btn" onClick={handleInstall}>Install</button>
        <button className="pwa-dismiss-btn" onClick={handleDismiss}><FiX /></button>
      </div>
    </div>
  );
}

/* ─── Offline Indicator ─── */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-indicator">
      <FiWifiOff />
      <span>You are offline</span>
    </div>
  );
}
