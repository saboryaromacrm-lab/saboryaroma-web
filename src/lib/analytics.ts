/**
 * TELEMETRÍA ANÓNIMA del sitio — qué se mira y cuánto tiempo.
 * ============================================================================
 * Sin Google Analytics ni cookies de terceros: los eventos van a la MISMA API
 * del CRM y se leen en Web › Estadísticas. La sesión es un UUID que vive en
 * sessionStorage — sin nombre, sin IP guardada, muere al cerrar la pestaña.
 *
 * Qué se mide:
 *  - `vista_pagina`: cada cambio de ruta.
 *  - `vista_producto`: SEGUNDOS con la tarjeta realmente visible (≥50% en
 *    pantalla, medido con IntersectionObserver) — "en qué se quedan mirando".
 *  - `agregar_carrito`: el clic en Agregar.
 *  - `busqueda`: lo que se escribió en el buscador.
 *  - `pedido`: el pedido que se mandó (0179), para cerrar el embudo por sesión.
 *  - `llegada`: UNA vez por sesión, de dónde vino (0194): solo el DOMINIO del
 *    sitio que lo trajo (nunca la dirección completa), los `utm_*` del link y
 *    si vino de un anuncio. El canal lo decide el servidor.
 *
 * Cada lote dice en qué MODO de la tienda pasó (mayorista o minorista, 0179):
 * las métricas del ERP van separadas por modo.
 *
 * Los eventos se juntan en memoria y viajan EN LOTE: cada 15 s y al salir de
 * la página (sendBeacon, que sobrevive al cierre). Si la API no responde, se
 * descartan — la telemetría jamás rompe la compra.
 */

// `||` y no `??` por lo mismo que en `api.ts`: la cadena vacía que deja un
// argumento de build sin pasar tiene que caer al default, no ganarle.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const FLUSH_MS = 15000;
/** Menos de esto no es "mirar": es scrollear por encima. */
const MIN_SEGUNDOS = 1;

type Evento = {
  tipo: string; ruta?: string; productoId?: number; segundos?: number;
  /* Solo en `llegada` (0194). */
  referente?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; clic?: string; meta?: boolean; propio?: string; link?: string;
};

const cola: Evento[] = [];
const dwellAcumulado = new Map<number, number>(); // productoId → segundos ya juntados
const dwellActivo = new Map<number, number>();    // productoId → timestamp en que se hizo visible
let iniciado = false;

function sesionId(): string {
  try {
    let s = sessionStorage.getItem('sa_sesion');
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem('sa_sesion', s);
    }
    return s;
  } catch { return 'anonima'; }
}

/** Cierra los conteos de visibilidad abiertos y pasa lo acumulado a la cola. */
function volcarDwell() {
  const ahora = Date.now();
  for (const [id, t0] of dwellActivo) {
    dwellAcumulado.set(id, (dwellAcumulado.get(id) ?? 0) + (ahora - t0) / 1000);
    dwellActivo.set(id, ahora); // sigue visible: el reloj arranca de nuevo
  }
  for (const [productoId, segundos] of dwellAcumulado) {
    if (segundos >= MIN_SEGUNDOS) {
      cola.push({ tipo: 'vista_producto', productoId, segundos: Math.round(segundos * 10) / 10 });
    }
  }
  dwellAcumulado.clear();
}

function flush(alSalir = false) {
  volcarDwell();
  if (!cola.length) return;
  // `splice` saca del frente lo que viaja (el tope de la API son 200 por
  // request); si quedó más, espera al próximo flush. Antes había un `cola = []`
  // acá que tiraba a la basura todo lo que pasaba de 200.
  const lote = cola.splice(0, 200);
  /* El modo en que está la página (lo pone el layout en <html data-modo>). */
  const payload = JSON.stringify({ sesion: sesionId(), modo: document.documentElement.dataset.modo, eventos: lote });
  try {
    if (alSalir && navigator.sendBeacon) {
      navigator.sendBeacon(`${API}/tienda/eventos`, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(`${API}/tienda/eventos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: payload, keepalive: true,
      }).catch(() => { /* la telemetría nunca molesta */ });
    }
  } catch { /* idem */ }
}

/**
 * De dónde llegó esta sesión (0194): una sola vez (la marca vive en
 * sessionStorage, igual que la sesión). Sin sessionStorage no se manda: mejor
 * sin dato que contar la misma visita en cada página.
 */
function registrarLlegada() {
  try {
    if (sessionStorage.getItem('sa_llegada')) return;
    sessionStorage.setItem('sa_llegada', '1');
  } catch { return; }
  const q = new URLSearchParams(location.search);
  const p = (k: string) => (q.get(k) ?? '').slice(0, 60);
  let referente = '';
  try { referente = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* sin dato */ }
  cola.push({
    tipo: 'llegada', ruta: location.pathname, referente, propio: location.hostname,
    utmSource: p('utm_source'), utmMedium: p('utm_medium'), utmCampaign: p('utm_campaign'),
    clic: q.has('gclid') || q.has('gbraid') || q.has('wbraid') ? 'google' : q.has('ttclid') ? 'tiktok' : '',
    meta: q.has('fbclid'),
    /* El link medible por el que entró (0195): lo pone la redirección de /l/<código>. */
    link: p('l'),
  });
}

/** Arranca el ciclo de envío. Idempotente: el tracker lo llama una vez. */
export function iniciarAnalytics() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  registrarLlegada();
  setInterval(() => flush(false), FLUSH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
}

export function paginaVista(ruta: string) {
  cola.push({ tipo: 'vista_pagina', ruta });
}

export function carritoAgregado(productoId: number) {
  cola.push({ tipo: 'agregar_carrito', productoId });
}

/** Se mandó un pedido: viaja en el acto, no espera el lote. */
export function pedidoEnviado(codigo: string) {
  cola.push({ tipo: 'pedido', ruta: codigo });
  flush(false);
}

/** Qué se escribió en el buscador: lo que se busca y no está es catálogo faltante. */
export function busquedaHecha(termino: string) {
  const t = termino.trim().slice(0, 60);
  if (t.length >= 2) cola.push({ tipo: 'busqueda', ruta: t });
}

export function productoVisible(productoId: number) {
  if (!dwellActivo.has(productoId)) dwellActivo.set(productoId, Date.now());
}

export function productoOculto(productoId: number) {
  const t0 = dwellActivo.get(productoId);
  if (t0 == null) return;
  dwellActivo.delete(productoId);
  dwellAcumulado.set(productoId, (dwellAcumulado.get(productoId) ?? 0) + (Date.now() - t0) / 1000);
}
