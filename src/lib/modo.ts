/**
 * EL MODO DE LA TIENDA (0173, 16/10/2026): la misma URL vende MINORISTA (precio
 * de mostrador, sin mínimo, se ingresa con el WhatsApp desde 0178) y MAYORISTA
 * (la tienda de siempre, con DNI habilitado). La elección vive en una cookie que leen el navegador y el
 * servidor de Next: así el HTML ya sale armado para el modo elegido.
 */
export type Modo = 'mayorista' | 'minorista';

export const COOKIE_MODO = 'sa_modo';
/** Cuánto dura la elección: la usan el navegador y el link medible (/l/<código>). */
export const DURACION_MODO_S = 365 * 86_400;

/** Lo que haya en la cookie, solo si es un modo válido. */
export const modoDe = (v: unknown): Modo | null => (v === 'minorista' || v === 'mayorista' ? v : null);

/** Sin elección todavía, la tienda arranca en minorista: es pública y la más rápida de servir. */
export const MODO_INICIAL: Modo = 'minorista';

export function guardarModo(modo: Modo) {
  const seguro = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_MODO}=${modo}; Max-Age=${DURACION_MODO_S}; Path=/; SameSite=Lax${seguro}`;
}

export const ETIQUETA_MODO: Record<Modo, string> = { minorista: 'Minorista', mayorista: 'Mayorista' };
