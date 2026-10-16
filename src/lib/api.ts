import type { Catalogo, Comprador, Entrega, EntregaMinorista } from './types';
import type { Modo } from './modo';

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

/** La cookie con el token del aparato que ingresó (0155). La leen el navegador (sesion.ts) y el servidor de Next. */
export const COOKIE_SESION = 'sa_sesion';
/** La cabecera con que viaja el token a la API. */
const SESION = 'X-Tienda-Sesion';
const conSesion = (token?: string): Record<string, string> => (token ? { [SESION]: token } : {});

/**
 * Catálogo completo de la tienda, en su modo (0173). Sin caché de este lado:
 * la API ya lo guarda unos segundos para todos. Minorista: siempre con
 * precios. Mayorista: con el token de un cliente habilitado viene con precios
 * y sus datos; sin él, sin nada de plata (`conPrecios: false`).
 */
export async function getCatalogo(token?: string, modo: Modo = 'mayorista'): Promise<Catalogo> {
  const r = await pedir(
    `${API}/tienda/catalogo${modo === 'minorista' ? '?modo=minorista' : ''}`,
    { cache: 'no-store', headers: conSesion(token) },
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
  /** Quién compra lo sabe la API por la sesión; acá solo el WhatsApp de ESTE pedido, si lo cambió. */
  cliente: { telefono: string };
  direccion?: DireccionEntrega;
  /** `variante`: la opción de un granel (bolsa o paquete), 3/10/2026. */
  items: { productoId: number; cantidad: number; variante?: string }[];
}

/** Lo que contesta la API al ingresar o pedir ingreso (0155). */
export type EstadoIngreso =
  | { estado: 'habilitado'; token: string; nombre: string }
  | { estado: 'pendiente' | 'bloqueado' | 'sin_registro' };

export interface DatosRegistro {
  nombre: string;
  dni: string;
  whatsapp: string;
  localidad: string;
  cuit?: string;
}

const postJson = async <T>(ruta: string, body: unknown, token?: string): Promise<T> => manejar<T>(await pedir(
  `${API}${ruta}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json', ...conSesion(token) }, body: JSON.stringify(body ?? {}) },
  TIMEOUT_CATALOGO_MS,
  'No se pudo conectar con la tienda. Probá de nuevo en un momento.',
));

/** Entrar con el DNI. */
export const ingresar = (dni: string) => postJson<EstadoIngreso>('/tienda/ingresar', { dni });
/** Pedir ingreso a la tienda mayorista. */
export const registrarse = (datos: DatosRegistro) => postJson<EstadoIngreso>('/tienda/registro', datos);
/** Cerrar la sesión de este aparato (si falla, igual se borra la cookie: queda vencida sola). */
export const salir = (token: string) => postJson<{ ok: boolean }>('/tienda/salir', {}, token).catch(() => null);

/* ----------------------------- modo minorista (0173) ----------------------------- */

/** Los datos guardados de un comprador minorista por su WhatsApp (null si nunca compró). */
export const buscarComprador = (telefono: string) => postJson<{ comprador: Comprador | null }>('/tienda/minorista/comprador', { telefono });

export interface PedidoMinoristaDto {
  telefono: string;
  nombre: string;
  apellido: string;
  entrega: EntregaMinorista;
  direccion?: DireccionEntrega;
  observaciones?: string;
  items: { productoId: number; cantidad: number; variante?: string }[];
}

export async function crearPedidoMinorista(dto: PedidoMinoristaDto): Promise<{ ok: true; codigo: string; total: number }> {
  const r = await pedir(
    `${API}/tienda/minorista/pedidos`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) },
    TIMEOUT_PEDIDO_MS,
    'No recibimos respuesta de la tienda. Esperá un momento antes de volver a intentar; si el problema sigue, escribinos por WhatsApp.',
  );
  return manejar(r);
}

export async function crearPedido(dto: PedidoDto, token: string): Promise<{ ok: true; codigo: string; total: number }> {
  const r = await pedir(
    `${API}/tienda/pedidos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...conSesion(token) },
      body: JSON.stringify(dto),
    },
    TIMEOUT_PEDIDO_MS,
    // Decirle "reintentá" a secas puede duplicar el pedido: el servidor pudo
    // haberlo tomado y ser la respuesta lo que se perdió.
    'No recibimos respuesta de la tienda. Esperá un momento antes de volver a intentar; si el problema sigue, escribinos por WhatsApp.',
  );
  return manejar(r);
}
