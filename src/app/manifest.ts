import type { MetadataRoute } from 'next';
import { estaCerrada, getCatalogo, imgSrc } from '@/lib/api';
import { MODO_INICIAL } from '@/lib/modo';

/* Se arma al pedirlo, con el catálogo de ese momento: al construir la imagen la API no está. */
export const dynamic = 'force-dynamic';

/** Los de siempre, para cuando todavía no hay favicon cargado. */
const ICONOS_BASE: MetadataRoute.Manifest['icons'] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
];

/**
 * EL ÍCONO DE LA TIENDA INSTALADA (25/10/2026, pedido del dueño: «que salga el
 * favicon que tengo cargado»): el favicon del ERP (Tienda online ›
 * Configuración › Datos del sitio), que se sube como PNG de 512×512. Es el que
 * muestra el celular al instalar la tienda y en la pantalla de inicio.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cat = await getCatalogo(undefined, MODO_INICIAL).catch(() => null);
  const favicon = cat && !estaCerrada(cat) ? imgSrc(cat.sitio.faviconUrl) : '';
  return {
    name: 'Sabor y Aroma — Tienda online',
    short_name: 'Sabor y Aroma',
    description: 'Dietética y distribuidora saludable en Formosa. Pedidos online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#086633',
    icons: favicon ? [{ src: favicon, sizes: '192x192 512x512', type: 'image/png' }] : ICONOS_BASE,
  };
}
