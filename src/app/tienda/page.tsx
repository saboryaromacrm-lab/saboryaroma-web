import { catalogoConSesion } from '@/lib/catalogoServidor';
import { norm } from '@/lib/format';
import { jsonLdString } from '@/lib/jsonLd';
import { ProductCard } from '@/components/ProductCard';
import { ListaProductos } from '@/components/ListaProductos';
import { ShopFilters } from '@/components/ShopFilters';
import { Migas } from '@/components/Migas';
import { IngresarParaComprar } from '@/components/Ingreso';
import { LEMA_NUTRIOFERTAS, NUTRIOFERTAS, mayorDescuento } from '@/lib/nutriofertas';
import { NUTRIRESCATE, URL_NUTRIRESCATE, enRescate } from '@/lib/nutrirescate';
import { NutriRescateBanner } from '@/components/NutriRescate';
import { esMultiUnidad } from '@/lib/oferta';
import { metaPagina, productoSchema } from '@/lib/seo';
import type { Catalogo, ItemCatalogo } from '@/lib/types';
import styles from './page.module.css';

type Params = Record<string, string | undefined>;

const idsDe = (v?: string) => new Set((v ?? '').split(',').filter(Boolean).map(Number));
/** Los parámetros que eligen qué se ve, en orden fijo: para comparar la dirección pedida con la canónica. */
const FILTROS = ['cat', 'sub', 'marca', 'tag', 'oferta', 'rescate', 'q'];
const firma = (p: Params) => FILTROS.filter((k) => p[k]).map((k) => `${k}=${p[k]}`).join('&');

/**
 * QUÉ PÁGINA ES. Igual que el tema original: con un único filtro de contexto
 * la tienda "se convierte" en el archivo de ese término (miga y título
 * propios). Para Google (20/10/2026) esa es una página con su dirección y su
 * título; una búsqueda o una mezcla de filtros es una vista de paso: se ve
 * igual, pero no se indexa. Lo usan la página y sus metadatos.
 */
function paginaDe(cat: Catalogo, sp: Params) {
  const cats = idsDe(sp.cat);
  const subs = idsDe(sp.sub);
  const marcasSel = idsDe(sp.marca);
  const tags = idsDe(sp.tag);
  const busqueda = (sp.q ?? '').trim();
  const q = norm(busqueda);
  /** `?oferta=1`: solo lo que está en promo (la portada minorista lleva ahí). */
  const soloOfertas = sp.oferta === '1';
  /** En la minorista es la página de NutriOfertas: con su propio encabezado y su fondo (17/10/2026). */
  const nutri = soloOfertas && cat.modo === 'minorista';
  /** `?rescate=1`: NutriRescate, lo próximo a vencer (20/10/2026), en los dos modos. */
  const soloRescate = sp.rescate === '1';

  const items = cat.items.filter((p: ItemCatalogo) => {
    if (cats.size && (!p.categoriaId || !cats.has(p.categoriaId))) return false;
    if (subs.size && (!p.subcategoriaId || !subs.has(p.subcategoriaId))) return false;
    if (marcasSel.size && (!p.marcaId || !marcasSel.has(p.marcaId))) return false;
    if (tags.size && !p.etiquetas.some((e) => tags.has(e.id))) return false;
    if (q && !norm(p.nombre).includes(q) && !norm(p.marca).includes(q)) return false;
    if (soloOfertas && !p.oferta) return false;
    if (soloRescate && !p.porVencer) return false;
    return true;
  });

  let miga: string | null = null;
  /** Con una subcategoría, la categoría va en la miga como enlace: un toque y se ve la categoría entera. */
  let migaPadre: { texto: string; href: string } | null = null;
  /** El nombre de la página (sin adornos: es también su título en Google) y su dirección canónica. */
  let nombre = 'Tienda';
  let ruta = '/tienda';
  const termino = (param: string, ids: Set<number>, lista: { id: number; nombre: string }[]) => {
    const t = lista.find((x) => ids.has(x.id));
    if (t) { miga = t.nombre; nombre = t.nombre; ruta = `/tienda?${param}=${t.id}`; }
  };
  const subUnica = subs.size === 1 ? (cat.subcategorias ?? []).find((s) => subs.has(s.id)) : undefined;
  if (busqueda) {
    miga = `Resultados para "${busqueda}"`; nombre = miga;
  } else if (soloOfertas) {
    miga = nutri ? NUTRIOFERTAS : 'Ofertas'; nombre = miga; ruta = '/tienda?oferta=1';
  } else if (soloRescate) {
    miga = NUTRIRESCATE; nombre = miga; ruta = URL_NUTRIRESCATE;
  } else if (subUnica && cats.size <= 1 && !marcasSel.size && !tags.size) {
    const padre = cat.categorias.find((c) => c.id === subUnica.categoriaId);
    if (padre) migaPadre = { texto: padre.nombre, href: `/tienda?cat=${padre.id}` };
    miga = subUnica.nombre; nombre = subUnica.nombre;
    /* La dirección que arma el menú de categorías (Header): la categoría y la subcategoría. */
    ruta = padre ? `/tienda?cat=${padre.id}&sub=${subUnica.id}` : `/tienda?sub=${subUnica.id}`;
  } else if (cats.size === 1) {
    termino('cat', cats, cat.categorias);
  } else if (marcasSel.size === 1) {
    termino('marca', marcasSel, cat.marcas);
  } else if (tags.size === 1) {
    termino('tag', tags, cat.etiquetas);
  }
  const canonica = Object.fromEntries(new URLSearchParams(ruta.split('?')[1] ?? ''));
  const indexar = !busqueda && firma(canonica) === firma(sp);
  /* En NutriRescate, solo lo que tiene stock y lo que vence antes, primero. */
  return { items: soloRescate ? enRescate(items) : items, miga, migaPadre, nombre, ruta, indexar, soloOfertas, nutri, soloRescate };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }) {
  const cat = await catalogoConSesion().catch(() => null);
  if (!cat) return { title: 'Tienda' };
  const pg = paginaDe(cat, await searchParams);
  const n = `${pg.items.length} producto${pg.items.length === 1 ? '' : 's'}`;
  return metaPagina(cat.sitio, {
    titulo: pg.nombre,
    descripcion: pg.ruta === '/tienda'
      ? `Catálogo completo de Sabor y Aroma (Formosa): ${n} naturales, sin TACC y orgánicos para comprar online.`
      : pg.soloRescate
        ? `${NUTRIRESCATE}: productos próximos a vencer con precio reducido en Sabor y Aroma (Formosa). Aprovechalos y ayudanos a no desperdiciar alimentos.`
        : `${pg.nombre} en Sabor y Aroma (Formosa): ${n} para comprar online. Retirás en el local o te lo llevamos.`,
    ruta: pg.ruta,
    indexar: pg.indexar,
  });
}

/**
 * JSON-LD de la grilla (ItemList de Product): los buscadores entienden qué se
 * vende y a cuánto sin scrapear el HTML. Cada uno apunta a su página (20/10/2026).
 */
function jsonLdProductos(items: ItemCatalogo[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: productoSchema(p) })),
  };
}

/**
 * EL ENCABEZADO DE NUTRIOFERTAS (17/10/2026, pedido del dueño: «más decorada,
 * más de ofertas, distinta a la tienda»): franja naranja con etiquetas de
 * precio de fondo, el nombre en grande, el lema y lo que hay —cuántas, hasta
 * cuánto de descuento y si hay promos por cantidad—, todo sacado del catálogo.
 * Sin la cinta «Ofertas reales» (18/10/2026): repetía el lema.
 */
function NutriOfertasHero({ items, sinSesion }: { items: ItemCatalogo[]; sinSesion: boolean }) {
  const hasta = mayorDescuento(items);
  const porCantidad = items.some((p) => esMultiUnidad(p.oferta));
  return (
    <div className={styles.nutriHero}>
      <div className={`container ${styles.nutriInner}`}>
        <h1 className={styles.nutriTitulo}><span className={styles.nutriFuego} aria-hidden>🔥</span>{NUTRIOFERTAS}</h1>
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
  searchParams: Promise<Params>;
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

  const { items, miga, migaPadre, nombre, soloOfertas, nutri, soloRescate } = paginaDe(cat, sp);
  const titulo = soloOfertas ? `🔥 ${nombre}` : nombre;
  /** Sin ingresar no viajan precios ni ofertas (0155 / 0178): la página de ofertas invita a ingresar. */
  const sinSesion = cat.conPrecios === false;

  return (
    <div className={`${styles.shopPage} ${nutri ? styles.nutriPage : ''} ${soloRescate ? styles.rescatePage : ''}`}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLdProductos(items)) }}
      />
      <Migas pasos={[
        { texto: 'Inicio', href: '/' },
        { texto: 'Tienda', href: '/tienda' },
        ...(migaPadre ? [migaPadre] : []),
        ...(miga ? [{ texto: miga }] : []),
      ]}
      />

      {soloRescate ? (
        <NutriRescateBanner items={items} conPrecios={!sinSesion} />
      ) : nutri ? (
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
            <p className={styles.vacio}>{soloRescate ? `Hoy no hay productos en ${NUTRIRESCATE}.` : 'No se encontraron productos que coincidan con tu selección.'}</p>
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
