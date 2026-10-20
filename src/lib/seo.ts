/**
 * LO QUE VEN GOOGLE Y QUIEN RECIBE EL LINK (20/10/2026, pedido del dueño):
 * el título, la descripción y la imagen de cada página, y los datos
 * estructurados del comercio (la ficha con dirección, teléfono y horario).
 * Los textos, la imagen para compartir y los locales se cargan en el ERP:
 * Tienda online › Configuración › General.
 */
import type { Metadata } from 'next';
import { imgSrc } from './api';
import { linkRed, telefonoArgentino } from './format';
import { horarioSchema } from './locales';
import { rutaProducto, SITE_URL } from './rutas';
import type { ItemCatalogo, SitioConfig } from './types';

export const NOMBRE = 'Sabor y Aroma';

/** Si la API todavía no manda los textos (o no contesta): los de siempre. */
const SEO_DEFAULT = {
  titulo: 'Sabor y Aroma — Tienda online',
  descripcion: 'Dietética y distribuidora saludable en Formosa. Productos naturales, orgánicos y libres de gluten, por menor y por mayor.',
  imagenUrl: '',
};

type ConSeo = Partial<Pick<SitioConfig, 'seo'>> | null | undefined;
export const seoDe = (sitio: ConSeo) => ({ ...SEO_DEFAULT, ...sitio?.seo });

/**
 * Lo de UNA PÁGINA: su título (sin título = el del sitio entero), su
 * descripción, su dirección canónica —la que Google indexa aunque llegue con
 * otros parámetros— y la imagen (la propia o la del sitio). El `openGraph` de
 * una página REEMPLAZA entero al del layout: por eso va completo acá.
 */
export function metaPagina(sitio: ConSeo, pagina: {
  titulo?: string; descripcion?: string; ruta: string; imagen?: string; indexar?: boolean;
}): Metadata {
  const seo = seoDe(sitio);
  const titulo = pagina.titulo ? `${pagina.titulo} · ${NOMBRE}` : seo.titulo;
  const descripcion = pagina.descripcion || seo.descripcion;
  const imagen = imgSrc(pagina.imagen) || imgSrc(seo.imagenUrl);
  return {
    title: { absolute: titulo },
    description: descripcion,
    alternates: { canonical: pagina.ruta },
    ...(pagina.indexar === false ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website', locale: 'es_AR', siteName: NOMBRE, url: pagina.ruta, title: titulo, description: descripcion,
      ...(imagen ? { images: [imagen] } : {}),
    },
    twitter: { card: imagen ? 'summary_large_image' : 'summary' },
  };
}

/**
 * UN PRODUCTO PARA GOOGLE (schema.org): la grilla de la tienda y la página del
 * producto. Sin precio —quien no ingresó (0155)— no se publica la oferta: el
 * precio no sale ni para los buscadores.
 */
export function productoSchema(p: ItemCatalogo) {
  return {
    '@type': 'Product',
    name: p.nombre,
    sku: String(p.id),
    brand: p.marca ? { '@type': 'Brand', name: p.marca } : undefined,
    category: p.categoria || undefined,
    image: imgSrc(p.imagenUrl) || undefined,
    url: `${SITE_URL}${rutaProducto(p)}`,
    offers: p.precio > 0 ? {
      '@type': 'Offer',
      price: (p.oferta?.precioOferta ?? p.precio).toFixed(2),
      priceCurrency: 'ARS',
      availability: p.enStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    } : undefined,
  };
}

/**
 * LA FICHA DEL COMERCIO para Google: la empresa, el sitio y cada local como
 * tienda de alimentos saludables, con su dirección, teléfono y horario. Sin
 * locales cargados, solo la empresa y el sitio.
 */
export function jsonLdNegocio(sitio: Partial<SitioConfig> | null | undefined) {
  const seo = seoDe(sitio);
  const c = sitio?.contacto;
  const organizacion = `${SITE_URL}/#organizacion`;
  const wa = telefonoArgentino(c?.whatsapp ?? '');
  const redes = [linkRed(c?.instagram ?? '', 'instagram.com'), linkRed(c?.facebook ?? '', 'facebook.com')].filter(Boolean);
  const imagen = imgSrc(seo.imagenUrl) || undefined;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizacion,
        name: NOMBRE,
        url: SITE_URL,
        description: seo.descripcion,
        logo: imgSrc(sitio?.logoUrl) || undefined,
        image: imagen,
        email: c?.email || undefined,
        telephone: c?.telefono || (wa ? `+549${wa}` : undefined),
        sameAs: redes.length ? redes : undefined,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#sitio`,
        url: SITE_URL,
        name: NOMBRE,
        publisher: { '@id': organizacion },
        inLanguage: 'es-AR',
      },
      ...(sitio?.locales ?? []).map((l, i) => {
        const horario = horarioSchema(l);
        return {
          '@type': 'HealthFoodStore',
          '@id': `${SITE_URL}/#local-${i + 1}`,
          name: l.nombre || NOMBRE,
          url: SITE_URL,
          image: imagen,
          telephone: l.telefono || undefined,
          address: {
            '@type': 'PostalAddress',
            streetAddress: l.direccion || undefined,
            addressLocality: l.localidad || undefined,
            addressCountry: 'AR',
          },
          openingHoursSpecification: horario.length ? horario : undefined,
          parentOrganization: { '@id': organizacion },
        };
      }),
    ],
  };
}
