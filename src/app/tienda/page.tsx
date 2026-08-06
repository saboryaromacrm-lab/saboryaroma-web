import Link from 'next/link';
import { getCatalogo, imgSrc } from '@/lib/api';
import { norm } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';
import { ShopFilters } from '@/components/ShopFilters';
import type { ItemCatalogo } from '@/lib/types';
import styles from './page.module.css';

export const metadata = {
  title: 'Tienda',
  description: 'Catálogo mayorista completo: productos naturales, sin TACC y orgánicos, con precios de distribuidora.',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

const idsDe = (v?: string) => new Set((v ?? '').split(',').filter(Boolean).map(Number));

/**
 * JSON-LD de la grilla (ItemList de Product): los buscadores entienden qué se
 * vende y a cuánto sin scrapear el HTML. No hay página por producto todavía,
 * así que cada uno apunta a la tienda.
 */
function jsonLdProductos(items: ItemCatalogo[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.slice(0, 30).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.nombre,
        brand: p.marca ? { '@type': 'Brand', name: p.marca } : undefined,
        image: imgSrc(p.imagenUrl) || undefined,
        url: `${SITE_URL}/tienda`,
        offers: {
          '@type': 'Offer',
          price: (p.oferta?.precioOferta ?? p.precio).toFixed(2),
          priceCurrency: 'ARS',
          availability: p.enStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
    })),
  };
}

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const cat = await getCatalogo().catch(() => null);

  if (!cat) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p>No pudimos conectar con la tienda. Probá de nuevo en un momento.</p>
      </div>
    );
  }

  const cats = idsDe(sp.cat);
  const marcasSel = idsDe(sp.marca);
  const tags = idsDe(sp.tag);
  const q = norm((sp.q ?? '').trim());

  const items = cat.items.filter((p: ItemCatalogo) => {
    if (cats.size && (!p.categoriaId || !cats.has(p.categoriaId))) return false;
    if (marcasSel.size && (!p.marcaId || !marcasSel.has(p.marcaId))) return false;
    if (tags.size && !p.etiquetas.some((e) => tags.has(e.id))) return false;
    if (q && !norm(p.nombre).includes(q) && !norm(p.marca).includes(q)) return false;
    return true;
  });

  // Igual que el tema original: si hay un único filtro de contexto activo, la página
  // "se convierte" en el archivo de ese término (breadcrumb + título propios).
  let miga: string | null = null;
  let titulo = 'Tienda';
  if (sp.q?.trim()) {
    miga = `Resultados para "${sp.q.trim()}"`;
    titulo = miga;
  } else if (cats.size === 1) {
    const t = cat.categorias.find((c) => cats.has(c.id));
    if (t) { miga = t.nombre; titulo = t.nombre; }
  } else if (marcasSel.size === 1) {
    const t = cat.marcas.find((m) => marcasSel.has(m.id));
    if (t) { miga = t.nombre; titulo = t.nombre; }
  } else if (tags.size === 1) {
    const t = cat.etiquetas.find((e) => tags.has(e.id));
    if (t) { miga = t.nombre; titulo = t.nombre; }
  }

  return (
    <div className={styles.shopPage}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProductos(items)) }}
      />
      <div className={styles.breadcrumbBar}>
        <div className={`container ${styles.breadcrumbInner}`}>
          <Link href="/">Inicio</Link>
          <span className={styles.sep}>›</span>
          <Link href="/tienda">Tienda</Link>
          {miga && (
            <>
              <span className={styles.sep}>›</span>
              <span className={styles.current}>{miga}</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.headerBar}>
        <div className={`container ${styles.headerInner}`}>
          <h1 className={styles.title}>{titulo}</h1>
          <span className={styles.count}>{items.length} producto{items.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className={`container ${styles.layout}`}>
        <ShopFilters categorias={cat.categorias} marcas={cat.marcas} etiquetas={cat.etiquetas} productos={cat.items} />

        <section>
          {items.length === 0 ? (
            <p className={styles.vacio}>No se encontraron productos que coincidan con tu selección.</p>
          ) : (
            <div className={styles.grid}>
              {items.map((p) => <ProductCard key={p.id} producto={p} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
