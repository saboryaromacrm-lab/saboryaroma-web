/**
 * ENVÍO GRATIS POR BARRIO (0185, 20/10/2026, pedido del dueño): el cartel de
 * la portada minorista entre las categorías y las NutriOfertas. Las líneas
 * salen de lo cargado en el ERP (barrios con envío 0 y promos de envío
 * gratis; hoy primero). Una moto de reparto cruza por la calle de abajo: solo
 * CSS (transform), sin JavaScript; quieta si el sistema pide menos movimiento.
 */
import { money } from '@/lib/format';
import type { EnvioGratis } from '@/lib/types';
import styles from './EnvioGratisBanner.module.css';

export function EnvioGratisBanner({ envios }: { envios: EnvioGratis[] }) {
  return (
    <section className={styles.banner} aria-labelledby="envio-gratis-titulo">
      <div className={styles.texto}>
        <p className={styles.eyebrow}>Te lo llevamos a casa</p>
        <h2 id="envio-gratis-titulo" className={styles.titulo}>Envío <span>gratis</span></h2>
        <ul className={styles.lista}>
          {envios.map((e) => (
            <li key={`${e.cuando}|${e.barrios.join('|')}`} className={styles.linea}>
              <span className={styles.cuando} data-hoy={e.hoy}>{e.cuando}</span>
              {e.barrios.map((b) => <span key={b} className={styles.barrio}>📍 {b}</span>)}
              {e.minimo > 0 && <span className={styles.minimo}>en compras desde {money(e.minimo)}</span>}
            </li>
          ))}
        </ul>
        <p className={styles.nota}>Al finalizar el pedido marcás tu casa en el mapa: si tu barrio tiene envío gratis, se aplica solo.</p>
      </div>

      <div className={styles.calle} aria-hidden="true">
        <div className={styles.recorrido}>
          <svg className={styles.moto} viewBox="0 0 84 52">
            <g className={styles.velocidad} stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="0" y1="22" x2="12" y2="22" />
              <line x1="4" y1="30" x2="14" y2="30" />
              <line x1="0" y1="38" x2="10" y2="38" />
            </g>
            <g className={styles.cuerpo}>
              {/* La caja de reparto, con la hoja de la casa. */}
              <rect x="16" y="11" width="19" height="16" rx="3" fill="#fff" />
              <path d="M25.5 15c3 0 4.5 2.2 4.5 5-3 0-4.5-2.2-4.5-5zM25.5 15c-3 0-4.5 2.2-4.5 5 3 0 4.5-2.2 4.5-5z" fill="#2f8a57" />
              <path d="M17 38c1-8 6-10 14-10h19l6-10h6l6 18c-5-3-12-2-15 2H17z" fill="#e5933c" />
              {/* El repartidor: casco, cuerpo y el brazo al manubrio. */}
              <path d="M43 28l2-12c1-3 3-4 6-4l2 10-4 6z" fill="#fff" />
              <circle cx="50" cy="8" r="6" fill="#ffd166" />
              <path d="M51 15l9 4" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              <path d="M58 13l4 7" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g className={styles.rueda}><circle cx="24" cy="40" r="9" fill="#1f2937" /><circle cx="24" cy="40" r="3.5" fill="#e5e7eb" /><path d="M24 32v16M16 40h16" stroke="#6b7280" strokeWidth="1.5" /></g>
            <g className={styles.rueda}><circle cx="66" cy="40" r="9" fill="#1f2937" /><circle cx="66" cy="40" r="3.5" fill="#e5e7eb" /><path d="M66 32v16M58 40h16" stroke="#6b7280" strokeWidth="1.5" /></g>
          </svg>
        </div>
      </div>
    </section>
  );
}
