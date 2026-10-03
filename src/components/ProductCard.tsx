'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import { imgSrc } from '@/lib/api';
import { carritoAgregado, productoOculto, productoVisible } from '@/lib/analytics';
import { flyToCart } from '@/lib/flyToCart';
import { money, cant } from '@/lib/format';
import type { ItemCatalogo, Variante } from '@/lib/types';
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
  /*
   * EL GRANEL SE ELIGE POR TAMAÑO (3/10/2026): paquetes y bolsa cerrada, cada
   * uno con su precio, mínimo y stock. Arranca en la primera opción con stock.
   * Un entero no tiene opciones y la tarjeta queda como siempre.
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
  const grupos: { clave: string; etiqueta: string; formas: Variante[] }[] = [];
  for (const v of variantes ?? []) {
    const g = grupos.find((x) => x.clave === grupoDe(v));
    if (g) g.formas.push(v);
    else grupos.push({ clave: grupoDe(v), etiqueta: v.grupoEtiqueta ?? v.etiqueta, formas: [v] });
  }
  const grupo = variante ? grupos.find((g) => g.clave === grupoDe(variante)) ?? null : null;
  const elegirGrupo = (g: (typeof grupos)[number]) => {
    if (g.clave === grupo?.clave) return;
    elegir((g.formas.find((v) => v.enStock) ?? g.formas[0]).clave);
  };
  const precioDe = (v: Variante) => v.oferta?.precioOferta ?? v.precio;
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

  /* Precio, oferta, unidad y stock: los de la opción elegida (granel) o los del producto. */
  const fuente = variante ?? producto;
  const unidad: 'kg' | 'u' = variante ? 'u' : producto.unidad;
  const paso = unidad === 'kg' ? 0.5 : 1;
  const precioEfectivo = fuente.oferta?.precioOferta ?? fuente.precio;
  const tieneDescuento = fuente.oferta?.precioOferta != null;
  const enStock = fuente.enStock;

  /*
   * Lo que ya está en el carrito y cuánto más entra. El tope sale del carrito
   * (que lo resuelve contra el catálogo vivo) y no de la prop: así la tarjeta
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

  const click = () => {
    if (sinMargen) return;
    if (variante) agregar(producto, cantidad, variante);
    else agregar(tieneDescuento ? { ...producto, precio: precioEfectivo } : producto, cantidad);
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
        {fuente.oferta && <span className={styles.ofertaBadge}>{fuente.oferta.badge}</span>}
        {!fuente.oferta && producto.reingreso && <span className={styles.reingresoBadge}>¡Volvió!</span>}
        {/* Lo que ya está en el carrito, sobre la foto: se ve de un pantallazo
            recorriendo la tienda, sin abrir el carrito para acordarse. */}
        {yaEnCarrito > 0 && (
          <span className={styles.enCarritoBadge}>
            🛒 {cant(yaEnCarrito, unidad)}{variante ? ` de ${variante.etiqueta}` : ''} en el carrito
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
        {/* Paso 1, el TAMAÑO: un botón por tamaño (cómodo con el dedo), el elegido marcado. */}
        {grupos.length > 1 && (
          <div className={styles.opciones} role="radiogroup" aria-label={`Tamaño de ${producto.nombre}`}>
            {grupos.map((g) => {
              const activo = g.clave === grupo?.clave;
              const hay = g.formas.some((v) => v.enStock);
              return (
                <button
                  key={g.clave}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  className={`${styles.opcion} ${activo ? styles.opcionActiva : ''} ${hay ? '' : styles.opcionSinStock}`}
                  onClick={() => elegirGrupo(g)}
                  title={hay ? undefined : 'Sin stock'}
                >
                  {g.etiqueta}
                </button>
              );
            })}
          </div>
        )}
        {grupos.length === 1 && <span className={styles.opcionUnica}>{grupos[0].etiqueta}</span>}
        {/* Paso 2, CÓMO lo lleva: solo si el tamaño se vende de más de una forma. */}
        {grupo && grupo.formas.length > 1 && (
          <div className={styles.formas} role="radiogroup" aria-label={`Cómo llevar ${producto.nombre} ${grupo.etiqueta}`}>
            <span className={styles.formasTitulo}>¿Cómo lo llevás?</span>
            {grupo.formas.map((v) => {
              const activa = v.clave === variante?.clave;
              const n = v.paquetesPorUnidad ?? 1;
              return (
                <button
                  key={v.clave}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  className={`${styles.forma} ${activa ? styles.formaActiva : ''} ${v.enStock ? '' : styles.formaSinStock}`}
                  onClick={() => elegir(v.clave)}
                >
                  <span className={styles.formaPunto} aria-hidden="true" />
                  <span className={styles.formaTexto}>
                    <span className={styles.formaNombre}>{v.forma ?? v.etiqueta}</span>
                    <span className={styles.formaCu}>
                      {v.enStock
                        ? n > 1 ? `${n} paquetes · ${money(precioDe(v) / n)} c/u` : `${money(precioDe(v))} c/u`
                        : 'Sin stock'}
                    </span>
                  </span>
                  <span className={styles.formaDerecha}>
                    <span className={styles.formaPrecio}>{money(precioDe(v))}</span>
                    {(v.ahorroPct ?? 0) > 0 && <span className={styles.ahorro}>Ahorrás {v.ahorroPct}%</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className={styles.price}>
          {tieneDescuento && <span className={styles.priceOld}>{money(fuente.precio)}</span>}
          {money(precioEfectivo)}{unidad === 'kg' && <span className={styles.perKg}> /kg</span>}
          {variante && (variante.paquetesPorUnidad ?? 1) > 1 ? (
            <span className={styles.perKg}> · {money(precioEfectivo / (variante.paquetesPorUnidad ?? 1))} c/u</span>
          ) : variante && variante.kgPorUnidad !== 1 && (
            <span className={styles.perKg}> · {money((precioEfectivo) / variante.kgPorUnidad)} /kg</span>
          )}
        </div>
        {cajaQueConviene && (() => {
          const n = cajaQueConviene.paquetesPorUnidad ?? 1;
          const cajas = Math.floor(cantidad / n);
          const sobran = cantidad - cajas * n;
          return (
            <div className={styles.conviene}>
              <span>
                Llevando {cantidad}, te conviene la <strong>{(cajaQueConviene.forma ?? cajaQueConviene.etiqueta).toLowerCase()}</strong>:
                {' '}cada paquete a {money(precioDe(cajaQueConviene) / n)}.
                {sobran > 0 && ` Los otros ${sobran} los podés agregar sueltos.`}
              </span>
              <button type="button" className={styles.convieneBtn} onClick={() => elegir(cajaQueConviene.clave, cajas)}>
                Pasar a {cajas} bolsa{cajas === 1 ? '' : 's'}
              </button>
            </div>
          );
        })()}

        {enStock ? (
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
                Ya tenés todo el stock disponible en el carrito ({cant(disponible, unidad)}).
              </span>
            )}
            {recortado && (
              <span className={styles.stockAviso}>
                Solo {puedoSumar === 1 && unidad === 'u' ? 'queda' : 'quedan'}{' '}
                {cant(puedoSumar, unidad)}
                {yaEnCarrito > 0 ? ` (ya tenés ${cant(yaEnCarrito, unidad)})` : ''}.
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
