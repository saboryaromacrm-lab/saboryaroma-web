/**
 * EL WHATSAPP, BIEN GRANDE (23/10/2026, pedido del dueño: «aclarame bien grande
 * el número de teléfono, porque siempre se equivocan»). Va arriba de todo en la
 * segunda confirmación de los dos checkouts: con ese número se coordina el pedido.
 */
import type { ReactNode } from 'react';
import { telLegible, telefonoArgentino } from '@/lib/format';
import styles from './page.module.css';

export function TelefonoConfirmar({ telefono, children }: { telefono: string; children: ReactNode }) {
  return (
    <div className={styles.telConfirmar}>
      <span className={styles.telEtiqueta}>📱 Te vamos a escribir a este WhatsApp</span>
      <strong className={styles.telNumero}>{telLegible(telefonoArgentino(telefono) || telefono.trim())}</strong>
      <span className={styles.telAviso}>{children}</span>
    </div>
  );
}
