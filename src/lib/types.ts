/** Tipos del catálogo público (espejo de lo que devuelve GET /tienda/catalogo). */

export interface Termino {
  id: number;
  nombre: string;
  count: number;
  /** Imagen subida en el módulo Web (ruta relativa a la API; '' = sin imagen). */
  imagenUrl?: string;
}

/** Una subcategoría con productos publicados: cuelga de su categoría en el menú y en los filtros. */
export interface Subtermino extends Termino {
  categoriaId: number | null;
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

/**
 * UNA OPCIÓN DE UN GRANEL (3/10/2026): el granel no se vende suelto, se elige
 * el tamaño. `p` = la bolsa cerrada del producto; `s<id>` = un paquete (o una
 * caja de paquetes). Precio, mínimo y stock son de LA OPCIÓN, por unidad de
 * compra (una bolsa, un paquete, una caja).
 */
export interface Variante {
  clave: string;
  presentacionId: number | null;
  /** «500 g», «Bolsa de 10 kg», «Caja de 6 × 500 g». */
  etiqueta: string;
  /**
   * El TAMAÑO al que pertenece (3/10/2026): «1 kg» suelto y «Caja de 5 × 1 kg»
   * son el mismo tamaño vendido de dos formas (pueden salir de dos listas
   * mayoristas). Sin `grupo` (API anterior), cada opción es su propio tamaño.
   */
  grupo?: string;
  /** El nombre del tamaño: «1 kg», «Bolsa de 10 kg». */
  grupoEtiqueta?: string;
  /** La forma de compra dentro del tamaño: «Por unidad», «Caja de 5». */
  forma?: string;
  /** Lo que sale cada paquete en esta forma (en la bolsa, la bolsa). */
  precioPaquete?: number;
  /** Cuánto más barato sale cada paquete que en la forma más cara del mismo tamaño (0 = nada). */
  ahorroPct?: number;
  /**
   * Lo que se ahorra frente al precio MINORISTA (el de mostrador): el kilo
   * minorista más barato del producto contra el kilo de esta opción. `pesos`
   * es por unidad de compra (una bolsa, un paquete). null = no hay con qué comparar.
   */
  ahorroMinorista?: { pct: number; precioKg: number; pesos: number } | null;
  kgPorUnidad: number;
  paquetesPorUnidad?: number;
  /** Cuántas unidades del stock lleva una unidad de compra (la caja x12 de un entero: 12). */
  unidadesStock?: number;
  precio: number;
  /** El kilo, de referencia. */
  precioKg: number;
  unidadesMinimas: number;
  enStock: boolean;
  /** Unidades de compra que puede vender el sitio; `null` = sin tope. */
  disponible: number | null;
  oferta: OfertaItem | null;
}

export interface ItemCatalogo {
  id: number;
  nombre: string;
  marcaId: number | null;
  marca: string;
  categoriaId: number | null;
  categoria: string;
  /** Solo si cuelga de la categoría del producto (si no, null). */
  subcategoriaId?: number | null;
  subcategoria?: string;
  etiquetas: { id: number; nombre: string }[];
  tipo: 'granel' | 'entero';
  unidad: 'kg' | 'u';
  iva: number;
  precio: number;
  /** Mínimo de compra propio del producto (0 = sin mínimo). */
  unidadesMinimas: number;
  enStock: boolean;
  /**
   * Cuántas unidades (o kilos) puede vender el sitio, con el piso del mostrador
   * ya descontado. Es el tope del carrito: no se muestra como "quedan pocos",
   * solo se avisa al llegar a él.
   */
  disponible: number | null;
  imagenUrl: string;
  /** Marcado en el módulo Web: arma el carrusel "Destacados" de la portada. */
  destacado: boolean;
  oferta: OfertaItem | null;
  /** Tuvo un ingreso de stock (compra) en los últimos 14 días. */
  reingreso: boolean;
  /** Solo el granel: las opciones del selector (bolsa del producto y paquetes con lista mayorista). */
  variantes?: Variante[];
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
  /** El cartel de bienvenida, editable en el ERP (3/10/2026). Opcional: una API anterior no lo manda. */
  popup?: PopupSitio;
}

export interface PopupSitio {
  /** Si aparece solo al entrar. El botón «Info de compra» lo abre igual. */
  activo: boolean;
  /** '' = sin etiqueta. */
  etiqueta: string;
  titulo: string;
  /** '' = sin párrafo. */
  texto: string;
}

export interface Catalogo {
  sucursalId: number | null;
  listaId: number | null;
  listaNombre: string;
  /** 0 = sin mínimo por monto configurado. */
  montoMinimo: number;
  /** Piso EXTRA del pedido si la entrega es el envío sin costo (0 = sin piso). */
  montoMinimoCamioneta: number;
  /** Si se ofrece el envío sin costo. Opcional: una API anterior al 4/10/2026 no lo manda (= sí). */
  envioCamionetaActivo?: boolean;
  /** Catálogo sin fotos: la tienda lista los productos (renglones) en vez de tarjetas. Opcional (= no). */
  vistaLista?: boolean;
  presupuestoValidezDias: number;
  categorias: Termino[];
  /** Opcional: una API anterior al 2/10/2026 no las manda. */
  subcategorias?: Subtermino[];
  marcas: Termino[];
  etiquetas: Termino[];
  reglasMarca: ReglaMarca[];
  items: ItemCatalogo[];
  sitio: SitioConfig;
}

export interface ItemCarrito {
  productoId: number;
  /** La opción elegida de un granel (`Variante.clave`); sin opción = un entero. */
  variante?: string;
  /** El tamaño elegido, para mostrar: «500 g», «Bolsa de 10 kg». */
  etiqueta?: string;
  nombre: string;
  marcaId: number | null;
  marca: string;
  precio: number;
  unidad: 'kg' | 'u';
  unidadesMinimas: number;
  cantidad: number;
  /** Un entero en caja: cuántas unidades trae (los mínimos por marca cuentan unidades). */
  unidadesPorCompra?: number;
}

export type Entrega = 'retiro' | 'cadete' | 'camioneta';
