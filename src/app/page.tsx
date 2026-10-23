import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import { catalogoConSesion } from '@/lib/catalogoServidor';
import { ProductCard } from '@/components/ProductCard';
import { ProductCarousel } from '@/components/ProductCarousel';
import { CarruselBanners } from '@/components/CarruselBanners';
import { MarcasCarousel } from '@/components/MarcasCarousel';
import { HomeMinorista } from '@/components/minorista/HomeMinorista';
import { NutriRescateBanner } from '@/components/NutriRescate';
import { enRescate } from '@/lib/nutrirescate';
import { bannersTienda } from '@/lib/bannersTienda';
import { metaPagina } from '@/lib/seo';
import styles from './page.module.css';

/** La portada: el título y la descripción del sitio, como dirección única para Google. */
export async function generateMetadata() {
  return metaPagina((await catalogoConSesion().catch(() => null))?.sitio, { ruta: '/' });
}

export default async function HomePage() {
  const cat = await catalogoConSesion().catch(() => null);

  if (!cat) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <p>No pudimos conectar con la tienda. Probá de nuevo en un momento.</p>
      </div>
    );
  }
  /* La portada minorista es otra (0173): las ofertas al frente. */
  if (cat.modo === 'minorista') return <HomeMinorista cat={cat} />;

  // La grilla central la curan desde el módulo Web (★ Destacado); si nadie
  // marcó nada todavía, una selección automática mantiene la portada viva.
  const destacados = cat.items.filter((p) => p.destacado);
  const seleccion = destacados.length ? destacados : cat.items.slice(0, 8);
  const enOferta = cat.items.filter((p) => p.oferta);
  const reingresados = cat.items.filter((p) => p.reingreso && !p.oferta);
  const rescate = enRescate(cat.items);

  return (
    <div>
      <CarruselBanners banners={bannersTienda(cat, 'mayorista')} />

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

      {/* NutriRescate (20/10/2026): lo próximo a vencer, si hay. Al final de la portada (23/10/2026, pedido del dueño). */}
      {rescate.length > 0 && (
        <div className={`container ${styles.rescate}`}>
          <NutriRescateBanner items={rescate} conPrecios={cat.conPrecios !== false} enPortada />
        </div>
      )}
    </div>
  );
}
