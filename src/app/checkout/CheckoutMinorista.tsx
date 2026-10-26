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
 *
 * EL CUPÓN (0190): se escribe y se aplica; el servidor dice si vale y cuánto
 * descuenta (con la misma cuenta del pedido). Si el cupón vale solo pagando de
 * una forma, se pregunta cómo va a pagar.
 *
 * PARA CUÁNDO (23/10/2026): con envío, al final se pregunta en cuánto lo
 * quiere (CuandoEnvio). Las opciones se renuevan cada minuto: «lo antes
 * posible» corre con la hora y las franjas de hoy se van venciendo.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { totalLinea, useCart } from '@/lib/cart';
import { agendaEnvios, cotizarEnvio, crearPedidoMinorista } from '@/lib/api';
import { textoCuando } from '@/lib/horarioEnvio';
import { pedidoEnviado } from '@/lib/analytics';
import { leerToken } from '@/lib/sesion';
import { money, telLegible } from '@/lib/format';
import { IngresarParaComprar, useSalirDeLaCuenta } from '@/components/Ingreso';
import { TelefonoConfirmar } from './TelefonoConfirmar';
import { UbicacionEnvio } from '@/components/minorista/UbicacionEnvio';
import type { AgendaEnvios, CotizacionEnvio, CuandoEnvio as Cuando, DescuentoAutomatico, EntregaMinorista, ItemCarrito, MedioPagoTienda, Punto } from '@/lib/types';
import { CuandoEnvio } from './CuandoEnvio';
import styles from './page.module.css';

/** Pausa antes de recalcular el envío: el mapa se mueve de a muchos pasitos. */
const ESPERA_COTIZAR_MS = 400;
/** Cada cuánto se renuevan las opciones de «para cuándo». */
const RENOVAR_AGENDA_MS = 60_000;
/** Si no se pudieron traer los horarios: queda coordinarlo por WhatsApp. */
const SIN_AGENDA: AgendaEnvios = { conHorario: false, pronto: null, dias: [] };

const lineasDe = (items: ItemCarrito[]) => items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad, ...(it.variante ? { variante: it.variante } : {}) }));

const MEDIOS: Record<MedioPagoTienda, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia' };

/** «−5 %» o, si no es de porcentaje, lo que da. */
const etiquetaDescuento = (d: DescuentoAutomatico) => (d.porcentaje != null ? `−${d.porcentaje} %` : d.envioGratis ? 'envío gratis' : `−${money(d.descuento)}`);

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
  /** Lo que se escribe en el campo y el cupón que se aplicó (0190). */
  const [cuponTexto, setCuponTexto] = useState('');
  const [cupon, setCupon] = useState('');
  const [medioPago, setMedioPago] = useState<MedioPagoTienda | ''>('');
  const [agenda, setAgenda] = useState<AgendaEnvios | null>(null);
  const [cuando, setCuando] = useState<Cuando | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ codigo: string; total: number; telefono: string } | null>(null);
  const enVuelo = useRef(false);
  const salirDeLaCuenta = useSalirDeLaCuenta();

  const conEnvio = entrega === 'envio';
  /** Va a la guardada si tiene una y la eligió; si no, a la que escriba. */
  const usaGuardada = conEnvio && aGuardada && !!comprador?.direccion;
  const conMapa = config.mapsKey !== '' && !sinMapa;

  /*
   * Cuánto sale, siempre (también retirando): el envío (con el punto marcado o
   * a la dirección guardada, que el servidor ya conoce), el cupón y los
   * descuentos por medio de pago (0199).
   */
  useEffect(() => {
    if (!comprador || !items.length) { setCotizacion(null); return undefined; }
    let vigente = true;
    const t = setTimeout(() => {
      cotizarEnvio({
        entrega,
        direccion: conEnvio && usaGuardada ? { guardada: true } : undefined,
        ubicacion: conEnvio ? punto ?? undefined : undefined,
        items: lineasDe(items),
        ...(cupon ? { cupon } : {}),
        ...(medioPago ? { medioPago } : {}),
      }, leerToken('minorista'))
        .then((c) => { if (vigente) setCotizacion(c); })
        .catch(() => { if (vigente) setCotizacion(null); });
    }, ESPERA_COTIZAR_MS);
    return () => { vigente = false; clearTimeout(t); };
  }, [entrega, conEnvio, usaGuardada, punto, items, comprador, cupon, medioPago]);

  /* Las opciones de «para cuándo», al día: lo elegido que dejó de valer se vuelve a elegir. */
  const traerAgenda = useCallback(async () => {
    const a = await agendaEnvios().catch(() => SIN_AGENDA);
    setAgenda(a);
    setCuando((c) => ((c?.tipo === 'pronto' && !a.pronto)
      || (c?.tipo === 'horario' && !a.dias.some((d) => d.franjas.some((f) => f.desde === c.desde))) ? null : c));
  }, []);
  useEffect(() => {
    if (!conEnvio) return undefined;
    traerAgenda();
    const t = setInterval(traerAgenda, RENOVAR_AGENDA_MS);
    return () => clearInterval(t);
  }, [conEnvio, traerAgenda]);

  /* El cupón pide un solo medio: queda elegido solo. */
  const unicoMedio = cotizacion?.cupon?.vale && cotizacion.cupon.medios.length === 1 ? cotizacion.cupon.medios[0] : null;
  useEffect(() => { if (unicoMedio) setMedioPago(unicoMedio); }, [unicoMedio]);

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
  const cot = cotizacion;
  const aPagar = cot ? cot.total : total;
  const cup = cot?.cupon ?? null;
  /*
   * LOS DESCUENTOS POR MEDIO DE PAGO (0199): lo que daría cada medio, para
   * mostrarlo en la opción y animar a pagar así; el que corre ya está en el total.
   * Con un cupón escrito no hay (no se suman); el cupón puede pedir sus medios.
   */
  const porMedio = cot?.porMedio ?? null;
  const auto = cot?.automatico ?? null;
  const mediosAElegir: MedioPagoTienda[] = cup?.vale && cup.medios.length ? cup.medios : porMedio ? ['efectivo', 'transferencia'] : [];
  const mejorMedio = porMedio
    ? (Object.entries(porMedio) as [MedioPagoTienda, DescuentoAutomatico | null][]).reduce<[MedioPagoTienda, DescuentoAutomatico] | null>(
      (a, [m, d]) => (d && (!a || d.descuento > a[1].descuento) ? [m, d] : a), null)
    : null;
  const aplicarCupon = () => { setCupon(cuponTexto.trim().toUpperCase()); setError(''); };
  const quitarCupon = () => { setCupon(''); setCuponTexto(''); setMedioPago(''); };

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
    if (conEnvio && !cuando) {
      setError('¿En cuánto querés tu envío? Elegí una de las opciones.');
      return;
    }
    if (cupon && cup && !cup.vale) {
      setError(`El cupón ${cup.codigo} no vale: ${cup.motivo} Quitalo para seguir sin él.`);
      return;
    }
    if (mediosAElegir.length && !medioPago) {
      setError(cup?.vale ? 'Elegí cómo vas a pagar: el cupón vale con ese medio.' : 'Elegí cómo vas a pagar.');
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
        ...(cup?.vale ? { cupon: cup.codigo } : {}),
        ...(medioPago ? { medioPago } : {}),
        ...(conEnvio && cuando ? { cuando } : {}),
      }, leerToken('minorista'));
      pedidoEnviado(r.codigo);
      setResultado({ codigo: r.codigo, total: r.total + (r.envio ?? 0), telefono: comprador.telefono });
      vaciar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido.');
      setConfirmar(false);
      /* Lo elegido pudo dejar de valer mientras confirmaba: las opciones, al día. */
      if (conEnvio) traerAgenda();
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
            <label htmlFor="cupon">¿Tenés un cupón de descuento?</label>
            {cupon ? (
              <div className={styles.cupon} data-estado={!cup ? 'cargando' : cup.vale ? 'ok' : 'error'} aria-live="polite">
                <span>
                  <strong>{cupon}</strong>
                  {!cup ? ' · revisando…'
                    : cup.vale
                      ? (cup.envioGratis ? ' · ¡envío gratis!' : ` · −${money(cup.descuento)}`)
                      : ` · ${cup.motivo}`}
                  {cup?.vale && cup.descripcion && <span className={styles.hint}>{cup.descripcion}</span>}
                </span>
                <button type="button" className={styles.cuponQuitar} onClick={quitarCupon}>Quitar</button>
              </div>
            ) : (
              <div className={styles.cuponFila}>
                <input
                  id="cupon" maxLength={30} value={cuponTexto} autoComplete="off" spellCheck={false}
                  onChange={(e) => setCuponTexto(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (cuponTexto.trim()) aplicarCupon(); } }}
                  placeholder="Escribí el código"
                />
                <button type="button" className={styles.cuponAplicar} onClick={aplicarCupon} disabled={!cuponTexto.trim()}>Aplicar</button>
              </div>
            )}
          </div>

          {mediosAElegir.length > 0 && (
            <div className={styles.field}>
              <label>
                ¿Cómo vas a pagar? *
                {cup?.vale
                  ? <span className={styles.hint}>El cupón vale pagando con {cup.medios.map((m) => MEDIOS[m].toLowerCase()).join(' o ')}.</span>
                  : mejorMedio && <span className={styles.medioIncentivo}>💸 Pagando en {MEDIOS[mejorMedio[0]].toLowerCase()} ahorrás {money(mejorMedio[1].descuento)}</span>}
              </label>
              <div className={styles.entregas}>
                {mediosAElegir.map((m) => {
                  const d = porMedio?.[m] ?? null;
                  return (
                    <label key={m} className={styles.entregaOpt} data-selected={medioPago === m} data-descuento={!!d}>
                      <input type="radio" name="medio" checked={medioPago === m} onChange={() => setMedioPago(m)} />
                      <span className={styles.medioTexto}>
                        <strong>{MEDIOS[m]}</strong>
                        {d && <span className={styles.medioDetalle}>{d.descripcion || 'Descuento en los productos que no están en oferta'}</span>}
                      </span>
                      {d && (
                        <span className={styles.medioAhorro}>
                          <strong>{etiquetaDescuento(d)}</strong>
                          {d.descuento > 0 && <small>ahorrás {money(d.descuento)}</small>}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {porMedio && <span className={styles.medioNota}>No se suma a los productos en oferta ni a un cupón.</span>}
              {conEnvio && medioPago === 'efectivo' && (
                <p className={styles.medioCadete}>🛵 Con envío a domicilio, le abonás en efectivo al cadete cuando te entrega el pedido.</p>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="obs">Notas del pedido</label>
            <textarea id="obs" rows={3} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Indicaciones especiales: timbre, a quién entregar, etc." />
          </div>

          {conEnvio && (
            <div className={styles.field}>
              <label>¿En cuánto querés tu envío? *</label>
              <CuandoEnvio agenda={agenda} valor={cuando} onCambio={setCuando} />
            </div>
          )}

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
              <TelefonoConfirmar telefono={comprador.telefono}>
                Si no es tu número no te vamos a poder avisar.
                <br />
                <button type="button" className={styles.telCambiar} disabled={enviando} onClick={() => { setConfirmar(false); salirDeLaCuenta(); }}>
                  No es mi número: ingresar con otro
                </button>
              </TelefonoConfirmar>
              <dl className={styles.confirmDatos}>
                <dt>Nombre</dt><dd>{quien}</dd>
                <dt>Entrega</dt>
                <dd>
                  {!conEnvio ? 'Retiro en el local'
                    : cot ? `Envío a domicilio${cot.barrio ? ` · B° ${cot.barrio}` : ''} (${textoCosto(cot.envio)})`
                      : `Envío a domicilio${envioGratis ? ' (gratis)' : ''}`}
                </dd>
                {conEnvio && cuando && (<><dt>Cuándo</dt><dd>{textoCuando(cuando, agenda)}</dd></>)}
                {conEnvio && (<><dt>Dirección</dt><dd>{usaGuardada ? `Tu dirección guardada (${comprador.direccion})` : [calle.trim(), localidad.trim(), referencia.trim()].filter(Boolean).join(' · ')}</dd></>)}
                {observaciones.trim() && (<><dt>Notas</dt><dd>{observaciones.trim()}</dd></>)}
                {cot && cot.descuento > 0 && (<><dt>Descuento</dt><dd>−{money(cot.descuento)} (barrio {cot.barrio})</dd></>)}
                {cup?.vale && (<><dt>Cupón</dt><dd>{cup.codigo} · {cup.envioGratis ? 'envío gratis' : `−${money(cup.descuento)}`}</dd></>)}
                {auto && (<><dt>Descuento</dt><dd>{auto.descripcion || auto.codigo} · {auto.envioGratis ? 'envío gratis' : `−${money(auto.descuento)}`}</dd></>)}
                {medioPago && (<><dt>Pago</dt><dd>{MEDIOS[medioPago]}{conEnvio && medioPago === 'efectivo' ? ' · se lo abonás al cadete' : ''}</dd></>)}
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
          {cup?.vale && cup.descuento > 0 && (
            <div className={styles.summaryItem}><span>Cupón {cup.codigo}</span><span>−{money(cup.descuento)}</span></div>
          )}
          {auto && auto.descuento > 0 && (
            <div className={`${styles.summaryItem} ${styles.summaryAhorro}`}>
              <span>{medioPago ? `Pagando en ${MEDIOS[medioPago].toLowerCase()}` : auto.descripcion || 'Descuento'}{auto.porcentaje != null ? ` (${auto.porcentaje} %)` : ''}</span>
              <span>−{money(auto.descuento)}</span>
            </div>
          )}
          {cot && conEnvio && (
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
