'use client';

/**
 * DÓNDE RECIBÍS (0185): el cliente busca su dirección (sugerencias de Google,
 * dentro de Formosa), o usa su ubicación, y ajusta moviendo el mapa hasta que
 * el pin del medio quede en su casa. Ese punto es el que decide el barrio en
 * el servidor. Si el mapa no carga (sin conexión, clave rechazada), avisa con
 * `onSinMapa` y el checkout sigue como antes, con la dirección escrita.
 */
import { useEffect, useRef, useState } from 'react';
import { AREA_FORMOSA, FORMOSA, cargarGoogleMaps, siRechazaLaClave, type Escucha, type Mapa, type Places, type Prediccion } from '@/lib/googleMaps';
import type { Punto } from '@/lib/types';
import styles from './UbicacionEnvio.module.css';

/** La dirección escrita: el buscador ES ese campo y la completa al elegir una sugerencia. */
interface Direccion { calle: string; onCalle: (v: string) => void; onLocalidad: (v: string) => void }

interface Props {
  mapsKey: string;
  punto: Punto | null;
  onPunto: (p: Punto) => void;
  /** Sin dirección (envío a la guardada): el buscador solo lleva el mapa. */
  direccion: Direccion | null;
  onSinMapa: () => void;
}

const ZOOM_CASA = 17;
const ESPERA_BUSQUEDA_MS = 300;

/** «Av. 25 de Mayo 1234» y «Formosa», de las partes de la dirección del lugar. */
function partes(componentes: { longText: string; types: string[] }[] = []) {
  const de = (tipo: string) => componentes.find((c) => c.types.includes(tipo))?.longText ?? '';
  return { calle: [de('route'), de('street_number')].filter(Boolean).join(' '), localidad: de('locality') || de('administrative_area_level_2') };
}

export function UbicacionEnvio({ mapsKey, punto, onPunto, direccion, onSinMapa }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<Mapa | null>(null);
  const places = useRef<Places | null>(null);
  const sesion = useRef<unknown>(null);
  /** El pin cuenta recién cuando el cliente hizo algo: el centro inicial (Formosa) no es su casa. */
  const marcado = useRef(!!punto);
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState<Prediccion[]>([]);
  const [aviso, setAviso] = useState('');
  const [ubicando, setUbicando] = useState(false);
  const busqueda = direccion ? direccion.calle : texto;

  /* Las funciones del padre cambian en cada render: se leen de acá para no rearmar el mapa. */
  const ultimo = useRef({ onPunto, onSinMapa });
  useEffect(() => { ultimo.current = { onPunto, onSinMapa }; });

  useEffect(() => {
    let vivo = true;
    const escuchas: Escucha[] = [];
    const dejar = siRechazaLaClave(() => ultimo.current.onSinMapa());
    cargarGoogleMaps(mapsKey).then(async (maps) => {
      const [{ Map }, lib] = await Promise.all([maps.importLibrary('maps'), maps.importLibrary('places')]);
      if (!vivo || !caja.current) return;
      places.current = lib;
      sesion.current = new lib.AutocompleteSessionToken();
      const m = new Map(caja.current, {
        center: punto ?? FORMOSA, zoom: punto ? ZOOM_CASA : 13,
        disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: 'greedy',
      });
      mapa.current = m;
      /* Arrastrar es «acá vivo»; el zoom solo no (el del arranque también dispara eventos). */
      escuchas.push(m.addListener('dragstart', () => { marcado.current = true; }));
      /* Cuando el mapa se queda quieto, el centro (donde está el pin) es el punto. */
      escuchas.push(m.addListener('idle', () => {
        const c = m.getCenter();
        if (marcado.current && c) ultimo.current.onPunto({ lat: c.lat(), lng: c.lng() });
      }));
    }).catch(() => { if (vivo) ultimo.current.onSinMapa(); });
    return () => { vivo = false; escuchas.forEach((x) => x.remove()); dejar(); };
    // El mapa se arma una vez; después lo mueve el cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey]);

  /* Las sugerencias, con una pausa para no consultar en cada letra. */
  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 3 || !places.current) { setSugerencias([]); return undefined; }
    let vigente = true;
    const t = setTimeout(async () => {
      try {
        const { suggestions } = await places.current!.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q, sessionToken: sesion.current, includedRegionCodes: ['ar'], locationRestriction: AREA_FORMOSA, language: 'es',
        });
        if (vigente) setSugerencias(suggestions.map((s) => s.placePrediction).filter((p): p is Prediccion => !!p).slice(0, 5));
      } catch {
        if (vigente) setSugerencias([]);
      }
    }, ESPERA_BUSQUEDA_MS);
    return () => { vigente = false; clearTimeout(t); };
  }, [busqueda]);

  const irA = (p: Punto) => {
    marcado.current = true;
    mapa.current?.setCenter(p);
    mapa.current?.setZoom(ZOOM_CASA);
    onPunto(p);
  };

  const elegir = async (pred: Prediccion) => {
    setSugerencias([]);
    setAviso('');
    try {
      const lugar = pred.toPlace();
      await lugar.fetchFields({ fields: ['location', 'addressComponents'] });
      /* Cada elección cierra una búsqueda (así la cobra Google): la siguiente arranca otra. */
      sesion.current = places.current ? new places.current.AutocompleteSessionToken() : null;
      if (!lugar.location) throw new Error('sin lugar');
      if (direccion) {
        const { calle, localidad } = partes(lugar.addressComponents);
        direccion.onCalle(calle || pred.mainText?.toString() || pred.text.toString());
        if (localidad) direccion.onLocalidad(localidad);
      } else {
        setTexto(pred.text.toString());
      }
      irA({ lat: lugar.location.lat(), lng: lugar.location.lng() });
      setAviso('Ajustá moviendo el mapa hasta que el pin quede justo en tu casa.');
    } catch {
      setAviso('No pudimos ubicar esa dirección: mové el mapa hasta tu casa.');
    }
  };

  const miUbicacion = () => {
    if (!navigator.geolocation) { setAviso('Tu celular no comparte la ubicación: buscá tu dirección o mové el mapa.'); return; }
    setUbicando(true);
    setAviso('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUbicando(false); irA({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setAviso('¿Es tu casa? Si no, mové el mapa hasta que el pin quede en ella.'); },
      () => { setUbicando(false); setAviso('No pudimos saber tu ubicación: buscá tu dirección o mové el mapa.'); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className={styles.ubicacion}>
      <div className={styles.buscador}>
        <input
          id="calle" value={busqueda} maxLength={120} autoComplete="off"
          placeholder={direccion ? 'Calle y número. Ej: Av. 25 de Mayo 1234' : 'Buscá tu dirección'}
          aria-label={direccion ? 'Dirección de entrega' : 'Buscá tu dirección en el mapa'}
          onChange={(e) => (direccion ? direccion.onCalle(e.target.value) : setTexto(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Escape') setSugerencias([]); }}
        />
        {sugerencias.length > 0 && (
          <ul className={styles.sugerencias} role="listbox" aria-label="Direcciones sugeridas">
            {sugerencias.map((p, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button type="button" onClick={() => elegir(p)}>
                  <strong>{p.mainText?.toString() ?? p.text.toString()}</strong>
                  {p.secondaryText && <span>{p.secondaryText.toString()}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.mapaCaja}>
        <div ref={caja} className={styles.mapa} />
        {/* El pin queda fijo en el medio: se mueve el mapa, no el pin (más fácil con el dedo). */}
        <svg className={styles.pin} viewBox="0 0 24 34" aria-hidden="true">
          <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 34 12 34s12-13.2 12-22.1C24 5.3 18.6 0 12 0z" />
          <circle cx="12" cy="12" r="4.5" fill="#fff" />
        </svg>
        <button type="button" className={styles.miUbicacion} onClick={miUbicacion} disabled={ubicando}>
          {ubicando ? 'Buscando…' : '📍 Usar mi ubicación'}
        </button>
      </div>
      <p className={styles.aviso} aria-live="polite">
        {aviso || (punto ? 'Listo: si hace falta, mové el mapa para ajustar.' : 'Buscá tu dirección o mové el mapa hasta que el pin quede en tu casa.')}
      </p>
    </div>
  );
}
