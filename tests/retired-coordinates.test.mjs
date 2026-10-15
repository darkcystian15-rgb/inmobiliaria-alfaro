import test from 'node:test';
import assert from 'node:assert/strict';
import { stripCoordinates, scrubCoordinateJson } from '../lib/retired-coordinates.mjs';
import { propertyInput, registrationInput } from '../lib/property-input.mjs';

test('old clients cannot save coordinates while address and property edits still work', () => {
  assert.deepEqual(propertyInput({ direccion: 'Av. Perú 100', latitud: '-9.1', longitud: '-78.5' }), { direccion: 'Av. Perú 100' });
  assert.deepEqual(propertyInput({ latitud: 0 }), {});
  const result = registrationInput({ posicion: 1, operacion: 'venta', tipo: 'Casa', direccion: 'Av. Perú 100', nombreContacto: 'Contacto', latitud: 0, longitud: 0 });
  assert.equal(result.direccion, 'Av. Perú 100');
  assert.equal('latitud' in result, false);
  assert.equal('longitud' in result, false);
});

test('cleanup removes coordinates from nested history and drafts without deleting other information', () => {
  const original = { anterior: { latitud: '-9.1', longitud: '-78.5', direccion: 'Antes' }, nuevo: { latitud: null, longitud: null, direccion: 'Después' }, campos: ['direccion', 'latitud', 'longitud'], form: { latitude: 0, longitude: 0, distrito: 'Chimbote' } };
  const expected = { anterior: { direccion: 'Antes' }, nuevo: { direccion: 'Después' }, campos: ['direccion'], form: { distrito: 'Chimbote' } };
  assert.deepEqual(stripCoordinates(original), expected);
  assert.equal(original.anterior.latitud, '-9.1');
  assert.deepEqual(JSON.parse(scrubCoordinateJson(JSON.stringify(original))), expected);
  assert.deepEqual(stripCoordinates(expected), expected);
  assert.equal(scrubCoordinateJson(' { "direccion": "Av. Perú" } '), ' { "direccion": "Av. Perú" } ');
  assert.equal(scrubCoordinateJson(null), null);
  assert.throws(() => scrubCoordinateJson('Texto histórico sin JSON'));
});
