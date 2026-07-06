import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initRealBackend } from './lib/realBackend';
import './index.css';

// Boot-time backend mode switch: no-op in demo mode; in real mode restores the
// Supabase session and starts the Postgres/Realtime sync before first render.
initRealBackend();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
