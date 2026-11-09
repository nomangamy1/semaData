import './index.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import SemaData_App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <StrictMode>
      <SemaData_App />
    </StrictMode>
  </GoogleOAuthProvider>,
)

// ── PWA Service Worker Registration ──
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[PWA] Service worker registered:', reg.scope))
        .catch(err => console.warn('[PWA] Service worker failed:', err));
    });
  } else {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(err => console.warn('[PWA] Could not unregister development service workers:', err));
  }
}
