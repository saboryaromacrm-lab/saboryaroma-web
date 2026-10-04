'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { buscarCliente, crearPedido } from '@/lib/api';
import { money, telefonoArgentino } from '@/lib/format';
import type { Entrega } from '@/lib/types';
import styles from './page.module.css';

/* `camioneta` es el id interno: el cliente lee «Envío sin costo» (4/10/2026). */
const ENTREGAS: { id: Entrega; label: string }[] = [
  { id: 'retiro', label: 'Retiro en el local' },
  { id: 'cadete', label: 'Envío por cadete' },
  { id: 'camioneta', label: 'Envío sin costo' },
];

export default function CheckoutPage() {
  const { items, total, gate, config, vaciar } = useCart();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
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
   * EL DNI VA PRIMERO Y RECONOCE AL CLIENTE (4/10/2026, pedido del dueño). Con
   * 7 u 8 dígitos se busca: si está registrado se completan nombre, apellido,
   * WhatsApp y dirección (editables; la ficha del ERP no se toca); si no, es su
   * primera compra y sus datos quedan guardados al enviar el pedido.
   * Se pisa solo lo que está vacío o lo que había completado la búsqueda
   * anterior: lo que el cliente escribió a mano no se borra.
   */
  const [busqueda, setBusqueda] = useState<'idle' | 'buscando' | 'encontrado' | 'nuevo'>('idle');
  const [saludo, setSaludo] = useState('');
  const auto = useRef<Record<string, string>>({});
  useEffect(() => {
    if (dni.length < 7) { setBusqueda('idle'); return undefined; }
    let vigente = true;
    setBusqueda('buscando');
    const t = setTimeout(async () => {
      const r = await buscarCliente(dni);
      if (!vigente) return;
      if (!r.encontrado) { setBusqueda('nuevo'); return; }
      const nuevos: Record<string, string> = {
        nombre: r.nombre ?? '', apellido: r.apellido ?? '', telefono: r.telefono ?? '',
        calle: r.direccion ?? '', localidad: r.localidad ?? '',
      };
      const poner = (k: string, set: (f: (v: string) => string) => void) =>
        set((v) => (!v.trim() || v === auto.current[k] ? nuevos[k] : v));
      poner('nombre', setNombre);
      poner('apellido', setApellido);
      poner('telefono', setTelefono);
      poner('calle', setCalle);
      poner('localidad', setLocalidad);
      auto.current = nuevos;
      setSaludo(nuevos.nombre.split(' ')[0] ?? '');
      setBusqueda('encontrado');
    }, 450);
    return () => { vigente = false; clearTimeout(t); };
  }, [dni]);

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
    if (dni.length < 7) {
      setError('El DNI tiene que tener 7 u 8 dígitos.');
      return;
    }
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
        cliente: { nombre, apellido, telefono, dni },
        direccion: conEnvio
          ? { calle: calle.trim(), localidad: localidad.trim(), referencia: referencia.trim() || undefined }
          : undefined,
        // La opción del granel viaja: el servidor la necesita para saber si son bolsas o paquetes.
        items: items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad, ...(it.variante ? { variante: it.variante } : {}) })),
      });
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
          <div className={styles.field}>
            <label htmlFor="dni">
              DNI *
              <span className={styles.hint}>Si ya compraste, completamos tus datos solos. No es para facturación.</span>
            </label>
            <input
              id="dni" required inputMode="numeric" maxLength={8} autoFocus
              value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 35678242"
            />
            {busqueda === 'buscando' && <span className={styles.dniEstado}>Buscando tus datos…</span>}
            {busqueda === 'encontrado' && (
              <span className={styles.dniEstado} data-tipo="ok">
                ¡Hola{saludo ? ` ${saludo}` : ''}! Completamos tus datos: revisá que estén bien.
              </span>
            )}
            {busqueda === 'nuevo' && (
              <span className={styles.dniEstado} data-tipo="nuevo">
                Es tu primera compra: completá tus datos y los guardamos para la próxima.
              </span>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="nombre">Nombre *</label>
              <input id="nombre" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className={styles.field}>
              <label htmlFor="apellido">Apellido *</label>
              <input id="apellido" required maxLength={60} value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Tu apellido" />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.field}>
              <label htmlFor="telefono">
                WhatsApp *
                <span className={styles.hint}>Con código de área, sin 0 ni 15. Ej: 370 4123456</span>
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
            No se paga en este paso. Coordinamos el pago (transferencia o al recibir) por WhatsApp.
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
              <dl className={styles.confirmDatos}>
                <dt>DNI</dt><dd>{dni}</dd>
                <dt>Nombre</dt><dd>{`${nombre} ${apellido}`.trim()}</dd>
                <dt>WhatsApp</dt><dd>{telefono}</dd>
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
              <span>{money(it.precio * it.cantidad)}</span>
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
