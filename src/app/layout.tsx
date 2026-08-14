import type { Metadata, Viewport } from 'next';
import { getCatalogo } from '@/lib/api';
import { CartProvider } from '@/lib/cart';
import { jsonLdString } from '@/lib/jsonLd';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WelcomePopup } from '@/components/WelcomePopup';
import { PwaRegister } from '@/components/PwaRegister';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { FaviconSetter } from '@/components/FaviconSetter';
import './globals.css';

/** Origen público del sitio: en producción se setea NEXT_PUBLIC_SITE_URL. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sabor y Aroma — Tienda mayorista online',
    template: '%s · Sabor y Aroma',
  },
  description: 'Distribuidora saludable en Formosa. Productos naturales, orgánicos y libres de gluten al por mayor.',
  keywords: ['mayorista', 'dietética', 'productos naturales', 'sin TACC', 'orgánico', 'Formosa', 'distribuidora'],
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Sabor y Aroma' },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Sabor y Aroma',
    title: 'Sabor y Aroma — Tienda mayorista online',
    description: 'Productos naturales y saludables al por mayor, en Formosa.',
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
  const catalogoInicial = await getCatalogo().catch(() => null);

  return (
    <html lang="es-AR">
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdString(JSON_LD) }}
        />
        <CartProvider initialCatalogo={catalogoInicial}>
          <Header />
          <main>{children}</main>
          <Footer />
          <WelcomePopup />
          <FaviconSetter />
        </CartProvider>
        <PwaRegister />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
