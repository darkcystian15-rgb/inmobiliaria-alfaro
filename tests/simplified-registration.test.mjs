import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationInput, propertyInput } from '../lib/property-input.mjs';
import { simplifiedRegistration } from '../lib/simplified-registration.mjs';

const capture = { posicion: 1, operacion: 'alquiler', tipo: 'Casa', direccion: 'Frente al mercado', nombreContacto: 'Ana Pérez', departamento: 'Áncash', provincia: 'Santa', distrito: 'Chimbote' };

test('a zoned capture requires only position, operation, type, reference and contact', () => {
  const result = registrationInput(capture);
  assert.equal(result.referencia, capture.direccion);
  const zoned=Object.fromEntries(Object.entries(capture).filter(([key])=>!['departamento','provincia','distrito'].includes(key)));
  assert.equal(registrationInput(zoned).nombreContacto,capture.nombreContacto);
  for (const key of ['posicion','operacion','tipo','direccion','nombreContacto']) {
    assert.throws(() => registrationInput({ ...capture, [key]: '' }), undefined, key);
  }
  for (const posicion of [0, 91, 1.5, true, [], {}]) assert.throws(() => registrationInput({ ...capture, posicion }));
  assert.equal(registrationInput({ ...capture, posicion: 90 }).posicion, 90);
  assert.throws(() => registrationInput({ ...capture, operacion: 'otro' }));
});
test('legacy personal fields cannot enter the independent contact through new writes', () => {
  const result = registrationInput({ ...capture, dni: '12345678', nombres: 'Otra persona', referencia: 'Nombre antiguo', numeroDireccion: '999', propietario: { telefono: '999999999' } });
  assert.equal(result.nombreContacto, 'Ana Pérez');
  assert.equal(result.referencia, capture.direccion);
  for (const key of ['dni', 'nombres', 'numeroDireccion', 'propietario', 'propietarioId']) assert.equal(key in result, false);
  assert.deepEqual(propertyInput({ nombreContacto: '  Ana  ' }), { nombreContacto: 'Ana' });
  assert.deepEqual(propertyInput({ dni: '12345678', propietario: { nombres: 'No guardar' } }), {});
});
test('conversion merges address and number and copies the full contact, preserving identity outside its scope', () => {
  const original = { id: 8, codigo: '008-CASA-ANTERIOR', direccion: ' Av. Perú ', numero_direccion: ' 325 ', referencia: 'Casa anterior', propietario_id: 3 };
  const result = simplifiedRegistration(original, { nombres: 'Ana', apellidos: 'Pérez' });
  assert.deepEqual(result, { nombre_contacto: 'Ana Pérez', direccion: 'Av. Perú 325', numero_direccion: null, referencia: 'Av. Perú 325', propietario_id: null });
  assert.equal(original.codigo, '008-CASA-ANTERIOR');
  assert.equal('codigo' in result, false);
  for (const key of ['estado', 'posicion', 'fecha_salida', 'dni', 'archivos', 'precio_venta']) assert.equal(key in result, false);
});
test('conversion handles missing owners and incomplete legacy locations without inventing data', () => {
  assert.equal(simplifiedRegistration({ direccion: null, referencia: 'Junto al colegio' }).direccion, 'Junto al colegio');
  assert.equal(simplifiedRegistration({ referencia: 'Anterior' }).nombre_contacto, null);
  const long = { direccion: 'a'.repeat(255), numero_direccion: 'b'.repeat(30) };
  assert.equal(simplifiedRegistration(long).direccion.length, 286);
  assert.equal(simplifiedRegistration(long).referencia.length, 255);
});
test('a migrated record retains its contact on a subsequent conversion without shared-owner links', () => {
  const owner = { nombres: 'Ana', apellidos: 'Pérez' };
  const first = simplifiedRegistration({ direccion: 'Av. Perú', numero_direccion: '325' }, owner);
  assert.deepEqual(simplifiedRegistration(first), first);
  const second = simplifiedRegistration({ direccion: 'Otra ubicación' }, owner);
  first.nombre_contacto = 'Contacto corregido';
  assert.equal(second.nombre_contacto, 'Ana Pérez');
});
