'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import { carritoAgregado, productoOculto, productoVisible } from '@/lib/analytics';
import { flyToCart } from '@/lib/flyToCart';
import type { ItemCatalogo, Variante } from '@/lib/types';

export type GrupoTamano = { clave: string; etiqueta: string; formas: Variante[] };

/**
 * LA LÓGICA DE COMPRA DE UN PRODUCTO, UNA SOLA VEZ (4/10/2026). La tarjeta con
 * foto y la vista de lista sin foto muestran lo mismo de distinta forma: el
 * tamaño y la forma del granel, el precio de la opción elegida, el tope de
 * stock, el empujón a la caja y el alta al carrito viven acá, y cada vista
 * solo dibuja. Un arreglo en la regla llega a las dos.
 *
 * `T` es el elemento raíz de la vista (div de la tarjeta, li de la lista):
 * se le cuelga la telemetría de «cuánto tiempo estuvo a la vista».
 */
export function useCompraProducto<T extends HTMLElement = HTMLDivElement>(producto: ItemCatalogo) {
  const { agregar, enCarrito, disponibleDe } = useCart();
  const [cantidad, setCantidad] = useState(1);
  /*
   * EL GRANEL SE ELIGE POR TAMAÑO (3/10/2026): paquetes y bolsa cerrada, cada
   * uno con su precio, mínimo y stock. Arranca en la primera opción con stock.
   * Un entero no tiene opciones y la vista queda como siempre.
   */
  const variantes = producto.variantes ?? null;
  const [clave, setClave] = useState(() => (variantes ? (variantes.find((v) => v.enStock) ?? variantes[0]).clave : ''));
  const variante = variantes ? (variantes.find((v) => v.clave === clave) ?? variantes[0]) : null;
  const elegir = (c: string, cant = 1) => { setClave(c); setCantidad(cant); };
  /*
   * DOS PASOS (3/10/2026): primero el TAMAÑO (1 kg, Bolsa de 10 kg) y, si ese
   * tamaño se vende de más de una forma —suelto en una lista mayorista, en
   * caja de 5 en otra—, CÓMO lo lleva, con lo que sale cada paquete y el ahorro.
   */
  const grupoDe = (v: Variante) => v.grupo ?? v.clave;
  const grupos: GrupoTamano[] = [];
  for (const v of variantes ?? []) {
    const g = grupos.find((x) => x.clave === grupoDe(v));
    if (g) g.formas.push(v);
    else grupos.push({ clave: grupoDe(v), etiqueta: v.grupoEtiqueta ?? v.etiqueta, formas: [v] });
  }
  const grupo = variante ? grupos.find((g) => g.clave === grupoDe(variante)) ?? null : null;
  const elegirGrupo = (g: GrupoTamano) => {
    if (g.clave === grupo?.clave) return;
    elegir((g.formas.find((v) => v.enStock) ?? g.formas[0]).clave);
  };
  const precioDe = (v: Variante) => v.oferta?.precioOferta ?? v.precio;
  const [agregado, setAgregado] = useState(false);
  const raizRef = useRef<T>(null);

  /* Telemetría de interés: cuenta los segundos con el producto REALMENTE en
     pantalla (≥50% visible). Es la métrica "en qué se quedan mirando". */
  useEffect(() => {
    const el = raizRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const id = producto.id;
    const obs = new IntersectionObserver(
      ([entrada]) => (entrada.isIntersecting ? productoVisible(id) : productoOculto(id)),
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => { productoOculto(id); obs.disconnect(); };
  }, [producto.id]);

  /* Precio, oferta, unidad y stock: los de la opción elegida (granel) o los del producto. */
  const fuente = variante ?? producto;
  const unidad: 'kg' | 'u' = variante ? 'u' : producto.unidad;
  const paso = unidad === 'kg' ? 0.5 : 1;
  const precioEfectivo = fuente.oferta?.precioOferta ?? fuente.precio;
  const tieneDescuento = fuente.oferta?.precioOferta != null;
  const enStock = fuente.enStock;

  /*
   * Lo que ya está en el carrito y cuánto más entra. El tope sale del carrito
   * (que lo resuelve contra el catálogo vivo) y no de la prop: así la vista
   * dice lo mismo que va a pasar cuando se apriete Agregar.
   */
  const yaEnCarrito = enCarrito(producto.id, variante?.clave);
  const disponible = disponibleDe(producto.id, variante?.clave);
  const conTope = Number.isFinite(disponible);
  const puedoSumar = conTope ? Math.max(0, Math.round((disponible - yaEnCarrito) * 1000) / 1000) : Infinity;
  const sinMargen = puedoSumar <= 0;
  /** Se pidió más de lo que entra: el botón agrega lo que queda, no lo elegido. */
  const recortado = conTope && !sinMargen && cantidad > puedoSumar;

  /*
   * EL EMPUJÓN: eligió paquetes sueltos y ya lleva tantos como trae una caja
   * del mismo tamaño que sale más barata. Se le avisa con la cuenta hecha y un
   * botón que lo pasa a cajas (las enteras que entran en lo que había elegido).
   */
  const nSuelto = variante?.paquetesPorUnidad ?? 1;
  const cajaQueConviene = variante && grupo && nSuelto === 1
    ? grupo.formas
      .filter((v) => (v.paquetesPorUnidad ?? 1) > 1 && v.enStock && (v.ahorroPct ?? 0) > 0 && cantidad >= (v.paquetesPorUnidad ?? 1))
      .sort((a, b) => (b.paquetesPorUnidad ?? 1) - (a.paquetesPorUnidad ?? 1))[0] ?? null
    : null;

  const restar = () => setCantidad((c) => Math.max(paso, c - paso));
  /** El + no pasa de lo que queda. */
  const sumar = () => setCantidad((c) => (conTope ? Math.min(c + paso, Math.max(paso, puedoSumar)) : c + paso));
  const sumarBloqueado = sinMargen || (conTope && cantidad >= puedoSumar);

  /** Agrega al carrito; `desde` es el elemento que «vuela» hasta el ícono (la foto, o el botón). */
  const agregarAlCarrito = (desde: HTMLElement | null) => {
    if (sinMargen) return;
    if (variante) agregar(producto, cantidad, variante);
    else agregar(tieneDescuento ? { ...producto, precio: precioEfectivo } : producto, cantidad);
    carritoAgregado(producto.id);
    flyToCart(desde);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1200);
  };

  return {
    cantidad, setCantidad, paso, restar, sumar, sumarBloqueado,
    variante, grupos, grupo, elegir, elegirGrupo, precioDe,
    fuente, unidad, precioEfectivo, tieneDescuento, enStock,
    yaEnCarrito, disponible, conTope, puedoSumar, sinMargen, recortado,
    cajaQueConviene, agregado, agregarAlCarrito, raizRef,
  };
}
