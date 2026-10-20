/** Lee una cookie en el navegador ('' en el servidor o si no está). */
export function leerCookie(nombre: string): string {
  if (typeof document === 'undefined') return '';
  const m = new RegExp(`(?:^|;\\s*)${nombre}=([^;]+)`).exec(document.cookie);
  return m ? decodeURIComponent(m[1]) : '';
}
