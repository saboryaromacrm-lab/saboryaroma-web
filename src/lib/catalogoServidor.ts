import { cookies } from 'next/headers';
import { COOKIE_SESION, getCatalogo } from './api';

/**
 * El catálogo para el SERVIDOR de Next, con la sesión del que pide la página
 * (0155): si ingresó, el HTML ya sale con sus precios. El layout y las páginas
 * llaman a esto con la misma cookie, así que Next junta los pedidos en uno.
 */
export async function catalogoConSesion() {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  return getCatalogo(token);
}
