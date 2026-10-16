import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loteDe, totalConOferta } from './oferta.ts';
import type { OfertaItem } from './types.ts';

const o = (x: Partial<OfertaItem>): OfertaItem => ({ id: 1, nombre: 'p', badge: '', precioOferta: null, tipo: 'nxm', ...x });

test('3×2 en el carrito: igual que el servidor', () => {
  const tresPorDos = o({ tipo: 'nxm', lleva: 3, paga: 2 });
  assert.equal(totalConOferta(tresPorDos, 4657, 3), 9314);
  assert.equal(totalConOferta(tresPorDos, 4657, 4), 13971);
  assert.equal(loteDe(tresPorDos), 3);
});

test('2ª unidad y pack', () => {
  assert.equal(totalConOferta(o({ tipo: 'segunda_unidad', porcentaje: 50 }), 100, 3), 250);
  assert.equal(loteDe(o({ tipo: 'segunda_unidad', porcentaje: 50 })), 2);
  assert.equal(totalConOferta(o({ tipo: 'pack', lleva: 3, precioPack: 250 }), 100, 4), 350);
});
