import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import type { Catalogo } from '@/lib/types';
import styles from './SinTaccBanner.module.css';

/** Cuántas fotos de productos van en el collage (en el celular se ven las tres primeras). */
const FOTOS = 5;
/** Cuántas categorías se ofrecen como atajo, de las que más productos sin TACC tienen. */
const ATAJOS = 3;

/** «Sin T.A.C.C.», «SIN TACC», «sin tacc»… es la misma etiqueta. */
const esSinTacc = (nombre: string) => nombre.toUpperCase().replace(/[.\s]/g, '') === 'SINTACC';

/**
 * EL BANNER SIN TACC DE LA PORTADA (28/10/2026, pedido del dueño: «Surtite de
 * tus productos»). Todo sale de la etiqueta SIN TACC del catálogo: cuántos
 * productos hay, las fotos y los atajos por categoría; el logo y el botón
 * llevan a la tienda con esa etiqueta puesta. Sin la etiqueta, o sin productos
 * con ella, no se muestra (y tampoco su lugar en la página: `className` es el
 * del envoltorio).
 */
export function SinTaccBanner({ cat, className }: { cat: Catalogo; className?: string }) {
  const etiqueta = cat.etiquetas.find((e) => esSinTacc(e.nombre));
  if (!etiqueta?.count) return null;
  const href = `/tienda?tag=${etiqueta.id}`;
  const productos = cat.items.filter((p) => p.etiquetas.some((e) => e.id === etiqueta.id));
  /* Agrupados por categoría, de la que más tiene a la que menos: los atajos son las primeras y
   * las fotos salen de a una por categoría (si no, eran cinco alfajores de la misma marca). */
  const porCategoria = new Map<number | null, typeof productos>();
  for (const p of productos) porCategoria.set(p.categoriaId, [...(porCategoria.get(p.categoriaId) ?? []), p]);
  const grupos = [...porCategoria].sort((a, b) => b[1].length - a[1].length);
  const atajos = grupos.slice(0, ATAJOS)
    .map(([id]) => cat.categorias.find((c) => c.id === id)).filter((c) => !!c);
  const conFoto = grupos.map(([, ps]) => ps.filter((p) => p.imagenUrl && p.enStock));
  const fotos: typeof productos = [];
  for (let i = 0; fotos.length < FOTOS && conFoto.some((ps) => ps.length > i); i++) {
    for (const ps of conFoto) if (ps[i] && fotos.length < FOTOS) fotos.push(ps[i]);
  }

  return (
    <div className={className}>
      <section className={styles.banner} aria-label="Productos sin TACC">
        <div className={styles.texto}>
          <div className={styles.filaSello}>
            <Link href={href} className={styles.sello} aria-label={`Ver los productos ${etiqueta.nombre}`}>
              <img src="/sin-tacc.webp" alt="Sin T.A.C.C." width={480} height={480} />
            </Link>
            <span className={styles.pill}>
              <b>{etiqueta.count}</b> producto{etiqueta.count === 1 ? '' : 's'} apto{etiqueta.count === 1 ? '' : 's'} para celíacos
            </span>
          </div>
          <div className={styles.titulos}>
            <h2 className={styles.titulo}>Surtite de tus productos <span className={styles.resalta}>SIN TACC</span></h2>
            <p className={styles.bajada}>
              Alfajores, galletitas, pastas, harinas y premezclas, panificados y snacks. Todo lo que necesitás, en un solo lugar.
            </p>
          </div>
          <div className={styles.acciones}>
            <Link href={href} className={styles.cta}>Ver productos sin TACC <span aria-hidden>→</span></Link>
            {atajos.length > 0 && (
              <div className={styles.atajos}>
                {atajos.map((c) => (
                  <Link key={c.id} href={`${href}&cat=${c.id}`} className={styles.atajo}>{c.nombre}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
        {fotos.length > 0 && (
          <Link href={href} className={styles.collage} aria-hidden tabIndex={-1}>
            {fotos.map((p, i) => (
              <span key={p.id} className={`${styles.prod} ${styles[`p${i + 1}`]}`}>
                <img src={imgSrc(p.imagenUrl)} alt="" loading="lazy" />
              </span>
            ))}
          </Link>
        )}
      </section>
    </div>
  );
}
