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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [config, setConfig] = useState<Config>({ montoMinimo: 0, montoMinimoCamioneta: 0, reglasMarca: [], presupuestoValidezDias: 7 });
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setItems(leerCarrito());
    setCargado(true);
    getCatalogo()
      .then((c) => {
        setConfig({
          montoMinimo: c.montoMinimo, montoMinimoCamioneta: c.montoMinimoCamioneta,
          reglasMarca: c.reglasMarca, presupuestoValidezDias: c.presupuestoValidezDias,
        });
        setCatalogo(c);
      })
      .catch(() => { /* el carrito funciona igual sin esto; el checkout revalida */ });
  }, []);

  useEffect(() => {
    if (!cargado) return; // no pisar localStorage con el [] inicial antes de leerlo
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* modo privado */ }
  }, [items, cargado]);

  const agregar = useCallback((producto: ItemCatalogo, cantidad = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.productoId === producto.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], cantidad: next[i].cantidad + cantidad };
        return next;
      }
      return [...prev, {
        productoId: producto.id, nombre: producto.nombre, marcaId: producto.marcaId, marca: producto.marca,
        precio: producto.precio, unidad: producto.unidad, unidadesMinimas: producto.unidadesMinimas, cantidad,
      }];
    });
  }, []);

  const quitar = useCallback((productoId: number) => {
    setItems((prev) => prev.filter((x) => x.productoId !== productoId));
  }, []);

  const setCantidad = useCallback((productoId: number, cantidad: number) => {
    setItems((prev) => (cantidad <= 0
      ? prev.filter((x) => x.productoId !== productoId)
      : prev.map((x) => (x.productoId === productoId ? { ...x, cantidad } : x))));
  }, []);

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
    items, cantidadTotal, total, agregar, quitar, setCantidad, vaciar, config, catalogo, gate,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
