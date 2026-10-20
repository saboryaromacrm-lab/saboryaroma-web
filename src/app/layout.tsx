import type { Metadata, Viewport } from 'next';
import { estadoTienda, modoElegido } from '@/lib/catalogoServidor';
import { estaCerrada } from '@/lib/api';
import { MODO_INICIAL } from '@/lib/modo';
import { CartProvider } from '@/lib/cart';
import { ElegirModo } from '@/components/ElegirModo';
import { jsonLdString } from '@/lib/jsonLd';
import { imgSrc } from '@/lib/api';
import { jsonLdNegocio, NOMBRE, seoDe } from '@/lib/seo';
import { SITE_URL } from '@/lib/rutas';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FirmaCoftech } from '@/components/FirmaCoftech';
import { WelcomePopup } from '@/components/WelcomePopup';
import { Ingreso } from '@/components/Ingreso';
import { IngresoMinorista } from '@/components/minorista/IngresoMinorista';
import { PwaRegister } from '@/components/PwaRegister';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { FaviconSetter } from '@/components/FaviconSetter';
import { AvisoVistaPrevia, Proximamente } from '@/components/Publicacion';
import './globals.css';

/**
 * Lo de todo el sitio: el título y la descripción que se cargan en el ERP
 * (Tienda online › Configuración › General) y la imagen para compartir. Cada
 * página pone lo suyo encima (`metaPagina`).
 */
export async function generateMetadata(): Promise<Metadata> {
  const estado = await estadoTienda().catch(() => null);
  const seo = seoDe(estado?.sitio);
  const imagen = imgSrc(seo.imagenUrl);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.titulo, template: `%s · ${NOMBRE}` },
    description: seo.descripcion,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: NOMBRE },
    openGraph: {
      type: 'website', locale: 'es_AR', siteName: NOMBRE, title: seo.titulo, description: seo.descripcion,
      ...(imagen ? { images: [imagen] } : {}),
    },
    twitter: { card: imagen ? 'summary_large_image' : 'summary' },
    /* Sin `robots`: indexar es lo que hacen los buscadores si no se dice nada, y así no choca con el «noindex» de la tienda en preparación (Publicacion.tsx). */
  };
}

export const viewport: Viewport = {
  themeColor: '#086633',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Un solo pedido del catálogo para todo el árbol: `estadoTienda` lo pide una
  // vez por request (cache de React) y lo comparten el layout, la página y sus
  // metadatos; este resultado se lo pasamos al carrito para que no tenga que
  // volver a pedirlo desde el navegador.
  const [estado, elegido] = await Promise.all([estadoTienda().catch(() => null), modoElegido()]);
  /* Ninguna tienda abierta para quien mira (20/10/2026): «Próximamente», sin las páginas ni el carrito. */
  if (estado && estaCerrada(estado)) {
    return (
      <html lang="es-AR">
        <body><Proximamente sitio={estado.sitio} /></body>
      </html>
    );
  }
  const catalogoInicial = estado;
  /*
   * EL MODO (0173): el que dice el catálogo (la API baja a mayorista si el
   * minorista está apagado); sin catálogo, el elegido o el inicial. `data-modo`
   * en <html> es lo que viste la tienda (globals.css). La primera visita elige;
   * con el minorista apagado no hay nada que elegir.
   */
  const modo = catalogoInicial?.modo ?? elegido ?? MODO_INICIAL;
  const elegir = !elegido && catalogoInicial?.minoristaActiva === true;

  return (
    <html lang="es-AR" data-modo={modo}>
      <body>
        {/* Para los buscadores (JSON-LD): la empresa, el sitio y los locales con su horario. Los productos, en sus páginas. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLdNegocio(catalogoInicial?.sitio)) }}
        />
        {/* `key={modo}`: al cambiar de modo el carrito arranca de cero con el guardado de ese modo. */}
        <CartProvider key={modo} modo={modo} initialCatalogo={catalogoInicial}>
          <Header />
          <main>{children}</main>
          <Footer />
          {/* Hermana del footer y no hija: un <footer> dentro de otro no es
              HTML válido, y acá afuera queda FUERA del árbol de cliente del
              carrito — o sea, renderizada en el servidor y sin mandar JS. */}
          <FirmaCoftech />
          {/* El cartel de condiciones es del mayorista; cada modo ingresa con lo suyo: el DNI o el WhatsApp (0178). */}
          {modo === 'mayorista' && <WelcomePopup />}
          {modo === 'mayorista' ? <Ingreso /> : <IngresoMinorista />}
          <ElegirModo abiertoAlEntrar={elegir} />
          <FaviconSetter />
        </CartProvider>
        {catalogoInicial?.vistaPrevia && <AvisoVistaPrevia />}
        <PwaRegister />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
