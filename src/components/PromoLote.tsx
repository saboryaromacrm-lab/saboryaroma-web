import { money } from '@/lib/format';
import type { useCompraProducto } from '@/lib/useCompraProducto';
import styles from './PromoLote.module.css';

type Promo = NonNullable<ReturnType<typeof useCompraProducto>['promo']>;

/**
 * LA PROMO DE VARIAS UNIDADES A LA VISTA (16/10/2026): qué es («Llevás 3 y
 * pagás 2»), cuánto sale cada una con ella y lo que se paga por lo elegido. Si
 * lo elegido no completa el lote, dice cuántas faltan. La tarjeta y el renglón
 * de la lista la muestran igual.
 */
export default function PromoLote({ promo }: { promo: Promo }) {
  const ahorro = promo.sinPromo - promo.total;
  return (
    <div className={styles.promo}>
      <span><strong>{promo.texto}</strong> · cada una te sale {money(promo.cadaUna)}</span>
      <span className={styles.det}>
        Por lo elegido pagás <strong>{money(promo.total)}</strong>
        {ahorro > 0 && <> (ahorrás {money(ahorro)})</>}
        {promo.faltan > 0 && <>. Sumá {promo.faltan} más {ahorro > 0 ? 'para otra promo' : 'y se aplica'}</>}.
      </span>
    </div>
  );
}
