'use client';

/**
 * INGRESO A LA TIENDA MINORISTA (0178, 17/10/2026, pedido del dueño)
 * ============================================================================
 * Para ver los precios y comprar, el cliente minorista ingresa con su WHATSAPP
 * (el mayorista sigue con el DNI). Si es la primera vez se registra —WhatsApp,
 * nombre, apellido y dirección, nada más— y entra en el momento, sin
 * aprobación. El que ya había comprado entra directo; si le falta algún dato,
 * se lo pide una vez («completar»). Se abre igual que la del DNI, con
 * `abrirIngreso()`, y comparte con ella el marco y el candado del envío.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { ingresarMinorista, registrarMinorista, type EstadoMinorista } from '@/lib/api';
import { guardarToken, leerToken } from '@/lib/sesion';
import { linkWhatsApp, telefonoArgentino } from '@/lib/format';
import { VentanaIngreso, useVentanaIngreso } from '../Ingreso';
import styles from '../Ingreso.module.css';

type Paso = 'telefono' | 'registro' | 'completar' | 'bloqueado';

const MSG_WHATSAPP = 'Revisá el WhatsApp: con el código de área, sin 0 ni 15 — por ejemplo 370 4123456.';

export function IngresoMinorista() {
  const router = useRouter();
  const { conPrecios, comprador, catalogo } = useCart();
  const { abierto, setAbierto, paso, setPaso, error, setError, enviando, enviar, cerrar } = useVentanaIngreso<Paso>('telefono', 'registro');
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [direccion, setDireccion] = useState('');
  const whatsappEmpresa = linkWhatsApp(catalogo?.sitio?.contacto?.whatsapp ?? '');
  const tel = telefonoArgentino(telefono);

  /* Con sesión, la cookie se renueva: 90 días desde hoy, igual que el servidor. */
  useEffect(() => {
    if (!conPrecios || !comprador) return;
    const t = leerToken('minorista');
    if (t) guardarToken(t, 'minorista');
  }, [conPrecios, comprador]);

  /** Lo que contestó la API. Habilitado: guarda el token y la página se vuelve a armar con precios. */
  const resolver = (r: EstadoMinorista) => {
    if (r.estado === 'habilitado') {
      guardarToken(r.token, 'minorista');
      setAbierto(false);
      router.refresh();
      return;
    }
    setPaso(r.estado === 'sin_registro' ? 'registro' : r.estado);
  };

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tel) { setError(MSG_WHATSAPP); return; }
    enviar(() => ingresarMinorista(tel), resolver);
  };

  const registrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tel) { setError(MSG_WHATSAPP); return; }
    if (nombre.trim().length < 2 || apellido.trim().length < 2) { setError('Escribí tu nombre y tu apellido.'); return; }
    if (direccion.trim().length < 5) { setError('Escribí tu dirección: calle, número y barrio.'); return; }
    enviar(() => registrarMinorista({ telefono: tel, nombre: nombre.trim(), apellido: apellido.trim(), direccion: direccion.trim() }), resolver);
  };

  const volver = () => { setError(''); setPaso('telefono'); };

  if (!abierto) return null;

  const completar = paso === 'completar';
  return (
    <VentanaIngreso onCerrar={cerrar}>
      {paso === 'telefono' && (
        <form onSubmit={entrar} className={styles.form}>
          <span className={styles.etiqueta}>🛒 Tienda minorista</span>
          <h2 id="ingreso-titulo" className={styles.titulo}>Ingresá con tu WhatsApp</h2>
          <p className={styles.texto}>Para ver los precios y hacer tu pedido. Si es la primera vez, te registrás en un minuto.</p>
          <label className={styles.campo}>
            WhatsApp
            <input autoFocus inputMode="tel" autoComplete="tel-national" placeholder="Ej: 370 4123456" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.boton} disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
          <button type="button" className={styles.link} onClick={() => { setError(''); setPaso('registro'); }}>
            ¿Es tu primera vez? <strong>Registrate</strong>
          </button>
        </form>
      )}

      {(paso === 'registro' || completar) && (
        <form onSubmit={registrar} className={styles.form}>
          <span className={styles.etiqueta}>{completar ? '📝 Completá tus datos' : '📝 Registro'}</span>
          <h2 id="ingreso-titulo" className={styles.titulo}>{completar ? 'Nos faltan algunos datos' : 'Creá tu cuenta'}</h2>
          <p className={styles.texto}>Una sola vez: después entrás solo con tu WhatsApp.</p>
          <label className={styles.campo}>
            WhatsApp *
            <input
              autoFocus={!completar} inputMode="tel" autoComplete="tel-national" placeholder="Ej: 370 4123456"
              value={telefono} onChange={(e) => setTelefono(e.target.value)} readOnly={completar}
            />
          </label>
          <div className={styles.fila}>
            <label className={styles.campo}>
              Nombre *
              <input autoFocus={completar} maxLength={60} autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            <label className={styles.campo}>
              Apellido *
              <input maxLength={60} autoComplete="family-name" value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </label>
          </div>
          <label className={styles.campo}>
            Dirección *
            <input maxLength={120} autoComplete="street-address" placeholder="Calle, número y barrio" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.boton} disabled={enviando}>
            {enviando ? 'Guardando…' : completar ? 'Guardar y entrar' : 'Registrarme y entrar'}
          </button>
          <button type="button" className={styles.link} onClick={volver}>
            Ya tengo cuenta: <strong>ingresar con mi WhatsApp</strong>
          </button>
        </form>
      )}

      {paso === 'bloqueado' && (
        <div className={styles.form}>
          <h2 id="ingreso-titulo" className={styles.titulo}>No podemos habilitarte el ingreso</h2>
          <p className={styles.texto}>Si creés que es un error, escribinos por WhatsApp.</p>
          <a href={whatsappEmpresa} target="_blank" rel="noopener noreferrer" className={styles.boton}>Escribir por WhatsApp</a>
        </div>
      )}
    </VentanaIngreso>
  );
}
