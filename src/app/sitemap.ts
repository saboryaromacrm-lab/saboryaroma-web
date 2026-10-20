import type { MetadataRoute } from 'next';
import { estaCerrada, getCatalogo } from '@/lib/api';
import { MODO_INICIAL } from '@/lib/modo';
import { rutaProducto, SITE_URL } from '@/lib/rutas';

/* Se arma al pedirlo, con el catálogo de ese momento: al construir la imagen la API no está. */
export const dynamic = 'force-dynamic';

/**
 * Las páginas indexables (20/10/2026): la portada, la tienda, cada categoría
 * (y subcategoría), cada marca y cada producto publicado — lo que ve un visitante sin sesión en
 * la tienda que abre por defecto. Con la tienda cerrada al público, vacío.
 * Carrito y checkout quedan afuera a propósito: son del comprador, no de los
 * buscadores (robots.ts las bloquea además).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cat = await getCatalogo(undefined, MODO_INICIAL).catch(() => null);
  if (!cat || estaCerrada(cat)) return [];
  /* Next escribe la dirección tal cual dentro del XML: el «&» va escapado. */
  const url = (ruta: string) => `${SITE_URL}${ruta}`.replace(/&/g, '&amp;');
  return [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/tienda'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/nosotros'), changeFrequency: 'monthly', priority: 0.8 },
    ...cat.categorias.map((c) => ({ url: url(`/tienda?cat=${c.id}`), changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...(cat.subcategorias ?? []).filter((s) => s.categoriaId).map((s) => ({
      url: url(`/tienda?cat=${s.categoriaId}&sub=${s.id}`), changeFrequency: 'weekly' as const, priority: 0.6,
    })),
    ...cat.marcas.map((m) => ({ url: url(`/tienda?marca=${m.id}`), changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...cat.items.map((p) => ({ url: url(rutaProducto(p)), changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
