'use client';

import { useEffect } from 'react';

/** Registra el service worker para que el sitio sea instalable (PWA). */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* no bloquea el sitio si falla */ });
    }
  }, []);
  return null;
}
