import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { supabase } from './lib/supabaseClient'

if (import.meta.env.DEV) {
  ;(window as any).supabase = supabase
}

import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('refused to connect')) {
    event.preventDefault();
    console.warn('WebSocket connection blocked - this is expected if Realtime is not enabled');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
