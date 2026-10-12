'use client';

/**
 * INGRESO A LA TIENDA MAYORISTA (0155, 10/10/2026, pedido del dueño)
 * ============================================================================
 * Los precios los ven solo los clientes habilitados. Esta ventana es la única
 * puerta: se entra con el DNI; si el DNI no está registrado, se pide ingreso
 * (nombre o comercio, WhatsApp, localidad y CUIT opcional) y alguien del local
 * lo habilita y le avisa por WhatsApp. Se abre desde cualquier lado con
 * `abrirIngreso()` (el botón del encabezado, «Ver precio», «Agregar», el carrito).
 *
 * Además: el cartel «tu solicitud está en revisión» mientras espera, y la
 * renovación de la cookie (90 días desde el último uso, igual que el servidor).
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { ingresar, registrarse, salir, type EstadoIngreso } from '@/lib/api';
import {
  abrirIngreso, borrarToken, guardarToken, leerSolicitud, leerToken, marcarSolicitud,
} from '@/lib/sesion';
import { linkWhatsApp, telefonoArgentino } from '@/lib/format';
import styles from './Ingreso.module.css';

type Paso = 'dni' | 'registro' | 'recibida' | 'pendiente' | 'bloqueado';

const soloDigitos = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

export function Ingreso() {
  const router = useRouter();
  const { conPrecios, catalogo } = useCart();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState<Paso>('dni');
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [cuit, setCuit] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enVuelo = useRef(false);
  const [esperando, setEsperando] = useState(false);
  const whatsappEmpresa = linkWhatsApp(catalogo?.sitio?.contacto?.whatsapp ?? '');

  useEffect(() => {
    const abrir = () => { setPaso('dni'); setError(''); setAbierto(true); };
    window.addEventListener('sa:abrir-ingreso', abrir);
    return () => window.removeEventListener('sa:abrir-ingreso', abrir);
  }, []);

  /* Con sesión: la cookie se renueva (90 días desde hoy) y el cartel de «en revisión» ya no corre. */
  useEffect(() => {
    if (conPrecios && catalogo?.cliente) {
      const t = leerToken();
      if (t) guardarToken(t);
      marcarSolicitud(false);
      setEsperando(false);
    } else {
      setEsperando(leerSolicitud());
    }
  }, [conPrecios, catalogo?.cliente]);

  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !enVuelo.current) setAbierto(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [abierto]);

  /** Lo que contestó la API, en pantalla. Habilitado: guarda el token y la página se vuelve a armar con precios. */
  const resolver = (r: EstadoIngreso, desdeRegistro: boolean) => {
    if (r.estado === 'habilitado') {
      guardarToken(r.token);
      marcarSolicitud(false);
      setAbierto(false);
      router.refresh();
      return;
    }
    if (r.estado === 'sin_registro') { setPaso('registro'); return; }
    marcarSolicitud(r.estado === 'pendiente');
    setEsperando(r.estado === 'pendiente');
    setPaso(r.estado === 'pendiente' ? (desdeRegistro ? 'recibida' : 'pendiente') : 'bloqueado');
  };

  /** Un envío por vez: un doble toque no manda dos pedidos de ingreso. */
  const enviar = async (fn: () => Promise<EstadoIngreso>, desdeRegistro: boolean) => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setEnviando(true);
    setError('');
    try {
      resolver(await fn(), desdeRegistro);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar con la tienda.');
    } finally {
      enVuelo.current = false;
      setEnviando(false);
    }
  };

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (dni.length < 7) { setError('El DNI tiene 7 u 8 números.'); return; }
    enviar(() => ingresar(dni), false);
  };

  const pedirIngreso = (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 3) { setError('Escribí tu nombre y apellido, o el nombre de tu comercio.'); return; }
    if (dni.length < 7) { setError('El DNI tiene 7 u 8 números.'); return; }
    if (!telefonoArgentino(whatsapp)) { setError('Revisá el WhatsApp: con el código de área, sin 0 ni 15 — por ejemplo 370 4123456.'); return; }
    if (!localidad.trim()) { setError('Escribí tu localidad.'); return; }
    if (cuit && cuit.length !== 11) { setError('El CUIT tiene 11 números. Si no tenés, dejalo vacío.'); return; }
    enviar(() => registrarse({ nombre: nombre.trim(), dni, whatsapp, localidad: localidad.trim(), cuit: cuit || undefined }), true);
  };

  const cerrar = () => { if (!enVuelo.current) setAbierto(false); };

  const cartelEspera = esperando && !abierto && (
    <div className={styles.espera} role="status">
      <span>⏳ <strong>Tu solicitud de ingreso está en revisión.</strong> Te avisamos por WhatsApp apenas estés habilitado.</span>
      <button type="button" className={styles.esperaCerrar} onClick={() => setEsperando(false)} aria-label="Ocultar">×</button>
    </div>
  );

  if (!abierto) return cartelEspera || null;

  return (
    <div className={styles.fondo} onClick={cerrar} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="ingreso-titulo" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">×</button>

        {paso === 'dni' && (
          <form onSubmit={entrar} className={styles.form}>
            <span className={styles.etiqueta}>🔒 Tienda mayorista</span>
            <h2 id="ingreso-titulo" className={styles.titulo}>Ingresá para ver los precios</h2>
            <p className={styles.texto}>Los precios mayoristas los ven los clientes habilitados. Si ya estás habilitado, entrá con tu DNI.</p>
            <label className={styles.campo}>
              DNI
              <input
                autoFocus inputMode="numeric" autoComplete="off" placeholder="Ej: 35678242"
                value={dni} onChange={(e) => setDni(soloDigitos(e.target.value, 8))}
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.boton} disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
            <button type="button" className={styles.link} onClick={() => { setError(''); setPaso('registro'); }}>
              ¿Todavía no estás registrado? <strong>Pedí tu ingreso</strong>
            </button>
          </form>
        )}

        {paso === 'registro' && (
          <form onSubmit={pedirIngreso} className={styles.form}>
            <span className={styles.etiqueta}>📝 Pedido de ingreso</span>
            <h2 id="ingreso-titulo" className={styles.titulo}>Pedí tu ingreso a la tienda mayorista</h2>
            <p className={styles.texto}>Revisamos tu pedido y te avisamos por WhatsApp. Después entrás solo con tu DNI.</p>
            <label className={styles.campo}>
              Nombre y apellido, o el de tu comercio *
              <input autoFocus maxLength={120} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            <div className={styles.fila}>
              <label className={styles.campo}>
                DNI *
                <input inputMode="numeric" autoComplete="off" placeholder="Ej: 35678242" value={dni} onChange={(e) => setDni(soloDigitos(e.target.value, 8))} />
              </label>
              <label className={styles.campo}>
                WhatsApp *
                <input inputMode="tel" autoComplete="tel" placeholder="Ej: 370 4123456" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </label>
            </div>
            <div className={styles.fila}>
              <label className={styles.campo}>
                Localidad *
                <input maxLength={80} autoComplete="address-level2" placeholder="Ej: Formosa" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
              </label>
              <label className={styles.campo}>
                <span>CUIT <span className={styles.opcional}>(opcional)</span></span>
                <input inputMode="numeric" autoComplete="off" placeholder="Para factura A" value={cuit} onChange={(e) => setCuit(soloDigitos(e.target.value, 11))} />
              </label>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.boton} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar pedido de ingreso'}</button>
            <button type="button" className={styles.link} onClick={() => { setError(''); setPaso('dni'); }}>
              Ya estoy habilitado: <strong>ingresar con mi DNI</strong>
            </button>
          </form>
        )}

        {(paso === 'recibida' || paso === 'pendiente') && (
          <div className={styles.form}>
            <span className={styles.icono} aria-hidden>{paso === 'recibida' ? '✓' : '⏳'}</span>
            <h2 id="ingreso-titulo" className={styles.titulo}>{paso === 'recibida' ? '¡Listo! Recibimos tu pedido de ingreso' : 'Tu solicitud está en revisión'}</h2>
            <p className={styles.texto}>
              La revisamos y te avisamos por WhatsApp apenas estés habilitado. Después entrás solo con tu DNI.
            </p>
            <button type="button" className={styles.boton} onClick={cerrar}>Seguir mirando el catálogo</button>
          </div>
        )}

        {paso === 'bloqueado' && (
          <div className={styles.form}>
            <h2 id="ingreso-titulo" className={styles.titulo}>No podemos habilitarte el ingreso</h2>
            <p className={styles.texto}>Si creés que es un error, escribinos por WhatsApp.</p>
            <a href={whatsappEmpresa} target="_blank" rel="noopener noreferrer" className={styles.boton}>Escribir por WhatsApp</a>
          </div>
        )}
      </div>
    </div>
  );
}

/** El botón de la cuenta en el encabezado: «Ingresar» o «Hola, Juan · Salir». */
export function BotonCuenta({ className }: { className?: string }) {
  const router = useRouter();
  const { conPrecios, cliente } = useCart();
  const saliendo = useRef(false);
  if (!conPrecios || !cliente) {
    return <button type="button" className={`${styles.cuenta} ${className ?? ''}`} onClick={abrirIngreso}>👤 Ingresar</button>;
  }
  const salirDeLaCuenta = async () => {
    if (saliendo.current) return;
    saliendo.current = true;
    await salir(leerToken());
    borrarToken();
    router.refresh();
    saliendo.current = false;
  };
  return (
    <span className={`${styles.cuenta} ${styles.cuentaActiva} ${className ?? ''}`}>
      <span className={styles.hola}>👤 Hola, {cliente.nombre.split(' ')[0]}</span>
      <button type="button" className={styles.salir} onClick={salirDeLaCuenta}>Salir</button>
    </span>
  );
}

/** En lugar del precio, para el que no ingresó: un toque y abre el ingreso. */
export function PrecioOculto({ className }: { className?: string }) {
  return (
    <button type="button" className={`${styles.precioOculto} ${className ?? ''}`} onClick={abrirIngreso}>
      🔒 Ingresá para ver el precio
    </button>
  );
}

/** Carrito, mini-carrito y checkout sin haber ingresado: no hay plata que mostrar ni con qué comprar. */
export function IngresarParaComprar({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className={compacto ? styles.paraComprarCompacto : styles.paraComprar}>
      <p className={styles.texto}>Para ver los precios y hacer tu pedido, ingresá con tu DNI.</p>
      <button type="button" className={styles.boton} onClick={abrirIngreso}>Ingresar</button>
    </div>
  );
}
