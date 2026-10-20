import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { catalogoConSesion } from '@/lib/catalogoServidor';
import { linkWhatsApp } from '@/lib/format';
import { jsonLdString } from '@/lib/jsonLd';
import { idDeRuta, rutaProducto } from '@/lib/rutas';
import { metaPagina, NOMBRE, productoSchema } from '@/lib/seo';
import { Migas } from '@/components/Migas';
import { ProductCard } from '@/components/ProductCard';
import { ProductCarousel } from '@/components/ProductCarousel';
import type { ItemCatalogo } from '@/lib/types';
import styles from './page.module.css';

type Props = { params: Promise<{ slug: string }> };

/** El producto de la dirección, del catálogo de quien mira (su modo y su sesión: con precios si ingresó). */
async function buscar(params: Props['params']) {
  const [{ slug }, cat] = await Promise.all([params, catalogoConSesion().catch(() => null)]);
  const id = idDeRuta(slug);
  return { slug, cat, p: cat?.items.find((x) => x.id === id) ?? null };
}

const descripcionDe = (p: ItemCatalogo) => [
  p.nombre, p.marca, p.categoria,
].filter(Boolean).join(' · ') + `. Comprá online en ${NOMBRE} (Formosa): retirás en el local o te lo llevamos.`;

export async function generateMetadata({ params }: Props) {
  const { cat, p } = await buscar(params);
  if (!p) return { title: 'Producto no encontrado', robots: { index: false, follow: true } };
  return metaPagina(cat?.sitio, { titulo: p.nombre, descripcion: descripcionDe(p), ruta: rutaProducto(p), imagen: p.imagenUrl });
}

/**
 * LA PÁGINA DE UN PRODUCTO (20/10/2026, SEO): una dirección propia para que
 * Google lo encuentre y para compartirlo. Es la misma tarjeta de la tienda
 * (tamaños, cantidad, agregar al carrito), con sus datos enlazados a la
 * categoría, la marca y las etiquetas, y más de la misma categoría abajo.
 * Si el nombre cambió en el ERP, el link viejo redirige al nombre nuevo.
 */
export default async function ProductoPage({ params }: Props) {
  const { slug, cat, p } = await buscar(params);
  if (!cat) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <p>No pudimos conectar con la tienda. Probá de nuevo en un momento.</p>
      </div>
    );
  }
  if (!p) notFound();
  const ruta = rutaProducto(p);
  if (`/producto/${slug}` !== ruta) permanentRedirect(ruta);

  const sub = p.subcategoriaId ? (cat.subcategorias ?? []).find((s) => s.id === p.subcategoriaId) : undefined;
  const enCategoria = p.categoriaId ? `/tienda?cat=${p.categoriaId}` : '/tienda';
  /* Más de la misma categoría, con stock; primero los de su subcategoría. */
  const relacionados = cat.items
    .filter((x) => x.id !== p.id && x.enStock && p.categoriaId && x.categoriaId === p.categoriaId)
    .sort((a, b) => Number(b.subcategoriaId === p.subcategoriaId) - Number(a.subcategoriaId === p.subcategoriaId))
    .slice(0, 12);
  const consulta = `${linkWhatsApp(cat.sitio.contacto.whatsapp)}?text=${encodeURIComponent(`Hola, quería consultar por ${p.nombre}`)}`;

  return (
    <div className={styles.pagina}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString({ '@context': 'https://schema.org', ...productoSchema(p) }) }}
      />
      <Migas pasos={[
        { texto: 'Inicio', href: '/' },
        { texto: 'Tienda', href: '/tienda' },
        ...(p.categoriaId && p.categoria ? [{ texto: p.categoria, href: enCategoria }] : []),
        { texto: p.nombre },
      ]}
      />

      <div className={`container ${styles.cuerpo}`}>
        <ProductCard producto={p} ficha />

        <aside className={styles.datos}>
          <dl className={styles.lista}>
            {p.marca && (
              <div>
                <dt>Marca</dt>
                <dd>{p.marcaId ? <Link href={`/tienda?marca=${p.marcaId}`}>{p.marca}</Link> : p.marca}</dd>
              </div>
            )}
            {p.categoria && (
              <div>
                <dt>Categoría</dt>
                <dd>
                  <Link href={enCategoria}>{p.categoria}</Link>
                  {sub && <> › <Link href={`${enCategoria}&sub=${sub.id}`}>{sub.nombre}</Link></>}
                </dd>
              </div>
            )}
            {p.etiquetas.length > 0 && (
              <div>
                <dt>Es</dt>
                <dd className={styles.etiquetas}>
                  {p.etiquetas.map((e) => <Link key={e.id} href={`/tienda?tag=${e.id}`} className={styles.etiqueta}>{e.nombre}</Link>)}
                </dd>
              </div>
            )}
          </dl>
          <a href={consulta} target="_blank" rel="noopener noreferrer" className={styles.consulta}>¿Dudas? Consultanos por WhatsApp</a>
          <Link href={enCategoria} className={styles.volver}>← Ver más de {p.categoria || 'la tienda'}</Link>
        </aside>
      </div>

      {p.categoria && <ProductCarousel titulo={`Más de ${p.categoria}`} productos={relacionados} />}
    </div>
  );
}
