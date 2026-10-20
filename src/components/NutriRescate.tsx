import Link from 'next/link';
import { mayorDescuento } from '@/lib/nutriofertas';
import { NUTRIRESCATE, URL_NUTRIRESCATE, textoVence } from '@/lib/nutrirescate';
import type { ItemCatalogo } from '@/lib/types';
import styles from './NutriRescate.module.css';

/**
 * EL SELLO DE NUTRIRESCATE: el aro con «PRECIO REDUCIDO» arriba y «PRÓXIMO A
 * VENCER» abajo, la hoja de la casa y el nombre al centro. SVG puro: pesa
 * nada, se ve nítido en cualquier pantalla y viaja dentro del HTML.
 */
function Sello() {
  return (
    <svg className={styles.sello} viewBox="0 0 220 220" role="img" aria-label={`${NUTRIRESCATE}: precio reducido, próximo a vencer`}>
      <defs>
        <path id="nr-arriba" d="M 30 110 A 80 80 0 0 1 190 110" />
        <path id="nr-abajo" d="M 18 110 A 92 92 0 0 0 202 110" />
      </defs>
      <circle cx="110" cy="110" r="104" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="110" cy="110" r="72" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <text className={styles.selloAro}><textPath href="#nr-arriba" startOffset="50%" textAnchor="middle">PRECIO REDUCIDO</textPath></text>
      <text className={styles.selloAro}><textPath href="#nr-abajo" startOffset="50%" textAnchor="middle">PRÓXIMO A VENCER</textPath></text>
      <circle cx="21" cy="110" r="4" fill="currentColor" />
      <circle cx="199" cy="110" r="4" fill="currentColor" />
      <path className={styles.selloHoja} d="M110 62c-14 6-20 18-16 30 12-2 20-12 16-30Zm0 0c14 6 20 18 16 30-12-2-20-12-16-30Z" />
      <text x="110" y="118" textAnchor="middle" className={styles.selloNutri}>Nutri</text>
      <text x="110" y="148" textAnchor="middle" className={styles.selloRescate}>Rescate</text>
    </svg>
  );
}

/**
 * EL BANNER DE NUTRIRESCATE (20/10/2026, pedido del dueño a partir del de
 * «Consumo inmediato» de un súper, con la marca de la casa). El sello y el
 * nombre a la izquierda; a la derecha qué es, el compromiso contra el
 * desperdicio y lo que hay: cuántos productos, hasta cuánto de descuento y
 * cuándo vence el primero. Es la cabecera de la sección (`/tienda?rescate=1`)
 * y, en la portada (`enPortada`), una tarjeta que lleva a ella.
 *
 * `items`: los de la sección, ya en orden (`enRescate`: el que vence antes, primero).
 */
export function NutriRescateBanner({ items, conPrecios, enPortada = false }: {
  items: ItemCatalogo[]; conPrecios: boolean; enPortada?: boolean;
}) {
  const hasta = conPrecios ? mayorDescuento(items) : 0;
  const primero = items[0]?.venceEl;
  const Titulo = enPortada ? 'h2' : 'h1';
  return (
    <section className={`${styles.banner} ${enPortada ? styles.enPortada : ''}`}>
      <div className={enPortada ? styles.inner : `container ${styles.inner}`}>
        <div className={styles.marca}>
          <Sello />
          <Titulo className={styles.titulo}><span className={styles.nutri}>Nutri</span><span className={styles.rescate}>Rescate</span></Titulo>
        </div>
        <div className={styles.texto}>
          <p className={styles.lema}>Bajamos el precio de los productos próximos a vencer para que los aproveches y nada se desperdicie.</p>
          <p className={styles.compromiso}>Es parte de nuestro compromiso contra el desperdicio de alimentos.</p>
          {items.length > 0 ? (
            <ul className={styles.datos}>
              <li><strong>{items.length}</strong> producto{items.length === 1 ? '' : 's'} en rescate</li>
              {hasta > 0 && <li>Hasta <strong>{hasta}% OFF</strong></li>}
              {primero && <li>⏳ El próximo: <strong>{textoVence(primero).toLowerCase()}</strong></li>}
            </ul>
          ) : (
            <p className={styles.vacio}>Hoy no hay productos en rescate: los publicamos apenas se acercan a su fecha. ¡Volvé pronto!</p>
          )}
          {enPortada ? (
            <Link href={URL_NUTRIRESCATE} className={styles.cta}>Ver los {items.length} producto{items.length === 1 ? '' : 's'} →</Link>
          ) : (
            <details className={styles.condiciones}>
              <summary>Ver condiciones</summary>
              <p>
                Productos en buen estado, para consumir antes de la fecha de vencimiento que indica cada uno. Stock limitado: el
                precio vale hasta agotar el stock o hasta esa fecha.
              </p>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
