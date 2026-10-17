import Link from 'next/link';
import { imgSrc } from '@/lib/api';
import { catalogoConSesion } from '@/lib/catalogoServidor';
import { norm } from '@/lib/format';
import { jsonLdString } from '@/lib/jsonLd';
import { ProductCard } from '@/components/ProductCard';
import { ListaProductos } from '@/components/ListaProductos';
import { ShopFilters } from '@/components/ShopFilters';
import { IngresarParaComprar } from '@/components/Ingreso';
import { LEMA_NUTRIOFERTAS, NUTRIOFERTAS, mayorDescuento } from '@/lib/nutriofertas';
import { esMultiUnidad } from '@/lib/oferta';
import type { ItemCatalogo } from '@/lib/types';
import styles from './page.module.css';

export const metadata = {
  title: 'Tienda',
  description: 'Catálogo completo: productos naturales, sin TACC y orgánicos, por menor y por mayor.',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

const idsDe = (v?: string) => new Set((v ?? '').split(',').filter(Boolean).map(Number));

/**
 * JSON-LD de la grilla (ItemList de Product): los buscadores entienden qué se
 * vende y a cuánto sin scrapear el HTML. No hay página por producto todavía,
 * así que cada uno apunta a la tienda. Sin precio (el que no ingresó, 0155)
 * no se publica la oferta: el precio mayorista no sale ni para los buscadores.
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
        offers: p.precio > 0 ? {
          '@type': 'Offer',
          price: (p.oferta?.precioOferta ?? p.precio).toFixed(2),
          priceCurrency: 'ARS',
          availability: p.enStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        } : undefined,
      },
    })),
  };
}

/**
 * EL ENCABEZADO DE NUTRIOFERTAS (17/10/2026, pedido del dueño: «más decorada,
 * más de ofertas, distinta a la tienda»): franja naranja con etiquetas de
 * precio de fondo, el nombre en grande, el lema y lo que hay —cuántas, hasta
 * cuánto de descuento y si hay promos por cantidad—, todo sacado del catálogo.
 */
function NutriOfertasHero({ items, sinSesion }: { items: ItemCatalogo[]; sinSesion: boolean }) {
  const hasta = mayorDescuento(items);
  const porCantidad = items.some((p) => esMultiUnidad(p.oferta));
  return (
    <div className={styles.nutriHero}>
      <div className={`container ${styles.nutriInner}`}>
        <span className={styles.nutriCinta}>✓ Ofertas reales</span>
        <h1 className={styles.nutriTitulo}><span aria-hidden>🔥</span> {NUTRIOFERTAS}</h1>
        <p className={styles.nutriLema}>{LEMA_NUTRIOFERTAS}</p>
        <ul className={styles.nutriDatos}>
          {/* Sin ingresar no viajan las ofertas (0178): no hay qué contar. */}
          {sinSesion ? <li>🔒 Ingresá con tu WhatsApp para verlas</li> : <li>{items.length} producto{items.length === 1 ? '' : 's'} en oferta</li>}
          {hasta > 0 && <li>Hasta <strong>{hasta}% OFF</strong></li>}
          {porCantidad && <li>Promos por cantidad: <strong>3×2, 2ª unidad y packs</strong></li>}
        </ul>
      </div>
    </div>
  );
}

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const cat = await catalogoConSesion().catch(() => null);

  if (!cat) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <p>No pudimos conectar con la tienda. Probá de nuevo en un momento.</p>
      </div>
    );
  }

  const cats = idsDe(sp.cat);
  const subs = idsDe(sp.sub);
  const marcasSel = idsDe(sp.marca);
  const tags = idsDe(sp.tag);
  const q = norm((sp.q ?? '').trim());
  /** `?oferta=1`: solo lo que está en promo (la portada minorista lleva ahí). */
  const soloOfertas = sp.oferta === '1';
  /** En la minorista es la página de NutriOfertas: con su propio encabezado y su fondo (17/10/2026). */
  const nutri = soloOfertas && cat.modo === 'minorista';
  /** Sin ingresar no viajan precios ni ofertas (0155 / 0178): la página de ofertas invita a ingresar. */
  const sinSesion = cat.conPrecios === false;

  const items = cat.items.filter((p: ItemCatalogo) => {
    if (cats.size && (!p.categoriaId || !cats.has(p.categoriaId))) return false;
    if (subs.size && (!p.subcategoriaId || !subs.has(p.subcategoriaId))) return false;
    if (marcasSel.size && (!p.marcaId || !marcasSel.has(p.marcaId))) return false;
    if (tags.size && !p.etiquetas.some((e) => tags.has(e.id))) return false;
    if (q && !norm(p.nombre).includes(q) && !norm(p.marca).includes(q)) return false;
    if (soloOfertas && !p.oferta) return false;
    return true;
  });

  // Igual que el tema original: si hay un único filtro de contexto activo, la página
  // "se convierte" en el archivo de ese término (breadcrumb + título propios).
  let miga: string | null = null;
  /** Con una subcategoría, la categoría va en la miga como enlace: un toque y se ve la categoría entera. */
  let migaPadre: { texto: string; href: string } | null = null;
  let titulo = 'Tienda';
  const subUnica = subs.size === 1 ? (cat.subcategorias ?? []).find((s) => subs.has(s.id)) : undefined;
  if (sp.q?.trim()) {
    miga = `Resultados para "${sp.q.trim()}"`;
    titulo = miga;
  } else if (soloOfertas) {
    miga = nutri ? NUTRIOFERTAS : 'Ofertas'; titulo = nutri ? `🔥 ${NUTRIOFERTAS}` : '🔥 Ofertas';
  } else if (subUnica && cats.size <= 1 && !marcasSel.size && !tags.size) {
    const padre = cat.categorias.find((c) => c.id === subUnica.categoriaId);
    if (padre) migaPadre = { texto: padre.nombre, href: `/tienda?cat=${padre.id}` };
    miga = subUnica.nombre; titulo = subUnica.nombre;
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
    <div className={`${styles.shopPage} ${nutri ? styles.nutriPage : ''}`}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLdProductos(items)) }}
      />
      <div className={styles.breadcrumbBar}>
        <div className={`container ${styles.breadcrumbInner}`}>
          <Link href="/">Inicio</Link>
          <span className={styles.sep}>›</span>
          <Link href="/tienda">Tienda</Link>
          {migaPadre && (
            <>
              <span className={styles.sep}>›</span>
              <Link href={migaPadre.href}>{migaPadre.texto}</Link>
            </>
          )}
          {miga && (
            <>
              <span className={styles.sep}>›</span>
              <span className={styles.current}>{miga}</span>
            </>
          )}
        </div>
      </div>

      {nutri ? (
        <NutriOfertasHero items={items} sinSesion={sinSesion} />
      ) : (
        <div className={styles.headerBar}>
          <div className={`container ${styles.headerInner}`}>
            <h1 className={styles.title}>{titulo}</h1>
            <span className={styles.count}>{items.length} producto{items.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}

      <div className={`container ${styles.layout}`}>
        <ShopFilters categorias={cat.categorias} subcategorias={cat.subcategorias ?? []} marcas={cat.marcas} etiquetas={cat.etiquetas} productos={cat.items} />

        <section>
          {soloOfertas && sinSesion ? (
            <IngresarParaComprar />
          ) : items.length === 0 ? (
            <p className={styles.vacio}>No se encontraron productos que coincidan con tu selección.</p>
          ) : cat.vistaLista ? (
            <div className={styles.lista}>
              <div className={styles.listaCabecera} aria-hidden="true">
                <span>Producto</span><span>Precio</span><span>Cantidad</span>
              </div>
              {/* CATÁLOGO SIN FOTOS (4/10/2026): con `vistaLista` encendido en el ERP, renglones en vez de
                  tarjetas. El renglón es un archivo aparte que se descarga solo acá (ver ListaProductos). */}
              <ListaProductos items={items} className={styles.listaItems} />
            </div>
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
