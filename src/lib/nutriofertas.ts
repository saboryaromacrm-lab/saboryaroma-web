/**
 * NUTRIOFERTAS (17/10/2026, pedido del dueño): así se llaman las ofertas en la
 * tienda MINORISTA, siempre con su lema. Un solo lugar para el nombre, el lema
 * y la dirección: el encabezado, la portada, el carrito y la página las usan.
 * La mayorista sigue diciendo «Ofertas».
 */
import type { ItemCatalogo } from './types';

export const NUTRIOFERTAS = 'NutriOfertas';
export const LEMA_NUTRIOFERTAS = 'Ofertas «reales», así que ¡aprovechalas!';
export const URL_NUTRIOFERTAS = '/tienda?oferta=1';

/** El mayor descuento de las ofertas de precio único (porcentaje o precio fijo), en % entero; 0 si no hay. */
export function mayorDescuento(items: ItemCatalogo[]): number {
  let max = 0;
  for (const p of items) {
    const o = p.oferta?.precioOferta;
    if (o != null && p.precio > 0 && o < p.precio) max = Math.max(max, Math.floor((1 - o / p.precio) * 100));
  }
  return max;
}
