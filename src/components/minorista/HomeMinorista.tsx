import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import { money } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';
import { ProductCarousel } from '@/components/ProductCarousel';
import { MarcasCarousel } from '@/components/MarcasCarousel';
import type { Catalogo } from '@/lib/types';
import styles from './HomeMinorista.module.css';

/** Cuántas ofertas van en la grilla grande de arriba. */
const OFERTAS_AL_FRENTE = 8;

/**
 * LA PORTADA MINORISTA (0173, 16/10/2026, pedido del dueño): otra cara para el
 * consumidor final. Las OFERTAS van primero y en grande; después las categorías
 * para entrar de un toque, lo que volvió, los destacados y las marcas. Todo
 * sale del mismo catálogo; no hay contenido fijo que mantener aparte.
 */
export function HomeMinorista({ cat }: { cat: Catalogo }) {
  const enOferta = cat.items.filter((p) => p.oferta && p.enStock);
  const destacados = cat.items.filter((p) => p.destacado);
  const seleccion = destacados.length ? destacados : cat.items.filter((p) => p.enStock).slice(0, 8);
  const reingresados = cat.items.filter((p) => p.reingreso && !p.oferta);
  const envioGratis = cat.envioGratisDesde ?? 0;

  return (
    <div className={styles.portada}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroTexto}>
            <p className={styles.eyebrow}>Dietética · Formosa · Tienda minorista</p>
            <h1 className={styles.titulo}>Lo natural, al precio de la góndola.</h1>
            <p className={styles.sub}>
              Elegí, pedí y te lo llevás o te lo llevamos. Sin mínimo de compra, sin registro: solo tu WhatsApp.
            </p>
            <div className={styles.heroBotones}>
              {enOferta.length > 0 && <a href="#ofertas" className={styles.ctaOfertas}>🔥 Ver las ofertas</a>}
              <Link href="/tienda" className={styles.ctaTienda}>Ir a la tienda →</Link>
            </div>
          </div>
          <ul className={styles.heroDatos} aria-label="Lo que ofrece la tienda">
            <li><strong>{cat.items.length}</strong><span>productos</span></li>
            <li><strong>{cat.marcas.length}</strong><span>marcas</span></li>
            <li><strong>{envioGratis > 0 ? money(envioGratis) : 'Retiro'}</strong><span>{envioGratis > 0 ? 'envío gratis desde' : 'en el local o envío'}</span></li>
          </ul>
        </div>
      </section>

      {enOferta.length > 0 && (
        <section id="ofertas" className={`container ${styles.seccion}`}>
          <div className={styles.seccionHead}>
            <div>
              <h2 className={styles.seccionTitulo}><span className={styles.fuego}>🔥</span> Ofertas de hoy</h2>
              <p className={styles.seccionSub}>Precios especiales mientras duren.</p>
            </div>
            {enOferta.length > OFERTAS_AL_FRENTE && <Link href="/tienda?oferta=1" className={styles.verTodo}>Ver las {enOferta.length} ofertas →</Link>}
          </div>
          <div className={styles.gridOfertas}>
            {enOferta.slice(0, OFERTAS_AL_FRENTE).map((p) => <ProductCard key={p.id} producto={p} />)}
          </div>
        </section>
      )}

      {cat.categorias.length > 0 && (
        <section className={`container ${styles.seccion}`}>
          <h2 className={styles.seccionTitulo}>¿Qué buscás?</h2>
          <div className={styles.chips}>
            {cat.categorias.map((c) => (
              <Link key={c.id} href={`/tienda?cat=${c.id}`} className={styles.chip}>
                <img src={imgSrc(c.imagenUrl) || '/placeholder-categoria.svg'} alt="" loading="lazy" className={styles.chipImg} />
                <span>{c.nombre}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductCarousel titulo="Volvieron a stock" subtitulo="Lo que estaba agotado y ya podés volver a pedir" productos={reingresados} />

      {seleccion.length > 0 && (
        <section className={`container ${styles.seccion}`}>
          <div className={styles.seccionHead}>
            <div>
              <h2 className={styles.seccionTitulo}>{destacados.length ? 'Los elegidos de la casa' : 'Para empezar'}</h2>
              <p className={styles.seccionSub}>{destacados.length ? 'Lo que más recomendamos' : 'Una selección de nuestro catálogo'}</p>
            </div>
            <Link href="/tienda" className={styles.verTodo}>Ver todo el catálogo →</Link>
          </div>
          <div className={styles.grid}>
            {seleccion.map((p) => <ProductCard key={p.id} producto={p} />)}
          </div>
        </section>
      )}

      <MarcasCarousel marcas={cat.marcas} />
    </div>
  );
}
