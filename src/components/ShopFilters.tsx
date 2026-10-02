'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { norm } from '@/lib/format';
import type { ItemCatalogo, Subtermino, Termino } from '@/lib/types';
import styles from './ShopFilters.module.css';

interface Props {
  categorias: Termino[];
  /** Se muestran DEBAJO de cada categoría marcada (2/10/2026). */
  subcategorias: Subtermino[];
  marcas: Termino[];
  etiquetas: Termino[];
  /** Catálogo completo (sin filtrar): para calcular qué opciones tienen sentido dado lo ya elegido. */
  productos: ItemCatalogo[];
}

type Clave = 'cat' | 'sub' | 'marca' | 'tag';

const GRUPOS: { titulo: string; clave: Clave }[] = [
  { titulo: 'Categoría', clave: 'cat' },
  { titulo: 'Marca', clave: 'marca' },
  { titulo: 'Dieta', clave: 'tag' },
];

/**
 * Filtros por checkbox que actualizan la URL — igual que el sitio real: se puede
 * compartir el link filtrado. Cada grupo es CONTEXTUAL: sus opciones y contadores
 * se recalculan según lo elegido en los OTROS grupos (no el propio, para poder
 * seguir viendo y sacando la propia selección) — al elegir Marca=NutriSol,
 * Categoría y Dieta solo muestran lo que existe dentro de esa marca.
 */
export function ShopFilters({ categorias, subcategorias, marcas, etiquetas, productos }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [abiertoMobile, setAbiertoMobile] = useState(false);

  const porClave: Record<Clave, Termino[]> = { cat: categorias, sub: subcategorias, marca: marcas, tag: etiquetas };

  const activos = (clave: Clave) => new Set((params.get(clave) ?? '').split(',').filter(Boolean).map(Number));
  const q = norm((params.get('q') ?? '').trim());

  const toggle = (clave: Clave, id: number) => {
    const set = activos(clave);
    const quitando = set.has(id);
    if (quitando) set.delete(id); else set.add(id);
    const next = new URLSearchParams(params.toString());
    if (set.size) next.set(clave, [...set].join(',')); else next.delete(clave);
    /* Al sacar una categoría se van también sus subcategorías: si quedaran, seguirían
     * filtrando sin que se vea por qué (están debajo de la categoría, que ya no está). */
    if (clave === 'cat' && quitando) {
      const subs = new Set([...activos('sub')].filter((s) => subcategorias.find((x) => x.id === s)?.categoriaId !== id));
      if (subs.size) next.set('sub', [...subs].join(',')); else next.delete('sub');
    }
    router.push(`/tienda?${next.toString()}`);
  };

  const coincideOtras = (p: ItemCatalogo, exceptoClave: Clave) => {
    if (q && !norm(p.nombre).includes(q) && !norm(p.marca).includes(q)) return false;
    // Categoría y subcategoría son UNA dimensión: al contar categorías no se mira ninguna de las dos.
    if (exceptoClave !== 'cat') {
      const set = activos('cat');
      if (set.size && (!p.categoriaId || !set.has(p.categoriaId))) return false;
    }
    if (exceptoClave !== 'cat' && exceptoClave !== 'sub') {
      const set = activos('sub');
      if (set.size && (!p.subcategoriaId || !set.has(p.subcategoriaId))) return false;
    }
    if (exceptoClave !== 'marca') {
      const set = activos('marca');
      if (set.size && (!p.marcaId || !set.has(p.marcaId))) return false;
    }
    if (exceptoClave !== 'tag') {
      const set = activos('tag');
      if (set.size && !p.etiquetas.some((e) => set.has(e.id))) return false;
    }
    return true;
  };

  /** Términos disponibles por grupo, con su cantidad recalculada según los otros filtros activos. */
  const disponibles = useMemo(() => {
    const resultado: Record<Clave, (Termino & { activo: boolean })[]> = { cat: [], sub: [], marca: [], tag: [] };

    for (const clave of ['cat', 'sub', 'marca', 'tag'] as Clave[]) {
      const conteo = new Map<number, number>();
      for (const p of productos) {
        if (!coincideOtras(p, clave)) continue;
        if (clave === 'cat' && p.categoriaId) conteo.set(p.categoriaId, (conteo.get(p.categoriaId) ?? 0) + 1);
        if (clave === 'sub' && p.subcategoriaId) conteo.set(p.subcategoriaId, (conteo.get(p.subcategoriaId) ?? 0) + 1);
        if (clave === 'marca' && p.marcaId) conteo.set(p.marcaId, (conteo.get(p.marcaId) ?? 0) + 1);
        if (clave === 'tag') for (const e of p.etiquetas) conteo.set(e.id, (conteo.get(e.id) ?? 0) + 1);
      }
      const set = activos(clave);
      resultado[clave] = porClave[clave]
        .map((t) => ({ ...t, count: conteo.get(t.id) ?? 0, activo: set.has(t.id) }))
        .filter((t) => t.count > 0 || t.activo);
    }
    return resultado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, productos, categorias, subcategorias, marcas, etiquetas]);

  const pills = useMemo(() => {
    const list: { clave: Clave; id: number; nombre: string }[] = [];
    for (const clave of ['cat', 'sub', 'marca', 'tag'] as Clave[]) {
      for (const id of activos(clave)) {
        const t = porClave[clave].find((x) => x.id === id);
        if (t) list.push({ clave, id, nombre: t.nombre });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, categorias, subcategorias, marcas, etiquetas]);

  const hayFiltros = pills.length > 0;
  const limpiar = () => router.push('/tienda');

  const grupo = (titulo: string, clave: Clave) => {
    const terminos = disponibles[clave];
    if (!terminos.length) return null;
    return (
      <div key={clave} className={styles.grupo}>
        <h3 className={styles.titulo}>{titulo}</h3>
        <div className={styles.lista}>
          {terminos.map((t) => {
            /* Las subcategorías de una categoría MARCADA, colgando de ella: se afina sin perder de vista dónde se está. */
            const subs = clave === 'cat' && t.activo
              ? disponibles.sub.filter((s) => subcategorias.find((x) => x.id === s.id)?.categoriaId === t.id)
              : [];
            return (
              <div key={t.id}>
                <label className={styles.item}>
                  <input type="checkbox" checked={t.activo} onChange={() => toggle(clave, t.id)} />
                  <span className={styles.checkbox} aria-hidden />
                  <span className={styles.label}>{t.nombre}</span>
                  <span className={styles.count}>({t.count})</span>
                </label>
                {subs.length > 0 && (
                  <div className={styles.sublista}>
                    {subs.map((s) => (
                      <label key={s.id} className={`${styles.item} ${styles.subitem}`}>
                        <input type="checkbox" checked={s.activo} onChange={() => toggle('sub', s.id)} />
                        <span className={styles.checkbox} aria-hidden />
                        <span className={styles.label}>{s.nombre}</span>
                        <span className={styles.count}>({s.count})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className={styles.sidebar}>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setAbiertoMobile((v) => !v)}
        aria-expanded={abiertoMobile}
      >
        <span>Filtros {hayFiltros && <span className={styles.mobileToggleBadge}>{pills.length}</span>}</span>
        <span className={`${styles.mobileToggleArrow} ${abiertoMobile ? styles.mobileToggleArrowOpen : ''}`}>▾</span>
      </button>

      {hayFiltros && (
        <div className={styles.activos}>
          <div className={styles.activosHeader}>
            <span className={styles.activosTitulo}>FILTROS ACTIVOS</span>
            <button type="button" className={styles.limpiar} onClick={limpiar}>Limpiar todo</button>
          </div>
          <div className={styles.pills}>
            {pills.map((p) => (
              <button key={`${p.clave}-${p.id}`} type="button" className={styles.pill} onClick={() => toggle(p.clave, p.id)}>
                {p.nombre}
                <span className={styles.pillX} aria-hidden>×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`${styles.grupos} ${abiertoMobile ? styles.gruposAbierto : ''}`}>
        {GRUPOS.map(({ titulo, clave }) => grupo(titulo, clave))}
      </div>
    </aside>
  );
}
