'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { norm } from '@/lib/format';
import type { ItemCatalogo, Termino } from '@/lib/types';
import styles from './ShopFilters.module.css';

interface Props {
  categorias: Termino[];
  marcas: Termino[];
  etiquetas: Termino[];
  /** Catálogo completo (sin filtrar): para calcular qué opciones tienen sentido dado lo ya elegido. */
  productos: ItemCatalogo[];
}

type Clave = 'cat' | 'marca' | 'tag';

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
export function ShopFilters({ categorias, marcas, etiquetas, productos }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [abiertoMobile, setAbiertoMobile] = useState(false);

  const porClave: Record<Clave, Termino[]> = { cat: categorias, marca: marcas, tag: etiquetas };

  const activos = (clave: Clave) => new Set((params.get(clave) ?? '').split(',').filter(Boolean).map(Number));
  const q = norm((params.get('q') ?? '').trim());

  const toggle = (clave: Clave, id: number) => {
    const set = activos(clave);
    if (set.has(id)) set.delete(id); else set.add(id);
    const next = new URLSearchParams(params.toString());
    if (set.size) next.set(clave, [...set].join(',')); else next.delete(clave);
    router.push(`/tienda?${next.toString()}`);
  };

  const coincideOtras = (p: ItemCatalogo, exceptoClave: Clave) => {
    if (q && !norm(p.nombre).includes(q) && !norm(p.marca).includes(q)) return false;
    if (exceptoClave !== 'cat') {
      const set = activos('cat');
      if (set.size && (!p.categoriaId || !set.has(p.categoriaId))) return false;
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
    const resultado: Record<Clave, (Termino & { activo: boolean })[]> = { cat: [], marca: [], tag: [] };

    for (const { clave } of GRUPOS) {
      const conteo = new Map<number, number>();
      for (const p of productos) {
        if (!coincideOtras(p, clave)) continue;
        if (clave === 'cat' && p.categoriaId) conteo.set(p.categoriaId, (conteo.get(p.categoriaId) ?? 0) + 1);
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
  }, [params, productos, categorias, marcas, etiquetas]);

  const pills = useMemo(() => {
    const list: { clave: Clave; id: number; nombre: string }[] = [];
    for (const { clave } of GRUPOS) {
      for (const id of activos(clave)) {
        const t = porClave[clave].find((x) => x.id === id);
        if (t) list.push({ clave, id, nombre: t.nombre });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, categorias, marcas, etiquetas]);

  const hayFiltros = pills.length > 0;
  const limpiar = () => router.push('/tienda');

  const grupo = (titulo: string, clave: Clave) => {
    const terminos = disponibles[clave];
    if (!terminos.length) return null;
    return (
      <div key={clave} className={styles.grupo}>
        <h3 className={styles.titulo}>{titulo}</h3>
        <div className={styles.lista}>
          {terminos.map((t) => (
            <label key={t.id} className={styles.item}>
              <input type="checkbox" checked={t.activo} onChange={() => toggle(clave, t.id)} />
              <span className={styles.checkbox} aria-hidden />
              <span className={styles.label}>{t.nombre}</span>
              <span className={styles.count}>({t.count})</span>
            </label>
          ))}
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
