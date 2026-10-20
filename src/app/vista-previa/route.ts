import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_VISTA_PREVIA } from '@/lib/api';

const TREINTA_DIAS_S = 30 * 86_400;

/**
 * EL LINK DE VISTA PREVIA (20/10/2026): `/vista-previa?clave=…` (lo da el ERP)
 * deja la clave en una cookie y lleva a la portada; `?salir` la borra. Acá no
 * se valida nada: la clave la controla la API en cada pedido, así que una
 * cookie inventada no abre ninguna tienda. La redirección es relativa: detrás
 * del proxy, `request.url` puede tener el host interno del contenedor.
 */
export function GET(request: NextRequest) {
  const res = new NextResponse(null, { status: 303, headers: { Location: '/' } });
  const clave = request.nextUrl.searchParams.get('clave')?.trim() ?? '';
  if (request.nextUrl.searchParams.has('salir') || !clave) {
    res.cookies.delete(COOKIE_VISTA_PREVIA);
  } else {
    res.cookies.set({
      name: COOKIE_VISTA_PREVIA, value: clave, path: '/', maxAge: TREINTA_DIAS_S,
      sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    });
  }
  return res;
}
