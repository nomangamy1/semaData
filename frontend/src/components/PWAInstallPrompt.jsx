import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: '#0f172a', color: 'white', borderRadius: 16,
      padding: '14px 20px', display: 'flex', alignItems: 'center',
      gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 9999, maxWidth: 380, width: 'calc(100% - 32px)',
      border: '1px solid rgba(72,156,140,0.3)'
    }}>
      <span style={{ fontSize: 28 }}>📱</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem' }}>
          Install SemaData
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
          Add to home screen for faster access
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setShowBanner(false)}
          style={{
            background: 'transparent', border: '1px solid #475569',
            color: '#94a3b8', padding: '6px 12px', borderRadius: 8,
            fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600
          }}
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          style={{
            background: '#489c8c', border: 'none',
            color: 'white', padding: '6px 14px', borderRadius: 8,
            fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
