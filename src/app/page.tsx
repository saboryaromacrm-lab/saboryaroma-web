import Link from 'next/link';
import { getCatalogo, imgSrc } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductCarousel } from '@/components/ProductCarousel';
import { HeroSlider } from '@/components/HeroSlider';
import { MarcasCarousel } from '@/components/MarcasCarousel';
import styles from './page.module.css';

export default async function HomePage() {
  const cat = await getCatalogo().catch(() => null);

  if (!cat) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p>No pudimos conectar con la tienda. Probá de nuevo en un momento.</p>
      </div>
    );
  }

  // La grilla central la curan desde el módulo Web (★ Destacado); si nadie
  // marcó nada todavía, una selección automática mantiene la portada viva.
  const destacados = cat.items.filter((p) => p.destacado);
  const seleccion = destacados.length ? destacados : cat.items.slice(0, 8);
  const enOferta = cat.items.filter((p) => p.oferta);
  const reingresados = cat.items.filter((p) => p.reingreso && !p.oferta);

  return (
    <div>
      <HeroSlider sitio={cat.sitio} />

      <ProductCarousel id="ofertas" variant="ofertas" titulo="Ofertas" subtitulo="Precios especiales por tiempo limitado" productos={enOferta} />
      <ProductCarousel titulo="Volvieron a stock" subtitulo="Productos que estaban agotados y ya podés volver a pedir" productos={reingresados} />

      {cat.categorias.length > 0 && (
        <section className={styles.categoriasBand}>
          <div className={`container ${styles.categoriasInner}`}>
            <h2 className={styles.sectionTitle}>Categorías</h2>
            <div className={styles.catGrid}>
              {cat.categorias.slice(0, 12).map((c) => (
                <Link key={c.id} href={`/tienda?cat=${c.id}`} className={styles.catCard}>
                  <span className={styles.catImgWrap}>
                    <img src={imgSrc(c.imagenUrl) || '/placeholder-categoria.svg'} alt="" className={styles.catImg} loading="lazy" />
                  </span>
                  <span className={styles.catInfo}>
                    <span className={styles.catName}>{c.nombre}</span>
                    <span className={styles.catCount}>{c.count} producto{c.count === 1 ? '' : 's'}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {seleccion.length > 0 && (
        <section className="container" style={{ marginTop: 'var(--space-10)' }}>
          <h2 className={styles.sectionTitle}>{destacados.length ? 'Destacados' : 'Productos'}</h2>
          <p className={styles.sectionSub}>
            {destacados.length ? 'Los elegidos de la casa' : 'Una selección de nuestro catálogo'}
          </p>
          <div className={styles.grid}>
            {seleccion.map((p) => <ProductCard key={p.id} producto={p} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
            <Link href="/tienda" className={styles.verTodo}>Ver todo el catálogo →</Link>
          </div>
        </section>
      )}

      <MarcasCarousel marcas={cat.marcas} />
    </div>
  );
}
