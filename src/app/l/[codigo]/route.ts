import { NextResponse, type NextRequest } from 'next/server';
import { resolverLink } from '@/lib/api';
import { COOKIE_MODO, DURACION_MODO_S } from '@/lib/modo';

/**
 * EL LINK MEDIBLE (0195, 23/10/2026): `/l/<código>` es lo que se comparte.
 * Deja la tienda en el modo del link (minorista o mayorista) y lleva a su
 * página con `?l=<código>` (y `utm_source` con el canal). La visita la cuenta
 * el navegador al llegar (`analytics.ts`): una vista previa de WhatsApp pide
 * esta dirección pero no ejecuta nada, así que no suma. Un código que no
 * existe o está desactivado abre la portada. Redirección relativa: detrás del
 * proxy, `request.url` puede tener el host interno del contenedor.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<'/l/[codigo]'>) {
  const { codigo } = await ctx.params;
  const link = await resolverLink(codigo).catch(() => null);
  if (!link) return new NextResponse(null, { status: 303, headers: { Location: '/' } });
  const [camino, consulta = ''] = link.destino.split('?');
  const q = new URLSearchParams(consulta);
  q.set('l', codigo.toLowerCase());
  if (link.canal) q.set('utm_source', link.canal);
  const res = new NextResponse(null, { status: 303, headers: { Location: `${camino}?${q}` } });
  res.cookies.set({
    name: COOKIE_MODO, value: link.modo, path: '/', maxAge: DURACION_MODO_S,
    sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
