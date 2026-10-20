'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import { rutaProducto } from '@/lib/rutas';
import { useCompraProducto } from '@/lib/useCompraProducto';
import { COLORES_TAG, COLOR_TAG_DEFAULT } from '@/lib/etiquetas';
import { money, cant } from '@/lib/format';
import { PrecioOculto } from './Ingreso';
import PromoLote from './PromoLote';
import type { ItemCatalogo } from '@/lib/types';
import styles from './ProductCard.module.css';

/**
 * LA TARJETA CON FOTO. La regla de compra (tamaños, formas, tope de stock,
 * empujón a la caja, alta al carrito) vive en `useCompraProducto`, compartida
 * con la vista de lista sin foto (4/10/2026); acá solo se dibuja.
 *
 * El nombre lleva a la página del producto (20/10/2026). `ficha`: la tarjeta
 * ES esa página — el nombre es el título y, desde tablet, la foto va al lado.
 */
export function ProductCard({ producto, ficha = false }: { producto: ItemCatalogo; ficha?: boolean }) {
  const {
    modo, conPrecios, cantidad, restar, sumar, sumarBloqueado, variante, grupos, grupo, elegir, elegirGrupo, precioDe,
    fuente, unidad, precioEfectivo, tieneDescuento, enStock, promo, yaEnCarrito, disponible, conTope, puedoSumar,
    sinMargen, recortado, cajaQueConviene, agregado, agregarAlCarrito, raizRef: cardRef,
  } = useCompraProducto<HTMLDivElement>(producto);
  const imgRef = useRef<HTMLImageElement>(null);
  const click = () => agregarAlCarrito(imgRef.current);

  const tagsAMostrar = producto.etiquetas.slice(0, 2);

  return (
    <div ref={cardRef} className={`${styles.card} ${ficha ? styles.ficha : ''}`}>
      <div className={styles.imageWrap}>
        <img
          ref={imgRef}
          src={imgSrc(producto.imagenUrl) || '/placeholder-producto.svg'}
          alt={producto.nombre}
          className={styles.image}
          loading={ficha ? 'eager' : 'lazy'}
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
              const c = COLORES_TAG[t.nombre.toUpperCase()] ?? COLOR_TAG_DEFAULT;
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
        {ficha
          ? <h1 className={styles.name}>{producto.nombre}</h1>
          : <h3 className={styles.name}><Link href={rutaProducto(producto)} className={styles.nameLink}>{producto.nombre}</Link></h3>}
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
                  {/* Minorista (0173): el precio del tamaño en el mismo botón (el más barato de sus formas). */}
                  {modo === 'minorista' && hay && <span className={styles.opcionPrecio}>{money(Math.min(...g.formas.filter((v) => v.enStock).map(precioDe)))}</span>}
                </button>
              );
            })}
          </div>
        )}
        {grupos.length === 1 && grupos[0].etiqueta && <span className={styles.opcionUnica}>{grupos[0].etiqueta}</span>}
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
                      {!v.enStock ? 'Sin stock'
                        : !conPrecios ? (n > 1 ? `${n} ${producto.tipo === 'granel' ? 'paquetes' : 'unidades'}` : 'Por unidad')
                          : n > 1 ? `${n} ${producto.tipo === 'granel' ? 'paquetes' : 'unidades'} · ${money(precioDe(v) / n)} c/u` : `${money(precioDe(v))} c/u`}
                    </span>
                  </span>
                  {conPrecios && (
                    <span className={styles.formaDerecha}>
                      <span className={styles.formaPrecio}>{money(precioDe(v))}</span>
                      {(v.ahorroPct ?? 0) > 0 && <span className={styles.ahorro}>Ahorrás {v.ahorroPct}%</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {/* Sin haber ingresado, en lugar del precio, el botón para ingresar (0155). */}
        {!conPrecios ? <PrecioOculto /> : <div className={styles.price}>
          {tieneDescuento && <span className={styles.priceOld}>{money(fuente.precio)}</span>}
          {money(precioEfectivo)}{unidad === 'kg' && <span className={styles.perKg}> /kg</span>}
          {variante && (variante.paquetesPorUnidad ?? 1) > 1 ? (
            <span className={styles.perKg}> · {money(precioEfectivo / (variante.paquetesPorUnidad ?? 1))} c/u</span>
          ) : variante && variante.kgPorUnidad !== 1 && (
            <span className={styles.perKg}> · {money((precioEfectivo) / variante.kgPorUnidad)} /kg</span>
          )}
        </div>}
        {conPrecios && promo && <PromoLote promo={promo} />}
        {/* Cuánto se ahorra frente al minorista (el precio de mostrador), con la cantidad elegida. */}
        {variante?.ahorroMinorista && (
          <div className={styles.ahorroMin}>
            <strong>Ahorrás {money(variante.ahorroMinorista.pesos * cantidad)} ({variante.ahorroMinorista.pct}%)</strong> frente al precio minorista
            <span className={styles.ahorroMinDet}>
              Minorista: {money(variante.ahorroMinorista.precioKg)} el kilo · acá: {money(precioEfectivo / variante.kgPorUnidad)} el kilo
            </span>
          </div>
        )}
        {cajaQueConviene && (() => {
          const n = cajaQueConviene.paquetesPorUnidad ?? 1;
          const cajas = Math.floor(cantidad / n);
          const sobran = cantidad - cajas * n;
          return (
            <div className={styles.conviene}>
              <span>
                Llevando {cantidad}, te conviene la <strong>{(cajaQueConviene.forma ?? cajaQueConviene.etiqueta).toLowerCase()}</strong>:
                {' '}cada {producto.tipo === 'granel' ? 'paquete' : 'unidad'} a {money(precioDe(cajaQueConviene) / n)}.
                {sobran > 0 && ` Los otros ${sobran} los podés agregar sueltos.`}
              </span>
              <button type="button" className={styles.convieneBtn} onClick={() => elegir(cajaQueConviene.clave, cajas)}>
                Pasar a {cajas} {producto.tipo === 'granel' ? 'bolsa' : 'caja'}{cajas === 1 ? '' : 's'}
              </button>
            </div>
          );
        })()}

        {enStock && conPrecios ? (
          <div className={styles.actions}>
            <div className={styles.qty}>
              <button type="button" onClick={restar} aria-label="Restar">−</button>
              <span key={cantidad} className={styles.qtyValue}>{cantidad}</span>
              {/* El + no pasa de lo que queda: el aviso de abajo explica por qué. */}
              <button type="button" onClick={sumar} disabled={sumarBloqueado} aria-label="Sumar">
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
        ) : !enStock ? (
          <span className={styles.disabled}>Sin stock</span>
        ) : null}
      </div>
    </div>
  );
}
