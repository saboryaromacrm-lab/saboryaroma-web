/**
 * Tests de las utilidades puras del sitio. Corren con el runner nativo de
 * Node (`npm test`), que desde la 22.18 entiende TypeScript sin compilar —
 * por eso el import lleva la extensión `.ts` (Node resuelve archivos, no
 * módulos de TypeScript) y el tsconfig tiene `allowImportingTsExtensions`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkRed, linkWhatsApp, norm, telefonoArgentino } from './format.ts';

test('telefonoArgentino: misma regla que la API', () => {
  assert.equal(telefonoArgentino('370 4123456'), '3704123456');
  assert.equal(telefonoArgentino('0370 15 4123456'), '3704123456', 'con 0 y 15');
  assert.equal(telefonoArgentino('+54 9 370 4123456'), '3704123456', 'internacional');
  assert.equal(telefonoArgentino('11 4123-4567'), '1141234567', 'AMBA');
  assert.equal(telefonoArgentino('4123456'), '', 'sin área no alcanza');
  assert.equal(telefonoArgentino(''), '');
});

test('linkWhatsApp: arma el link con 549 y cae al histórico si el número no sirve', () => {
  assert.equal(linkWhatsApp('370 4123456'), 'https://wa.me/5493704123456');
  assert.equal(linkWhatsApp(''), 'https://wa.me/5493704621563');
  assert.equal(linkWhatsApp('123'), 'https://wa.me/5493704621563');
});

test('norm: sin acentos ni mayúsculas, para buscar', () => {
  assert.equal(norm('Azúcar Orgánica'), 'azucar organica');
  assert.equal(norm('SIN TACC'), 'sin tacc');
  assert.equal(norm('ñandú'), 'nandu');
});

test('linkRed: usuario pelado o URL completa', () => {
  assert.equal(linkRed('saboryaroma', 'instagram.com'), 'https://instagram.com/saboryaroma');
  assert.equal(linkRed('@saboryaroma', 'instagram.com'), 'https://instagram.com/saboryaroma');
  assert.equal(linkRed('https://www.instagram.com/x', 'instagram.com'), 'https://www.instagram.com/x');
  assert.equal(linkRed('', 'instagram.com'), '');
});
