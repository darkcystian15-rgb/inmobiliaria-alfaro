import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyAddress } from '../lib/property-address.mjs';

test('operational descriptions show reference street and number without appended geography or zone', () => {
  assert.equal(propertyAddress({direccion:'Av Meigss',numeroDireccion:'C3',distrito:'Chimbote',provincia:'Santa',departamento:'Áncash',zona:'Chimbote'}), 'Av Meigss C3');
  assert.equal(propertyAddress({direccion:'Calle Las Flores 816',numeroDireccion:null,distrito:'Chimbote'}), 'Calle Las Flores 816');
});
test('missing address does not use geography or zone as a substitute', () => {
  assert.equal(propertyAddress({distrito:'Chimbote',provincia:'Santa',departamento:'Áncash'}), 'Ubicación por completar');
  assert.equal(propertyAddress({zona:'Chimbote'}), 'Ubicación por completar');
  assert.equal(propertyAddress(null, ''), '');
});
test('whitespace is normalized without altering the written address', () => {
  assert.equal(propertyAddress({direccion:'  Av.  Los Girasoles ',numeroDireccion:' 488 '}), 'Av. Los Girasoles 488');
  assert.equal(propertyAddress({direccion:'Calle 1',numeroDireccion:'Mz. A / Lt. 5'}), 'Calle 1 Mz. A / Lt. 5');
});
