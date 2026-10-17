import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import { linkWhatsApp, money } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';
import { ProductCarousel } from '@/components/ProductCarousel';
import { MarcasCarousel } from '@/components/MarcasCarousel';
import { HeroFotos } from './HeroFotos';
import type { Catalogo, ItemCatalogo, PortadaMinorista } from '@/lib/types';
import styles from './HomeMinorista.module.css';

/** Cuántas ofertas van en la grilla grande de arriba. */
const OFERTAS_AL_FRENTE = 8;
/** Cuántos productos con foto entran al hero (3 escenas de uno grande + 5 chicos). */
const FOTOS_HERO = 8;

/**
 * Si la API es anterior al 17/10/2026 no manda los textos: la portada se arma
 * igual, con lo que sale del catálogo, y los bloques de texto no aparecen.
 */
const VACIO: PortadaMinorista = {
  avisos: [], hero: { eyebrow: '', titulo: '', texto: '', cta1: { texto: '', url: '/' }, cta2: { texto: '', url: '/' } },
  sellos: [], beneficios: { titulo: '', items: [] }, cierre: { titulo: '', texto: '', cta: '' },
};

/**
 * EL BORDE DE SELLO (17/10/2026): un polígono de puntas cortas alrededor del
 * círculo, calculado una vez. Sin imagen ni SVG: es un `clip-path`.
 */
const SELLO_CLIP = (() => {
  const puntos: string[] = [];
  for (let i = 0; i < 48; i += 1) {
    const r = i % 2 ? 46 : 50;
    const a = (i / 48) * Math.PI * 2;
    puntos.push(`${(50 + r * Math.cos(a)).toFixed(2)}% ${(50 + r * Math.sin(a)).toFixed(2)}%`);
  }
  return `polygon(${puntos.join(', ')})`;
})();

/** Las fotos del hero: destacados con imagen primero, después ofertas, después lo que haya con stock. */
function fotosDelHero(items: ItemCatalogo[]) {
  const conFoto = items.filter((p) => p.imagenUrl && p.enStock);
  const orden = [...conFoto.filter((p) => p.destacado), ...conFoto.filter((p) => !p.destacado && p.oferta), ...conFoto.filter((p) => !p.destacado && !p.oferta)];
  return orden.slice(0, FOTOS_HERO);
}

/**
 * LA PORTADA MINORISTA (0173 · rediseño 17/10/2026, pedido del dueño a partir
 * de magicspoon.com, con los colores de la casa). Un hero a pantalla completa
 * con degradé, el encabezado encima, las fotos de los productos flotando a la
 * izquierda y el título, los botones y los sellos a la derecha; después las
 * categorías en círculos, las OFERTAS en grande, los elegidos, los beneficios,
 * lo que volvió, las marcas y un cierre que lleva al WhatsApp. Los textos se
 * editan en el ERP (`sitio.minorista`); los productos salen del catálogo.
 */
export function HomeMinorista({ cat }: { cat: Catalogo }) {
  const p = cat.sitio.minorista ?? VACIO;
  const enOferta = cat.items.filter((x) => x.oferta && x.enStock);
  const destacados = cat.items.filter((x) => x.destacado);
  const seleccion = destacados.length ? destacados : cat.items.filter((x) => x.enStock).slice(0, 8);
  const reingresados = cat.items.filter((x) => x.reingreso && !x.oferta);
  const fotos = fotosDelHero(cat.items);
  const envioGratis = cat.envioGratisDesde ?? 0;
  /* El envío gratis es un sello solo si está configurado: no hace falta escribirlo. */
  const sellos = [...p.sellos, ...(envioGratis > 0 ? [`Envío gratis desde ${money(envioGratis)}`] : [])].slice(0, 4);
  const wa = linkWhatsApp(cat.sitio.contacto.whatsapp);
  const beneficios = p.beneficios.items.filter((b) => b.titulo);

  return (
    <div className={styles.portada}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <HeroFotos fotos={fotos} />
          <div className={styles.heroTexto}>
            {p.hero.eyebrow && <p className={styles.eyebrow}>{p.hero.eyebrow}</p>}
            <h1 className={styles.titulo}>{p.hero.titulo || 'Sabor y Aroma'}</h1>
            {p.hero.texto && <p className={styles.sub}>{p.hero.texto}</p>}
            <div className={styles.heroBotones}>
              {p.hero.cta1.texto && (enOferta.length > 0 || p.hero.cta1.url !== '/#ofertas') && (
                <Link href={p.hero.cta1.url} className={styles.ctaPrincipal}>{p.hero.cta1.texto}</Link>
              )}
              {p.hero.cta2.texto && <Link href={p.hero.cta2.url} className={styles.ctaSecundario}>{p.hero.cta2.texto}</Link>}
            </div>
            {sellos.length > 0 && (
              <ul className={styles.sellos} aria-label="Lo que nos distingue">
                {sellos.map((s) => (
                  <li key={s} className={styles.sello} style={{ clipPath: SELLO_CLIP }}>
                    <span className={styles.selloInner} style={{ clipPath: SELLO_CLIP }}>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {cat.categorias.length > 0 && (
        <section className={`container ${styles.seccion}`}>
          <h2 className={styles.seccionTitulo}>¿Qué buscás?</h2>
          <div className={styles.circulos}>
            {cat.categorias.map((c) => (
              <Link key={c.id} href={`/tienda?cat=${c.id}`} className={styles.circulo}>
                <span className={styles.circuloImg}>
                  <img src={imgSrc(c.imagenUrl) || '/placeholder-categoria.svg'} alt="" loading="lazy" />
                </span>
                <span className={styles.circuloNombre}>{c.nombre}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
            {enOferta.slice(0, OFERTAS_AL_FRENTE).map((x) => <ProductCard key={x.id} producto={x} />)}
          </div>
        </section>
      )}

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
            {seleccion.map((x) => <ProductCard key={x.id} producto={x} />)}
          </div>
        </section>
      )}

      {beneficios.length > 0 && (
        <section className={styles.beneficios}>
          <div className={`container ${styles.beneficiosInner}`}>
            {p.beneficios.titulo && <h2 className={styles.beneficiosTitulo}>{p.beneficios.titulo}</h2>}
            <div className={styles.beneficiosGrid}>
              {beneficios.map((b) => (
                <article key={b.titulo} className={styles.beneficio}>
                  {b.icono && <span className={styles.beneficioIcono} aria-hidden>{b.icono}</span>}
                  <h3>{b.titulo}</h3>
                  {b.texto && <p>{b.texto}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <ProductCarousel titulo="Volvieron a stock" subtitulo="Lo que estaba agotado y ya podés volver a pedir" productos={reingresados} />
      <MarcasCarousel marcas={cat.marcas} />

      {p.cierre.titulo && (
        <section className={`container ${styles.seccion}`}>
          <div className={styles.cierre}>
            <h2 className={styles.cierreTitulo}>{p.cierre.titulo}</h2>
            {p.cierre.texto && <p className={styles.cierreTexto}>{p.cierre.texto}</p>}
            <div className={styles.heroBotones}>
              {wa && p.cierre.cta && <a href={wa} target="_blank" rel="noopener noreferrer" className={styles.ctaPrincipal}>{p.cierre.cta}</a>}
              <Link href="/tienda" className={styles.ctaClaro}>Ir a la tienda →</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
