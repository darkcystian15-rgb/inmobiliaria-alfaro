import test from 'node:test';
import assert from 'node:assert/strict';
import { fileListFilters, fileListType } from '../lib/file-list.mjs';

test('file filters support active-zone names, all types and automatic pagination', () => {
  assert.deepEqual(fileListFilters(new URLSearchParams()), { zone: '*', type: '*', query: '', page: 1, pageSize: 50 });
  assert.equal(fileListFilters(new URLSearchParams({zona:'Nuevo Chimbote',tipo:'tasaciones',pagina:'2'})).page, 2);
  for (const params of [{tipo:'FOTO_INMUEBLE'},{pagina:'0'},{pagina:'1.5'},{pagina:'Infinity'},{pagina:'1000001'},{zona:'x'.repeat(101)}]) assert.throws(() => fileListFilters(new URLSearchParams(params)));
});
test('appraisals share one type; rental contracts use explicit or unambiguous legacy categories', () => {
  for (const category of ['TASACION','TASACION_EXPRESS','TASACION_PROPIETARIO']) assert.equal(fileListType(category,'venta').key,'tasaciones');
  assert.equal(fileListType('CONTRATO','alquiler').key,'contratos-alquiler');
  assert.equal(fileListType('CONTRATO','venta'),null);
  assert.equal(fileListType('CONTRATO_ALQUILER','alquiler').singular,'Contrato de alquiler');
  assert.equal(fileListType('MINUTA_COMPRAVENTA','venta').key,'minutas');
  assert.equal(fileListType('ESCRITURA_PUBLICA','venta').key,'escrituras');
  assert.equal(fileListType('FOTO_INMUEBLE','venta'),null);
});

test('search trims text, preserves literal characters and limits query length', () => {
  assert.equal(fileListFilters(new URLSearchParams({q:'  Lidia  '})).query, 'Lidia');
  assert.equal(fileListFilters(new URLSearchParams({q:'100%_contrato'})).query, '100%_contrato');
  assert.throws(() => fileListFilters(new URLSearchParams({q:'a'.repeat(151)})));
});
