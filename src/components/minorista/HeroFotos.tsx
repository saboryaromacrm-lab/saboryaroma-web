'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import styles from './HomeMinorista.module.css';

export interface FotoHero { id: number; nombre: string; imagenUrl?: string }

/** Cuántas escenas distintas gira el hero y cuántas fotos chicas flotan alrededor de la grande. */
const ESCENAS = 3;
const CHICAS = 5;
const ESCENA_MS = 7000;

/**
 * LAS FOTOS DEL HERO (17/10/2026, a partir de magicspoon.com): un producto en
 * grande, apenas girado, y otros chicos flotando alrededor, algunos cortados
 * por el borde. Cada 7 s cambia el producto grande (los puntos de abajo lo
 * eligen a mano). Las fotos vienen con fondo blanco: `mix-blend-mode` lo funde
 * con el degradé y quedan como recortes.
 */
export function HeroFotos({ fotos }: { fotos: FotoHero[] }) {
  const escenas = Math.min(ESCENAS, fotos.length);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (escenas < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % escenas), ESCENA_MS);
    return () => clearInterval(t);
  }, [escenas]);
  if (!fotos.length) return null;
  const grande = fotos[i];
  const chicas = [...fotos.slice(i + 1), ...fotos.slice(0, i)].slice(0, CHICAS);
  const link = (f: FotoHero) => `/tienda?q=${encodeURIComponent(f.nombre)}`;

  return (
    <div className={styles.heroFotos}>
      <div className={styles.escena} aria-hidden>
        <Link key={grande.id} href={link(grande)} className={styles.grande} tabIndex={-1}>
          <img src={imgSrc(grande.imagenUrl)} alt="" loading="eager" />
        </Link>
        {chicas.map((f, k) => (
          <Link key={f.id} href={link(f)} className={`${styles.chica} ${styles[`chica${k + 1}`]}`} tabIndex={-1}>
            <img src={imgSrc(f.imagenUrl)} alt="" loading="lazy" />
          </Link>
        ))}
      </div>
      {escenas > 1 && (
        <div className={styles.puntos} role="tablist" aria-label="Productos del hero">
          {Array.from({ length: escenas }, (_, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Ver ${fotos[k].nombre}`} className={`${styles.punto} ${k === i ? styles.puntoActivo : ''}`} onClick={() => setI(k)} />
          ))}
        </div>
      )}
    </div>
  );
}
