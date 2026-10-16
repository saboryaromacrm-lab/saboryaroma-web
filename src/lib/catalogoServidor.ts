import { cookies } from 'next/headers';
import { COOKIE_SESION, getCatalogo } from './api';
import { COOKIE_MODO, MODO_INICIAL, modoDe, type Modo } from './modo';

/** El modo que eligió este navegador (cookie), o null si todavía no eligió. */
export async function modoElegido(): Promise<Modo | null> {
  return modoDe((await cookies()).get(COOKIE_MODO)?.value);
}

/**
 * El catálogo para el SERVIDOR de Next, en el modo del que pide la página
 * (0173) y, en mayorista, con su sesión (0155): si ingresó, el HTML ya sale
 * con sus precios. El layout y las páginas llaman a esto con las mismas
 * cookies, así que Next junta los pedidos en uno.
 */
export async function catalogoConSesion() {
  const c = await cookies();
  const modo = modoDe(c.get(COOKIE_MODO)?.value) ?? MODO_INICIAL;
  return getCatalogo(modo === 'mayorista' ? c.get(COOKIE_SESION)?.value : undefined, modo);
}
