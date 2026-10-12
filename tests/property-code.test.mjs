import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyCode } from '../lib/property-code.mjs';

test('codes use a stable order, the property type and property name', () => {
  assert.equal(propertyCode(1, 'Casa', 'Ana Torres Salazar'), '001-CASA-ANA-TORRES-SALAZAR');
  assert.equal(propertyCode(13, 'Local comercial', 'María / Las Flores'), '013-LOCAL-COMERCIAL-MARIA-LAS-FLORES');
  assert.equal(propertyCode(1000, 'Terreno', 'Lote 2'), '1000-TERRENO-LOTE-2');
  assert.notEqual(propertyCode(1, 'Casa', 'Las Flores'), propertyCode(2, 'Casa', 'Las Flores'));
});

test('valid names longer than the old 30-character limit are preserved', () => {
  const code = propertyCode(14, 'Departamento', 'Residencial San José con acceso al parque principal');
  assert.ok(code.length > 30);
  assert.ok(code.endsWith('AL-PARQUE-PRINCIPAL'));
  assert.ok(propertyCode(Number.MAX_SAFE_INTEGER, 'a'.repeat(30), 'b'.repeat(255)).length <= 350);
});

test('invalid order and oversized or empty names are rejected', () => {
  for (const value of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => propertyCode(value, 'Casa', 'Nombre'));
  for (const value of ['', ' ', 'x'.repeat(256)]) assert.throws(() => propertyCode(1, 'Casa', value));
  assert.throws(() => propertyCode(1, 'x'.repeat(31), 'Nombre'));
});
