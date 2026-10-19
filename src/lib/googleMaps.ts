/**
 * GOOGLE MAPS EN EL CHECKOUT MINORISTA (0185). Se carga una sola vez y recién
 * cuando el cliente elige «Envío a domicilio». La clave viene del catálogo
 * (Tienda online › Configuración › Tienda minorista) y es pública por diseño:
 * en Google Cloud se restringe a los dominios de la tienda y del ERP.
 *
 * El proyecto no trae los tipos de Google: acá están solo las piezas que usa
 * el checkout (mapa, centro, sugerencias de dirección y su lugar).
 */
import type { Punto } from './types';

export interface LatLng { lat(): number; lng(): number }
export interface Escucha { remove(): void }
export interface Mapa {
  getCenter(): LatLng | undefined;
  setCenter(p: Punto): void;
  setZoom(z: number): void;
  addListener(evento: string, fn: () => void): Escucha;
}
export interface ComponenteDireccion { longText: string; types: string[] }
export interface Lugar {
  fetchFields(o: { fields: string[] }): Promise<unknown>;
  location?: LatLng | null;
  addressComponents?: ComponenteDireccion[];
}
export interface Prediccion {
  text: { toString(): string };
  mainText?: { toString(): string } | null;
  secondaryText?: { toString(): string } | null;
  toPlace(): Lugar;
}
export interface Places {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: { fetchAutocompleteSuggestions(r: Record<string, unknown>): Promise<{ suggestions: { placePrediction: Prediccion | null }[] }> };
}
export interface Maps {
  importLibrary(nombre: 'maps'): Promise<{ Map: new (el: HTMLElement, o: Record<string, unknown>) => Mapa }>;
  importLibrary(nombre: 'places'): Promise<Places>;
}

/** Formosa Capital: donde arranca el mapa, y el área donde se buscan las direcciones. */
export const FORMOSA: Punto = { lat: -26.1849, lng: -58.1731 };
export const AREA_FORMOSA = { north: -26.05, south: -26.32, east: -58.05, west: -58.35 };

const CALLBACK = '__tiendaMapsListo';
let carga: Promise<Maps> | null = null;
let claveRechazada = false;
const alRechazar = new Set<() => void>();

type Ventana = Window & { google?: { maps: Maps }; gm_authFailure?: () => void } & Record<string, unknown>;

/** Resuelve con `google.maps` listo para `importLibrary`. */
export function cargarGoogleMaps(clave: string): Promise<Maps> {
  if (carga) return carga;
  const w = window as unknown as Ventana;
  /* Google avisa por acá cuando la clave no sirve (mal copiada, sin la API habilitada o sin este dominio). */
  w.gm_authFailure = () => { claveRechazada = true; alRechazar.forEach((fn) => fn()); };
  carga = new Promise<Maps>((resolve, reject) => {
    w[CALLBACK] = () => { delete w[CALLBACK]; resolve(w.google!.maps); };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(clave)}&v=weekly&loading=async&language=es&region=AR&callback=${CALLBACK}`;
    script.async = true;
    script.onerror = () => { script.remove(); carga = null; reject(new Error('No se pudo cargar el mapa.')); };
    document.head.appendChild(script);
  });
  return carga;
}

/** Avisa si Google rechaza la clave (ahora o más adelante). Devuelve cómo dejar de escuchar. */
export function siRechazaLaClave(fn: () => void): () => void {
  if (claveRechazada) fn();
  alRechazar.add(fn);
  return () => { alRechazar.delete(fn); };
}
