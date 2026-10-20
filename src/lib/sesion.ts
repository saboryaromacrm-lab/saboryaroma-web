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
import { COOKIE_SESION, COOKIE_SESION_MIN } from './api';
import { leerCookie } from './cookies';
import type { Modo } from './modo';

const NOVENTA_DIAS_S = 90 * 86_400;
/** Cada modo con su cookie (0178): el DNI de la mayorista y el WhatsApp de la minorista. */
const cookieDe = (modo: Modo) => (modo === 'minorista' ? COOKIE_SESION_MIN : COOKIE_SESION);
/** Pidió ingreso y espera: el cartel «tu solicitud está en revisión» hasta que entre o se lo rechace. */
const SOLICITUD = 'sa_solicitud';

export const leerToken = (modo: Modo = 'mayorista'): string => leerCookie(cookieDe(modo));

/** Guarda (o renueva) la cookie por 90 días más. */
export function guardarToken(token: string, modo: Modo = 'mayorista') {
  const seguro = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${cookieDe(modo)}=${encodeURIComponent(token)}; Max-Age=${NOVENTA_DIAS_S}; Path=/; SameSite=Lax${seguro}`;
}

export function borrarToken(modo: Modo = 'mayorista') {
  document.cookie = `${cookieDe(modo)}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** Abre la ventana de ingreso desde cualquier lado (botón del encabezado, «Agregar», el carrito). */
export const abrirIngreso = () => window.dispatchEvent(new Event('sa:abrir-ingreso'));
/** Igual, pero directo en el pedido de ingreso (el «Registrarme» del cartel de bienvenida). */
export const abrirRegistro = () => window.dispatchEvent(new CustomEvent('sa:abrir-ingreso', { detail: 'registro' }));

/**
 * ELEGIR MINORISTA ABRE EL INGRESO (17/10/2026, pedido del dueño). Se anota
 * acá y no se abre en el acto porque el cambio de modo puede rearmar la
 * página: la ventana de la minorista la toma apenas está montada
 * (`tomarIngresoPendiente`), sea en el acto (evento) o después de rearmar.
 */
const INGRESO_PENDIENTE = 'sa_ingreso_pendiente';
export function pedirIngresoAlEntrar() {
  try { sessionStorage.setItem(INGRESO_PENDIENTE, '1'); } catch { /* modo privado: se ingresa desde el botón */ }
  window.dispatchEvent(new Event('sa:ingreso-pendiente'));
}
/** ¿Había que abrir el ingreso? Lo responde una vez (y lo borra). */
export function tomarIngresoPendiente(): boolean {
  try {
    const hay = sessionStorage.getItem(INGRESO_PENDIENTE) === '1';
    if (hay) sessionStorage.removeItem(INGRESO_PENDIENTE);
    return hay;
  } catch { return false; }
}

export function leerSolicitud(): boolean {
  try { return localStorage.getItem(SOLICITUD) === '1'; } catch { return false; }
}
export function marcarSolicitud(pendiente: boolean) {
  try {
    if (pendiente) localStorage.setItem(SOLICITUD, '1');
    else localStorage.removeItem(SOLICITUD);
  } catch { /* modo privado: el cartel no se recuerda, nada más */ }
}
