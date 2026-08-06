'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { imgSrc } from '@/lib/api';
import { busquedaHecha } from '@/lib/analytics';
import { money, norm } from '@/lib/format';
import { MiniCart } from '@/components/MiniCart';
import type { Termino } from '@/lib/types';
import styles from './Header.module.css';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CIERRE_MS = 220;

type Fly = 'categorias' | 'marcas' | 'dieta' | null;
type Accordion = 'categorias' | 'marcas' | 'dieta' | null;

function abrirInfoCompra() {
  window.dispatchEvent(new Event('sa:abrir-popup'));
}

export function Header() {
  const { cantidadTotal, catalogo } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [fly, setFly] = useState<Fly>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [accordion, setAccordion] = useState<Accordion>(null);
  const [filtroMarca, setFiltroMarca] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const cierreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const cartCierreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartWrapRef = useRef<HTMLDivElement>(null);

  const cancelarCierre = useCallback(() => {
    if (cierreTimer.current) { clearTimeout(cierreTimer.current); cierreTimer.current = null; }
  }, []);

  const abrirCarrito = useCallback(() => {
    if (cartCierreTimer.current) { clearTimeout(cartCierreTimer.current); cartCierreTimer.current = null; }
    setCarritoAbierto(true);
  }, []);

  const programarCierreCarrito = useCallback(() => {
    if (cartCierreTimer.current) clearTimeout(cartCierreTimer.current);
    cartCierreTimer.current = setTimeout(() => setCarritoAbierto(false), CIERRE_MS);
  }, []);

  /** Abre al instante (hover o click) — así el submenú reacciona apenas el mouse se acerca. */
  const abrirFly = useCallback((tipo: Exclude<Fly, null>, trigger: HTMLDivElement) => {
    cancelarCierre();
    triggerRef.current = trigger;
    setFly(tipo);
  }, [cancelarCierre]);

  /** Cierra con un pequeño retraso: si el mouse va del botón al submenú (cruzando el hueco), da tiempo a que no se corte. */
  const programarCierre = useCallback(() => {
    cancelarCierre();
    cierreTimer.current = setTimeout(() => { setFly(null); setMenuPos(null); }, CIERRE_MS);
  }, [cancelarCierre]);

  const alClickFly = useCallback((tipo: Exclude<Fly, null>, trigger: HTMLDivElement) => {
    cancelarCierre();
    triggerRef.current = trigger;
    setFly((v) => (v === tipo ? null : tipo));
  }, [cancelarCierre]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setBuscadorAbierto(false);
      if (navRef.current && !navRef.current.contains(e.target as Node)) { cancelarCierre(); setFly(null); setMenuPos(null); }
      if (cartWrapRef.current && !cartWrapRef.current.contains(e.target as Node)) setCarritoAbierto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setBuscadorAbierto(false); cancelarCierre(); setFly(null); setMenuPos(null); setCarritoAbierto(false); }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [cancelarCierre]);

  useEffect(() => () => {
    cancelarCierre();
    if (cartCierreTimer.current) clearTimeout(cartCierreTimer.current);
  }, [cancelarCierre]);

  /**
   * Posiciona el submenú en coordenadas de viewport (position:fixed) en vez de anclarlo al botón:
   * los menús anchos (Marcas, 860px) se salían de la pantalla si el botón no estaba cerca del borde
   * izquierdo. Se mide después de pintar (oculto) y se recalcula al abrir o al cambiar el tamaño de ventana.
   */
  useLayoutEffect(() => {
    if (!fly) return;
    const medir = () => {
      const menu = megaMenuRef.current;
      const trigger = triggerRef.current;
      if (!menu || !trigger) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu.getBoundingClientRect().width;
      const left = Math.min(
        Math.max(triggerRect.left - 20, 12),
        Math.max(12, window.innerWidth - menuWidth - 12),
      );
      setMenuPos({ top: triggerRect.bottom + 12, left });
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [fly]);

  const marcasPorLetra = useMemo(() => {
    const todas = catalogo?.marcas ?? [];
    const filtradas = filtroMarca.trim()
      ? todas.filter((m) => norm(m.nombre).includes(norm(filtroMarca.trim())))
      : todas;
    const mapa = new Map<string, typeof todas>();
    for (const m of filtradas) {
      const letra = norm(m.nombre)[0]?.toUpperCase() ?? '#';
      const arr = mapa.get(letra);
      if (arr) arr.push(m); else mapa.set(letra, [m]);
    }
    return mapa;
  }, [catalogo, filtroMarca]);

  const sugerencias = useMemo(() => {
    const q = norm(busqueda.trim());
    if (!q || !catalogo) return [];
    return catalogo.items
      .filter((p) => norm(p.nombre).includes(q) || norm(p.marca).includes(q))
      .slice(0, 6);
  }, [busqueda, catalogo]);

  const irAFiltro = (clave: 'cat' | 'marca' | 'tag', id: number) => {
    setFly(null);
    setMenuAbierto(false);
    setFiltroMarca('');
    router.push(`/tienda?${clave}=${id}`);
  };

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busqueda.trim();
    if (q) busquedaHecha(q);
    router.push(q ? `/tienda?q=${encodeURIComponent(q)}` : '/tienda');
    setBuscadorAbierto(false);
    setMenuAbierto(false);
  };

  const activo = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const megaMenuStyle: React.CSSProperties = menuPos
    ? { top: menuPos.top, left: menuPos.left, visibility: 'visible' }
    : { top: -9999, left: -9999, visibility: 'hidden' };

  const renderMegaMenuSimple = (terminos: Termino[], clave: 'cat' | 'tag') => (
    <div ref={megaMenuRef} className={styles.megaMenu} style={megaMenuStyle}>
      {terminos.length === 0 ? (
        <p className={styles.megaMenuVacio}>No hay opciones disponibles.</p>
      ) : (
        <div className={styles.megaMenuGridSimple}>
          {terminos.map((t) => (
            <button key={t.id} type="button" onClick={() => irAFiltro(clave, t.id)} className={styles.megaMenuChip}>
              <span>{t.nombre}</span>
              <span className={styles.megaMenuChipCount}>({t.count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <p className={styles.topBarText}>🍃 Tienda online solo compra mayorista — las mejores marcas con nosotros.</p>
      </div>

      <div className={styles.main}>
        <div className={`container ${styles.mainInner}`}>
          <Link href="/" className={styles.logo} aria-label="Ir al inicio">
            {catalogo?.sitio?.logoUrl
              ? <img src={imgSrc(catalogo.sitio.logoUrl)} alt="Sabor y Aroma" style={{ height: 46, width: 'auto', display: 'block' }} />
              : 'Sabor y Aroma'}
          </Link>

          <nav ref={navRef} className={styles.nav} aria-label="Navegación principal">
            <Link href="/" className={`${styles.navLink} ${activo('/') ? styles.navLinkActive : ''}`}>Inicio</Link>
            <Link href="/tienda" className={`${styles.navLink} ${activo('/tienda') ? styles.navLinkActive : ''}`}>Tienda</Link>

            <div
              className={`${styles.flyWrap} ${fly === 'categorias' ? styles.flyOpen : ''}`}
              onMouseEnter={(e) => abrirFly('categorias', e.currentTarget)}
              onMouseLeave={programarCierre}
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={(e) => alClickFly('categorias', e.currentTarget.parentElement as HTMLDivElement)}
                aria-expanded={fly === 'categorias'}
              >
                Categorías <span className={styles.navArrow}>▾</span>
              </button>
              {fly === 'categorias' && renderMegaMenuSimple(catalogo?.categorias ?? [], 'cat')}
            </div>

            <div
              className={`${styles.flyWrap} ${fly === 'marcas' ? styles.flyOpen : ''}`}
              onMouseEnter={(e) => abrirFly('marcas', e.currentTarget)}
              onMouseLeave={programarCierre}
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={(e) => alClickFly('marcas', e.currentTarget.parentElement as HTMLDivElement)}
                aria-expanded={fly === 'marcas'}
              >
                Marcas <span className={styles.navArrow}>▾</span>
              </button>
              {fly === 'marcas' && (
                <div ref={megaMenuRef} className={`${styles.megaMenu} ${styles.megaMenuBrands}`} style={megaMenuStyle}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar una marca..."
                    value={filtroMarca}
                    onChange={(e) => setFiltroMarca(e.target.value)}
                    className={styles.megaMenuSearch}
                  />
                  {marcasPorLetra.size === 0 ? (
                    <p className={styles.megaMenuVacio}>No encontramos marcas con ese nombre.</p>
                  ) : (
                    <div className={styles.megaMenuGrid}>
                      {LETRAS.filter((l) => marcasPorLetra.has(l)).map((letra) => (
                        <div key={letra} className={styles.megaMenuCol}>
                          <span className={styles.megaMenuLetra}>{letra}</span>
                          {marcasPorLetra.get(letra)!.map((m) => (
                            <button key={m.id} type="button" onClick={() => irAFiltro('marca', m.id)} className={styles.megaMenuMarca}>
                              {m.nombre}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className={`${styles.flyWrap} ${fly === 'dieta' ? styles.flyOpen : ''}`}
              onMouseEnter={(e) => abrirFly('dieta', e.currentTarget)}
              onMouseLeave={programarCierre}
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={(e) => alClickFly('dieta', e.currentTarget.parentElement as HTMLDivElement)}
                aria-expanded={fly === 'dieta'}
              >
                Dieta <span className={styles.navArrow}>▾</span>
              </button>
              {fly === 'dieta' && renderMegaMenuSimple(catalogo?.etiquetas ?? [], 'tag')}
            </div>
          </nav>

          <div className={styles.actions}>
            <button type="button" className={styles.infoBtn} onClick={abrirInfoCompra}>
              <span aria-hidden>ⓘ</span> Info de compra
            </button>

            <div ref={searchWrapRef} className={styles.search}>
              <form onSubmit={buscar} className={styles.searchForm}>
                <input
                  type="search"
                  placeholder="Buscar productos..."
                  value={busqueda}
                  onFocus={() => setBuscadorAbierto(true)}
                  onChange={(e) => { setBusqueda(e.target.value); setBuscadorAbierto(true); }}
                  className={styles.searchInput}
                />
                <button type="submit" className={styles.searchBtn} aria-label="Buscar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </form>
              {buscadorAbierto && busqueda.trim() && (
                <div className={styles.searchDropdown}>
                  {sugerencias.length === 0 ? (
                    <p className={styles.searchSinResultados}>Sin resultados para &ldquo;{busqueda.trim()}&rdquo;.</p>
                  ) : (
                    <>
                      {sugerencias.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={styles.searchItem}
                          onClick={() => { busquedaHecha(busqueda); setBusqueda(p.nombre); router.push(`/tienda?q=${encodeURIComponent(p.nombre)}`); setBuscadorAbierto(false); }}
                        >
                          <img src={imgSrc(p.imagenUrl) || '/placeholder-producto.svg'} alt="" className={styles.searchItemImg} />
                          <span className={styles.searchItemInfo}>
                            <span className={styles.searchItemName}>{p.nombre}</span>
                            <span className={styles.searchItemBrand}>{p.marca}</span>
                          </span>
                          <span className={styles.searchItemPrice}>{money(p.oferta?.precioOferta ?? p.precio)}</span>
                        </button>
                      ))}
                      <button type="button" className={styles.searchVerTodo} onClick={buscar}>
                        Ver todos los resultados para &ldquo;{busqueda}&rdquo;
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div ref={cartWrapRef} className={styles.cartWrap} onMouseEnter={abrirCarrito} onMouseLeave={programarCierreCarrito}>
              <Link id="header-cart-link" href="/carrito" className={styles.cartLink} aria-label="Ver carrito" aria-expanded={carritoAbierto}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span id="header-cart-count" className={styles.cartCount}>{cantidadTotal}</span>
              </Link>
              {carritoAbierto && (
                <div className={styles.cartDropdown}>
                  <MiniCart onNavigate={() => setCarritoAbierto(false)} />
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.mobileToggle}
              aria-label="Abrir menú"
              onClick={() => setMenuAbierto((v) => !v)}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {menuAbierto && (
        <div className={styles.mobileMenu}>
          <form onSubmit={buscar} className={styles.mobileSearch}>
            <input
              type="search"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={styles.searchInput}
            />
          </form>
          <nav className={styles.mobileNav}>
            <Link href="/" className={styles.mobileNavLink} onClick={() => setMenuAbierto(false)}>Inicio</Link>
            <Link href="/tienda" className={styles.mobileNavLink} onClick={() => setMenuAbierto(false)}>Tienda</Link>

            <div className={styles.mobileAccordion}>
              <button
                type="button"
                className={styles.mobileAccordionToggle}
                onClick={() => setAccordion((v) => (v === 'categorias' ? null : 'categorias'))}
                aria-expanded={accordion === 'categorias'}
              >
                Categorías <span className={`${styles.navArrow} ${accordion === 'categorias' ? styles.navArrowOpen : ''}`}>▾</span>
              </button>
              {accordion === 'categorias' && (
                <div className={styles.mobileAccordionContent}>
                  {(catalogo?.categorias ?? []).map((c) => (
                    <button key={c.id} type="button" className={styles.mobileAccordionLink} onClick={() => irAFiltro('cat', c.id)}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.mobileAccordion}>
              <button
                type="button"
                className={styles.mobileAccordionToggle}
                onClick={() => setAccordion((v) => (v === 'marcas' ? null : 'marcas'))}
                aria-expanded={accordion === 'marcas'}
              >
                Marcas <span className={`${styles.navArrow} ${accordion === 'marcas' ? styles.navArrowOpen : ''}`}>▾</span>
              </button>
              {accordion === 'marcas' && (
                <div className={styles.mobileAccordionContent}>
                  <input
                    type="text"
                    placeholder="Buscar marca..."
                    value={filtroMarca}
                    onChange={(e) => setFiltroMarca(e.target.value)}
                    className={styles.mobileBrandsSearch}
                  />
                  {(catalogo?.marcas ?? [])
                    .filter((m) => !filtroMarca.trim() || norm(m.nombre).includes(norm(filtroMarca.trim())))
                    .map((m) => (
                      <button key={m.id} type="button" className={styles.mobileAccordionLink} onClick={() => irAFiltro('marca', m.id)}>
                        {m.nombre}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className={styles.mobileAccordion}>
              <button
                type="button"
                className={styles.mobileAccordionToggle}
                onClick={() => setAccordion((v) => (v === 'dieta' ? null : 'dieta'))}
                aria-expanded={accordion === 'dieta'}
              >
                Dieta <span className={`${styles.navArrow} ${accordion === 'dieta' ? styles.navArrowOpen : ''}`}>▾</span>
              </button>
              {accordion === 'dieta' && (
                <div className={styles.mobileAccordionContent}>
                  {(catalogo?.etiquetas ?? []).map((t) => (
                    <button key={t.id} type="button" className={styles.mobileAccordionLink} onClick={() => irAFiltro('tag', t.id)}>
                      {t.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className={styles.mobileInfoBtn} onClick={() => { setMenuAbierto(false); abrirInfoCompra(); }}>
              <span aria-hidden>ⓘ</span> Info de compra
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
