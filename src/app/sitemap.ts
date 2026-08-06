import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

/**
 * Las páginas indexables. Carrito y checkout quedan afuera a propósito: son
 * del comprador, no de los buscadores (robots.ts las bloquea además).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tienda`, changeFrequency: 'daily', priority: 0.9 },
  ];
}
