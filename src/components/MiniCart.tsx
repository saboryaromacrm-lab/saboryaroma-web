'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import styles from './MiniCart.module.css';

const MAX_VISIBLE = 5;

export function MiniCart({ onNavigate }: { onNavigate: () => void }) {
  const { items, total, config, gate } = useCart();

  if (items.length === 0) {
    return (
      <div className={styles.minicart}>
        <div className={styles.empty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <p>Tu carrito está vacío</p>
        </div>
      </div>
    );
  }

  const ordenados = [...items].reverse();
  const visibles = ordenados.slice(0, MAX_VISIBLE);
  const restantes = ordenados.length - visibles.length;

  const progresoPct = config.montoMinimo > 0 ? Math.min(100, (total / config.montoMinimo) * 100) : 0;

  return (
    <div className={styles.minicart}>
      <div className={styles.header}>
        <span className={styles.title}>Mi Carrito</span>
        <span className={styles.count}>{items.length} producto{items.length === 1 ? '' : 's'}</span>
      </div>

      <ul className={styles.items}>
        {visibles.map((it, i) => (
          <li key={it.productoId} className={`${styles.item} ${i === 0 ? styles.itemLatest : ''}`}>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{it.nombre}</span>
              <span className={styles.itemQty}>{it.cantidad} x {money(it.precio)}</span>
            </div>
            <div className={styles.itemTotal}>{money(it.precio * it.cantidad)}</div>
          </li>
        ))}
      </ul>

      {restantes > 0 && (
        <div className={styles.more}>y {restantes} producto{restantes === 1 ? '' : 's'} más...</div>
      )}

      <div className={styles.footer}>
        <div className={styles.total}>
          <span>Subtotal</span>
          <strong>{money(total)}</strong>
        </div>
        <div className={styles.buttons}>
          <Link href="/carrito" className={styles.btnCart} onClick={onNavigate}>Ver carrito</Link>
          <Link href="/checkout" className={styles.btnCheckout} onClick={onNavigate}>Finalizar compra</Link>
        </div>
      </div>

      {config.montoMinimo > 0 && (
        gate.habilitado ? (
          <div className={`${styles.progress} ${styles.progressOk}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            <span>{gate.montoOk ? '¡Compra mínima alcanzada!' : '¡Mínimos de cantidad alcanzados!'}</span>
          </div>
        ) : (
          <div className={styles.progress}>
            <div className={styles.progressRow}>
              <span>Faltan <strong>{money(gate.faltaMonto)}</strong></span>
              <span className={styles.progressMuted}>{money(total)} / {money(config.montoMinimo)}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progresoPct}%` }} />
            </div>
          </div>
        )
      )}
    </div>
  );
}
