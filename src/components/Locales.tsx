import { direccionDe, horarioLegible, mapaLink } from '@/lib/locales';
import type { LocalSitio } from '@/lib/types';
import styles from './Locales.module.css';

/**
 * LOS LOCALES (20/10/2026): una tarjeta por local —dirección (abre el mapa),
 * teléfono y horario agrupado—. En el pie y en /nosotros. Sin locales, nada.
 */
export function Locales({ locales }: { locales: LocalSitio[] }) {
  if (!locales.length) return null;
  return (
    <ul className={styles.locales}>
      {locales.map((l, i) => {
        const dir = direccionDe(l);
        const horario = horarioLegible(l);
        return (
          <li key={`${i}-${l.nombre}`} className={styles.local}>
            <strong className={styles.nombre}>{l.nombre || 'Sabor y Aroma'}</strong>
            {dir && <a href={mapaLink(dir)} target="_blank" rel="noopener noreferrer">{dir}</a>}
            {l.telefono && <a href={`tel:${l.telefono.replace(/\D/g, '')}`}>{l.telefono}</a>}
            {horario.length > 0 && (
              <dl className={styles.horario}>
                {horario.map((h) => <div key={h.dias}><dt>{h.dias}</dt><dd>{h.horas}</dd></div>)}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
