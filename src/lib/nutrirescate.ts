/**
 * NUTRIRESCATE (20/10/2026, pedido del dueño): la sección de los productos
 * PRÓXIMOS A VENCER, con precio reducido. Hermana de NutriOfertas: un solo
 * lugar para el nombre, la dirección, cómo se dice cuándo vence y en qué orden
 * se muestran. Un producto entra si tiene una promo marcada «por vencimiento»
 * en el ERP (Ventas › Ofertas o Almacén › Vencimientos); la API lo marca en el
 * producto (`porVencer`, `venceEl`), así la sección se arma aun sin precios.
 */
import type { ItemCatalogo } from './types';

export const NUTRIRESCATE = 'NutriRescate';
export const URL_NUTRIRESCATE = '/tienda?rescate=1';

const DIA_MS = 86_400_000;
const HOY_AR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

/** Días de hoy (en Argentina, sea cual sea el huso del servidor) a `AAAA-MM-DD`; 0 = hoy. */
function diasHasta(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hy, hm, hd] = HOY_AR.format(new Date()).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(hy, hm - 1, hd)) / DIA_MS);
}

/** «Vence hoy», «Vence mañana», «Vence en 3 días», «Vence el 25/10»; sin fecha, «Próximo a vencer». */
export function textoVence(venceEl?: string | null): string {
  if (!venceEl) return 'Próximo a vencer';
  const dias = diasHasta(venceEl);
  if (dias <= 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  if (dias <= 7) return `Vence en ${dias} días`;
  const [, m, d] = venceEl.split('-');
  return `Vence el ${d}/${m}`;
}

/** Lo de la sección: con stock y lo que vence antes primero (sin fecha, al final). */
export function enRescate(items: ItemCatalogo[]): ItemCatalogo[] {
  return items
    .filter((p) => p.porVencer && p.enStock)
    .sort((a, b) => (a.venceEl ?? '9').localeCompare(b.venceEl ?? '9'));
}
