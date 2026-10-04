'use client';

import dynamic from 'next/dynamic';
import type { ItemCatalogo } from '@/lib/types';

/*
 * EL RENGLÓN SE CARGA SOLO SI LA VISTA DE LISTA ESTÁ ACTIVADA (4/10/2026).
 * El `dynamic` vive en un componente cliente a propósito: desde la página
 * (componente de servidor) Next NO parte el código, y el renglón viajaba
 * dentro del mismo archivo que la tarjeta aunque nadie lo usara. Acá sí lo
 * parte: `ProductRow` y su CSS son un archivo aparte que el navegador pide
 * únicamente cuando esta lista se dibuja. Con la vista apagada, este
 * componente ni se renderiza y ese archivo nunca se descarga.
 */
const ProductRow = dynamic(() => import('./ProductRow').then((m) => m.ProductRow));

export function ListaProductos({ items, className }: { items: ItemCatalogo[]; className?: string }) {
  return (
    <ul className={className} aria-label="Productos">
      {items.map((p) => <ProductRow key={p.id} producto={p} />)}
    </ul>
  );
}
