/**
 * ¿PARA CUÁNDO EL ENVÍO? (23/10/2026): los textos de las opciones. Siempre en
 * hora argentina, aunque el navegador esté en otro huso.
 */
import type { AgendaEnvios, CuandoEnvio } from './types';

const ZONA = 'America/Argentina/Buenos_Aires';
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** «10:25». */
export const horaAr = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/** El día en Argentina de un instante, como AAAA-MM-DD. */
const fechaAr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: ZONA });

/** «Hoy», «Mañana» o «Lun 27/10». */
export function nombreDia(fecha: string) {
  const ahora = new Date();
  if (fecha === fechaAr(ahora)) return 'Hoy';
  if (fecha === fechaAr(new Date(ahora.getTime() + 86_400_000))) return 'Mañana';
  return `${DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()]} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/** Lo elegido en una línea, para la confirmación. */
export function textoCuando(c: CuandoEnvio, agenda: AgendaEnvios | null) {
  if (c.tipo === 'whatsapp') return 'Lo coordino por WhatsApp';
  if (c.tipo === 'pronto') {
    return agenda?.pronto ? `Lo antes posible (entre las ${horaAr(agenda.pronto.desde)} y las ${horaAr(agenda.pronto.hasta)})` : 'Lo antes posible';
  }
  const franja = agenda?.dias.flatMap((d) => d.franjas).find((f) => f.desde === c.desde);
  return `${nombreDia(fechaAr(new Date(c.desde)))} de ${horaAr(c.desde)} a ${franja ? horaAr(franja.hasta) : '—'}`;
}
