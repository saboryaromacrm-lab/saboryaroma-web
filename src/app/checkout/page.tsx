'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { crearPedido } from '@/lib/api';
import { money, telefonoArgentino } from '@/lib/format';
import type { Entrega } from '@/lib/types';
import styles from './page.module.css';

const ENTREGAS: { id: Entrega; label: string }[] = [
  { id: 'retiro', label: 'Retiro en el local' },
  { id: 'cadete', label: 'Envío por cadete' },
  { id: 'camioneta', label: 'Envío con la camioneta de la empresa' },
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
  const [resultado, setResultado] = useState<{ codigo: string; total: number } | null>(null);

  if (resultado) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className={styles.okIcon}>✓</div>
        <h1 className={styles.title}>¡Pedido recibido!</h1>
        <p className={styles.okText}>
          Tu pedido <strong>{resultado.codigo}</strong> por {money(resultado.total)} ya está en revisión.
          Te vamos a contactar por WhatsApp para coordinar el pago y la entrega.
        </p>
        <Link href="/tienda" className={styles.cta}>Seguir comprando</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1 className={styles.title}>Tu carrito está vacío</h1>
        <Link href="/tienda" className={styles.cta}>Ir a la tienda</Link>
      </div>
    );
  }

  if (!gate.habilitado) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1 className={styles.title}>Todavía no llegaste al mínimo de compra</h1>
        <p className={styles.okText}>Volvé al carrito para ver qué falta.</p>
        <Link href="/carrito" className={styles.cta}>Volver al carrito</Link>
      </div>
    );
  }

  /*
   * La camioneta tiene su propio piso: mover el vehículo cuesta lo mismo
   * lleve lo que lleve. Si el total no llega, la opción se muestra
   * deshabilitada con cuánto falta (y el servidor lo revalida igual).
   */
  const minCamioneta = config.montoMinimoCamioneta;
  const camionetaOk = !minCamioneta || total >= minCamioneta;
  const conEnvio = entrega !== 'retiro';

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // El WhatsApp es el único canal de vuelta: un número incompleto deja el
    // pedido huérfano. Se valida acá para avisar ANTES de enviar (el servidor
    // aplica la misma regla igual).
    if (!telefonoArgentino(telefono)) {
      setError('Revisá el WhatsApp: escribilo con el código de área, sin el 15 — por ejemplo 370 4123456 (10 dígitos en total).');
      return;
    }
    // Misma regla que el servidor (7 u 8 dígitos): avisar acá ahorra el viaje.
    if (dni.length < 7) {
      setError('El DNI tiene que tener 7 u 8 dígitos.');
      return;
    }
    if (entrega === 'camioneta' && !camionetaOk) {
      setError(`El envío con la camioneta necesita un pedido de al menos ${money(minCamioneta)}. Elegí otra forma de entrega o sumá productos.`);
      return;
    }
    // Sin dirección no hay a dónde llevar el pedido: antes dependía de que el
    // cliente la escribiera en las notas, o de pedírsela después por WhatsApp.
    if (conEnvio && (!calle.trim() || !localidad.trim())) {
      setError('Para el envío necesitamos la dirección: calle y número, y el barrio o localidad.');
      return;
    }
    setEnviando(true);
    try {
      const r = await crearPedido({
        entrega,
        observaciones,
        cliente: { nombre, apellido, telefono, dni },
        direccion: conEnvio
          ? { calle: calle.trim(), localidad: localidad.trim(), referencia: referencia.trim() || undefined }
          : undefined,
        items: items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad })),
      });
      setResultado({ codigo: r.codigo, total: r.total });
      vaciar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 0 60px' }}>
      <h1 className={styles.title}>Finalizar pedido</h1>

      <div className={styles.layout}>
        <form onSubmit={enviar} className={styles.form}>
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

          <div className={styles.row}>
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
            <div className={styles.field}>
              <label htmlFor="dni">
                DNI *
                <span className={styles.hint}>Es solo a modo de búsqueda de cliente, no para facturación.</span>
              </label>
              <input
                id="dni" required inputMode="numeric" maxLength={8}
                value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 35678242"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Entrega *</label>
            <div className={styles.entregas}>
              {ENTREGAS.map((op) => {
                const esCamionetaBloqueada = op.id === 'camioneta' && !camionetaOk;
                return (
                  <label
                    key={op.id}
                    className={styles.entregaOpt}
                    data-selected={entrega === op.id}
                    style={esCamionetaBloqueada ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                  >
                    <input
                      type="radio" name="entrega"
                      checked={entrega === op.id}
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

        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>Tu pedido</h2>
          {items.map((it) => (
            <div key={it.productoId} className={styles.summaryItem}>
              <span>{it.cantidad} × {it.nombre}</span>
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
