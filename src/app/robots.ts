import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/rutas';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Páginas del comprador, sin valor para el índice.
      disallow: ['/carrito', '/checkout'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
