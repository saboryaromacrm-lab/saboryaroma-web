import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import type { Termino } from '@/lib/types';
import styles from './MarcasCarousel.module.css';

/** Auto-scroll infinito (CSS puro) que se pausa al pasar el mouse — el contenido se duplica una vez para el loop. */
export function MarcasCarousel({ marcas }: { marcas: Termino[] }) {
  if (!marcas.length) return null;

  const duracion = Math.max(18, marcas.length * 3.5);

  const tarjeta = (m: Termino, key: string) => (
    <Link key={key} href={`/tienda?marca=${m.id}`} className={styles.card}>
      <img src={imgSrc(m.imagenUrl) || '/placeholder-marca.svg'} alt={m.nombre} className={styles.logo} loading="lazy" />
    </Link>
  );

  return (
    <section id="marcas" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Nuestras principales marcas</h2>
        <p className={styles.subtitle}>Trabajamos con las mejores marcas del mercado</p>
      </div>

      <div className={styles.slider}>
        <div className={styles.track} style={{ animationDuration: `${duracion}s` }}>
          {marcas.map((m) => tarjeta(m, `a-${m.id}`))}
          {marcas.map((m) => tarjeta(m, `b-${m.id}`))}
        </div>
      </div>

      <p className={styles.hint}>Pasá el mouse para pausar</p>
    </section>
  );
}
