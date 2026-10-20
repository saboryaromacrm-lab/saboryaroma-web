import { estaCerrada, getCatalogo } from '@/lib/api';
import { linkRed, whatsappLegible } from '@/lib/format';
import { direccionDe, horarioLegible } from '@/lib/locales';
import { MODO_INICIAL } from '@/lib/modo';
import { SITE_URL } from '@/lib/rutas';
import { NOMBRE, seoDe } from '@/lib/seo';

/* Se arma al pedirlo, con los datos de ese momento: al construir la imagen la API no está. */
export const dynamic = 'force-dynamic';

/**
 * /llms.txt (20/10/2026, pedido del dueño: «que me encuentren cuando buscan en
 * ChatGPT o similares»): el resumen del negocio en texto plano (Markdown, como
 * propone llmstxt.org) para los asistentes de IA que lo leen — quiénes somos,
 * locales y horarios, contacto, preguntas frecuentes, categorías y marcas, con
 * sus links. Sale de lo cargado en el ERP. Con la tienda cerrada al público, no existe.
 */
export async function GET() {
  const cat = await getCatalogo(undefined, MODO_INICIAL).catch(() => null);
  if (!cat || estaCerrada(cat)) return new Response('No encontrado', { status: 404 });
  const { sitio } = cat;
  const c = sitio.contacto;
  const url = (ruta: string) => `${SITE_URL}${ruta}`;
  const lista = (renglones: string[]) => renglones.filter(Boolean).map((r) => `- ${r}`).join('\n');
  const seccion = (titulo: string, cuerpo: string) => (cuerpo ? `## ${titulo}\n\n${cuerpo}` : '');

  const locales = (sitio.locales ?? []).map((l) => {
    const horario = horarioLegible(l).map((h) => `${h.dias} ${h.horas}`).join('; ');
    return [`**${l.nombre || NOMBRE}**`, direccionDe(l), l.telefono && `Tel. ${l.telefono}`, horario && `Horario: ${horario}`].filter(Boolean).join('. ');
  });
  const contacto = lista([
    c.whatsapp && `WhatsApp: ${whatsappLegible(c.whatsapp)}`,
    c.telefono && `Teléfono: ${c.telefono}`,
    c.email && `Correo: ${c.email}`,
    c.instagram && `Instagram: ${linkRed(c.instagram, 'instagram.com')}`,
    c.facebook && `Facebook: ${linkRed(c.facebook, 'facebook.com')}`,
  ]);
  const faq = (sitio.nosotros?.faq ?? []).map((f) => `### ${f.pregunta}\n\n${f.respuesta}`).join('\n\n');

  const texto = [
    `# ${NOMBRE}`,
    `> ${seoDe(sitio).descripcion}`,
    sitio.nosotros?.texto ?? '',
    seccion('Locales y horarios', lista(locales)),
    seccion('Contacto', contacto),
    seccion('Comprar online', lista([`[Tienda online](${url('/tienda')}): todo el catálogo`, `[Nosotros y preguntas frecuentes](${url('/nosotros')})`])),
    seccion('Preguntas frecuentes', faq),
    seccion('Categorías', lista(cat.categorias.map((t) => `[${t.nombre}](${url(`/tienda?cat=${t.id}`)}): ${t.count} productos`))),
    seccion('Marcas', lista(cat.marcas.map((t) => `[${t.nombre}](${url(`/tienda?marca=${t.id}`)})`))),
    seccion('Más', lista([`[Todos los productos (sitemap)](${url('/sitemap.xml')})`])),
  ].filter(Boolean).join('\n\n');

  return new Response(`${texto}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
