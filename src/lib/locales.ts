/**
 * LOS LOCALES (20/10/2026): su dirección para el mapa y su horario, para leer
 * (el pie, /nosotros, /llms.txt) y para Google (schema.org).
 */
import type { LocalSitio } from './types';

/** «Sarmiento 1314, Formosa». */
export const direccionDe = (l: Pick<LocalSitio, 'direccion' | 'localidad'>) => [l.direccion, l.localidad].filter(Boolean).join(', ');

/*
 * EL MAPA SIGUE A LA DIRECCIÓN (8/10/2026). Antes era un mapa fijo armado a
 * mano con la ubicación vieja: el dueño cambió la dirección en el ERP
 * (Configuración › Tienda online) a «Sarmiento 1314», el texto cambió y el mapa
 * no. Ahora el mapa y «Abrir en Google Maps» se arman con la MISMA dirección
 * que se muestra arriba. Una dirección sin ciudad («Sarmiento 1314») se busca
 * en Formosa: si no, Google la puede encontrar en cualquier provincia.
 */
export function direccionParaMapa(ubicacion: string) {
  const d = ubicacion.trim();
  if (!d) return 'Formosa, Argentina';
  return /formosa/i.test(d) ? d : `${d}, Formosa, Argentina`;
}
export const mapaLink = (dir: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionParaMapa(dir))}`;

/** Los días como los guarda el ERP, con su nombre corto y el de schema.org (Google). */
const DIAS = [
  { clave: 'lun', corto: 'Lun', schema: 'Monday' },
  { clave: 'mar', corto: 'Mar', schema: 'Tuesday' },
  { clave: 'mie', corto: 'Mié', schema: 'Wednesday' },
  { clave: 'jue', corto: 'Jue', schema: 'Thursday' },
  { clave: 'vie', corto: 'Vie', schema: 'Friday' },
  { clave: 'sab', corto: 'Sáb', schema: 'Saturday' },
  { clave: 'dom', corto: 'Dom', schema: 'Sunday' },
] as const;

/** «08:00-13:00, 17:00-21:00» → [['08:00', '13:00'], ['17:00', '21:00']]; vacío = cerrado. */
const tramosDe = (v: string | undefined) => String(v ?? '').split(',')
  .map((t) => t.trim().split('-'))
  .filter((t): t is [string, string] => t.length === 2 && Boolean(t[0] && t[1]));

const hora = (h: string) => h.replace(/^0(\d)/, '$1');

/**
 * EL HORARIO PARA LEER: los días seguidos con el mismo horario van juntos
 * («Lun a Vie · 8:00 a 13:00 y 17:00 a 21:00», «Dom · Cerrado»). Vacío si el
 * local no cargó ningún día.
 */
export function horarioLegible(local: LocalSitio): { dias: string; horas: string }[] {
  if (!DIAS.some((d) => tramosDe(local[d.clave]).length)) return [];
  const grupos: { desde: number; hasta: number; valor: string }[] = [];
  DIAS.forEach((d, i) => {
    const valor = tramosDe(local[d.clave]).join();
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.valor === valor) ultimo.hasta = i;
    else grupos.push({ desde: i, hasta: i, valor });
  });
  return grupos.map(({ desde, hasta }) => ({
    dias: desde === hasta ? DIAS[desde].corto : `${DIAS[desde].corto} ${hasta - desde === 1 ? 'y' : 'a'} ${DIAS[hasta].corto}`,
    horas: tramosDe(local[DIAS[desde].clave]).map(([a, b]) => `${hora(a)} a ${hora(b)}`).join(' y ') || 'Cerrado',
  }));
}

/** El mismo horario para Google (schema.org): un bloque por tramo, con los días que lo comparten. */
export function horarioSchema(local: LocalSitio) {
  const porTramo = new Map<string, string[]>();
  for (const d of DIAS) {
    for (const [a, b] of tramosDe(local[d.clave])) porTramo.set(`${a}-${b}`, [...(porTramo.get(`${a}-${b}`) ?? []), d.schema]);
  }
  return [...porTramo].map(([tramo, dias]) => {
    const [opens, closes] = tramo.split('-');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: dias, opens, closes };
  });
}
