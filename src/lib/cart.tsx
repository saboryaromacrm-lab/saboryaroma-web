'use client';

/**
 * CARRITO — vive en el navegador (sin cuentas de cliente).
 * ============================================================================
 * Cada línea guarda una FOTO del producto al agregarlo (nombre, marca,
 * precio, mínimo propio): si el catálogo cambia después, el carrito sigue
 * mostrando lo que el cliente vio, y el precio se vuelve a confirmar recién
 * en el servidor al enviar el pedido (nunca se confía en lo que viajó acá).
 *
 * El MÍNIMO DE COMPRA no cambia el precio: habilita el checkout. Se cumple
 * con CUALQUIERA de los dos caminos, igual que el sitio real:
 *   1. Monto total del carrito ≥ montoMinimo.
 *   2. Cada marca/producto con mínimo propio lo cumple en el carrito.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { getCatalogo } from './api';
import type { Catalogo, ItemCarrito, ItemCatalogo, ReglaMarca } from './types';

const CART_KEY = 'sa_carrito';

interface Config {
  montoMinimo: number;
  /** Piso extra si la entrega elegida es la camioneta de la empresa. */
  montoMinimoCamioneta: number;
  reglasMarca: ReglaMarca[];
  presupuestoValidezDias: number;
}

interface CartContextValue {
  items: ItemCarrito[];
  cantidadTotal: number;
  total: number;
  agregar: (producto: ItemCatalogo, cantidad?: number) => void;
  quitar: (productoId: number) => void;
  setCantidad: (productoId: number, cantidad: number) => void;
  vaciar: () => void;
  /** Cuánto hay de este producto en el carrito ahora mismo (0 = ninguno). */
  enCarrito: (productoId: number) => number;
  /**
   * El tope que el sitio puede vender de este producto, según el catálogo que
   * está cargado. `Infinity` cuando todavía no llegó: nunca frenar una compra
   * por no tener el dato — el pedido se revisa igual antes de aceptarse.
   */
  disponibleDe: (productoId: number) => number;
  config: Config;
  /** Catálogo completo, cargado una vez del lado del cliente: lo reusan el mega-menú y la búsqueda en vivo. */
  catalogo: Catalogo | null;
  /** Progreso hacia el mínimo de compra: si se cumple, y qué falta. */
  gate: {
    habilitado: boolean;
    montoOk: boolean;
    faltaMonto: number;
    marcas: { marca: string; enCarrito: number; falta: number; ok: boolean }[];
    productos: { nombre: string; enCarrito: number; falta: number; ok: boolean }[];
  };
}

const CartContext = createContext<CartContextValue | null>(null);

function leerCarrito(): ItemCarrito[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function configDeCatalogo(c: Catalogo | null): Config {
  return c
    ? {
      montoMinimo: c.montoMinimo, montoMinimoCamioneta: c.montoMinimoCamioneta,
      reglasMarca: c.reglasMarca, presupuestoValidezDias: c.presupuestoValidezDias,
    }
    : { montoMinimo: 0, montoMinimoCamioneta: 0, reglasMarca: [], presupuestoValidezDias: 7 };
}

/**
 * `initialCatalogo`: lo trae el layout del servidor (un solo pedido, ya
 * hecho para el HTML) para que el carrito no tenga que volver a pedirlo
 * desde el navegador — evita el fetch duplicado y el parpadeo de mega-menú
 * y buscador vacíos mientras carga. Si no llegó (falló en el servidor), se
 * pide igual del lado del cliente como respaldo.
 */
export function CartProvider({ children, initialCatalogo = null }: {
  children: React.ReactNode;
  initialCatalogo?: Catalogo | null;
}) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [config, setConfig] = useState<Config>(() => configDeCatalogo(initialCatalogo));
  const [catalogo, setCatalogo] = useState<Catalogo | null>(initialCatalogo);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setItems(leerCarrito());
    setCargado(true);
    if (initialCatalogo) return;
    getCatalogo()
      .then((c) => { setConfig(configDeCatalogo(c)); setCatalogo(c); })
      .catch(() => { /* el carrito funciona igual sin esto; el checkout revalida */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cargado) return; // no pisar localStorage con el [] inicial antes de leerlo
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* modo privado */ }
  }, [items, cargado]);

  /**
   * EL TOPE, EN UN SOLO LUGAR.
   *
   * Vive acá y no en la tarjeta porque la cantidad se toca desde tres lados
   * (tarjeta, carrito y mini-carrito): con el tope repartido, el que se
   * olvidara de aplicarlo dejaba pedir 50 kg de algo que tiene 3. El catálogo
   * ya está en memoria, así que es una búsqueda, no un viaje a la red.
   *
   * Si el catálogo todavía no llegó, el tope es infinito: es mejor dejar
   * comprar que frenar la venta por un dato que no está (y el pedido web lo
   * revisa una persona antes de aceptarlo).
   */
  const disponibleDe = useCallback((productoId: number) => {
    const it = catalogo?.items.find((x) => x.id === productoId);
    return it ? it.disponible : Infinity;
  }, [catalogo]);

  const enCarrito = useCallback(
    (productoId: number) => items.find((x) => x.productoId === productoId)?.cantidad ?? 0,
    [items],
  );

  /** Redondeo a 3 decimales: el granel va en kilos y 0.1+0.2 no da 0.3. */
  const r3 = (n: number) => Math.round(n * 1000) / 1000;

  const agregar = useCallback((producto: ItemCatalogo, cantidad = 1) => {
    setItems((prev) => {
      const tope = disponibleDe(producto.id);
      const i = prev.findIndex((x) => x.productoId === producto.id);
      const yaHay = i >= 0 ? prev[i].cantidad : 0;
      const nueva = Math.min(r3(yaHay + cantidad), tope);
      // Ya estaba en el tope: no hay nada que sumar (la pantalla lo explica).
      if (nueva <= yaHay) return prev;
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], cantidad: nueva };
        return next;
      }
      return [...prev, {
        productoId: producto.id, nombre: producto.nombre, marcaId: producto.marcaId, marca: producto.marca,
        precio: producto.precio, unidad: producto.unidad, unidadesMinimas: producto.unidadesMinimas,
        cantidad: nueva,
      }];
    });
  }, [disponibleDe]);

  const quitar = useCallback((productoId: number) => {
    setItems((prev) => prev.filter((x) => x.productoId !== productoId));
  }, []);

  const setCantidad = useCallback((productoId: number, cantidad: number) => {
    setItems((prev) => {
      if (cantidad <= 0) return prev.filter((x) => x.productoId !== productoId);
      const tope = disponibleDe(productoId);
      /* Se topea SUBIENDO, nunca bajando: si el carrito quedó guardado con más
       * de lo que hay hoy, se avisa en pantalla y el cliente lo corrige — no se
       * le toca el carrito por atrás. */
      return prev.map((x) => {
        if (x.productoId !== productoId) return x;
        const sube = cantidad > x.cantidad;
        return { ...x, cantidad: sube ? Math.min(r3(cantidad), Math.max(tope, x.cantidad)) : r3(cantidad) };
      });
    });
  }, [disponibleDe]);

  const vaciar = useCallback(() => setItems([]), []);

  const cantidadTotal = useMemo(() => items.reduce((a, i) => a + i.cantidad, 0), [items]);
  const total = useMemo(() => items.reduce((a, i) => a + i.cantidad * i.precio, 0), [items]);

  const gate = useMemo(() => {
    const montoOk = config.montoMinimo > 0 ? total >= config.montoMinimo : true;

    const porMarca = new Map<number, number>();
    for (const it of items) {
      if (!it.marcaId) continue;
      porMarca.set(it.marcaId, (porMarca.get(it.marcaId) ?? 0) + it.cantidad);
    }
    const marcas = config.reglasMarca
      .filter((rm) => porMarca.has(rm.marcaId))
      .map((rm) => {
        const enCarrito = porMarca.get(rm.marcaId) ?? 0;
        return { marca: rm.marca, enCarrito, falta: Math.max(0, rm.unidadesMinimas - enCarrito), ok: enCarrito >= rm.unidadesMinimas };
      });
    const productos = items
      .filter((it) => it.unidadesMinimas > 0)
      .map((it) => ({ nombre: it.nombre, enCarrito: it.cantidad, falta: Math.max(0, it.unidadesMinimas - it.cantidad), ok: it.cantidad >= it.unidadesMinimas }));

    const cantidadOk = marcas.every((m) => m.ok) && productos.every((p) => p.ok);
    return {
      habilitado: items.length > 0 && (montoOk || cantidadOk),
      montoOk,
      faltaMonto: Math.max(0, config.montoMinimo - total),
      marcas,
      productos,
    };
  }, [items, total, config]);

  const value: CartContextValue = {
    items, cantidadTotal, total, agregar, quitar, setCantidad, vaciar,
    enCarrito, disponibleDe, config, catalogo, gate,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
