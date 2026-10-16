/**
 * LAS PROMOS DE VARIAS UNIDADES EN EL SITIO (16/10/2026, pedido del dueño: «el
 * 3×2 que agregue el lote y aclare que lleva 3 y paga 2»). La cuenta es la
 * misma del servidor (`crm-api/src/tienda/oferta-linea.ts`): duplicada porque
 * son proyectos separados, no porque la regla cambie.
 */
import type { OfertaItem } from './types';

export const esMultiUnidad = (o: OfertaItem | null | undefined): o is OfertaItem =>
  !!o && (o.tipo === 'nxm' || o.tipo === 'segunda_unidad' || o.tipo === 'pack');

const money = (n: number) => Math.round(n * 100) / 100;

/** Lo que vale `unidades` con la promo; `precioUnidad` es el precio final de una unidad sin ella. */
export function totalConOferta(o: OfertaItem, precioUnidad: number, unidades: number): number {
  const lleno = precioUnidad * unidades;
  const lleva = o.lleva ?? 0;
  const paga = o.paga ?? 0;
  if (o.tipo === 'nxm' && lleva > paga && paga > 0) {
    const grupos = Math.floor(unidades / lleva);
    return money((grupos * paga + (unidades - grupos * lleva)) * precioUnidad);
  }
  if (o.tipo === 'segunda_unidad' && (o.porcentaje ?? 0) > 0) {
    const pares = Math.floor(unidades / 2);
    return money(lleno - pares * precioUnidad * Math.min(100, o.porcentaje!) / 100);
  }
  if (o.tipo === 'pack' && lleva > 1 && (o.precioPack ?? 0) > 0) {
    const grupos = Math.floor(unidades / lleva);
    return money(Math.min(lleno, grupos * o.precioPack! + (unidades - grupos * lleva) * precioUnidad));
  }
  return money(lleno);
}

/** Cuántas unidades arman la promo: 3 en el 3×2, 2 en la 2ª unidad, `lleva` en el pack. */
export const loteDe = (o: OfertaItem) => (o.tipo === 'segunda_unidad' ? 2 : Math.max(1, o.lleva ?? 1));

/** Cuántas unidades faltan para completar el próximo lote (0 = completo). */
export const faltanParaLote = (o: OfertaItem, unidades: number) => {
  const resto = unidades % loteDe(o);
  return resto ? loteDe(o) - resto : 0;
};

/** Lo que se lee en la tarjeta: «Llevás 3 y pagás 2», «La 2ª al 50% OFF», «Llevás 3 por $1.000». */
export function textoPromo(o: OfertaItem, fmt: (n: number) => string): string {
  if (o.tipo === 'nxm') return `Llevás ${o.lleva} y pagás ${o.paga}`;
  if (o.tipo === 'segunda_unidad') return `La 2ª unidad al ${o.porcentaje}% OFF`;
  return `Llevás ${o.lleva} por ${fmt(o.precioPack ?? 0)}`;
}
