'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { totalLinea, useCart } from '@/lib/cart';
import { crearPedido } from '@/lib/api';
import { pedidoEnviado } from '@/lib/analytics';
import { leerToken } from '@/lib/sesion';
import { money, telefonoArgentino } from '@/lib/format';
import { IngresarParaComprar } from '@/components/Ingreso';
import type { Entrega } from '@/lib/types';
import { CheckoutMinorista } from './CheckoutMinorista';
import { TelefonoConfirmar } from './TelefonoConfirmar';
import styles from './page.module.css';

/* `camioneta` es el id interno: el cliente lee «Envío sin costo» (4/10/2026). */
const ENTREGAS: { id: Entrega; label: string }[] = [
  { id: 'retiro', label: 'Retiro en el local' },
  { id: 'cadete', label: 'Envío por cadete' },
  { id: 'camioneta', label: 'Envío sin costo' },
];

/** El checkout minorista es otro (0173): sin DNI, con el WhatsApp como llave. */
export default function CheckoutPage() {
  const { modo } = useCart();
  return modo === 'minorista' ? <CheckoutMinorista /> : <CheckoutMayorista />;
}

function CheckoutMayorista() {
  const { items, total, gate, config, vaciar, conPrecios, cliente } = useCart();
  const [telefono, setTelefono] = useState('');
  const [entrega, setEntrega] = useState<Entrega>('retiro');
  // La dirección solo existe si hay envío. Se conserva al cambiar de opción
  // para que ir y volver entre "retiro" y "cadete" no borre lo escrito.
  const [calle, setCalle] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ codigo: string; total: number; telefono: string } | null>(null);
  /* Segunda confirmación antes de enviar (pedido del dueño, 4/10/2026): «¿están bien tus datos?». */
  const [confirmar, setConfirmar] = useState(false);
  const enVuelo = useRef(false);

  /*
   * QUIÉN COMPRA YA SE SABE (0155): entró con su DNI. Su WhatsApp y su dirección
   * vienen completos y se pueden cambiar para ESTE pedido (su ficha no se toca);
   * se completa solo lo vacío, para no pisar lo que ya escribió.
   */
  useEffect(() => {
    if (!cliente) return;
    setTelefono((v) => v || cliente.whatsapp);
    setCalle((v) => v || cliente.direccion);
    setLocalidad((v) => v || cliente.localidad);
  }, [cliente]);

  if (resultado) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <div className={styles.okIcon}>✓</div>
        <h1 className={styles.title}>¡Pedido recibido!</h1>
        <p className={styles.okText}>
          Tu pedido <strong>{resultado.codigo}</strong> por {money(resultado.total)} ya está en revisión.
        </p>
        <p className={styles.okDestacado}>
          Nos comunicaremos a la brevedad con usted para coordinar la compra.
        </p>
        <p className={styles.okText}>Te escribimos por WhatsApp al <strong>{resultado.telefono}</strong>.</p>
        <Link href="/tienda" className={styles.cta}>Seguir comprando</Link>
      </div>
    );
  }

  /* Sin haber ingresado no se compra (0155). */
  if (!conPrecios || !cliente) {
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

  if (!gate.habilitado) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <h1 className={styles.title}>Todavía no llegaste al mínimo de compra</h1>
        <p className={styles.okText}>Volvé al carrito para ver qué falta.</p>
        <Link href="/carrito" className={styles.cta}>Volver al carrito</Link>
      </div>
    );
  }

  /*
   * El envío sin costo se puede apagar desde el ERP (entonces ni aparece) y
   * tiene su propio piso: mover el vehículo cuesta lo mismo lleve lo que
   * lleve. Si el total no llega, la opción se muestra deshabilitada con
   * cuánto falta (y el servidor lo revalida igual).
   */
  const entregas = config.envioCamionetaActivo ? ENTREGAS : ENTREGAS.filter((op) => op.id !== 'camioneta');
  // Si se apagó con la página abierta, la elegida vuelve a retiro en vez de quedar en una opción que no está.
  const entregaVigente: Entrega = entregas.some((op) => op.id === entrega) ? entrega : 'retiro';
  const minCamioneta = config.montoMinimoCamioneta;
  const camionetaOk = !minCamioneta || total >= minCamioneta;
  const conEnvio = entregaVigente !== 'retiro';

  /** Primer paso: validar y mostrar los datos para confirmar. */
  const revisar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // El WhatsApp es el único canal de vuelta: un número incompleto deja el
    // pedido huérfano. Se valida acá para avisar ANTES de enviar (el servidor
    // aplica la misma regla igual).
    if (!telefonoArgentino(telefono)) {
      setError('Revisá el WhatsApp: escribilo con el código de área, sin el 15 — por ejemplo 370 4123456 (10 dígitos en total).');
      return;
    }
    if (entregaVigente === 'camioneta' && !camionetaOk) {
      setError(`El envío sin costo necesita un pedido de al menos ${money(minCamioneta)}. Elegí otra forma de entrega o sumá productos.`);
      return;
    }
    // Sin dirección no hay a dónde llevar el pedido: antes dependía de que el
    // cliente la escribiera en las notas, o de pedírsela después por WhatsApp.
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
    try {
      const r = await crearPedido({
        entrega: entregaVigente,
        observaciones,
        cliente: { telefono },
        direccion: conEnvio
          ? { calle: calle.trim(), localidad: localidad.trim(), referencia: referencia.trim() || undefined }
          : undefined,
        // La opción del granel viaja: el servidor la necesita para saber si son bolsas o paquetes.
        items: items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad, ...(it.variante ? { variante: it.variante } : {}) })),
      }, leerToken());
      pedidoEnviado(r.codigo);
      setResultado({ codigo: r.codigo, total: r.total, telefono });
      vaciar();
      // El «¡Pedido recibido!» está arriba y el botón de enviar abajo: sin esto,
      // en el celular el cliente se quedaba mirando el pie de la página.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido.');
      setConfirmar(false);
    } finally {
      enVuelo.current = false;
      setEnviando(false);
    }
  };
  const etiquetaEntrega = ENTREGAS.find((op) => op.id === entregaVigente)?.label ?? '';

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      <h1 className={styles.title}>Finalizar pedido</h1>

      <div className={styles.layout}>
        <form onSubmit={revisar} className={styles.form}>
          <p className={styles.dniEstado} data-tipo="ok">
            Comprás como <strong>{cliente.nombre}</strong> · DNI {cliente.dni}
          </p>

          <div className={styles.field}>
            <div className={styles.field}>
              <label htmlFor="telefono">
                WhatsApp para este pedido *
                <span className={styles.hint}>Por acá coordinamos el pago y la entrega. Con código de área, sin 0 ni 15.</span>
              </label>
              <input
                id="telefono" required inputMode="tel" value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 370 4123456"
              />
              {telefono.trim() !== '' && !telefonoArgentino(telefono) && (
                <span className={styles.hint} style={{ color: '#b91c1c' }}>
                  Le faltan dígitos: tienen que ser 10 en total (área + número).
                </span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label>Entrega *</label>
            <div className={styles.entregas}>
              {entregas.map((op) => {
                const esCamionetaBloqueada = op.id === 'camioneta' && !camionetaOk;
                return (
                  <label
                    key={op.id}
                    className={styles.entregaOpt}
                    data-selected={entregaVigente === op.id}
                    style={esCamionetaBloqueada ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                  >
                    <input
                      type="radio" name="entrega"
                      checked={entregaVigente === op.id}
                      disabled={esCamionetaBloqueada}
                      onChange={() => setEntrega(op.id)}
                    />
                    <span>
                      {op.label}
                      {op.id === 'camioneta' && minCamioneta > 0 && (
                        <span className={styles.hint} style={esCamionetaBloqueada ? { color: '#b45309' } : undefined}>
                          {esCamionetaBloqueada
                            ? `Pedido mínimo ${money(minCamioneta)} — te faltan ${money(minCamioneta - total)}`
                            : `Pedido mínimo ${money(minCamioneta)} ✓`}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {conEnvio && (
            <>
              <div className={styles.field}>
                <label htmlFor="calle">
                  Dirección de entrega *
                  <span className={styles.hint}>Calle y número. Si es un edificio, piso y departamento.</span>
                </label>
                <input
                  id="calle" required={conEnvio} maxLength={120} value={calle}
                  onChange={(e) => setCalle(e.target.value)} placeholder="Ej: Av. 25 de Mayo 1234, 2º B"
                  autoComplete="street-address"
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="localidad">Barrio / localidad *</label>
                  <input
                    id="localidad" required={conEnvio} maxLength={80} value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)} placeholder="Ej: Formosa, barrio San Martín"
                    autoComplete="address-level2"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="referencia">Referencia</label>
                  <input
                    id="referencia" maxLength={200} value={referencia}
                    onChange={(e) => setReferencia(e.target.value)} placeholder="Entre calles, portón verde, tocar timbre…"
                  />
                </div>
              </div>
            </>
          )}

          <div className={styles.field}>
            <label htmlFor="obs">Notas del pedido</label>
            <textarea
              id="obs" rows={3} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Horario de entrega preferido, indicaciones especiales, etc."
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submit} disabled={enviando}>
            {enviando ? 'Enviando…' : `Enviar pedido — ${money(total)}`}
          </button>
          <p className={styles.footNote}>
            No se paga en este paso. Coordinamos el pago (transferencia o efectivo) por WhatsApp.
          </p>
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
              <TelefonoConfirmar telefono={telefono}>¿Está bien? Si no, tocá «Corregir» y cambialo.</TelefonoConfirmar>
              <dl className={styles.confirmDatos}>
                <dt>DNI</dt><dd>{cliente.dni}</dd>
                <dt>Nombre</dt><dd>{cliente.nombre}</dd>
                <dt>Entrega</dt><dd>{etiquetaEntrega}</dd>
                {conEnvio && (<><dt>Dirección</dt><dd>{[calle.trim(), localidad.trim(), referencia.trim()].filter(Boolean).join(' · ')}</dd></>)}
                {observaciones.trim() && (<><dt>Notas</dt><dd>{observaciones.trim()}</dd></>)}
                <dt>Total</dt><dd><strong>{money(total)}</strong></dd>
              </dl>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.confirmBotones}>
                <button type="button" className={styles.confirmCorregir} onClick={() => setConfirmar(false)} disabled={enviando}>
                  Corregir
                </button>
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
