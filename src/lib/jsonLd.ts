/**
 * Serializa datos para un <script type="application/ld+json"> escapando `<`:
 * JSON.stringify no lo hace, y un valor con "</script>" (ej. el nombre de un
 * producto cargado desde el CRM) cerraría el tag e inyectaría HTML/JS.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
