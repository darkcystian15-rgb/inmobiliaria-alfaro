import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePropertyEditFields, canChangeOperation } from '../lib/property-edit-policy.mjs';

test('Información rechaza los tres campos reservados incluso junto con cambios permitidos', () => {
  for (const key of ['operacion', 'tipo', 'nombreContacto']) {
    assert.throws(() => validatePropertyEditFields({ direccion: 'Nueva dirección', [key]: 'Cambio' }, false), /únicamente desde Cartera/);
  }
  assert.doesNotThrow(() => validatePropertyEditFields({ direccion: 'Nueva dirección', habitaciones: 2 }, false));
});
test('Cartera permite dirección referencial y conserva las restricciones de los demás campos', () => {
  assert.doesNotThrow(() => validatePropertyEditFields({ operacion: 'alquiler', tipo: 'Casa', nombreContacto: 'Ana' }, true));
  assert.doesNotThrow(() => validatePropertyEditFields({ nombreContacto: 'Ana' }, true));
  assert.doesNotThrow(() => validatePropertyEditFields({ direccion: 'Av. Meiggs cuadra 3' }, true));
  assert.doesNotThrow(() => validatePropertyEditFields({ nombreContacto: 'Ana', direccion: 'Av. Meiggs cuadra 3' }, true));
  for (const key of ['estado', 'zonaId', 'codigo']) {
    assert.throws(() => validatePropertyEditFields({ nombreContacto: 'Ana', [key]: 'Cambio' }, true), /solo se editan/);
  }
});
test('Operación cambia en activo incluso con tasación o publicación y se bloquea en histórico', () => {
  for (const estado of ['activo', 'inactivo', 'vendido', 'alquilado', 'suspendido']) for (const hasPrices of [false, true]) for (const hasPublication of [false, true]) {
    assert.equal(canChangeOperation({ estado, hasPrices, hasPublication }), estado === 'activo');
  }
});
