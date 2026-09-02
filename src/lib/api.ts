import type { Catalogo, Entrega } from './types';

/*
 * `||` y NO `??`: una cadena VACÍA tiene que contar como "no configurada".
 * Al construir la imagen de producción el valor entra como argumento de build,
 * y un argumento declarado pero sin pasar llega como `''`, que con `??` gana.
 * El resultado sería un sitio pidiéndole la API a la raíz: la tienda carga y no
 * aparece un solo producto, sin ningún error en los logs del servidor.
 */
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/*
 * CUÁNTO SE ESPERA A LA API antes de darla por caída.
 *
 * Sin un límite, una API que acepta la conexión pero no contesta colgaba TODO
 * el sitio: el layout raíz espera el catálogo en cada request, así que ninguna
 * página terminaba de renderizar, y el botón del checkout quedaba en
 * "Enviando…" para siempre. Con el límite, el catálogo cae al mensaje de
 * "no pudimos conectar" y el pedido devuelve un error que se puede leer.
 *
 * El del pedido es más largo: del otro lado hay una transacción que recotiza
 * y valida stock, y cortarla antes de tiempo no la deshace — solo deja al
 * cliente sin saber si el pedido entró.
 */
const TIMEOUT_CATALOGO_MS = 8000;
const TIMEOUT_PEDIDO_MS = 15000;

export class ApiError extends Error {
  constructor(message: string) { super(message); this.name = 'ApiError'; }
}

/** `AbortSignal.timeout` existe en Node 18+ y en los navegadores desde 2022. */
function limite(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(ms)
    : undefined;
}

/**
 * `fetch` que convierte CUALQUIER falla (red caída, DNS, timeout) en un
 * `ApiError` con un mensaje legible, para que quien llama no tenga que
 * distinguir un `TimeoutError` de un `TypeError`.
 */
async function pedir(url: string, init: RequestInit, ms: number, sinRespuesta: string): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: limite(ms) });
  } catch {
    throw new ApiError(sinRespuesta);
  }
}

async function manejar<T>(r: Response): Promise<T> {
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    // Nest manda `message` como array cuando falla la validación del body.
    const msg = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
    throw new ApiError(msg || 'No se pudo conectar con la tienda.');
  }
  return data as T;
}

/** Catálogo completo de la tienda. Sin caché: precios y stock cambian seguido. */
export async function getCatalogo(): Promise<Catalogo> {
  const r = await pedir(
    `${API}/tienda/catalogo`,
    { cache: 'no-store' },
    TIMEOUT_CATALOGO_MS,
    'No se pudo conectar con la tienda.',
  );
  return manejar<Catalogo>(r);
}

/**
 * Src usable de una imagen del catálogo: las subidas en el módulo Web llegan
 * como ruta relativa a la API (`tienda/imagenes/...`) y hay que prefijarlas;
 * una URL externa o data-URL pasa tal cual. '' = sin imagen (el llamador
 * decide su placeholder).
 */
export function imgSrc(url: string | undefined): string {
  if (!url) return '';
  return /^https?:|^data:/.test(url) ? url : `${API}/${url}`;
}

export interface DatosCliente {
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
}

/**
 * A dónde va el pedido. Obligatoria cuando la entrega es `cadete` o
 * `camioneta`; con `retiro` no viaja. La API la valida igual.
 */
export interface DireccionEntrega {
  /** Calle y número (y piso/depto si hace falta). */
  calle: string;
  /** Barrio o localidad: la camioneta reparte en más de una. */
  localidad: string;
  /** Entre calles, color de la puerta, "tocar timbre del fondo"… */
  referencia?: string;
}

export interface PedidoDto {
  entrega: Entrega;
  observaciones?: string;
  cliente: DatosCliente;
  direccion?: DireccionEntrega;
  items: { productoId: number; cantidad: number }[];
}

export async function crearPedido(dto: PedidoDto): Promise<{ ok: true; codigo: string; total: number }> {
  const r = await pedir(
    `${API}/tienda/pedidos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
    TIMEOUT_PEDIDO_MS,
    // Decirle "reintentá" a secas puede duplicar el pedido: el servidor pudo
    // haberlo tomado y ser la respuesta lo que se perdió.
    'No recibimos respuesta de la tienda. Esperá un momento antes de volver a intentar; si el problema sigue, escribinos por WhatsApp.',
  );
  return manejar(r);
}
