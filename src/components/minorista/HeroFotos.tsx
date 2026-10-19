'use client';

import { useCallback, useEffect, useState } from 'react';
import { imgSrc } from '@/lib/api';
import { ProductoModal } from '@/components/ProductoModal';
import type { ItemCatalogo } from '@/lib/types';
import styles from './HomeMinorista.module.css';

/** Cuántas escenas distintas gira el hero y cuántas fotos chicas flotan alrededor de la grande. */
const ESCENAS = 3;
const CHICAS = 5;
const ESCENA_MS = 7000;

/**
 * LAS FOTOS DEL HERO (17/10/2026, a partir de magicspoon.com): un producto en
 * grande, apenas girado, y otros chicos flotando alrededor, algunos cortados
 * por el borde. Cada 7 s cambia el producto grande (los puntos de abajo lo
 * eligen a mano). Las fotos vienen con fondo blanco: `mix-blend-mode` lo funde
 * con el degradé y quedan como recortes. Tocar una abre el producto en una
 * ventanita para agregarlo ahí mismo (19/10/2026).
 */
export function HeroFotos({ fotos }: { fotos: ItemCatalogo[] }) {
  const escenas = Math.min(ESCENAS, fotos.length);
  const [i, setI] = useState(0);
  /* Por id y no el objeto: si el catálogo se renueva (al ingresar llegan los precios), la ventanita muestra el actual. */
  const [abiertoId, setAbiertoId] = useState<number | null>(null);
  const cerrar = useCallback(() => setAbiertoId(null), []);
  useEffect(() => {
    if (escenas < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % escenas), ESCENA_MS);
    return () => clearInterval(t);
  }, [escenas]);
  if (!fotos.length) return null;
  const grande = fotos[i];
  const chicas = [...fotos.slice(i + 1), ...fotos.slice(0, i)].slice(0, CHICAS);
  const abierto = fotos.find((f) => f.id === abiertoId);

  return (
    <div className={styles.heroFotos}>
      <div className={styles.escena} aria-hidden>
        <button key={grande.id} type="button" className={styles.grande} tabIndex={-1} onClick={() => setAbiertoId(grande.id)}>
          <img src={imgSrc(grande.imagenUrl)} alt="" loading="eager" />
        </button>
        {chicas.map((f, k) => (
          <button key={f.id} type="button" className={`${styles.chica} ${styles[`chica${k + 1}`]}`} tabIndex={-1} onClick={() => setAbiertoId(f.id)}>
            <img src={imgSrc(f.imagenUrl)} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {escenas > 1 && (
        <div className={styles.puntos} role="tablist" aria-label="Productos del hero">
          {Array.from({ length: escenas }, (_, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Ver ${fotos[k].nombre}`} className={`${styles.punto} ${k === i ? styles.puntoActivo : ''}`} onClick={() => setI(k)} />
          ))}
        </div>
      )}
      {abierto && <ProductoModal producto={abierto} onCerrar={cerrar} />}
    </div>
  );
}
