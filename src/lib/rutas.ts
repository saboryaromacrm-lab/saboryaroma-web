import { norm } from './format';

/** Origen público del sitio: en producción se setea NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

/** «Maní tostado 1 kg» → «mani-tostado-1-kg». */
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/^-+|-+$/g, '');

/**
 * LA PÁGINA DE UN PRODUCTO (20/10/2026): el nombre, para leer y para Google, y
 * el id al final, que es el que manda — si el nombre cambia en el ERP, el link
 * viejo sigue llevando al producto (la página redirige al nombre nuevo).
 */
export const rutaProducto = (p: { id: number; nombre: string }) => `/producto/${slug(p.nombre) || 'producto'}-${p.id}`;

/** El id de «mani-tostado-1-kg-123», o null. */
export function idDeRuta(s: string): number | null {
  const m = /(?:^|-)(\d+)$/.exec(s);
  return m ? Number(m[1]) : null;
}
