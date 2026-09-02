'use client';

/*
 * ERROR INESPERADO en cualquier página del sitio.
 *
 * Sin este archivo, una excepción no capturada caía en la pantalla genérica de
 * Next —en inglés, sin el encabezado del sitio y sin salida— y el visitante
 * cerraba la pestaña. Acá se muestra dentro del layout (header, footer y
 * carrito siguen), con un botón que vuelve a pedir el contenido.
 *
 * Es un Client Component por obligación de Next (los límites de error lo
 * son). El `error.message` que llega desde un Server Component viene
 * genérico a propósito —no filtra detalles del servidor—, por eso no se
 * muestra: el `digest` alcanza para encontrarlo en los logs.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import styles from './estado.module.css';

export default function ErrorPagina({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Al log del navegador: es lo que se ve al reproducir un reporte.
    console.error(error);
  }, [error]);

  return (
    <div className={`container ${styles.estado}`} style={{ margin: '0 auto' }}>
      <h1 className={styles.titulo}>Algo salió mal</h1>
      <p className={styles.texto}>
        No pudimos mostrar esta página. Suele ser pasajero: probá de nuevo en un
        momento. Si sigue pasando, escribinos por WhatsApp y lo resolvemos.
        {error?.digest ? ` (ref. ${error.digest})` : ''}
      </p>
      <div className={styles.acciones}>
        <button type="button" className={styles.boton} onClick={() => retry()}>
          Volver a intentar
        </button>
        <Link href="/" className={`${styles.boton} ${styles.secundario}`}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
