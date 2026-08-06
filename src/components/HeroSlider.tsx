'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import type { SitioConfig } from '@/lib/types';
import styles from './HeroSlider.module.css';

interface Slide {
  key: number;
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
  position: 'left' | 'center' | 'right';
}

const AUTOPLAY_MS = 5000;
const POSICIONES = new Set(['left', 'center', 'right']);

/**
 * TODOS los slides vienen del CRM (Web › Contenido): alta, baja, edición y
 * orden — acá no hay contenido fijo. Sin imagen propia, el slide rota entre
 * las tres ilustraciones locales (presentación, no contenido). Sin slides, la
 * portada arranca directo en las secciones de productos.
 */
export function HeroSlider({ sitio }: { sitio?: SitioConfig }) {
  const SLIDES = useMemo<Slide[]>(() => (sitio?.slides ?? []).map((sl, i) => ({
    key: sl.id,
    image: imgSrc(sl.bannerUrl) || `/hero/slide-${(i % 3) + 1}.svg`,
    badge: sl.badge,
    title: sl.titulo,
    subtitle: sl.texto,
    buttonText: sl.cta,
    buttonHref: sl.ctaUrl || '/tienda',
    position: (POSICIONES.has(sl.posicion) ? sl.posicion : 'left') as Slide['position'],
  })), [sitio]);

  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const total = SLIDES.length;

  const irA = useCallback((i: number) => {
    if (!total) return;
    setIndex(((i % total) + total) % total);
  }, [total]);

  const siguiente = useCallback(() => irA(index + 1), [index, irA]);
  const anterior = useCallback(() => irA(index - 1), [index, irA]);

  const detener = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const iniciar = useCallback(() => {
    detener();
    // Con un solo slide no hay nada que rotar.
    if (total < 2) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % total), AUTOPLAY_MS);
  }, [detener, total]);

  useEffect(() => {
    iniciar();
    const onVisibility = () => (document.hidden ? detener() : iniciar());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      detener();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [iniciar, detener]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.changedTouches[0].screenX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].screenX;
    const umbral = Math.max(30, window.innerWidth * 0.08);
    if (Math.abs(diff) > umbral) {
      if (diff > 0) siguiente(); else anterior();
      iniciar();
    }
  };

  // Sin slides configurados, la portada arranca directo en los productos.
  if (!total) return null;

  return (
    <section
      className={styles.slider}
      onMouseEnter={detener}
      onMouseLeave={iniciar}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.track}>
        {SLIDES.map((s, i) => (
          <div key={s.key} className={`${styles.slide} ${i === index ? styles.slideActive : ''}`}>
            <div className={styles.picture}>
              <img
                src={s.image}
                alt=""
                className={styles.image}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </div>
            <div className={styles.overlay} />
            <div className={`${styles.content} ${styles[`content${s.position[0].toUpperCase()}${s.position.slice(1)}`]}`}>
              <span className={styles.badge}>{s.badge}</span>
              <h2 className={styles.title}>{s.title}</h2>
              <p className={styles.subtitle}>{s.subtitle}</p>
              <Link href={s.buttonHref} className={styles.button}>{s.buttonText}</Link>
            </div>
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button type="button" className={`${styles.nav} ${styles.navPrev}`} aria-label="Slide anterior" onClick={() => { anterior(); iniciar(); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" className={`${styles.nav} ${styles.navNext}`} aria-label="Siguiente slide" onClick={() => { siguiente(); iniciar(); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>

          <div className={styles.dots}>
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                aria-label={`Ir al slide ${i + 1}`}
                onClick={() => { irA(i); iniciar(); }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
