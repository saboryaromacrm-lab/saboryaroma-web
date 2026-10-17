import { cookies } from 'next/headers';
import { COOKIE_SESION, COOKIE_SESION_MIN, getCatalogo } from './api';
import { COOKIE_MODO, MODO_INICIAL, modoDe, type Modo } from './modo';

/** El modo que eligió este navegador (cookie), o null si todavía no eligió. */
export async function modoElegido(): Promise<Modo | null> {
  return modoDe((await cookies()).get(COOKIE_MODO)?.value);
}

/**
 * El catálogo para el SERVIDOR de Next, en el modo del que pide la página
 * (0173) y con su sesión (0155): si ingresó, el HTML ya sale con sus precios.
 * El layout y las páginas llaman a esto con las mismas cookies, así que Next
 * junta los pedidos en uno.
 *
 * Las sesiones van SIEMPRE, las dos, aunque la cookie diga otro modo
 * (17/10/2026): con la minorista apagada la API contesta la mayorista, y sin
 * la sesión el cliente habilitado quedaba afuera aunque acabara de ingresar.
 * La API usa la del modo que contesta.
 */
export async function catalogoConSesion() {
  const c = await cookies();
  const modo = modoDe(c.get(COOKIE_MODO)?.value) ?? MODO_INICIAL;
  return getCatalogo(c.get(COOKIE_SESION)?.value, modo, c.get(COOKIE_SESION_MIN)?.value);
}
