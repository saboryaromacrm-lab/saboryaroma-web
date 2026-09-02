/*
 * PÁGINA NO ENCONTRADA. Reemplaza el 404 genérico de Next (en inglés y sin el
 * encabezado del sitio). Se muestra dentro del layout, así que el visitante
 * sigue teniendo el buscador, el menú y el carrito a mano.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './estado.module.css';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: true },
};

export default function NoEncontrada() {
  return (
    <div className={`container ${styles.estado}`} style={{ margin: '0 auto' }}>
      <h1 className={styles.titulo}>Esta página no existe</h1>
      <p className={styles.texto}>
        Puede que el enlace esté mal escrito o que el producto ya no esté
        publicado. El catálogo completo está en la tienda.
      </p>
      <div className={styles.acciones}>
        <Link href="/tienda" className={styles.boton}>Ver la tienda</Link>
        <Link href="/" className={`${styles.boton} ${styles.secundario}`}>Ir al inicio</Link>
      </div>
    </div>
  );
}
