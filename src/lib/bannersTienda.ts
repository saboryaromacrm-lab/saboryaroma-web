import { imgSrc } from '@/lib/api';
import type { Catalogo, ItemCatalogo, SlideSitio } from '@/lib/types';
import type { Modo } from '@/lib/modo';

/**
 * LOS BANNERS DE LA PORTADA, DINÁMICOS (23/10/2026, pedidos del dueño). Salen
 * del catálogo de cada tienda en el momento: nada queda viejo.
 *
 * Primero los slides del ERP (Tienda online › Contenido) de ESTA tienda, en su
 * orden:
 *   · imagen propia: se ve si tiene la imagen subida;
 *   · una marca: su logo y las fotos de sus productos con stock;
 *   · productos elegidos: las fotos de los que tienen stock.
 * Los textos que quedaron vacíos se completan solos; uno de marca o de
 * productos sin nada con foto y stock no se muestra.
 *
 * En la mayorista, además, los automáticos: Ofertas, las marcas con más fotos
 * (solo si no elegiste ninguna marca ni productos: si elegiste, mandás vos) y
 * Volvieron a stock; si con todo no se llega a dos, el catálogo. La minorista
 * muestra solo los elegidos (su portada ya tiene sus fotos y ofertas).
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
const TONOS: Tono[] = ['crema', 'lima', 'verde'];
const POSICIONES = new Set(['left', 'center', 'right']);

const conFoto = (p: ItemCatalogo) => !!p.imagenUrl && p.enStock;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
/** Un slide sin `tiendas` es de antes (23/10/2026): era de la mayorista. */
const esDe = (sl: SlideSitio, modo: Modo) => (sl.tiendas || 'mayorista') === modo || sl.tiendas === 'ambas';

export function bannersTienda(cat: Catalogo, modo: Modo): Banner[] {
  const fotos = cat.items.filter(conFoto);
  const porId = new Map(fotos.map((p) => [p.id, p]));
  const porMarca = new Map<number, ItemCatalogo[]>();
  for (const p of fotos) if (p.marcaId != null) porMarca.set(p.marcaId, [...(porMarca.get(p.marcaId) ?? []), p]);
  const marcaPorId = new Map(cat.marcas.map((m) => [m.id, m]));
  let tono = 0;
  const siguienteTono = () => TONOS[tono++ % TONOS.length];

  const marcaBanner = (marcaId: number, sl?: SlideSitio): Banner | null => {
    const m = marcaPorId.get(marcaId);
    const suyas = porMarca.get(marcaId) ?? [];
    if (!m || !suyas.length) return null;
    return {
      tipo: 'auto', key: sl ? `s${sl.id}` : `m${m.id}`, tono: siguienteTono(),
      badge: sl?.badge || 'Marca destacada', titulo: sl?.titulo || m.nombre,
      texto: sl?.texto || (modo === 'minorista'
        ? `${plural(m.count, 'producto', 'productos')} de ${m.nombre}, al precio del local.`
        : `${plural(m.count, 'producto', 'productos')} de ${m.nombre} a precio mayorista para tu negocio.`),
      cta: sl?.cta || `Ver ${m.nombre}`, url: sl?.ctaUrl || `/tienda?marca=${m.id}`,
      ...(m.imagenUrl ? { logo: imgSrc(m.imagenUrl), marca: m.nombre } : {}),
      fotos: suyas.slice(0, FOTOS_POR_BANNER),
    };
  };

  const deSlide = (sl: SlideSitio): Banner | null => {
    if (sl.contenido === 'marca') return marcaBanner(sl.marcaId ?? 0, sl);
    if (sl.contenido === 'productos') {
      const elegidos = String(sl.productoIds ?? '').split(',').map(Number).map((id) => porId.get(id)).filter((p): p is ItemCatalogo => !!p);
      if (!elegidos.length) return null;
      const unaMarca = elegidos.every((p) => p.marcaId != null && p.marcaId === elegidos[0].marcaId);
      return {
        tipo: 'auto', key: `s${sl.id}`, tono: siguienteTono(), badge: sl.badge, titulo: sl.titulo || 'Elegidos de la casa', texto: sl.texto,
        cta: sl.cta || 'Ver en la tienda', url: sl.ctaUrl || (unaMarca ? `/tienda?marca=${elegidos[0].marcaId}` : '/tienda'),
        fotos: elegidos.slice(0, FOTOS_POR_BANNER),
      };
    }
    if (!sl.bannerUrl) return null;
    return {
      tipo: 'imagen', key: `s${sl.id}`, imagen: imgSrc(sl.bannerUrl), badge: sl.badge, titulo: sl.titulo, texto: sl.texto,
      cta: sl.cta || 'Ver catálogo', url: sl.ctaUrl || '/tienda',
      posicion: (POSICIONES.has(sl.posicion) ? sl.posicion : 'left') as 'left' | 'center' | 'right',
    };
  };

  const slides = (cat.sitio?.slides ?? []).filter((sl) => esDe(sl, modo));
  const propios = slides.map(deSlide).filter((b): b is Banner => !!b);
  if (modo === 'minorista') return propios.slice(0, MAX_BANNERS);

  const auto: Banner[] = [];
  const ofertas = fotos.filter((p) => p.oferta);
  if (ofertas.length) {
    auto.push({
      tipo: 'auto', key: 'ofertas', tono: 'naranja', badge: 'Ofertas activas', titulo: 'Precios especiales por tiempo limitado',
      texto: `${plural(ofertas.length, 'producto', 'productos')} en oferta para tu compra mayorista, hasta agotar stock.`,
      cta: 'Ver ofertas', url: '/tienda?oferta=1', fotos: ofertas.slice(0, FOTOS_POR_BANNER),
    });
  }

  /* Las marcas automáticas, solo si no elegiste ninguna marca ni productos. */
  if (!slides.some((sl) => sl.contenido === 'marca' || sl.contenido === 'productos')) {
    cat.marcas
      .filter((m) => m.imagenUrl && (porMarca.get(m.id)?.length ?? 0) >= MIN_FOTOS)
      .sort((a, b) => (porMarca.get(b.id)?.length ?? 0) - (porMarca.get(a.id)?.length ?? 0))
      .slice(0, MAX_MARCAS)
      .forEach((m) => { const b = marcaBanner(m.id); if (b) auto.push(b); });
  }

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
