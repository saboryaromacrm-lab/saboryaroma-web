import type { Metadata, Viewport } from 'next';
import { catalogoConSesion, modoElegido } from '@/lib/catalogoServidor';
import { MODO_INICIAL } from '@/lib/modo';
import { CartProvider } from '@/lib/cart';
import { ElegirModo } from '@/components/ElegirModo';
import { jsonLdString } from '@/lib/jsonLd';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FirmaCoftech } from '@/components/FirmaCoftech';
import { WelcomePopup } from '@/components/WelcomePopup';
import { Ingreso } from '@/components/Ingreso';
import { IngresoMinorista } from '@/components/minorista/IngresoMinorista';
import { PwaRegister } from '@/components/PwaRegister';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { FaviconSetter } from '@/components/FaviconSetter';
import './globals.css';

/** Origen público del sitio: en producción se setea NEXT_PUBLIC_SITE_URL. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sabor y Aroma — Tienda online',
    template: '%s · Sabor y Aroma',
  },
  description: 'Dietética y distribuidora saludable en Formosa. Productos naturales, orgánicos y libres de gluten, por menor y por mayor.',
  keywords: ['dietética', 'mayorista', 'minorista', 'productos naturales', 'sin TACC', 'orgánico', 'Formosa', 'distribuidora'],
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Sabor y Aroma' },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Sabor y Aroma',
    title: 'Sabor y Aroma — Tienda online',
    description: 'Productos naturales y saludables, por menor y por mayor, en Formosa.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#086633',
};

/**
 * Datos estructurados para los buscadores (JSON-LD): quiénes somos y qué es
 * este sitio. Los productos van aparte, en la página de la tienda.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organizacion`,
      name: 'Sabor y Aroma',
      url: SITE_URL,
      description: 'Distribuidora mayorista de productos naturales y saludables en Formosa, Argentina.',
      address: { '@type': 'PostalAddress', addressLocality: 'Formosa', addressCountry: 'AR' },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#sitio`,
      url: SITE_URL,
      name: 'Sabor y Aroma — Tienda mayorista online',
      publisher: { '@id': `${SITE_URL}/#organizacion` },
      inLanguage: 'es-AR',
    },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Un solo pedido del catálogo para todo el árbol: Next dedupea automáticamente
  // el fetch idéntico que cada página vuelve a hacer para su propio contenido
  // (Request Memoization), y este resultado se lo pasamos al carrito para que
  // no tenga que volver a pedirlo desde el navegador.
  const [catalogoInicial, elegido] = await Promise.all([catalogoConSesion().catch(() => null), modoElegido()]);
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
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdString(JSON_LD) }}
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
        <PwaRegister />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
