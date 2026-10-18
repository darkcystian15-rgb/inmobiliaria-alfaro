import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyPanelId } from '../lib/property-panel-id.mjs';

test('panel identity uses stable order, current operation/type and reference address, never contact or geography', () => {
  const property = { id: '012-LOCAL-LIDIA-CHAVARRIA', posicion: 3, operacion: 'venta', tipo: 'Local', direccion: 'Av Meigss C3', propietario: 'Lidia Chavarria', distrito: 'Chimbote', provincia: 'Santa', departamento: 'Áncash' };
  assert.equal(propertyPanelId(property), '012-venta-local-av meigss c3');
  assert.equal(property.id, '012-LOCAL-LIDIA-CHAVARRIA');
  assert.equal(propertyPanelId({ ...property, operacion: 'alquiler' }), '012-alquiler-local-av meigss c3');
});

test('detail API shape uses stored code rather than numeric database ID or reusable position', () => {
  assert.equal(propertyPanelId({ id: 481, codigo: '012-LOCAL-LIDIA', posicion: 1, operacion: 'venta', tipo: 'Local', direccion: '  Av   Meigss C3  ' }), '012-venta-local-av meigss c3');
});

test('missing address does not fall back to contact, old reference, or geographic hierarchy', () => {
  assert.equal(propertyPanelId({ codigo: '012-LOCAL-LIDIA', operacion: 'venta', tipo: 'Local', direccion: ' ', referencia: 'Lidia Chavarria', distrito: 'Chimbote', zona: 'Chimbote' }), '012-venta-local-ubicación por completar');
});
