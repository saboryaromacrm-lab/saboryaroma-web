import type { Catalogo, Entrega } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(message: string) { super(message); this.name = 'ApiError'; }
}

async function manejar<T>(r: Response): Promise<T> {
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(data?.message || 'No se pudo conectar con la tienda.');
  return data as T;
}

/** Catálogo completo de la tienda. Sin caché: precios y stock cambian seguido. */
export async function getCatalogo(): Promise<Catalogo> {
  const r = await fetch(`${API}/tienda/catalogo`, { cache: 'no-store' });
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

export interface PedidoDto {
  entrega: Entrega;
  observaciones?: string;
  cliente: DatosCliente;
  items: { productoId: number; cantidad: number }[];
}

export async function crearPedido(dto: PedidoDto): Promise<{ ok: true; codigo: string; total: number }> {
  const r = await fetch(`${API}/tienda/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return manejar(r);
}
