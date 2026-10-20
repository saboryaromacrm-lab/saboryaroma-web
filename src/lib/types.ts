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
  /** Promos de varias unidades (16/10/2026): sus números, para cobrarlas en el carrito (`lib/oferta.ts`). */
  lleva?: number;
  paga?: number;
  porcentaje?: number;
  /** Pack: lo que vale el grupo de `lleva`. */
  precioPack?: number;
  /** Promo por vencimiento (NutriRescate, 20/10/2026) y hasta cuándo vale, `AAAA-MM-DD`. */
  porVencer?: boolean;
  venceEl?: string | null;
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
  /**
   * NUTRIRESCATE (20/10/2026): alguna opción tiene una promo por vencimiento,
   * y la fecha más cercana (`AAAA-MM-DD`, null = sin fecha). Viaja aun sin
   * sesión: la sección muestra qué hay, el precio queda para quien ingresó.
   */
  porVencer?: boolean;
  venceEl?: string | null;
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
  /** Los textos de la portada minorista (17/10/2026), editables en el ERP. Opcional: una API anterior no lo manda. */
  minorista?: PortadaMinorista;
  /** Lo que ven Google y quien recibe el link (20/10/2026). Opcional: una API anterior no lo manda. */
  seo?: SeoSitio;
  /** Los locales con su horario (20/10/2026); vacío = el pie no muestra locales. */
  locales?: LocalSitio[];
  /** Quiénes somos y las preguntas frecuentes (20/10/2026): /nosotros y /llms.txt. */
  nosotros?: { texto: string; faq: { pregunta: string; respuesta: string }[] };
}

/** El título y la descripción del sitio en Google y en WhatsApp, y la imagen para compartir ('' = sin imagen). */
export interface SeoSitio { titulo: string; descripcion: string; imagenUrl: string }

/** Un local: el horario de cada día es «08:00-13:00, 17:00-21:00» ('' = cerrado). */
export interface LocalSitio {
  nombre: string; direccion: string; localidad: string; telefono: string;
  lun: string; mar: string; mie: string; jue: string; vie: string; sab: string; dom: string;
}

/** Un botón de la portada: texto y ruta interna del sitio. */
export interface BotonSitio { texto: string; url: string; }

/** Lo configurable de la portada minorista; lo demás sale del catálogo. */
export interface PortadaMinorista {
  /** Los avisos que rotan en la barra de arriba. */
  avisos: string[];
  hero: { eyebrow: string; titulo: string; texto: string; cta1: BotonSitio; cta2: BotonSitio };
  /** Los sellos del hero («Sin TACC», «100 % natural»…). */
  sellos: string[];
  beneficios: { titulo: string; items: { icono: string; titulo: string; texto: string }[] };
  /** El cierre: título, texto y el botón de WhatsApp. */
  cierre: { titulo: string; texto: string; cta: string };
  /** El cartel de envío gratis por barrio (0185); ausente en una API anterior. */
  enviosGratis?: EnvioGratis[];
}

/** Una línea del cartel: a qué barrios, cuándo («Hoy», «Siempre», «Los martes») y desde qué compra (0 = sin mínimo). */
export interface EnvioGratis { barrios: string[]; cuando: string; hoy: boolean; minimo: number }

export interface PopupSitio {
  /** Si aparece solo al entrar. El botón «Info de compra» lo abre igual. */
  activo: boolean;
  /** '' = sin etiqueta. */
  etiqueta: string;
  titulo: string;
  /** '' = sin párrafo. */
  texto: string;
}

/** Quien ingresó (0155): lo que el checkout muestra ya completo. */
export interface ClienteSesion {
  nombre: string;
  dni: string;
  /** 10 dígitos (área + abonado). */
  whatsapp: string;
  direccion: string;
  localidad: string;
}

/** El comprador minorista (0173): lo guardado en su último pedido, para no escribirlo de nuevo. */
/**
 * El comprador minorista que ingresó con su WhatsApp (0178). La dirección viene
 * A MEDIAS (`Av. 25 de…`): con un WhatsApp ajeno no se ven los datos de nadie.
 */
export interface CompradorSesion {
  nombre: string;
  /** La inicial del apellido. */
  inicial: string;
  /** 10 dígitos (área + abonado). */
  telefono: string;
  /** La guardada, a medias; '' si no tiene. */
  direccion: string;
}

export interface Catalogo {
  /** En qué modo vino el catálogo (0173). Ausente = API anterior (mayorista). */
  modo?: 'mayorista' | 'minorista';
  /** El modo minorista está encendido en el ERP: la tienda ofrece elegir modo. Ausente = no. */
  minoristaActiva?: boolean;
  /** Minorista: envío a domicilio gratis desde este monto (0 = se coordina). */
  envioGratisDesde?: number;
  /** Minorista (0185): la clave de Google Maps del navegador; vacía o ausente = el checkout sin mapa. */
  mapsKey?: string;
  /** Se está viendo una tienda en preparación con el link de vista previa (20/10/2026): lo que se compre es de prueba. */
  vistaPrevia?: boolean;
  /** La compra mínima mayorista, en los dos modos (para el cartel de elegir modo). Ausente = API anterior. */
  minimoMayorista?: number;
  /**
   * PRECIOS SOLO PARA LOS HABILITADOS (0155, 10/10/2026). `false`: el visitante
   * no ingresó y la API mandó el catálogo SIN NADA DE PLATA — los precios,
   * ofertas y ahorros de productos y opciones NO VIENEN (aunque el tipo los
   * declare) y el piso del envío sin costo viene en 0 (la compra mínima sí viene:
   * el cartel de bienvenida la anuncia a todos). Ausente = API anterior (con precios).
   */
  conPrecios?: boolean;
  /** Con sesión, sus datos; sin ella, null. */
  cliente?: ClienteSesion | null;
  /** Quién ingresó a la minorista (0178), o ausente. */
  comprador?: CompradorSesion | null;
  /** Sin ingreso el piso del envío sin costo viene en 0: esto dice SI hay uno (para el cartel de condiciones). */
  hayMinimoEnvio?: boolean;
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
  /** Una promo de varias unidades (3×2, 2ª unidad, pack): el renglón se cobra con ella (`totalLinea`). */
  oferta?: OfertaItem;
  /** Cuántas unidades cuenta la promo por cada una de compra (una caja x6 son 6). */
  unidadesOferta?: number;
}

export type Entrega = 'retiro' | 'cadete' | 'camioneta';
/** Minorista (0173): retiro en el local o envío a domicilio. */
export type EntregaMinorista = 'retiro' | 'envio';

/** Un punto del mapa (0185). */
export interface Punto { lat: number; lng: number }

/**
 * Lo que sale recibir en casa (0185), según el barrio del punto marcado. Lo
 * calcula el servidor con la misma cuenta del pedido: lo que se ve es lo que se cobra.
 */
export interface CotizacionEnvio {
  /** Hay punto (marcado o el de la dirección guardada): sin él no hay barrio. */
  conPunto: boolean;
  barrio: string | null;
  /** 0 = gratis; null = se coordina por WhatsApp. */
  envio: number | null;
  /** % del barrio sobre los productos sin oferta, y cuánto es en pesos. */
  descuentoPct: number;
  descuento: number;
  /** Las promos del barrio que se están usando, en palabras. */
  promos: string[];
  /** La promo de hoy que se alcanza comprando un poco más. */
  proxima: { texto: string; faltan: number } | null;
  subtotal: number;
  /** Productos − descuento + envío. */
  total: number;
}
