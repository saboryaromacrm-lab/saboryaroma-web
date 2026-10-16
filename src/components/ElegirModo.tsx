'use client';

/**
 * ELEGIR CÓMO COMPRAR (0173, 16/10/2026): la primera vez que alguien entra, dos
 * tarjetas grandes —Minorista / Mayorista—. La elección queda en la cookie del
 * modo y, si es mayorista, la página se vuelve a pedir al servidor con ese
 * modo (`router.refresh`). El botón del cartel de arriba lo cambia cuando quiera.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { ETIQUETA_MODO, guardarModo, type Modo } from '@/lib/modo';
import styles from './ElegirModo.module.css';

/** Guarda el modo y vuelve a armar la página en el servidor (otro catálogo, otro carrito). */
function useCambiarModo() {
  const router = useRouter();
  const { modo } = useCart();
  return (nuevo: Modo) => {
    guardarModo(nuevo);
    if (nuevo !== modo) router.refresh();
  };
}

export function ElegirModo({ abiertoAlEntrar }: { abiertoAlEntrar: boolean }) {
  const { config } = useCart();
  const [abierto, setAbierto] = useState(abiertoAlEntrar);
  const cambiar = useCambiarModo();
  if (!abierto) return null;
  const elegir = (m: Modo) => { setAbierto(false); cambiar(m); };
  return (
    <div className={styles.fondo} role="dialog" aria-modal="true" aria-labelledby="elegir-modo-titulo">
      <div className={styles.caja}>
        <p className={styles.eyebrow}>🍃 Sabor y Aroma</p>
        <h2 id="elegir-modo-titulo" className={styles.titulo}>¿Cómo querés comprar?</h2>
        <div className={styles.opciones}>
          <button type="button" className={`${styles.opcion} ${styles.minorista}`} onClick={() => elegir('minorista')}>
            <span className={styles.opcionIcono}>🛒</span>
            <span className={styles.opcionTitulo}>Minorista</span>
            <span className={styles.opcionTexto}>Para tu casa. Precios a la vista, sin mínimo de compra ni registro.</span>
            {config.envioGratisDesde > 0 && <span className={styles.opcionPill}>Envío gratis desde {money(config.envioGratisDesde)}</span>}
            <span className={styles.opcionCta}>Comprar minorista →</span>
          </button>
          <button type="button" className={`${styles.opcion} ${styles.mayorista}`} onClick={() => elegir('mayorista')}>
            <span className={styles.opcionIcono}>🏪</span>
            <span className={styles.opcionTitulo}>Mayorista</span>
            <span className={styles.opcionTexto}>Para tu negocio. Precios de distribuidora, con tu DNI habilitado.</span>
            <span className={styles.opcionCta}>Comprar mayorista →</span>
          </button>
        </div>
        <p className={styles.nota}>Lo podés cambiar cuando quieras desde el cartel de arriba.</p>
      </div>
    </div>
  );
}

/** El botón del cartel de arriba: en qué modo estás y el paso al otro. */
export function ModoSwitch() {
  const { modo, config } = useCart();
  const cambiar = useCambiarModo();
  if (!config.minoristaActiva) return null;
  const otro: Modo = modo === 'minorista' ? 'mayorista' : 'minorista';
  return (
    <button type="button" className={styles.switch} onClick={() => cambiar(otro)}>
      Cambiar a {ETIQUETA_MODO[otro]}
    </button>
  );
}
