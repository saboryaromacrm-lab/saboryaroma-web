import { money } from '@/lib/format';
import type { useCompraProducto } from '@/lib/useCompraProducto';
import styles from './PromoLote.module.css';

type Promo = NonNullable<ReturnType<typeof useCompraProducto>['promo']>;

/**
 * LA PROMO DE VARIAS UNIDADES A LA VISTA (16/10/2026, pedido del dueño: «solo
 * ese texto, más grande y más lindo»): «Agregá 3 y pagás 2, $3.105 cada una».
 * La tarjeta y el renglón de la lista la muestran igual; `compacta`, más
 * chica en la tarjeta compacta (las ofertas del carrito).
 */
export default function PromoLote({ promo, compacta = false }: { promo: Promo; compacta?: boolean }) {
  return (
    <div className={`${styles.promo} ${compacta ? styles.compacta : ''}`}>
      <strong className={styles.titulo}>{promo.texto},</strong>
      <span className={styles.precio}>
        {money(promo.cadaUna)} cada una{promo.ahorroPct > 0 && <> · <strong>ahorrás {promo.ahorroPct}%</strong></>}
      </span>
    </div>
  );
}
