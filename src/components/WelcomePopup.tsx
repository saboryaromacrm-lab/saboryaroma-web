'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { abrirIngreso, abrirRegistro } from '@/lib/sesion';
import type { Catalogo } from '@/lib/types';
import styles from './WelcomePopup.module.css';

const FLAG = 'sa_popup_visto';

/**
 * El texto de siempre: se usa si la API todavía no manda el cartel (una API
 * anterior al 3/10/2026). Desde entonces se edita en el ERP: Web ›
 * Configuración del sitio › Cartel de bienvenida.
 */
const POR_DEFECTO = {
  activo: true,
  etiqueta: '🍃 Bienvenido',
  titulo: 'Ahorrá hasta 30% en tu compra comprando por mayor',
  texto: 'Armá tu pedido cuando quieras, las 24 horas. Coordinamos el pago y la entrega por WhatsApp, igual que siempre.',
};

/**
 * LAS CONDICIONES DE COMPRA MAYORISTA, RESUMIDAS (10/10/2026, pedido del dueño).
 * Salen de la configuración real de la tienda, así nunca dicen algo que ya
 * cambió. La compra mínima no va acá: va destacada arriba (`CompraMinima`). Del
 * envío sin costo, al que no ingresó no se le dice el monto.
 */
function condicionesDeCompra(c: Catalogo, conPrecios: boolean): { titulo: string; texto: string }[] {
  const lista: { titulo: string; texto: string }[] = [];
  if (!conPrecios) {
    lista.push({ titulo: 'Precios para clientes registrados', texto: 'pedí tu ingreso con tu DNI y WhatsApp; te habilitamos y te avisamos por WhatsApp.' });
  }
  const sinCosto = c.envioCamionetaActivo === false ? ''
    : conPrecios && c.montoMinimoCamioneta > 0 ? `, o envío sin costo desde ${money(c.montoMinimoCamioneta)}`
      : (conPrecios ? false : c.hayMinimoEnvio) ? ', o envío sin costo en pedidos grandes' : ', o envío sin costo';
  lista.push({ titulo: 'Entrega', texto: `retiro en el local, envío por cadete${sinCosto}.` });
  lista.push({ titulo: 'Pago', texto: 'transferencia o efectivo, coordinado por WhatsApp (no se paga en el sitio).' });
  return lista;
}

/** El título con los porcentajes resaltados: «Ahorrá hasta **30%**…». */
function TituloResaltado({ texto }: { texto: string }) {
  return <>{texto.split(/(\d+\s?%)/).map((parte, i) => (i % 2 ? <span key={i} className={styles.resalte}>{parte}</span> : parte))}</>;
}

/**
 * LA COMPRA MÍNIMA, DESTACADA (pedido del dueño): el monto configurado en el ERP
 * como protagonista y, como alternativa, el mínimo de unidades por marca.
 */
function CompraMinima({ c }: { c: Catalogo }) {
  const monto = c.montoMinimo > 0;
  const marcas = (c.reglasMarca ?? []).length > 0;
  if (!monto && !marcas) return null;
  return (
    <div className={styles.minimo}>
      <span className={styles.minimoEtiqueta}>{monto ? 'Compra mínima' : 'Compra mínima por marca'}</span>
      {monto
        ? <span className={styles.minimoMonto}>{money(c.montoMinimo)}</span>
        : <span className={styles.minimoAlt}>Completá el mínimo de unidades de cada marca que elijas.</span>}
      {monto && marcas && (
        <span className={styles.minimoAlt}>
          <strong>Opcional:</strong> en vez del monto, completá el mínimo de unidades de cada marca que elijas.
        </span>
      )}
    </div>
  );
}

export function WelcomePopup() {
  const { catalogo, conPrecios } = useCart();
  const [visible, setVisible] = useState(false);
  const popup = catalogo?.sitio?.popup ?? POR_DEFECTO;
  const cargado = !!catalogo;
  const activo = popup.activo !== false;

  /* Aparece solo al entrar si está activo en el ERP — se espera al catálogo
   * para saberlo: si no, un cartel apagado se asomaba igual un instante.
   * «Info de compra» lo abre siempre (ver el efecto de abajo). */
  useEffect(() => {
    if (!cargado || !activo) return;
    let visto = false;
    try { visto = !!sessionStorage.getItem(FLAG); } catch { /* modo privado */ }
    if (visto) return;
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [cargado, activo]);

  useEffect(() => {
    const onAbrir = () => setVisible(true);
    window.addEventListener('sa:abrir-popup', onAbrir);
    return () => window.removeEventListener('sa:abrir-popup', onAbrir);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cerrar = () => {
    setVisible(false);
    try { sessionStorage.setItem(FLAG, '1'); } catch { /* modo privado */ }
  };

  if (!visible) return null;

  return (
    <div className={styles.backdrop} onClick={cerrar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={cerrar} aria-label="Cerrar">×</button>
        {popup.etiqueta && <span className={styles.badge}>{popup.etiqueta}</span>}
        <h2 className={styles.title}><TituloResaltado texto={popup.titulo || POR_DEFECTO.titulo} /></h2>
        {catalogo && <CompraMinima c={catalogo} />}
        {popup.texto && <p className={styles.text}>{popup.texto}</p>}
        {catalogo && (
          <div className={styles.condiciones}>
            <span className={styles.condicionesTitulo}>Condiciones de compra mayorista</span>
            <ul>
              {condicionesDeCompra(catalogo, conPrecios).map((x) => (
                <li key={x.titulo}><strong>{x.titulo}:</strong> {x.texto}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={styles.actions}>
          <Link href="/tienda" className={styles.cta} onClick={cerrar}>Ir a la tienda</Link>
          {/* Para el que todavía no ingresó (13/10/2026, pedido del dueño): registrarse o ingresar, en la misma fila. */}
          {!conPrecios && (
            <>
              <div className={styles.acceso}>
                <button type="button" className={styles.ctaSecondary} onClick={() => { cerrar(); abrirRegistro(); }}>Registrarme</button>
                <button type="button" className={styles.ctaSecondary} onClick={() => { cerrar(); abrirIngreso(); }}>Ingresar</button>
              </div>
              <p className={styles.accesoNota}>Es fácil y práctico: solo con tu DNI.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
