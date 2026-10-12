/**
 * LA SESIÓN DE LA TIENDA EN EL NAVEGADOR (0155, 10/10/2026).
 * ============================================================================
 * El cliente habilitado entra con su DNI y el servidor le da un token para ESTE
 * aparato. Vive en una cookie (90 días, se renueva mientras se use) para que
 * también la lea el servidor de Next al armar la página: así los precios salen
 * en el primer HTML, sin parpadeo. Es legible desde JS a propósito —el
 * navegador la manda en la cabecera `X-Tienda-Sesion`—, y no da más de lo que
 * ya da el DNI (decisión del dueño: se entra solo con el DNI).
 */
import { COOKIE_SESION } from './api';

const NOVENTA_DIAS_S = 90 * 86_400;
/** Pidió ingreso y espera: el cartel «tu solicitud está en revisión» hasta que entre o se lo rechace. */
const SOLICITUD = 'sa_solicitud';

export function leerToken(): string {
  if (typeof document === 'undefined') return '';
  const m = new RegExp(`(?:^|;\\s*)${COOKIE_SESION}=([^;]+)`).exec(document.cookie);
  return m ? decodeURIComponent(m[1]) : '';
}

/** Guarda (o renueva) la cookie por 90 días más. */
export function guardarToken(token: string) {
  const seguro = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_SESION}=${encodeURIComponent(token)}; Max-Age=${NOVENTA_DIAS_S}; Path=/; SameSite=Lax${seguro}`;
}

export function borrarToken() {
  document.cookie = `${COOKIE_SESION}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** Abre la ventana de ingreso desde cualquier lado (botón del encabezado, «Agregar», el carrito). */
export const abrirIngreso = () => window.dispatchEvent(new Event('sa:abrir-ingreso'));

export function leerSolicitud(): boolean {
  try { return localStorage.getItem(SOLICITUD) === '1'; } catch { return false; }
}
export function marcarSolicitud(pendiente: boolean) {
  try {
    if (pendiente) localStorage.setItem(SOLICITUD, '1');
    else localStorage.removeItem(SOLICITUD);
  } catch { /* modo privado: el cartel no se recuerda, nada más */ }
}
