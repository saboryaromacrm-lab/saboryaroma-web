/** Formato de moneda y cantidad, consistente con el resto del sistema (es-AR). */
export function money(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function cant(n: number, unidad: 'kg' | 'u'): string {
  const v = Number(n) || 0;
  const texto = unidad === 'kg' ? v.toLocaleString('es-AR', { maximumFractionDigits: 3 }) : String(Math.round(v));
  return `${texto} ${unidad === 'kg' ? 'kg' : v === 1 ? 'unidad' : 'unidades'}`;
}

/** Texto comparable para buscar: sin acentos ni mayúsculas (U+0300-U+036F = diacríticos tras NFD). */
export function norm(v: string): string {
  return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Teléfono argentino normalizado a área + abonado (10 dígitos), o '' si no
 * llega. Tolera cómo escribe la gente: `+54`, el `9` de celular, el `0` de
 * larga distancia y el viejo `15` (0370 15 4123456). La misma regla corre en
 * el servidor: esto es solo para avisar ANTES de enviar.
 */
export function telefonoArgentino(tel: string): string {
  let d = String(tel ?? '').replace(/\D/g, '');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('9')) d = d.slice(1);
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
  return d.length === 10 ? d : '';
}

/** Link a WhatsApp desde el número configurado; si no es válido, va al histórico. */
export function linkWhatsApp(numero: string): string {
  const n = telefonoArgentino(numero);
  return `https://wa.me/${n ? `549${n}` : '5493704621563'}`;
}

/** Link a una red: acepta el usuario pelado ("saboryaroma") o la URL completa. */
export function linkRed(valor: string, dominio: string): string {
  const v = String(valor ?? '').trim();
  if (!v) return '';
  return /^https?:/i.test(v) ? v : `https://${dominio}/${v.replace(/^@/, '')}`;
}
