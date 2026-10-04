'use client';

import { useRef } from 'react';
import { useCompraProducto } from '@/lib/useCompraProducto';
import { COLORES_TAG, COLOR_TAG_DEFAULT } from '@/lib/etiquetas';
import { money, cant } from '@/lib/format';
import type { ItemCatalogo } from '@/lib/types';
import styles from './ProductRow.module.css';

/**
 * EL PRODUCTO COMO RENGLÓN DE UNA LISTA, SIN FOTO (4/10/2026, pedido del dueño).
 * Para el catálogo sin imágenes: lo que la foto no cuenta lo cuentan los
 * datos, todos a la vista en un renglón —marca, nombre, etiquetas de dieta,
 * oferta, precio con su referencia (por kilo, por unidad), stock y el botón
 * de agregar—. En el celular el renglón se parte en dos: los datos arriba, el
 * precio y la compra abajo.
 *
 * Toda la regla de compra es la misma de la tarjeta (`useCompraProducto`);
 * este archivo solo dibuja. Se descarga únicamente con la vista activada.
 */
export function ProductRow({ producto }: { producto: ItemCatalogo }) {
  const c = useCompraProducto<HTMLLIElement>(producto);
  const botonRef = useRef<HTMLButtonElement>(null);
  const { variante, grupo, fuente, unidad, precioEfectivo } = c;
  const nPaq = variante?.paquetesPorUnidad ?? 1;
  const porQue = unidad === 'kg'
    ? '/kg'
    : variante && nPaq > 1
      ? `${money(precioEfectivo / nPaq)} c/u`
      : variante && variante.kgPorUnidad !== 1
        ? `${money(precioEfectivo / variante.kgPorUnidad)} /kg`
        : '';
  const etiquetas = producto.etiquetas.slice(0, 3);
  const cosa = producto.tipo === 'granel' ? 'paquete' : 'unidad';

  return (
    <li ref={c.raizRef} className={styles.row} data-sin-stock={!c.enStock || undefined}>
      <div className={styles.info}>
        <div className={styles.cabecera}>
          {producto.marca && <span className={styles.marca}>{producto.marca}</span>}
          {fuente.oferta && <span className={styles.chipOferta}>{fuente.oferta.badge}</span>}
          {!fuente.oferta && producto.reingreso && <span className={styles.chipVolvio}>¡Volvió!</span>}
        </div>
        <h3 className={styles.nombre}>{producto.nombre}</h3>
        {(etiquetas.length > 0 || c.grupos.length === 1) && (
          <div className={styles.chips}>
            {c.grupos.length === 1 && c.grupos[0].etiqueta && <span className={styles.chipTamano}>{c.grupos[0].etiqueta}</span>}
            {etiquetas.map((t) => {
              const col = COLORES_TAG[t.nombre.toUpperCase()] ?? COLOR_TAG_DEFAULT;
              return <span key={t.id} className={styles.chip} style={{ background: col.bg, color: col.text }}>{t.nombre.toUpperCase()}</span>;
            })}
            {producto.etiquetas.length > 3 && <span className={styles.chipMas}>+{producto.etiquetas.length - 3}</span>}
          </div>
        )}

        {/* Paso 1, el TAMAÑO (granel con más de uno). */}
        {c.grupos.length > 1 && (
          <div className={styles.opciones} role="radiogroup" aria-label={`Tamaño de ${producto.nombre}`}>
            {c.grupos.map((g) => {
              const activo = g.clave === grupo?.clave;
              const hay = g.formas.some((v) => v.enStock);
              return (
                <button
                  key={g.clave} type="button" role="radio" aria-checked={activo}
                  className={`${styles.opcion} ${activo ? styles.opcionActiva : ''} ${hay ? '' : styles.opcionSinStock}`}
                  onClick={() => c.elegirGrupo(g)} title={hay ? undefined : 'Sin stock'}
                >
                  {g.etiqueta}
                </button>
              );
            })}
          </div>
        )}
        {/* Paso 2, CÓMO lo lleva: por unidad o en caja, con lo que sale cada uno. */}
        {grupo && grupo.formas.length > 1 && (
          <div className={styles.formas} role="radiogroup" aria-label={`Cómo llevar ${producto.nombre} ${grupo.etiqueta}`}>
            {grupo.formas.map((v) => {
              const activa = v.clave === variante?.clave;
              const n = v.paquetesPorUnidad ?? 1;
              return (
                <button
                  key={v.clave} type="button" role="radio" aria-checked={activa}
                  className={`${styles.forma} ${activa ? styles.formaActiva : ''} ${v.enStock ? '' : styles.opcionSinStock}`}
                  onClick={() => c.elegir(v.clave)}
                >
                  <strong>{v.forma ?? v.etiqueta}</strong>
                  <span>{v.enStock ? ` · ${money(c.precioDe(v) / n)} c/u` : ' · Sin stock'}</span>
                  {(v.ahorroPct ?? 0) > 0 && v.enStock && <em className={styles.ahorro}>−{v.ahorroPct}%</em>}
                </button>
              );
            })}
          </div>
        )}
        {variante?.ahorroMinorista && (
          <span className={styles.ahorroMin}>
            Ahorrás <strong>{money(variante.ahorroMinorista.pesos * c.cantidad)} ({variante.ahorroMinorista.pct}%)</strong> frente al minorista
            ({money(variante.ahorroMinorista.precioKg)} el kilo).
          </span>
        )}
        {c.cajaQueConviene && (() => {
          const n = c.cajaQueConviene.paquetesPorUnidad ?? 1;
          const cajas = Math.floor(c.cantidad / n);
          return (
            <span className={styles.conviene}>
              Llevando {c.cantidad}, te conviene la <strong>{(c.cajaQueConviene.forma ?? c.cajaQueConviene.etiqueta).toLowerCase()}</strong>: cada {cosa} a {money(c.precioDe(c.cajaQueConviene) / n)}.
              <button type="button" className={styles.convieneBtn} onClick={() => c.elegir(c.cajaQueConviene!.clave, cajas)}>
                Pasar a {cajas} {producto.tipo === 'granel' ? 'bolsa' : 'caja'}{cajas === 1 ? '' : 's'}
              </button>
            </span>
          );
        })()}
      </div>

      <div className={styles.precio}>
        {c.tieneDescuento && <s className={styles.precioViejo}>{money(fuente.precio)}</s>}
        <span className={styles.precioValor}>{money(precioEfectivo)}</span>
        {porQue && <span className={styles.precioRef}>{porQue}</span>}
      </div>

      <div className={styles.compra}>
        {c.enStock ? (
          <>
            <div className={styles.linea}>
              <div className={styles.qty}>
                <button type="button" onClick={c.restar} aria-label={`Restar uno de ${producto.nombre}`}>−</button>
                <span key={c.cantidad} className={styles.qtyValor}>{c.cantidad}</span>
                <button type="button" onClick={c.sumar} disabled={c.sumarBloqueado} aria-label={`Sumar uno de ${producto.nombre}`}>+</button>
              </div>
              <button
                ref={botonRef} type="button" className={styles.agregar}
                onClick={() => c.agregarAlCarrito(botonRef.current)} data-added={c.agregado} disabled={c.sinMargen}
              >
                {c.agregado ? 'Agregado ✓' : c.sinMargen ? 'Sin más stock' : 'Agregar'}
              </button>
            </div>
            {c.yaEnCarrito > 0 && (
              <span className={styles.enCarrito}>🛒 {cant(c.yaEnCarrito, unidad)}{variante ? ` de ${variante.etiqueta}` : ''} en el carrito</span>
            )}
            {c.sinMargen && <span className={styles.aviso}>Ya tenés todo el stock disponible en el carrito ({cant(c.disponible, unidad)}).</span>}
            {c.recortado && (
              <span className={styles.aviso}>
                Solo {c.puedoSumar === 1 && unidad === 'u' ? 'queda' : 'quedan'} {cant(c.puedoSumar, unidad)}{c.yaEnCarrito > 0 ? ` (ya tenés ${cant(c.yaEnCarrito, unidad)})` : ''}.
              </span>
            )}
            {!c.sinMargen && !c.recortado && c.conTope && c.cantidad >= c.puedoSumar && <span className={styles.avisoSuave}>Es todo lo que hay disponible.</span>}
          </>
        ) : (
          <span className={styles.sinStock}>Sin stock</span>
        )}
      </div>
    </li>
  );
}
