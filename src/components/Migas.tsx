import Link from 'next/link';
import { jsonLdString } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/rutas';
import styles from './Migas.module.css';

/** Un paso de la miga: con `href` es enlace; el último (la página actual) va sin. */
export interface Miga { texto: string; href?: string }

/**
 * LA MIGA DE PAN («Inicio › Tienda › Frutos secos»): la de la tienda y la de
 * cada producto. Va también como datos para Google (BreadcrumbList), que la
 * muestra en el resultado en lugar de la dirección (20/10/2026).
 */
export function Migas({ pasos }: { pasos: Miga[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: pasos.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, name: p.texto, ...(p.href ? { item: `${SITE_URL}${p.href}` } : {}),
    })),
  };
  return (
    <nav className={styles.barra} aria-label="Estás en">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <div className={`container ${styles.pasos}`}>
        {pasos.map((p, i) => (
          <span key={`${i}-${p.texto}`}>
            {i > 0 && <span className={styles.sep} aria-hidden="true">›</span>}
            {p.href ? <Link href={p.href}>{p.texto}</Link> : <span className={styles.actual} aria-current="page">{p.texto}</span>}
          </span>
        ))}
      </div>
    </nav>
  );
}
