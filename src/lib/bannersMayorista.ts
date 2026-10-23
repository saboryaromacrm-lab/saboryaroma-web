import { imgSrc } from '@/lib/api';
import type { Catalogo, ItemCatalogo } from '@/lib/types';

/**
 * LOS BANNERS DE LA PORTADA MAYORISTA, SOLOS (23/10/2026, pedido del dueño:
 * «banners automáticos como los de la minorista, con los logos de las marcas y
 * fotos de productos»). Salen del catálogo, sin cargar nada:
 *
 *   · los slides del ERP (Tienda online › Contenido) que tienen imagen propia,
 *     primero: son a propósito;
 *   · Ofertas, si hay en oferta con foto (sin ingresar no viajan ofertas);
 *   · las marcas con logo y al menos MIN_FOTOS productos con foto y stock, las
 *     de más productos primero;
 *   · Volvieron a stock, si hay con foto;
 *   · y, si con todo eso no se llega a dos, el catálogo con sus fotos.
 *
 * Un slide del ERP SIN imagen ya no se muestra: era el texto genérico sobre una
 * ilustración, y los automáticos dicen lo mismo con productos de verdad.
 */
export type Banner =
  | { tipo: 'imagen'; key: string; imagen: string; badge: string; titulo: string; texto: string; cta: string; url: string; posicion: 'left' | 'center' | 'right' }
  | { tipo: 'auto'; key: string; tono: Tono; badge: string; titulo: string; texto: string; cta: string; url: string; logo?: string; marca?: string; fotos: ItemCatalogo[] };

/** El fondo de cada banner automático: los colores de la casa, siempre claros (las fotos tienen fondo blanco). */
export type Tono = 'naranja' | 'verde' | 'crema' | 'lima';

const MAX_BANNERS = 7;
const MAX_MARCAS = 3;
const MIN_FOTOS = 3;
const FOTOS_POR_BANNER = 6;
const TONOS_MARCA: Tono[] = ['crema', 'lima', 'verde'];
const POSICIONES = new Set(['left', 'center', 'right']);

const conFoto = (p: ItemCatalogo) => !!p.imagenUrl && p.enStock;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function bannersMayorista(cat: Catalogo): Banner[] {
  const propios: Banner[] = (cat.sitio?.slides ?? [])
    .filter((sl) => sl.bannerUrl)
    .map((sl) => ({
      tipo: 'imagen', key: `s${sl.id}`, imagen: imgSrc(sl.bannerUrl), badge: sl.badge, titulo: sl.titulo, texto: sl.texto,
      cta: sl.cta || 'Ver catálogo', url: sl.ctaUrl || '/tienda',
      posicion: (POSICIONES.has(sl.posicion) ? sl.posicion : 'left') as 'left' | 'center' | 'right',
    }));

  const fotos = cat.items.filter(conFoto);
  const auto: Banner[] = [];

  const ofertas = fotos.filter((p) => p.oferta);
  if (ofertas.length) {
    auto.push({
      tipo: 'auto', key: 'ofertas', tono: 'naranja', badge: 'Ofertas activas', titulo: 'Precios especiales por tiempo limitado',
      texto: `${plural(ofertas.length, 'producto', 'productos')} en oferta para tu compra mayorista, hasta agotar stock.`,
      cta: 'Ver ofertas', url: '/tienda?oferta=1', fotos: ofertas.slice(0, FOTOS_POR_BANNER),
    });
  }

  const porMarca = new Map<number, ItemCatalogo[]>();
  for (const p of fotos) if (p.marcaId != null) porMarca.set(p.marcaId, [...(porMarca.get(p.marcaId) ?? []), p]);
  const marcas = cat.marcas
    .filter((m) => m.imagenUrl && (porMarca.get(m.id)?.length ?? 0) >= MIN_FOTOS)
    .sort((a, b) => (porMarca.get(b.id)?.length ?? 0) - (porMarca.get(a.id)?.length ?? 0))
    .slice(0, MAX_MARCAS);
  marcas.forEach((m, i) => {
    auto.push({
      tipo: 'auto', key: `m${m.id}`, tono: TONOS_MARCA[i % TONOS_MARCA.length], badge: 'Marca destacada', titulo: m.nombre,
      texto: `${plural(m.count, 'producto', 'productos')} de ${m.nombre} a precio mayorista para tu negocio.`,
      cta: `Ver ${m.nombre}`, url: `/tienda?marca=${m.id}`, logo: imgSrc(m.imagenUrl), marca: m.nombre,
      fotos: (porMarca.get(m.id) ?? []).slice(0, FOTOS_POR_BANNER),
    });
  });

  const volvieron = fotos.filter((p) => p.reingreso && !p.oferta);
  if (volvieron.length >= MIN_FOTOS) {
    auto.push({
      tipo: 'auto', key: 'volvieron', tono: 'lima', badge: 'Recién llegados', titulo: 'Volvieron a stock',
      texto: 'Lo que estaba agotado ya está otra vez en el depósito. Pedilo antes de que se vuelva a ir.',
      cta: 'Ver la tienda', url: '/tienda', fotos: volvieron.slice(0, FOTOS_POR_BANNER),
    });
  }

  if (propios.length + auto.length < 2 && fotos.length >= MIN_FOTOS) {
    const elegidos = fotos.filter((p) => p.destacado);
    const rubros = [...cat.categorias].sort((a, b) => b.count - a.count).slice(0, 3).map((c) => c.nombre.toLowerCase());
    auto.push({
      tipo: 'auto', key: 'catalogo', tono: 'verde', badge: 'Distribuidora saludable', titulo: 'Todo para tu negocio, en un solo pedido',
      texto: `${plural(cat.items.length, 'producto', 'productos')} a precio mayorista${rubros.length ? `: ${rubros.join(', ')} y más` : ''}.`,
      cta: 'Ver el catálogo', url: '/tienda', fotos: (elegidos.length >= MIN_FOTOS ? elegidos : fotos).slice(0, FOTOS_POR_BANNER),
    });
  }

  return [...propios, ...auto].slice(0, MAX_BANNERS);
}
