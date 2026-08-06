'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { imgSrc } from '@/lib/api';

/**
 * Aplica el favicon subido en el CRM (Web › Configuración del sitio). Se hace
 * del lado del cliente para no pagar un fetch del catálogo en cada render del
 * layout: la pestaña actualiza su ícono apenas llega el catálogo, y sin
 * favicon configurado no toca nada.
 */
export function FaviconSetter() {
  const { catalogo } = useCart();
  const url = catalogo?.sitio?.faviconUrl;

  useEffect(() => {
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = imgSrc(url);
  }, [url]);

  return null;
}
