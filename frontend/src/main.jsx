import './index.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SemaData_App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SemaData_App />
  </StrictMode>,
)

// ── PWA Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] Service worker failed:', err));
  });
}
