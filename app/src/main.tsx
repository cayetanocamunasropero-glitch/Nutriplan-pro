import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './ui/back';
import { applyTheme, getTheme } from './lib/theme';
import App from './App';

applyTheme(getTheme());

// Guarda el código de invitación del enlace de WhatsApp (?invite=NP-XXXX) para usarlo tras registrarse.
try {
  const inv = new URLSearchParams(location.search).get('invite');
  if (inv) {
    sessionStorage.setItem('np-invite', inv.toUpperCase());
    history.replaceState(null, '', location.pathname);
  }
} catch {
  /* */
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
