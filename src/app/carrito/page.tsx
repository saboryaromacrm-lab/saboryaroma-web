'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { money, cant } from '@/lib/format';
import styles from './page.module.css';

/** Barra de avance de una condición: verde cuando se cumple. */
function Barra({ pct, ok }: { pct: number; ok: boolean }) {
  return (
    <div className={styles.bar}>
      <div className={styles.barFill} data-ok={ok} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** «1 caja», «3 bolsas»: la cantidad en lo que el cliente compra (no «1 unidad» para una caja de 10). */
function cantidadTexto(n: number, unidad: 'kg' | 'u', etiqueta?: string | null): string {
  const forma = unidad === 'u' ? /^(caja|bolsa|paquete|pack)\b/i.exec(etiqueta ?? '')?.[1]?.toLowerCase() : undefined;
  return forma ? `${n} ${forma}${n === 1 ? '' : 's'}` : cant(n, unidad);
}

export default function CarritoPage() {
  const { items, total, setCantidad, quitar, gate, config, disponibleDe, quitadosViejos } = useCart();

  /* El granel antes se pedía en kilos: esos renglones se sacaron al abrir y se dice cuáles. */
  const avisoViejos = quitadosViejos.length > 0 && (
    <p className={styles.stockAviso} style={{ marginBottom: 16 }}>
      Cambió la forma de comprar {quitadosViejos.join(', ')}: ahora se elige cómo llevarlo (unidad, caja, paquete o bolsa).
      Lo sacamos del carrito para que lo vuelvas a agregar.
    </p>
  );

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        {avisoViejos}
        <h1 className={styles.title}>Tu carrito está vacío</h1>
        <Link href="/tienda" className={styles.cta}>Ir a la tienda</Link>
      </div>
    );
  }

  /*
   * LA REGLA DEL MÍNIMO, DICHA COMO ES (4/10/2026). Se puede finalizar con
   * UNA de dos opciones —igual que el servidor (tienda.module, «gate»)—:
   *   1. llegar al monto mínimo, o
   *   2. completar el mínimo de CADA marca / producto con mínimo que lleva el carrito.
   * El texto viejo decía «alguna de las marcas» y no es así: con una marca
   * completa y otra no, no alcanza.
   */
  const hayMonto = config.montoMinimo > 0;
  const reglas = [
    ...gate.marcas.map((m) => ({ clave: `m:${m.marca}`, nombre: m.marca, ...m })),
    ...gate.productos.map((p) => ({ clave: `p:${p.nombre}`, ...p })),
  ];
  /* Con el monto cumplido, la Opción 2 (los mínimos por marca) ya no hace
   * falta: se saca de la pantalla para no confundir (pedido del dueño, 4/10/2026).
   * Los productos del carrito no se tocan. */
  const hayCantidad = reglas.length > 0 && !(hayMonto && gate.montoOk);
  const dosOpciones = hayMonto && hayCantidad;
  /* Cumplida UNA de las dos opciones (cualquiera), queda solo el «¡Listo!»:
   * las tarjetas de las opciones se sacan (pedido del dueño, 7/10/2026). */
  const verOpciones = !gate.habilitado;
  const nArticulos = items.length;

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      <div className={styles.head}>
        <h1 className={styles.title}>Tu carrito</h1>
        <span className={styles.headCount}>{nArticulos} producto{nArticulos === 1 ? '' : 's'}</span>
      </div>
      {avisoViejos}

      <div className={styles.layout}>
        <ul className={styles.items}>
          {items.map((it) => {
            const paso = it.unidad === 'kg' ? 0.5 : 1;
            /* El mismo tope que la tarjeta, del mismo lugar. `enElTope` corta
             * el +; `pasado` es el carrito viejo que quedó con más de lo que
             * hay hoy — se avisa, no se corrige por atrás. */
            const disponible = disponibleDe(it.productoId, it.variante);
            const conTope = Number.isFinite(disponible);
            const enElTope = conTope && it.cantidad >= disponible;
            const pasado = conTope && it.cantidad > disponible;
            const porQue = it.unidad === 'kg' ? '/kg' : /^Caja/.test(it.etiqueta ?? '') ? 'por caja' : /^Bolsa/.test(it.etiqueta ?? '') ? 'por bolsa' : 'c/u';
            return (
              <li key={`${it.productoId}:${it.variante ?? ''}`} className={styles.item}>
                <div className={styles.itemInfo}>
                  {it.marca && <span className={styles.itemBrand}>{it.marca}</span>}
                  <span className={styles.itemName}>{it.nombre}</span>
                  {it.etiqueta && <span className={styles.itemTag}>{it.etiqueta}</span>}
                  <span className={styles.itemPrice}>{money(it.precio)} {porQue}</span>
                  {pasado ? (
                    <span className={styles.stockAviso}>
                      Quedan {cant(disponible, it.unidad)}: bajá la cantidad o lo revisamos al confirmar el pedido.
                    </span>
                  ) : enElTope ? (
                    <span className={styles.stockAvisoSuave}>Es todo el stock disponible.</span>
                  ) : null}
                </div>
                <div className={styles.qty}>
                  <button
                    type="button"
                    aria-label={`Restar uno de ${it.nombre}`}
                    onClick={() => setCantidad(it.productoId, it.cantidad - paso, it.variante)}
                  >
                    −
                  </button>
                  <span aria-live="polite">{cantidadTexto(it.cantidad, it.unidad, it.etiqueta)}</span>
                  <button
                    type="button"
                    aria-label={`Sumar uno de ${it.nombre}`}
                    onClick={() => setCantidad(it.productoId, it.cantidad + paso, it.variante)}
                    disabled={enElTope}
                  >
                    +
                  </button>
                </div>
                <div className={styles.itemTotal}>{money(it.precio * it.cantidad)}</div>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => quitar(it.productoId, it.variante)}
                  aria-label={`Quitar ${it.nombre} del carrito`}
                  title="Quitar del carrito"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>

        <aside className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>

          {(hayMonto || hayCantidad) && (
            gate.habilitado ? (
              <div className={styles.gateOk}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>¡Listo! Ya podés finalizar tu pedido.</span>
              </div>
            ) : (
              <div className={styles.gateMsg} role="status">
                <strong className={styles.gateMsgTitle}>Todavía no podés finalizar el pedido</strong>
                <span>
                  {dosOpciones
                    ? <>Cumplí <b>una</b> de estas dos opciones (con una sola alcanza):</>
                    : hayMonto
                      ? <>Tu pedido tiene que llegar a la compra mínima:</>
                      : <>Completá el mínimo de cada marca de tu carrito:</>}
                </span>
              </div>
            )
          )}

          {verOpciones && hayMonto && (
            <section className={styles.opcion} data-ok={gate.montoOk}>
              {dosOpciones && <span className={styles.opcionTag}>Opción 1</span>}
              <div className={styles.opcionHead}>
                <span className={styles.opcionTitulo}>Compra mínima de {money(config.montoMinimo)}</span>
                <span className={styles.opcionEstado} data-ok={gate.montoOk}>
                  {gate.montoOk ? '✓ Cumplido' : `Faltan ${money(gate.faltaMonto)}`}
                </span>
              </div>
              <Barra pct={(total / config.montoMinimo) * 100} ok={gate.montoOk} />
              <span className={styles.opcionSub}>{money(total)} de {money(config.montoMinimo)}</span>
            </section>
          )}

          {verOpciones && dosOpciones && <div className={styles.o} aria-hidden><span>o</span></div>}

          {verOpciones && hayCantidad && (
            <section className={styles.opcion} data-ok={reglas.every((r) => r.ok)}>
              {dosOpciones && <span className={styles.opcionTag}>Opción 2</span>}
              <div className={styles.opcionHead}>
                <span className={styles.opcionTitulo}>
                  {reglas.length === 1
                    ? 'Completar el mínimo de esta marca'
                    : `Completar el mínimo de cada marca (${reglas.filter((r) => r.ok).length} de ${reglas.length} completas)`}
                </span>
              </div>
              <ul className={styles.reglas}>
                {reglas.map((r) => {
                  const pide = r.enCarrito + r.falta;
                  return (
                    <li key={r.clave} className={styles.regla}>
                      <div className={styles.reglaHead}>
                        <span className={styles.reglaNombre}>{r.nombre}</span>
                        <span className={styles.reglaEstado} data-ok={r.ok}>
                          {r.ok ? `✓ ${r.enCarrito} de ${pide}` : `${r.enCarrito} de ${pide} · faltan ${r.falta}`}
                        </span>
                      </div>
                      <Barra pct={(r.enCarrito / (pide || 1)) * 100} ok={r.ok} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {gate.habilitado ? (
            <Link href="/checkout" className={styles.checkoutBtn}>Finalizar pedido</Link>
          ) : (
            <button type="button" className={styles.checkoutBtn} data-disabled disabled>Finalizar pedido</button>
          )}
          <Link href="/tienda" className={styles.seguir}>Seguir comprando</Link>
        </aside>
      </div>
    </div>
  );
}
