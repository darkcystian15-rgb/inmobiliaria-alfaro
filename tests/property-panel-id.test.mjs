import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyPanelId } from '../lib/property-panel-id.mjs';

test('panel identity uses zone position, current operation/type and reference address, never contact or geography', () => {
  const property = { id: '012-LOCAL-LIDIA-CHAVARRIA', posicion: 3, operacion: 'venta', tipo: 'Local', direccion: 'Av Meigss C3', propietario: 'Lidia Chavarria', distrito: 'Chimbote', provincia: 'Santa', departamento: 'Áncash' };
  assert.equal(propertyPanelId(property), '003-venta-local-av meigss c3');
  assert.equal(property.id, '012-LOCAL-LIDIA-CHAVARRIA');
  assert.equal(propertyPanelId({ ...property, operacion: 'alquiler' }), '003-alquiler-local-av meigss c3');
});

test('detail API shape uses position rather than stored order or numeric database ID', () => {
  assert.equal(propertyPanelId({ id: 481, codigo: '012-LOCAL-LIDIA', posicion: 1, operacion: 'venta', tipo: 'Local', direccion: '  Av   Meigss C3  ' }), '001-venta-local-av meigss c3');
});

test('missing address does not fall back to contact, old reference, or geographic hierarchy', () => {
  assert.equal(propertyPanelId({ codigo: '012-LOCAL-LIDIA', operacion: 'venta', tipo: 'Local', direccion: ' ', referencia: 'Lidia Chavarria', distrito: 'Chimbote', zona: 'Chimbote' }), '012-venta-local-ubicación por completar');
});

test('all zones share the position policy, while missing positions retain their identifier', () => {
  const property = { id: 493, codigo: '026-LOCAL-AV-PARDO', posicion: 3, operacion: 'alquiler', tipo: 'Local', direccion: 'AV. PARDO' };
  for (const zona of ['Chimbote', 'Nuevo Chimbote', 'Tortugas', 'Huarmey', 'Casma', 'Lima', 'Trujillo']) {
    assert.equal(propertyPanelId({...property,zona}), '003-alquiler-local-av. pardo');
  }
  assert.equal(propertyPanelId({...property,posicion:'03'}), '003-alquiler-local-av. pardo');
  for(const posicion of [null,undefined,'',0,-1,'abc']) assert.equal(propertyPanelId({...property,posicion}), '026-alquiler-local-av. pardo');
  assert.equal(property.codigo,'026-LOCAL-AV-PARDO');
 });
