'use client';

import { useRef } from 'react';
import type { ItemCatalogo } from '@/lib/types';
import { ProductCard } from './ProductCard';
import styles from './ProductCarousel.module.css';

export function ProductCarousel({ id, titulo, subtitulo, productos, variant, badge = '🔥 Ofertas', compacto = false }: {
  id?: string;
  titulo: string;
  subtitulo?: string;
  productos: ItemCatalogo[];
  /** 'ofertas': tarjeta con degradé cálido, igual al carrusel de ofertas del tema original. */
  variant?: 'ofertas';
  /** El cartelito de la variante 'ofertas' (la minorista dice «NutriOfertas»). */
  badge?: string;
  /**
   * Chico, como anexo de otra página (25/10/2026, las ofertas del carrito): un
   * renglón de título, sin cartelito ni bajada, y tarjetas más angostas.
   */
  compacto?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!productos.length) return null;

  const mover = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const contenido = (
    <>
      <div className={styles.headRow}>
        <div className={styles.headLeft}>
          {variant === 'ofertas' && !compacto && <span className={styles.badge}>{badge}</span>}
          <div>
            <h2 className={styles.title}>{titulo}</h2>
            {subtitulo && <p className={styles.subtitle}>{subtitulo}</p>}
          </div>
        </div>
        <div className={styles.arrows}>
          <button type="button" onClick={() => mover(-1)} aria-label="Anterior">‹</button>
          <button type="button" onClick={() => mover(1)} aria-label="Siguiente">›</button>
        </div>
      </div>
      <div className={styles.trackWrap}>
        <div className={`${styles.fade} ${styles.fadeLeft}`} aria-hidden="true" />
        <div className={`${styles.fade} ${styles.fadeRight}`} aria-hidden="true" />
        <div ref={trackRef} className={styles.track}>
          {productos.map((p) => (
            <div key={p.id} className={styles.slide}><ProductCard producto={p} compacta={compacto} /></div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <section
      id={id} className={`container ${compacto ? styles.compacto : ''}`}
      style={{ marginTop: compacto ? 'var(--space-5)' : 'var(--space-10)', scrollMarginTop: '90px' }}
    >
      {variant === 'ofertas' ? <div className={styles.ofertasCard}>{contenido}</div> : contenido}
    </section>
  );
}
