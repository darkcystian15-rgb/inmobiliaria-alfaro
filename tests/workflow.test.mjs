import test from 'node:test';
import assert from 'node:assert/strict';
import { todayInPeru, parseBusinessDate } from '../lib/calendar.mjs';
import { propertyInput, ownerInput } from '../lib/property-input.mjs';

test('Peru calendar rejects tomorrow while UTC has already crossed midnight', () => {
  const now = new Date('2026-10-04T02:00:00Z');
  assert.equal(todayInPeru(now), '2026-10-03');
  assert.equal(parseBusinessDate('2026-10-04', now), null);
  assert.equal(parseBusinessDate('2026-10-03', now).toISOString(), '2026-10-03T00:00:00.000Z');
});
test('invalid dates cannot silently roll into the next month', () => {
  const now = new Date('2026-10-03T18:00:00Z');
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', 'oops', null]) assert.equal(parseBusinessDate(value, now), null);
  assert.ok(parseBusinessDate('2024-02-29', now));
});
test('partial property edits preserve omitted fields and reject invalid dimensions', () => {
  assert.deepEqual(propertyInput({ direccion: ' Frente al parque ' }), { direccion: 'Frente al parque' });
  assert.deepEqual(propertyInput({ areaTerreno: '150.5', habitaciones: '3', banos: '' }), { areaTerreno: '150.50', habitaciones: 3, banos: null });
  for (const body of [{ areaTerreno: '-1' }, { habitaciones: '2.5' }, { banos: true }, { areaConstruida: 'abc' }, { direccion: '' }, { distrito: 'X'.repeat(101) }]) assert.throws(() => propertyInput(body));
});
test('owners are optional until filled, then require consistent identification', () => {
  assert.equal(ownerInput({}), null);
  assert.throws(() => ownerInput({ telefono: '999999999' }));
  assert.deepEqual(ownerInput({ nombres: 'Ana', telefono: '999999999' }), { dni: null, nombres: 'Ana', apellidos: '', telefono: '999999999', email: null, referenciaContacto: null });
  assert.equal(ownerInput({ dni: '12345678', nombres: 'Ana' }).apellidos, '');
  assert.throws(() => ownerInput({ dni: '123', nombres: 'Ana', apellidos: 'Pérez' }));
  assert.throws(() => ownerInput({ dni: '12345678', nombres: 'Ana', apellidos: 'Pérez', email: 'invalid' }));
  assert.equal(ownerInput({ dni: '12345678', nombres: 'Ana', apellidos: 'Pérez' }).dni, '12345678');
});
