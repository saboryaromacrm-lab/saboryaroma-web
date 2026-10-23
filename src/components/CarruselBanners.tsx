'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ProductoModal } from '@/components/ProductoModal';
import { imgSrc } from '@/lib/api';
import type { Banner } from '@/lib/bannersTienda';
import type { ItemCatalogo } from '@/lib/types';
import styles from './CarruselBanners.module.css';

const AUTOPLAY_MS = 6500;
/** Cuántas fotos chicas acompañan a la grande en un banner automático. */
const CHICAS = 4;

/**
 * EL CARRUSEL DE BANNERS DE LA PORTADA (23/10/2026), en las dos tiendas. Los
 * banners los arma `bannersTienda` con el catálogo: los automáticos llevan una foto grande,
 * otras chicas flotando y, si es de una marca, su logo en una tarjeta blanca;
 * los del ERP con imagen propia se ven a pantalla completa como siempre. Gira
 * solo cada 6,5 s (se frena con el mouse encima o con la pestaña oculta), se
 * pasa con las flechas, los puntos o deslizando; tocar una foto abre el producto.
 */
export function CarruselBanners({ banners, className = '' }: { banners: Banner[]; className?: string }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [abierto, setAbierto] = useState<ItemCatalogo | null>(null);
  const toque = useRef(0);
  const total = banners.length;
  const ir = useCallback((n: number) => setI(((n % total) + total) % total), [total]);
  const cerrar = useCallback(() => setAbierto(null), []);

  useEffect(() => {
    if (total < 2 || pausa || abierto) return undefined;
    const t = setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % total); }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [total, pausa, abierto]);

  if (!total) return null;

  return (
    <section
      className={`${styles.hero} ${className}`}
      aria-roledescription="carrusel"
      aria-label="Novedades de la tienda"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onTouchStart={(e) => { toque.current = e.changedTouches[0].screenX; }}
      onTouchEnd={(e) => {
        const d = toque.current - e.changedTouches[0].screenX;
        if (Math.abs(d) > Math.max(40, window.innerWidth * 0.1)) ir(i + (d > 0 ? 1 : -1));
      }}
    >
      {banners.map((b, k) => (
        <div
          key={b.key}
          className={`${styles.slide} ${k === i ? styles.activo : ''} ${b.tipo === 'auto' ? styles[b.tono] : styles.conImagen}`}
          aria-hidden={k !== i}
          inert={k !== i}
        >
          {b.tipo === 'imagen' ? (
            <>
              <img src={b.imagen} alt="" className={styles.fondo} loading={k === 0 ? 'eager' : 'lazy'} />
              <div className={`container ${styles.marco} ${styles[`pos_${b.posicion}`]}`}>
                <Texto b={b} />
              </div>
            </>
          ) : (
            <div className={`container ${styles.marco} ${styles.dosColumnas}`}>
              <Texto b={b} />
              <Fotos b={b} visible={k === i} onAbrir={setAbierto} />
            </div>
          )}
        </div>
      ))}

      {total > 1 && (
        <>
          <button type="button" className={`${styles.flecha} ${styles.anterior}`} aria-label="Banner anterior" onClick={() => ir(i - 1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" className={`${styles.flecha} ${styles.siguiente}`} aria-label="Banner siguiente" onClick={() => ir(i + 1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <div className={styles.puntos}>
            {banners.map((b, k) => (
              <button key={b.key} type="button" aria-label={`Ver «${b.titulo}»`} aria-current={k === i} className={`${styles.punto} ${k === i ? styles.puntoActivo : ''}`} onClick={() => ir(k)} />
            ))}
          </div>
        </>
      )}
      {abierto && <ProductoModal producto={abierto} onCerrar={cerrar} />}
    </section>
  );
}

function Texto({ b }: { b: Banner }) {
  return (
    <div className={styles.texto}>
      {b.tipo === 'auto' && b.logo && <LogoMarca src={b.logo} alt={`Logo de ${b.marca}`} />}
      {b.badge && <span className={styles.badge}>{b.badge}</span>}
      <h2 className={styles.titulo}>{b.titulo}</h2>
      {b.texto && <p className={styles.bajada}>{b.texto}</p>}
      <Link href={b.url} className={styles.boton}>{b.cta}</Link>
    </div>
  );
}

/** El logo cubre hasta este tanto de su tarjeta, y como mucho se agranda tantas veces. */
const LOGO_LLENA = { ancho: 0.86, alto: 0.78, zoomMax: 4 };

/**
 * EL LOGO, SIN EL AIRE DE ALREDEDOR. Los logos suben como imágenes de 400×200
 * con el dibujo chico en el medio (alguno ocupa la cuarta parte). Al cargar se
 * mide dónde está el dibujo (lo que no es blanco ni transparente) y se lo
 * agranda y centra en la tarjeta. Si la imagen no se puede leer, queda como vino.
 */
function LogoMarca({ src, alt }: { src: string; alt: string }) {
  const [transform, setTransform] = useState<string>();
  const ref = useRef<HTMLImageElement>(null);
  const medir = useCallback((img: HTMLImageElement) => {
    try {
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const k = Math.min(1, 200 / nw);
      const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
      const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (d[i + 3] > 24 && (d[i] < 236 || d[i + 1] < 236 || d[i + 2] < 236)) {
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return;
      /* Del dibujo en la imagen, al dibujo en la tarjeta (la imagen va `contain` en una tarjeta de 2:1). */
      const ar = nw / nh, A = 2;
      const fw = ar >= A ? 1 : ar / A, fh = ar >= A ? A / ar : 1;
      const cx = 0.5 + ((x0 + x1 + 1) / 2 / w - 0.5) * fw, cy = 0.5 + ((y0 + y1 + 1) / 2 / h - 0.5) * fh;
      const ew = ((x1 - x0 + 1) / w) * fw, eh = ((y1 - y0 + 1) / h) * fh;
      const z = Math.max(1, Math.min(LOGO_LLENA.ancho / ew, LOGO_LLENA.alto / eh, LOGO_LLENA.zoomMax));
      setTransform(`scale(${z.toFixed(3)}) translate(${((0.5 - cx) * 100).toFixed(2)}%, ${((0.5 - cy) * 100).toFixed(2)}%)`);
    } catch { /* imagen de otro origen sin permiso: queda como vino */ }
  }, []);
  /* Si la imagen ya estaba cargada antes de que React atara el onLoad (venía del servidor o del caché). */
  useEffect(() => { if (ref.current?.complete && ref.current.naturalWidth) medir(ref.current); }, [medir]);
  return (
    <span className={styles.logoMarca}>
      <img ref={ref} src={src} alt={alt} crossOrigin="anonymous" loading="lazy" style={transform ? { transform } : undefined} onLoad={(e) => medir(e.currentTarget)} />
    </span>
  );
}

/** Una foto grande, apenas girada, y las chicas alrededor. El fondo blanco de las fotos se funde con el del banner. */
function Fotos({ b, visible, onAbrir }: { b: Extract<Banner, { tipo: 'auto' }>; visible: boolean; onAbrir: (p: ItemCatalogo) => void }) {
  const [grande, ...resto] = b.fotos;
  if (!grande) return null;
  return (
    <div className={styles.escena}>
      <button type="button" className={`${styles.foto} ${styles.grande} ${visible ? styles.entra : ''}`} onClick={() => onAbrir(grande)} aria-label={`Ver ${grande.nombre}`}>
        <img src={imgSrc(grande.imagenUrl)} alt="" loading="lazy" />
      </button>
      {resto.slice(0, CHICAS).map((p, k) => (
        <button key={p.id} type="button" className={`${styles.foto} ${styles.chica} ${styles[`chica${k + 1}`]}`} onClick={() => onAbrir(p)} aria-label={`Ver ${p.nombre}`}>
          <img src={imgSrc(p.imagenUrl)} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}
