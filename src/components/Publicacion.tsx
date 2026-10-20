/**
 * LA TIENDA EN PREPARACIÓN (20/10/2026, pedido del dueño). Cada tienda se abre
 * al público o queda en preparación desde el ERP; en preparación la ve solo
 * quien tiene el link de vista previa. Los dos se arman en el servidor (sin
 * JavaScript) y le piden a los buscadores que no indexen (React 19 sube el
 * <meta> al <head>).
 */
import { imgSrc, type TiendaCerrada } from '@/lib/api';
import { linkWhatsApp } from '@/lib/format';
import styles from './Publicacion.module.css';

const NO_INDEXAR = <meta name="robots" content="noindex, nofollow" />;

/** Ninguna tienda abierta para quien mira: el logo, que ya viene, y el WhatsApp. */
export function Proximamente({ sitio }: { sitio: TiendaCerrada['sitio'] }) {
  return (
    <main className={styles.proximamente}>
      {NO_INDEXAR}
      <div className={styles.caja}>
        {sitio.logoUrl && <img src={imgSrc(sitio.logoUrl)} alt="Sabor y Aroma" className={styles.logo} />}
        <p className={styles.eyebrow}>Tienda online</p>
        <h1 className={styles.titulo}>Muy pronto</h1>
        <p className={styles.texto}>Estamos preparando nuestra tienda online para que compres desde acá. Mientras tanto, escribinos y te atendemos.</p>
        <a href={linkWhatsApp(sitio.contacto.whatsapp)} className={styles.cta} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>
      </div>
    </main>
  );
}

/** Se está viendo una tienda en preparación con el link de vista previa: que no se confunda con la abierta. */
export function AvisoVistaPrevia() {
  return (
    <div className={styles.aviso} role="status">
      {NO_INDEXAR}
      <span><strong>Vista previa</strong> · lo que compres es de prueba</span>
      <a href="/vista-previa?salir">Salir</a>
    </div>
  );
}
