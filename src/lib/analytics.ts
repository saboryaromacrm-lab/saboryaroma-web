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

type Evento = { tipo: string; ruta?: string; productoId?: number; segundos?: number };

let cola: Evento[] = [];
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
  const payload = JSON.stringify({ sesion: sesionId(), eventos: cola.splice(0, 200) });
  cola = [];
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

/** Arranca el ciclo de envío. Idempotente: el tracker lo llama una vez. */
export function iniciarAnalytics() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
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
