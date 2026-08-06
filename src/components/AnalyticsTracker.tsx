'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { iniciarAnalytics, paginaVista } from '@/lib/analytics';

/** Registra una vista por cada cambio de ruta y enciende el ciclo de envío. */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => { iniciarAnalytics(); }, []);
  useEffect(() => { paginaVista(pathname); }, [pathname]);

  return null;
}
