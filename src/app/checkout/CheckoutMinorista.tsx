'use client';

/**
 * EL CHECKOUT MINORISTA (0173, 16/10/2026). Desde 0178 se compra con ingreso:
 * quién compra (WhatsApp, nombre y apellido) sale de la sesión, no se escribe.
 * Retiro en el local o envío a domicilio, a su dirección guardada (la ve a
 * medias: «Av. 25 de…») o a otra, que pasa a ser la guardada. Segunda
 * confirmación antes de enviar, como el mayorista.
 *
 * EL BARRIO (0185): con la clave de Google Maps cargada, el cliente marca en
 * el mapa dónde recibe y el servidor dice su barrio, cuánto sale el envío, el
 * descuento del barrio y las promos del día (la misma cuenta del pedido). Sin
 * clave, o si el mapa no carga, todo sigue como antes: gratis desde el monto
 * configurado o se coordina.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { totalLinea, useCart } from '@/lib/cart';
import { cotizarEnvio, crearPedidoMinorista } from '@/lib/api';
import { pedidoEnviado } from '@/lib/analytics';
import { leerToken } from '@/lib/sesion';
import { money, telLegible } from '@/lib/format';
import { IngresarParaComprar } from '@/components/Ingreso';
import { UbicacionEnvio } from '@/components/minorista/UbicacionEnvio';
import type { CotizacionEnvio, EntregaMinorista, ItemCarrito, Punto } from '@/lib/types';
import styles from './page.module.css';

/** Pausa antes de recalcular el envío: el mapa se mueve de a muchos pasitos. */
const ESPERA_COTIZAR_MS = 400;

const lineasDe = (items: ItemCarrito[]) => items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad, ...(it.variante ? { variante: it.variante } : {}) }));

/** El envío en palabras: 0 = gratis; null = se coordina. */
const textoCosto = (envio: number | null) => (envio === 0 ? 'gratis' : envio != null ? money(envio) : 'a coordinar por WhatsApp');

export function CheckoutMinorista() {
  const { items, total, config, vaciar, conPrecios, comprador } = useCart();
  const [entrega, setEntrega] = useState<EntregaMinorista>('retiro');
  /** A su dirección guardada o a otra (la otra pasa a ser la guardada). */
  const [aGuardada, setAGuardada] = useState(true);
  const [calle, setCalle] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  /** Dónde recibe, marcado en el mapa (0185). */
  const [punto, setPunto] = useState<Punto | null>(null);
  /** El mapa no cargó (sin conexión o clave rechazada): sigue con la dirección escrita, como antes. */
  const [sinMapa, setSinMapa] = useState(false);
  const [cotizacion, setCotizacion] = useState<CotizacionEnvio | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ codigo: string; total: number; telefono: string } | null>(null);
  const enVuelo = useRef(false);

  const conEnvio = entrega === 'envio';
  /** Va a la guardada si tiene una y la eligió; si no, a la que escriba. */
  const usaGuardada = conEnvio && aGuardada && !!comprador?.direccion;
  const conMapa = config.mapsKey !== '' && !sinMapa;

  /* Cuánto sale recibir en casa: con el punto marcado o a la dirección guardada (el servidor sabe su punto). */
  useEffect(() => {
    if (!conEnvio || !comprador || !items.length || (!usaGuardada && !punto)) { setCotizacion(null); return undefined; }
    let vigente = true;
    const t = setTimeout(() => {
      cotizarEnvio({ direccion: usaGuardada ? { guardada: true } : undefined, ubicacion: punto ?? undefined, items: lineasDe(items) }, leerToken('minorista'))
        .then((c) => { if (vigente) setCotizacion(c); })
        .catch(() => { if (vigente) setCotizacion(null); });
    }, ESPERA_COTIZAR_MS);
    return () => { vigente = false; clearTimeout(t); };
  }, [conEnvio, usaGuardada, punto, items, comprador]);

  if (resultado) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <div className={styles.okIcon}>✓</div>
        <h1 className={styles.title}>¡Pedido recibido!</h1>
        <p className={styles.okText}>Tu pedido <strong>{resultado.codigo}</strong> por {money(resultado.total)} ya está en revisión.</p>
        <p className={styles.okDestacado}>Te escribimos por WhatsApp al <strong>{telLegible(resultado.telefono)}</strong> para coordinar el pago y la entrega.</p>
        <Link href="/tienda" className={styles.cta}>Seguir comprando</Link>
      </div>
    );
  }

  /* Sin haber ingresado no se compra (0178). */
  if (!conPrecios || !comprador) {
    return (
      <div className="container" style={{ paddingBlock: '60px' }}>
        <h1 className={styles.title} style={{ textAlign: 'center' }}>Finalizar pedido</h1>
        <IngresarParaComprar />
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

  const quien = `${comprador.nombre} ${comprador.inicial}.`;
  const envioGratis = config.envioGratisDesde > 0 && total >= config.envioGratisDesde;
  const textoEnvio = conMapa
    ? 'El costo depende de tu barrio: marcá tu casa en el mapa y lo ves al instante.'
    : config.envioGratisDesde <= 0
      ? 'El costo del envío se coordina por WhatsApp.'
      : envioGratis ? '¡Tu envío es gratis!' : `Gratis desde ${money(config.envioGratisDesde)} — te faltan ${money(config.envioGratisDesde - total)}.`;
  /** El mapa: a otra dirección siempre; a la guardada, solo si es de antes del mapa (no tiene punto). */
  const muestraMapa = conEnvio && conMapa && (!usaGuardada || !!punto || cotizacion?.conPunto === false);
  const cot = conEnvio ? cotizacion : null;
  const aPagar = cot ? cot.total : total;

  /** Primer paso: validar y mostrar los datos para confirmar. */
  const revisar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (conEnvio && !usaGuardada && (!calle.trim() || !localidad.trim())) {
      setError('Para el envío necesitamos la dirección: calle y número, y el barrio o localidad.');
      return;
    }
    if (muestraMapa && !punto) {
      setError('Marcá en el mapa dónde recibís: buscá tu dirección o mové el mapa hasta tu casa.');
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
    try {
      const r = await crearPedidoMinorista({
        entrega, observaciones,
        direccion: !conEnvio ? undefined
          : usaGuardada ? { guardada: true }
            : { calle: calle.trim(), localidad: localidad.trim(), referencia: referencia.trim() || undefined },
        ubicacion: conEnvio ? punto ?? undefined : undefined,
        items: lineasDe(items),
      }, leerToken('minorista'));
      pedidoEnviado(r.codigo);
      setResultado({ codigo: r.codigo, total: r.total + (r.envio ?? 0), telefono: comprador.telefono });
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

  /** Cambiar de destino es otra casa: el punto marcado no vale. */
  const elegirDestino = (guardada: boolean) => { setAGuardada(guardada); setPunto(null); };

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      <h1 className={styles.title}>Finalizar pedido</h1>

      <div className={styles.layout}>
        <form onSubmit={revisar} className={styles.form}>
          <p className={styles.dniEstado} data-tipo="ok">
            Comprás como <strong>{quien}</strong> · te escribimos al WhatsApp <strong>{telLegible(comprador.telefono)}</strong> para coordinar el pago y la entrega.
          </p>

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
                  <span className={styles.hint} style={envioGratis && !conMapa ? { color: '#047857', fontWeight: 700 } : undefined}>{textoEnvio}</span>
                </span>
              </label>
            </div>
          </div>

          {conEnvio && comprador.direccion && (
            <div className={styles.field}>
              <label>¿A dónde te lo llevamos? *</label>
              <div className={styles.entregas}>
                <label className={styles.entregaOpt} data-selected={aGuardada}>
                  <input type="radio" name="destino" checked={aGuardada} onChange={() => elegirDestino(true)} />
                  <span>A mi dirección guardada<span className={styles.hint}>{comprador.direccion}</span></span>
                </label>
                <label className={styles.entregaOpt} data-selected={!aGuardada}>
                  <input type="radio" name="destino" checked={!aGuardada} onChange={() => elegirDestino(false)} />
                  <span>A otra dirección<span className={styles.hint}>Pasa a ser tu dirección guardada.</span></span>
                </label>
              </div>
            </div>
          )}

          {conEnvio && !usaGuardada && (
            <>
              <div className={styles.field}>
                <label htmlFor="calle">
                  Dirección de entrega *
                  <span className={styles.hint}>
                    {conMapa ? 'Escribila y elegí la sugerencia, o mové el mapa hasta que el pin quede en tu casa.' : 'Calle y número. Si es un edificio, piso y departamento.'}
                  </span>
                </label>
                {conMapa ? (
                  <UbicacionEnvio
                    mapsKey={config.mapsKey} punto={punto} onPunto={setPunto} onSinMapa={() => setSinMapa(true)}
                    direccion={{ calle, onCalle: setCalle, onLocalidad: setLocalidad }}
                  />
                ) : (
                  <input id="calle" required maxLength={120} value={calle} onChange={(e) => setCalle(e.target.value)} placeholder="Ej: Av. 25 de Mayo 1234, 2º B" autoComplete="street-address" />
                )}
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="localidad">Barrio / localidad *</label>
                  <input id="localidad" required maxLength={80} value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Ej: Formosa, barrio San Martín" autoComplete="address-level2" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="referencia">Referencia</label>
                  <input id="referencia" maxLength={200} value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Piso y depto, entre calles, portón verde…" />
                </div>
              </div>
            </>
          )}

          {usaGuardada && muestraMapa && (
            <div className={styles.field}>
              <label>
                Marcá tu casa en el mapa *
                <span className={styles.hint}>Una sola vez: así sabemos tu barrio y queda guardado con tu dirección.</span>
              </label>
              <UbicacionEnvio mapsKey={config.mapsKey} punto={punto} onPunto={setPunto} onSinMapa={() => setSinMapa(true)} direccion={null} />
            </div>
          )}

          {cot && (cot.conPunto || cot.envio != null) && (
            <div className={styles.envioResumen} aria-live="polite">
              {cot.conPunto && <strong>{cot.barrio ? `📍 Barrio ${cot.barrio}` : '📍 Tu casa está fuera de los barrios con envío propio'}</strong>}
              <span>{cot.envio === 0 ? '¡Tu envío es gratis!' : `Envío: ${textoCosto(cot.envio)}`}</span>
              {cot.promos.map((p) => <span key={p} className={styles.envioPromo}>🎉 Hoy: {p}</span>)}
              {cot.descuento > 0 && <span>Descuento del barrio: −{money(cot.descuento)} ({cot.descuentoPct}% en los productos que no están en oferta)</span>}
              {cot.proxima && <span className={styles.envioProxima}>Sumá {money(cot.proxima.faltan)} y tenés: {cot.proxima.texto}</span>}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="obs">Notas del pedido</label>
            <textarea id="obs" rows={3} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Horario de entrega preferido, indicaciones especiales, etc." />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submit} disabled={enviando}>
            {enviando ? 'Enviando…' : `Enviar pedido — ${money(aPagar)}`}
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
                <dt>Nombre</dt><dd>{quien}</dd>
                <dt>WhatsApp</dt><dd>{telLegible(comprador.telefono)}</dd>
                <dt>Entrega</dt>
                <dd>
                  {!conEnvio ? 'Retiro en el local'
                    : cot ? `Envío a domicilio${cot.barrio ? ` · B° ${cot.barrio}` : ''} (${textoCosto(cot.envio)})`
                      : `Envío a domicilio${envioGratis ? ' (gratis)' : ''}`}
                </dd>
                {conEnvio && (<><dt>Dirección</dt><dd>{usaGuardada ? `Tu dirección guardada (${comprador.direccion})` : [calle.trim(), localidad.trim(), referencia.trim()].filter(Boolean).join(' · ')}</dd></>)}
                {observaciones.trim() && (<><dt>Notas</dt><dd>{observaciones.trim()}</dd></>)}
                {cot && cot.descuento > 0 && (<><dt>Descuento</dt><dd>−{money(cot.descuento)} (barrio {cot.barrio})</dd></>)}
                <dt>Total</dt><dd><strong>{money(aPagar)}</strong>{cot?.envio ? ' con envío' : ''}</dd>
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
          {cot && cot.descuento > 0 && (
            <div className={styles.summaryItem}><span>Descuento del barrio</span><span>−{money(cot.descuento)}</span></div>
          )}
          {cot && (
            <div className={styles.summaryItem}><span>Envío</span><span>{cot.envio === 0 ? 'Gratis' : cot.envio != null ? money(cot.envio) : 'A coordinar'}</span></div>
          )}
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <strong>{money(aPagar)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
