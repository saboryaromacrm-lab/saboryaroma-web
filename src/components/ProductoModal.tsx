'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ProductCard } from './ProductCard';
import type { ItemCatalogo } from '@/lib/types';
import styles from './ProductoModal.module.css';

/**
 * EL PRODUCTO EN UNA VENTANITA (19/10/2026): la misma tarjeta de la tienda
 * —tamaño, cantidad, tope de stock, agregar— sin salir de donde se está. Va al
 * `body` (portal): ningún contenedor con `overflow` o animación la recorta.
 * Se cierra con la cruz, tocando afuera o con Escape.
 */
export function ProductoModal({ producto, onCerrar }: { producto: ItemCatalogo; onCerrar: () => void }) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { cerrarRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  return createPortal(
    <div className={styles.fondo} onClick={onCerrar} role="presentation">
      <div className={styles.caja} role="dialog" aria-modal="true" aria-label={producto.nombre} onClick={(e) => e.stopPropagation()}>
        <button ref={cerrarRef} type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">×</button>
        <ProductCard producto={producto} />
      </div>
    </div>,
    document.body,
  );
}
