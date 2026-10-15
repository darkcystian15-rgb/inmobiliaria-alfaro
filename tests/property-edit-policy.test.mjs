import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePropertyEditFields, canChangeOperation } from '../lib/property-edit-policy.mjs';

test('Información rechaza los tres campos reservados incluso junto con cambios permitidos', () => {
  for (const key of ['operacion', 'tipo', 'nombreContacto']) {
    assert.throws(() => validatePropertyEditFields({ direccion: 'Nueva dirección', [key]: 'Cambio' }, false), /únicamente desde Cartera/);
  }
  assert.doesNotThrow(() => validatePropertyEditFields({ direccion: 'Nueva dirección', habitaciones: 2 }, false));
});
test('Cartera permite solo operación, tipo y contacto, también en ediciones parciales', () => {
  assert.doesNotThrow(() => validatePropertyEditFields({ operacion: 'alquiler', tipo: 'Casa', nombreContacto: 'Ana' }, true));
  assert.doesNotThrow(() => validatePropertyEditFields({ nombreContacto: 'Ana' }, true));
  for (const key of ['direccion', 'estado', 'zonaId', 'codigo']) {
    assert.throws(() => validatePropertyEditFields({ nombreContacto: 'Ana', [key]: 'Cambio' }, true), /solo se editan/);
  }
});
test('Operación solo cambia en activo sin precios ni publicación', () => {
  for (const estado of ['activo', 'inactivo']) for (const hasPrices of [false, true]) for (const hasPublication of [false, true]) {
    assert.equal(canChangeOperation({ estado, hasPrices, hasPublication }), estado === 'activo' && !hasPrices && !hasPublication);
  }
});
