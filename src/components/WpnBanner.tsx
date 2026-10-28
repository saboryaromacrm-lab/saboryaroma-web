import Link from 'next/link';
import type { ReactNode } from 'react';
import { imgSrc } from '@/lib/api';
import { norm } from '@/lib/format';
import type { Catalogo, ItemCatalogo } from '@/lib/types';
import styles from './WpnBanner.module.css';

const MARCA = 'WPN';
/** Cuántos atajos por tipo y cuántos potes van al escenario. */
const ATAJOS = 4;
const POTES = 3;

const ICONOS: Record<string, ReactNode> = {
  pesa: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" /></svg>,
  rayo: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
  ciclo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></svg>,
  mas: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></svg>,
};

/** Los tipos de suplemento, por la palabra que tienen en el nombre (sin tildes ni mayúsculas); el orden es el de los atajos y el de los potes. */
const TIPOS = [
  { nombre: 'Proteínas', busca: 'protein', icono: 'pesa' },
  { nombre: 'Creatinas', busca: 'creatina', icono: 'rayo' },
  { nombre: 'Colágeno', busca: 'colageno', icono: 'ciclo' },
  { nombre: 'Magnesio', busca: 'magnesio', icono: 'mas' },
  { nombre: 'Vitaminas', busca: 'vitamina', icono: 'mas' },
  { nombre: 'Glutamina', busca: 'glutamina', icono: 'rayo' },
];

/**
 * EL BANNER DE WPN EN LA PORTADA (28/10/2026, pedido del dueño: «proteínas,
 * creatinas y demás: que demuestre fuerza»). Negro y lima como sus potes. Todo
 * sale de los productos de la marca: la cantidad, los atajos por tipo (con lo
 * que hay de cada uno) y los potes del escenario (con stock y foto, uno de cada
 * tipo). Sin la marca, o sin productos, no se muestra ni deja su lugar.
 */
export function WpnBanner({ cat, className }: { cat: Catalogo; className?: string }) {
  const marca = cat.marcas.find((m) => norm(m.nombre) === norm(MARCA));
  if (!marca?.count) return null;
  const href = `/tienda?marca=${marca.id}`;
  const productos = cat.items.filter((p) => p.marcaId === marca.id);
  const deTipo = (lista: ItemCatalogo[], busca: string) => lista.filter((p) => norm(p.nombre).includes(busca));
  const atajos = TIPOS.map((t) => ({ ...t, n: deTipo(productos, t.busca).length })).filter((t) => t.n > 0).slice(0, ATAJOS);
  /* Los potes (con stock y foto): proteínas y creatinas alternadas, que son las que muestran fuerza,
   * y después el resto; el primero va al centro y más grande. */
  const conFoto = productos.filter((p) => p.imagenUrl && p.enStock);
  const [proteinas, creatinas] = TIPOS.slice(0, 2).map((t) => deTipo(conFoto, t.busca));
  const alternadas = proteinas.flatMap((p, i) => [p, creatinas[i]]).concat(creatinas.slice(proteinas.length));
  const potes = [...new Set([...alternadas.filter((p) => !!p), ...conFoto])].slice(0, POTES);
  const lugar = [styles.centro, styles.izquierda, styles.derecha];

  return (
    <div className={className}>
      <section className={styles.banner} aria-label={`Suplementos ${marca.nombre}`}>
        <div className={styles.fondo} aria-hidden>FUERZA</div>
        <div className={styles.texto}>
          <div className={styles.marca}>
            <Link href={href} className={styles.logo} aria-label={`Ver todo ${marca.nombre}`}>
              {marca.imagenUrl ? <img src={imgSrc(marca.imagenUrl)} alt={marca.nombre} /> : <span>{marca.nombre}</span>}
            </Link>
            <span className={styles.eyebrow}>Suplementos deportivos</span>
          </div>
          <div className={styles.titulos}>
            <h2 className={styles.titulo}>Sumá fuerza.<span className={styles.linea2}>Entrená con todo.</span></h2>
            <p className={styles.bajada}>
              Proteínas para crecer, creatina para rendir más, magnesio y colágeno para recuperarte. Todo {marca.nombre}, en un solo lugar.
            </p>
          </div>
          {atajos.length > 0 && (
            <div className={styles.tipos}>
              {atajos.map((t) => (
                <Link key={t.busca} href={`${href}&q=${t.busca}`} className={styles.tipo}>
                  <span className={styles.icono} aria-hidden>{ICONOS[t.icono]}</span>
                  <span>{t.nombre} <small>{t.n}</small></span>
                </Link>
              ))}
            </div>
          )}
          <div className={styles.acciones}>
            <Link href={href} className={styles.cta}><span>Ver todo {marca.nombre} →</span></Link>
          </div>
        </div>
        {potes.length > 0 && (
          <Link href={href} className={styles.escena} aria-hidden tabIndex={-1}>
            <span className={styles.barra} />
            <span className={styles.foco} />
            {potes.map((p, i) => (
              <span key={p.id} className={`${styles.pote} ${lugar[i]}`}>
                <img src={imgSrc(p.imagenUrl)} alt="" loading="lazy" />
              </span>
            ))}
            <span className={styles.sello}><b>{marca.count}</b><span>producto{marca.count === 1 ? '' : 's'}</span></span>
          </Link>
        )}
      </section>
    </div>
  );
}
