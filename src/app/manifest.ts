import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sabor y Aroma — Tienda mayorista',
    short_name: 'Sabor y Aroma',
    description: 'Distribuidora saludable en Formosa. Pedidos mayoristas online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#086633',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
