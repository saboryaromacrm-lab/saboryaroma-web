'use client';

/**
 * EL CHECKOUT MINORISTA (0173, 16/10/2026): sin ingreso ni aprobación. El
 * WhatsApp va primero: si ya compró, sus datos (nombre, apellido, dirección)
 * se completan solos; si no, los escribe una vez y quedan para la próxima.
 * Retiro en el local o envío a domicilio, gratis desde el monto configurado.
 * Segunda confirmación antes de enviar, como el mayorista.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { totalLinea, useCart } from '@/lib/cart';
import { buscarComprador, crearPedidoMinorista } from '@/lib/api';
import { money, telefonoArgentino } from '@/lib/format';
import type { EntregaMinorista } from '@/lib/types';
import styles from './page.module.css';

/** El último WhatsApp con el que se compró en este aparato: la próxima vez ya está puesto. */
const TEL_KEY = 'sa_min_tel';
const leerTel = () => { try { return localStorage.getItem(TEL_KEY) ?? ''; } catch { return ''; } };
const guardarTel = (t: string) => { try { localStorage.setItem(TEL_KEY, t); } catch { /* modo privado */ } };

export function CheckoutMinorista() {
  const { items, total, config, vaciar } = useCart();
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [entrega, setEntrega] = useState<EntregaMinorista>('retiro');
  const [calle, setCalle] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  /** Qué pasó con el teléfono: nada, buscando, lo conocemos (con nombre) o es nuevo. */
  const [buscado, setBuscado] = useState<{ tel: string; conocido: string | null } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ codigo: string; total: number; telefono: string } | null>(null);
  const enVuelo = useRef(false);

  /* Con los 10 dígitos se buscan sus datos, una vez por número (el cupo de la API es chico a propósito). */
  const buscar = async (crudo: string) => {
    const tel = telefonoArgentino(crudo);
    if (!tel || buscado?.tel === tel) return;
    setBuscando(true);
    try {
      const { comprador } = await buscarComprador(tel);
      if (comprador) {
        setNombre((v) => v || comprador.nombre);
        setApellido((v) => v || comprador.apellido);
        setCalle((v) => v || comprador.direccion);
        setLocalidad((v) => v || comprador.localidad);
        setReferencia((v) => v || comprador.referencia);
      }
      setBuscado({ tel, conocido: comprador ? comprador.nombre : null });
    } catch { /* sin datos guardados se escribe todo igual */ } finally { setBuscando(false); }
  };

  useEffect(() => {
    const tel = leerTel();
    if (tel) { setTelefono(tel); buscar(tel); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (resultado) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <div className={styles.okIcon}>✓</div>
        <h1 className={styles.title}>¡Pedido recibido!</h1>
        <p className={styles.okText}>Tu pedido <strong>{resultado.codigo}</strong> por {money(resultado.total)} ya está en revisión.</p>
        <p className={styles.okDestacado}>Te escribimos por WhatsApp al <strong>{resultado.telefono}</strong> para coordinar el pago y la entrega.</p>
        <Link href="/tienda" className={styles.cta}>Seguir comprando</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <h1 className={styles.title}>Tu carrito está vacío</h1>
        <Link href="/tienda" className={styles.cta}>Ir a la tienda</Link>
      </div>
    );
  }

  const conEnvio = entrega === 'envio';
  const envioGratis = config.envioGratisDesde > 0 && total >= config.envioGratisDesde;
  const textoEnvio = config.envioGratisDesde <= 0
    ? 'El costo del envío se coordina por WhatsApp.'
    : envioGratis ? '¡Tu envío es gratis!' : `Gratis desde ${money(config.envioGratisDesde)} — te faltan ${money(config.envioGratisDesde - total)}.`;

  /** Primer paso: validar y mostrar los datos para confirmar. */
  const revisar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!telefonoArgentino(telefono)) {
      setError('Revisá el WhatsApp: escribilo con el código de área, sin el 15 — por ejemplo 370 4123456 (10 dígitos en total).');
      return;
    }
    if (nombre.trim().length < 2 || apellido.trim().length < 2) { setError('Escribí tu nombre y tu apellido.'); return; }
    if (conEnvio && (!calle.trim() || !localidad.trim())) {
      setError('Para el envío necesitamos la dirección: calle y número, y el barrio o localidad.');
      return;
    }
    setConfirmar(true);
  };

  /** Segundo paso: «Sí, enviar pedido». Con candado: un doble toque no manda dos pedidos. */
  const enviar = async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setEnviando(true);
    setError('');
    const tel = telefonoArgentino(telefono);
    try {
      const r = await crearPedidoMinorista({
        telefono: tel, nombre: nombre.trim(), apellido: apellido.trim(), entrega, observaciones,
        direccion: conEnvio ? { calle: calle.trim(), localidad: localidad.trim(), referencia: referencia.trim() || undefined } : undefined,
        items: items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad, ...(it.variante ? { variante: it.variante } : {}) })),
      });
      guardarTel(tel);
      setResultado({ codigo: r.codigo, total: r.total, telefono: tel });
      vaciar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido.');
      setConfirmar(false);
    } finally {
      enVuelo.current = false;
      setEnviando(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      <h1 className={styles.title}>Finalizar pedido</h1>

      <div className={styles.layout}>
        <form onSubmit={revisar} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="telefono">
              Tu WhatsApp *
              <span className={styles.hint}>Por acá coordinamos el pago y la entrega. Con código de área, sin 0 ni 15.</span>
            </label>
            <input
              id="telefono" required inputMode="tel" value={telefono} autoComplete="tel-national"
              onChange={(e) => setTelefono(e.target.value)}
              onBlur={(e) => buscar(e.target.value)}
              placeholder="Ej: 370 4123456"
            />
            {telefono.trim() !== '' && !telefonoArgentino(telefono) && (
              <span className={styles.hint} style={{ color: '#b91c1c' }}>Le faltan dígitos: tienen que ser 10 en total (área + número).</span>
            )}
            {buscando && <span className={styles.hint}>Buscando tus datos…</span>}
            {!buscando && buscado?.conocido && buscado.tel === telefonoArgentino(telefono) && (
              <p className={styles.dniEstado} data-tipo="ok">¡Hola de nuevo, <strong>{buscado.conocido}</strong>! Completamos tus datos; revisalos.</p>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="nombre">Nombre *</label>
              <input id="nombre" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="apellido">Apellido *</label>
              <input id="apellido" required maxLength={60} value={apellido} onChange={(e) => setApellido(e.target.value)} autoComplete="family-name" />
            </div>
          </div>

          <div className={styles.field}>
            <label>Entrega *</label>
            <div className={styles.entregas}>
              <label className={styles.entregaOpt} data-selected={entrega === 'retiro'}>
                <input type="radio" name="entrega" checked={entrega === 'retiro'} onChange={() => setEntrega('retiro')} />
                <span>Retiro en el local</span>
              </label>
              <label className={styles.entregaOpt} data-selected={entrega === 'envio'}>
                <input type="radio" name="entrega" checked={entrega === 'envio'} onChange={() => setEntrega('envio')} />
                <span>
                  Envío a domicilio
                  <span className={styles.hint} style={envioGratis ? { color: '#047857', fontWeight: 700 } : undefined}>{textoEnvio}</span>
                </span>
              </label>
            </div>
          </div>

          {conEnvio && (
            <>
              <div className={styles.field}>
                <label htmlFor="calle">
                  Dirección de entrega *
                  <span className={styles.hint}>Calle y número. Si es un edificio, piso y departamento.</span>
                </label>
                <input id="calle" required maxLength={120} value={calle} onChange={(e) => setCalle(e.target.value)} placeholder="Ej: Av. 25 de Mayo 1234, 2º B" autoComplete="street-address" />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="localidad">Barrio / localidad *</label>
                  <input id="localidad" required maxLength={80} value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Ej: Formosa, barrio San Martín" autoComplete="address-level2" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="referencia">Referencia</label>
                  <input id="referencia" maxLength={200} value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Entre calles, portón verde, tocar timbre…" />
                </div>
              </div>
            </>
          )}

          <div className={styles.field}>
            <label htmlFor="obs">Notas del pedido</label>
            <textarea id="obs" rows={3} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Horario de entrega preferido, indicaciones especiales, etc." />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submit} disabled={enviando}>
            {enviando ? 'Enviando…' : `Enviar pedido — ${money(total)}`}
          </button>
          <p className={styles.footNote}>No se paga en este paso. Coordinamos el pago (transferencia o efectivo) por WhatsApp.</p>
        </form>

        {confirmar && (
          <div className={styles.confirmFondo} role="presentation" onClick={() => !enviando && setConfirmar(false)}>
            <div
              className={styles.confirm} role="dialog" aria-modal="true" aria-labelledby="confirm-titulo"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Escape' && !enviando) setConfirmar(false); }}
            >
              <h2 id="confirm-titulo" className={styles.confirmTitulo}>¿Están bien tus datos?</h2>
              <p className={styles.confirmSub}>Revisalos antes de enviar: con estos datos te contactamos.</p>
              <dl className={styles.confirmDatos}>
                <dt>Nombre</dt><dd>{nombre.trim()} {apellido.trim()}</dd>
                <dt>WhatsApp</dt><dd>{telefono}</dd>
                <dt>Entrega</dt><dd>{conEnvio ? `Envío a domicilio${envioGratis ? ' (gratis)' : ''}` : 'Retiro en el local'}</dd>
                {conEnvio && (<><dt>Dirección</dt><dd>{[calle.trim(), localidad.trim(), referencia.trim()].filter(Boolean).join(' · ')}</dd></>)}
                {observaciones.trim() && (<><dt>Notas</dt><dd>{observaciones.trim()}</dd></>)}
                <dt>Total</dt><dd><strong>{money(total)}</strong></dd>
              </dl>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.confirmBotones}>
                <button type="button" className={styles.confirmCorregir} onClick={() => setConfirmar(false)} disabled={enviando}>Corregir</button>
                <button type="button" className={styles.submit} onClick={enviar} disabled={enviando} autoFocus>
                  {enviando ? 'Enviando…' : 'Sí, enviar pedido'}
                </button>
              </div>
            </div>
          </div>
        )}

        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>Tu pedido</h2>
          {items.map((it) => (
            <div key={`${it.productoId}:${it.variante ?? ''}`} className={styles.summaryItem}>
              <span>{it.cantidad} × {it.nombre}{it.etiqueta ? ` · ${it.etiqueta}` : ''}</span>
              <span>{money(totalLinea(it))}</span>
            </div>
          ))}
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
