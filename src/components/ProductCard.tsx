'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import { imgSrc } from '@/lib/api';
import { carritoAgregado, productoOculto, productoVisible } from '@/lib/analytics';
import { flyToCart } from '@/lib/flyToCart';
import { money, cant } from '@/lib/format';
import type { ItemCatalogo } from '@/lib/types';
import styles from './ProductCard.module.css';

/** Mismos colores que el tema original para cada tag de dieta. */
const COLORES_TAG: Record<string, { bg: string; text: string }> = {
  'SIN TACC': { bg: '#dcfce7', text: '#166534' },
  'SIN AZUCAR': { bg: '#dbeafe', text: '#1e40af' },
  'SIN AZÚCAR': { bg: '#dbeafe', text: '#1e40af' },
  'SIN LACTOSA': { bg: '#fef3c7', text: '#92400e' },
  VEGANO: { bg: '#d1fae5', text: '#065f46' },
  KETO: { bg: '#ede9fe', text: '#5b21b6' },
  'SIN GLUTEN': { bg: '#fce7f3', text: '#9d174d' },
  ORGANICO: { bg: '#ecfccb', text: '#3f6212' },
  'ORGÁNICO': { bg: '#ecfccb', text: '#3f6212' },
  'SIN SAL': { bg: '#e0e7ff', text: '#3730a3' },
};

export function ProductCard({ producto }: { producto: ItemCatalogo }) {
  const { agregar, enCarrito, disponibleDe } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* Telemetría de interés: cuenta los segundos con la tarjeta REALMENTE en
     pantalla (≥50% visible). Es la métrica "en qué se quedan mirando". */
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const id = producto.id;
    const obs = new IntersectionObserver(
      ([entrada]) => (entrada.isIntersecting ? productoVisible(id) : productoOculto(id)),
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => { productoOculto(id); obs.disconnect(); };
  }, [producto.id]);

  const paso = producto.unidad === 'kg' ? 0.5 : 1;
  const precioEfectivo = producto.oferta?.precioOferta ?? producto.precio;
  const tieneDescuento = producto.oferta?.precioOferta != null;

  /*
   * Lo que ya está en el carrito y cuánto más entra. El tope sale del carrito
   * (que lo resuelve contra el catálogo vivo) y no de la prop: así la tarjeta
   * dice lo mismo que va a pasar cuando se apriete Agregar.
   */
  const yaEnCarrito = enCarrito(producto.id);
  const disponible = disponibleDe(producto.id);
  const conTope = Number.isFinite(disponible);
  const puedoSumar = conTope ? Math.max(0, Math.round((disponible - yaEnCarrito) * 1000) / 1000) : Infinity;
  const sinMargen = puedoSumar <= 0;
  /** Se pidió más de lo que entra: el botón agrega lo que queda, no lo elegido. */
  const recortado = conTope && !sinMargen && cantidad > puedoSumar;

  const click = () => {
    if (sinMargen) return;
    agregar(tieneDescuento ? { ...producto, precio: precioEfectivo } : producto, cantidad);
    carritoAgregado(producto.id);
    flyToCart(imgRef.current);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1200);
  };

  const tagsAMostrar = producto.etiquetas.slice(0, 2);

  return (
    <div ref={cardRef} className={styles.card}>
      <div className={styles.imageWrap}>
        <img
          ref={imgRef}
          src={imgSrc(producto.imagenUrl) || '/placeholder-producto.svg'}
          alt={producto.nombre}
          className={styles.image}
          loading="lazy"
        />
        {producto.oferta && <span className={styles.ofertaBadge}>{producto.oferta.badge}</span>}
        {!producto.oferta && producto.reingreso && <span className={styles.reingresoBadge}>¡Volvió!</span>}
        {/* Lo que ya está en el carrito, sobre la foto: se ve de un pantallazo
            recorriendo la tienda, sin abrir el carrito para acordarse. */}
        {yaEnCarrito > 0 && (
          <span className={styles.enCarritoBadge}>
            🛒 {cant(yaEnCarrito, producto.unidad)} en el carrito
          </span>
        )}
        {tagsAMostrar.length > 0 && (
          <div className={styles.tags}>
            {tagsAMostrar.map((t) => {
              const c = COLORES_TAG[t.nombre.toUpperCase()] ?? { bg: '#f3f4f6', text: '#374151' };
              return (
                <span key={t.id} className={styles.tag} style={{ background: c.bg, color: c.text }}>
                  {t.nombre.toUpperCase()}
                </span>
              );
            })}
            {producto.etiquetas.length > 2 && <span className={styles.tagMore}>+{producto.etiquetas.length - 2}</span>}
          </div>
        )}
      </div>

      <div className={styles.content}>
        {producto.marca && <span className={styles.brand}>{producto.marca}</span>}
        <h3 className={styles.name}>{producto.nombre}</h3>
        <div className={styles.price}>
          {tieneDescuento && <span className={styles.priceOld}>{money(producto.precio)}</span>}
          {money(precioEfectivo)}{producto.unidad === 'kg' && <span className={styles.perKg}> /kg</span>}
        </div>

        {producto.enStock ? (
          <div className={styles.actions}>
            <div className={styles.qty}>
              <button type="button" onClick={() => setCantidad((c) => Math.max(paso, c - paso))} aria-label="Restar">−</button>
              <span key={cantidad} className={styles.qtyValue}>{cantidad}</span>
              {/* El + no pasa de lo que queda: el aviso de abajo explica por qué. */}
              <button
                type="button"
                onClick={() => setCantidad((c) => (conTope ? Math.min(c + paso, Math.max(paso, puedoSumar)) : c + paso))}
                disabled={sinMargen || (conTope && cantidad >= puedoSumar)}
                aria-label="Sumar"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className={styles.addBtn}
              onClick={click}
              data-added={agregado}
              disabled={sinMargen}
            >
              {agregado ? 'Agregado ✓' : sinMargen ? 'Sin más stock' : 'Agregar'}
            </button>
            {/*
              El aviso del tope. Tres situaciones distintas y cada una dice qué
              hacer, en vez de un "no se puede" a secas:
                · ya está todo en el carrito,
                · pedís más de lo que queda,
                · estás justo en el último.
            */}
            {sinMargen && (
              <span className={styles.stockAviso}>
                Ya tenés todo el stock disponible en el carrito ({cant(disponible, producto.unidad)}).
              </span>
            )}
            {recortado && (
              <span className={styles.stockAviso}>
                Solo {puedoSumar === 1 && producto.unidad === 'u' ? 'queda' : 'quedan'}{' '}
                {cant(puedoSumar, producto.unidad)}
                {yaEnCarrito > 0 ? ` (ya tenés ${cant(yaEnCarrito, producto.unidad)})` : ''}.
              </span>
            )}
            {!sinMargen && !recortado && conTope && cantidad >= puedoSumar && (
              <span className={styles.stockAvisoSuave}>
                Es todo lo que hay disponible.
              </span>
            )}
          </div>
        ) : (
          <span className={styles.disabled}>Sin stock</span>
        )}
      </div>
    </div>
  );
}
