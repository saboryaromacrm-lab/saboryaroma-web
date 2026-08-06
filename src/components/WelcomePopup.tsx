'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { linkWhatsApp } from '@/lib/format';
import styles from './WelcomePopup.module.css';

const FLAG = 'sa_popup_visto';

export function WelcomePopup() {
  const { catalogo } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(FLAG)) return;
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

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
        <span className={styles.badge}>🍃 Bienvenido</span>
        <h2 className={styles.title}>Sabor y Aroma mayorista, ahora online</h2>
        <p className={styles.text}>
          Armá tu pedido cuando quieras, las 24 horas. Coordinamos el pago y la entrega por WhatsApp,
          igual que siempre.
        </p>
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
