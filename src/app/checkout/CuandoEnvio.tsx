'use client';

/**
 * ¿EN CUÁNTO QUERÉS TU ENVÍO? (23/10/2026, pedido del dueño): lo antes posible
 * (20 a 40 min, solo con el local abierto), un horario de 20 minutos dentro del
 * horario del local, o coordinarlo por WhatsApp. Las opciones las da el servidor.
 */
import { useState } from 'react';
import { horaAr, nombreDia } from '@/lib/horarioEnvio';
import type { AgendaEnvios, CuandoEnvio as Cuando } from '@/lib/types';
import styles from './page.module.css';

export function CuandoEnvio({ agenda, valor, onCambio }: { agenda: AgendaEnvios | null; valor: Cuando | null; onCambio: (c: Cuando) => void }) {
  const elegido = valor?.tipo === 'horario' ? valor.desde : '';
  const [dia, setDia] = useState(() => agenda?.dias.find((d) => d.franjas.some((f) => f.desde === elegido))?.fecha ?? '');

  if (!agenda) return <div className={styles.hint} style={{ color: 'var(--color-gray-550)' }}>Buscando los horarios…</div>;

  const delDia = agenda.dias.find((d) => d.fecha === dia) ?? agenda.dias[0];
  const opcion = (tipo: Cuando['tipo'], titulo: string, hint: string, deshabilitada = false) => (
    <label className={styles.entregaOpt} data-selected={valor?.tipo === tipo} data-deshabilitada={deshabilitada}>
      <input
        type="radio" name="cuando" checked={valor?.tipo === tipo} disabled={deshabilitada}
        onChange={() => onCambio(tipo === 'horario' ? { tipo, desde: elegido || delDia.franjas[0].desde } : { tipo })}
      />
      <span>{titulo}<span className={styles.hint}>{hint}</span></span>
    </label>
  );

  return (
    <div className={styles.entregas}>
      {opcion(
        'pronto', 'Lo antes posible',
        agenda.pronto
          ? `Llega en 20 a 40 minutos: entre las ${horaAr(agenda.pronto.desde)} y las ${horaAr(agenda.pronto.hasta)}.`
          /* Por cerrar (28/10/2026): no llega antes del cierre, y se dice a qué hora cerramos. */
          : agenda.abierto && agenda.cierra
            ? `Cerramos a las ${horaAr(agenda.cierra)}: ya no llegamos a enviarlo antes. Elegí un horario o coordinalo por WhatsApp.`
            : 'Ahora el local está cerrado: elegí un horario o coordinalo por WhatsApp.',
        !agenda.pronto,
      )}
      {agenda.dias.length > 0 && opcion('horario', 'Elijo el horario', 'De a 20 minutos, cuando el local está abierto.')}
      {valor?.tipo === 'horario' && delDia && (
        <div className={styles.agenda}>
          <div className={styles.agendaDias} role="tablist" aria-label="Día del envío">
            {agenda.dias.map((d) => (
              <button
                key={d.fecha} type="button" role="tab" aria-selected={d.fecha === delDia.fecha}
                className={styles.agendaDia} data-selected={d.fecha === delDia.fecha}
                onClick={() => { setDia(d.fecha); onCambio({ tipo: 'horario', desde: d.franjas[0].desde }); }}
              >
                {nombreDia(d.fecha)}
              </button>
            ))}
          </div>
          <div className={styles.agendaFranjas} role="radiogroup" aria-label="Horario del envío">
            {delDia.franjas.map((f) => (
              <button
                key={f.desde} type="button" role="radio" aria-checked={f.desde === elegido}
                className={styles.agendaFranja} data-selected={f.desde === elegido}
                onClick={() => onCambio({ tipo: 'horario', desde: f.desde })}
              >
                {horaAr(f.desde)} a {horaAr(f.hasta)}
              </button>
            ))}
          </div>
        </div>
      )}
      {opcion('whatsapp', 'Lo coordino por WhatsApp', 'Te escribimos y lo arreglamos.')}
    </div>
  );
}
