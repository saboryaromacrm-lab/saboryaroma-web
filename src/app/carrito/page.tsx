'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { money, cant } from '@/lib/format';
import styles from './page.module.css';

export default function CarritoPage() {
  const { items, total, setCantidad, quitar, gate, config, disponibleDe } = useCart();

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1 className={styles.title}>Tu carrito está vacío</h1>
        <Link href="/tienda" className={styles.cta}>Ir a la tienda</Link>
      </div>
    );
  }

  const pctMonto = config.montoMinimo > 0 ? Math.min(100, (total / config.montoMinimo) * 100) : 100;

  return (
    <div className="container" style={{ padding: '32px 0 60px' }}>
      <h1 className={styles.title}>Tu carrito</h1>

      <div className={styles.layout}>
        <div className={styles.items}>
          {items.map((it) => {
            const paso = it.unidad === 'kg' ? 0.5 : 1;
            /* El mismo tope que la tarjeta, del mismo lugar. `enElTope` corta
             * el +; `pasado` es el carrito viejo que quedó con más de lo que
             * hay hoy — se avisa, no se corrige por atrás. */
            const disponible = disponibleDe(it.productoId);
            const conTope = Number.isFinite(disponible);
            const enElTope = conTope && it.cantidad >= disponible;
            const pasado = conTope && it.cantidad > disponible;
            return (
              <div key={it.productoId} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemBrand}>{it.marca}</span>
                  <span className={styles.itemName}>{it.nombre}</span>
                  <span className={styles.itemPrice}>{money(it.precio)} {it.unidad === 'kg' ? '/kg' : 'c/u'}</span>
                  {pasado ? (
                    <span className={styles.stockAviso}>
                      Quedan {cant(disponible, it.unidad)}: bajá la cantidad o lo revisamos al confirmar el pedido.
                    </span>
                  ) : enElTope ? (
                    <span className={styles.stockAvisoSuave}>Es todo el stock disponible.</span>
                  ) : null}
                </div>
                <div className={styles.qty}>
                  <button type="button" onClick={() => setCantidad(it.productoId, it.cantidad - paso)}>−</button>
                  <span>{cant(it.cantidad, it.unidad)}</span>
                  <button
                    type="button"
                    onClick={() => setCantidad(it.productoId, it.cantidad + paso)}
                    disabled={enElTope}
                  >
                    +
                  </button>
                </div>
                <div className={styles.itemTotal}>{money(it.precio * it.cantidad)}</div>
                <button type="button" className={styles.remove} onClick={() => quitar(it.productoId)} aria-label="Quitar">×</button>
              </div>
            );
          })}
        </div>

        <aside className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>

          {config.montoMinimo > 0 && (
            <div className={styles.gateBlock}>
              <div className={styles.gateLabel}>
                <span>Mínimo de compra</span>
                <span>{money(total)} / {money(config.montoMinimo)}</span>
              </div>
              <div className={styles.bar}>
                <div className={styles.barFill} data-ok={gate.montoOk} style={{ width: `${pctMonto}%` }} />
              </div>
            </div>
          )}

          {gate.marcas.map((m) => (
            <div key={m.marca} className={styles.gateBlock}>
              <div className={styles.gateLabel}>
                <span>Mínimo {m.marca}</span>
                <span>{m.enCarrito} / {m.enCarrito + m.falta}</span>
              </div>
              <div className={styles.bar}>
                <div className={styles.barFill} data-ok={m.ok} style={{ width: `${Math.min(100, (m.enCarrito / (m.enCarrito + m.falta || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}

          {gate.productos.map((p) => (
            <div key={p.nombre} className={styles.gateBlock}>
              <div className={styles.gateLabel}>
                <span>Mínimo {p.nombre}</span>
                <span>{p.enCarrito} / {p.enCarrito + p.falta}</span>
              </div>
              <div className={styles.bar}>
                <div className={styles.barFill} data-ok={p.ok} style={{ width: `${Math.min(100, (p.enCarrito / (p.enCarrito + p.falta || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}

          {gate.habilitado ? (
            <Link href="/checkout" className={styles.checkoutBtn}>Finalizar pedido</Link>
          ) : (
            <>
              <button type="button" className={styles.checkoutBtn} data-disabled disabled>Finalizar pedido</button>
              <p className={styles.gateHint}>
                Para completar el pedido, alcanzá el mínimo por monto o por cantidad de alguna de las marcas/productos de arriba.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
