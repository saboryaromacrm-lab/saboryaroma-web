'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { linkWhatsApp } from '@/lib/format';
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
  titulo: 'Sabor y Aroma mayorista, ahora online',
  texto: 'Armá tu pedido cuando quieras, las 24 horas. Coordinamos el pago y la entrega por WhatsApp, igual que siempre.',
};

export function WelcomePopup() {
  const { catalogo } = useCart();
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
        <h2 className={styles.title}>{popup.titulo || POR_DEFECTO.titulo}</h2>
        {popup.texto && <p className={styles.text}>{popup.texto}</p>}
        <div className={styles.actions}>
          <Link href="/tienda" className={styles.cta} onClick={cerrar}>Ver catálogo</Link>
          <a
            href={linkWhatsApp(catalogo?.sitio?.contacto?.whatsapp ?? '')}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaSecondary}
            onClick={cerrar}
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
