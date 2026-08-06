/** Tipos del catálogo público (espejo de lo que devuelve GET /tienda/catalogo). */

export interface Termino {
  id: number;
  nombre: string;
  count: number;
  /** Imagen subida en el módulo Web (ruta relativa a la API; '' = sin imagen). */
  imagenUrl?: string;
}

export interface OfertaItem {
  id: number;
  nombre: string;
  tipo: 'porcentaje' | 'precio_fijo' | 'nxm' | 'segunda_unidad' | 'pack';
  /** Texto del cartel, ej. "15% OFF", "3×2". */
  badge: string;
  /** Precio final con la promo, cuando la mecánica define un único precio por unidad (null en 3x2/pack/2ª unidad). */
  precioOferta: number | null;
}

export interface ItemCatalogo {
  id: number;
  nombre: string;
  marcaId: number | null;
  marca: string;
  categoriaId: number | null;
  categoria: string;
  etiquetas: { id: number; nombre: string }[];
  tipo: 'granel' | 'entero';
  unidad: 'kg' | 'u';
  iva: number;
  precio: number;
  /** Mínimo de compra propio del producto (0 = sin mínimo). */
  unidadesMinimas: number;
  enStock: boolean;
  imagenUrl: string;
  /** Marcado en el módulo Web: arma el carrusel "Destacados" de la portada. */
  destacado: boolean;
  oferta: OfertaItem | null;
  /** Tuvo un ingreso de stock (compra) en los últimos 14 días. */
  reingreso: boolean;
}

export interface ReglaMarca {
  marcaId: number;
  marca: string;
  unidadesMinimas: number;
}

/** Un slide de la portada, definido desde el módulo Web del CRM (alta/baja/edición). */
export interface SlideSitio {
  id: number;
  badge: string;
  titulo: string;
  texto: string;
  cta: string;
  ctaUrl: string;
  posicion: 'left' | 'center' | 'right' | string;
  /** Imagen subida para ESTE slide ('' = ilustración por defecto del sitio). */
  bannerUrl: string;
}

/** Contacto y redes del sitio, editables desde Web › Configuración del sitio. */
export interface ContactoSitio {
  /** Número argentino de 10 dígitos (área + abonado): arma los links de WhatsApp. */
  whatsapp: string;
  telefono: string;
  email: string;
  ubicacion: string;
  instagram: string;
  facebook: string;
}

/** Contenido editable del sitio (módulo Web del CRM). */
export interface SitioConfig {
  slides: SlideSitio[];
  /** Logo del encabezado ('' = se muestra el nombre en texto). */
  logoUrl: string;
  /** Ícono de la pestaña del navegador ('' = el de siempre). */
  faviconUrl: string;
  contacto: ContactoSitio;
}

export interface Catalogo {
  sucursalId: number | null;
  listaId: number | null;
  listaNombre: string;
  /** 0 = sin mínimo por monto configurado. */
  montoMinimo: number;
  /** Piso EXTRA del pedido si la entrega es con la camioneta de la empresa (0 = sin piso). */
  montoMinimoCamioneta: number;
  presupuestoValidezDias: number;
  categorias: Termino[];
  marcas: Termino[];
  etiquetas: Termino[];
  reglasMarca: ReglaMarca[];
  items: ItemCatalogo[];
  sitio: SitioConfig;
}

export interface ItemCarrito {
  productoId: number;
  nombre: string;
  marcaId: number | null;
  marca: string;
  precio: number;
  unidad: 'kg' | 'u';
  unidadesMinimas: number;
  cantidad: number;
}

export type Entrega = 'retiro' | 'cadete' | 'camioneta';
