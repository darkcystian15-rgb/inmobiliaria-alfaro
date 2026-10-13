import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyAddress } from '../lib/property-address.mjs';

test('street and number precede the geographic hierarchy', () => {
  assert.equal(propertyAddress({direccion:'Calle Los Cedros',numeroDireccion:'383',distrito:'Chimbote',provincia:'Santa',departamento:'Áncash'}), 'Calle Los Cedros 383, Chimbote, Santa, Áncash');
});
test('missing number and partial addresses do not create separators', () => {
  assert.equal(propertyAddress({direccion:'Calle Las Flores 816',numeroDireccion:null,distrito:'Chimbote'}), 'Calle Las Flores 816, Chimbote');
  assert.equal(propertyAddress({distrito:'Chimbote',provincia:'Santa'}), 'Chimbote, Santa');
  assert.equal(propertyAddress({direccion:'Calle 1',numeroDireccion:'Mz. A / Lt. 5'}), 'Calle 1 Mz. A / Lt. 5');
});
test('whitespace is normalized; missing addresses use the chosen fallback', () => {
  assert.equal(propertyAddress({direccion:'  Av.  Los Girasoles ',numeroDireccion:' 488 ',distrito:' Chimbote '}), 'Av. Los Girasoles 488, Chimbote');
  assert.equal(propertyAddress({}), 'Ubicación por completar');
  assert.equal(propertyAddress(null, ''), '');
});
