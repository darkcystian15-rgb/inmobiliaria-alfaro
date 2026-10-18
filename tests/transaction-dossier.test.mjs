import test from 'node:test';
import assert from 'node:assert/strict';
import { dossierDefaults, dossierInput, dossierDocuments, dossierStatus, documentApplies } from '../lib/transaction-dossier.mjs';
import { DOCUMENT_TYPES } from '../lib/document-files.mjs';

const natural = () => ({ ...dossierDefaults(), vendedorTipo: 'natural', compradorAsignado: true, compradorTipo: 'natural', renta: 'afecto' });
const file = tipoDocumento => ({ tipoDocumento, almacenamiento: 'hosting' });
test('seller and buyer independently change identification by person type', () => {
  const result = dossierStatus({ ...natural(), compradorTipo: 'juridica' });
  const item = key => result.items.find(item => item.key === key);
  assert.equal(item('VENDEDOR_DNI').state, 'pendiente');
  assert.equal(item('VENDEDOR_FICHA_RUC').state, 'no_aplica');
  assert.equal(item('COMPRADOR_DNI').state, 'no_aplica');
  assert.equal(item('COMPRADOR_FICHA_RUC').state, 'pendiente');
  assert.equal(item('COMPRADOR_DNI_GERENTE').state, 'pendiente');
  assert.equal(item('COMPRADOR_VIGENCIA_GERENTE').state, 'pendiente');
});
test('unassigned buyer is pending and cannot receive documents', () => {
  const config = dossierDefaults();
  const result = dossierStatus(config);
  assert.ok(result.alerts.some(text => text.includes('Comprador')));
  assert.equal(result.complete, false);
  assert.ok(result.items.filter(item => item.party === 'comprador').every(item => !item.applies));
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'COMPRADOR_ALCABALA'), config), false);
});
test('national search requires an uploaded document OR a written note for each natural person', () => {
  const config = natural();
  assert.equal(dossierStatus(config).items.find(item => item.key === 'VENDEDOR_BUSQUEDA_NACIONAL').state, 'pendiente');
  config.vendedorBusquedaNota = 'No cuenta con búsqueda; revisión pendiente.';
  const result = dossierStatus(config, [file('COMPRADOR_BUSQUEDA_NACIONAL')]);
  for (const key of ['VENDEDOR_BUSQUEDA_NACIONAL', 'COMPRADOR_BUSQUEDA_NACIONAL']) assert.equal(result.items.find(item => item.key === key).state, 'completo');
});
test('exemption and optional charges change requirements, retaining existing documents', () => {
  const config = { ...natural(), renta: 'exonerado' };
  const files = [file('VENDEDOR_VOUCHER_RENTA')];
  let result = dossierStatus(config, files);
  assert.equal(result.items.find(item => item.key === 'VENDEDOR_FORMULARIO_RENTA').state, 'no_aplica');
  assert.equal(result.items.find(item => item.key === 'VENDEDOR_VOUCHER_RENTA').documents.length, 1);
  assert.equal(result.items.find(item => item.key === 'LEVANTAMIENTO_CARGAS').state, 'no_aplica');
  result = dossierStatus({ ...config, cargas: true }, files);
  assert.equal(result.items.find(item => item.key === 'LEVANTAMIENTO_CARGAS').state, 'pendiente');
});
test('one literal/CRI suffices, multiple files count once, links do not complete requirements', () => {
  const result = dossierStatus(natural(), [file('COPIA_LITERAL_CRI'), file('COPIA_LITERAL_CRI'), { tipoDocumento: 'HR_VENTA', almacenamiento: 'enlace' }]);
  assert.equal(result.items.find(item => item.key === 'COPIA_LITERAL_CRI').state, 'completo');
  assert.equal(result.items.find(item => item.key === 'COPIA_LITERAL_CRI').documents.length, 2);
  assert.equal(result.items.find(item => item.key === 'HR_VENTA').state, 'pendiente');
  assert.equal(result.completed, 1);
});
test('complete dossier excludes optional files and legacy uploads remain recognized', () => {
  const config = { ...natural(), vendedorBusquedaNota: 'Nota vendedor', compradorBusquedaNota: 'Nota comprador' };
  const result = dossierStatus(config);
  const files = result.items.filter(item => item.applies && item.required && !item.note).map(item => file(item.key));
  assert.equal(dossierStatus(config, files).complete, true);
  assert.equal(dossierStatus(config, files).percent, 100);
  assert.equal(dossierStatus(config, [file('DNI_PROPIETARIO')]).items.find(item => item.key === 'VENDEDOR_DNI').state, 'completo');
  assert.equal(dossierStatus({ ...config, renta: 'pendiente' }, files).complete, false);
  for (const item of dossierDocuments) assert.ok(DOCUMENT_TYPES.has(item.key));
});
test('configuration rejects malformed input and validates the single buyer type', () => {
  assert.deepEqual(dossierInput(natural()), natural());
  for (const input of [null, [], { ...natural(), compradorTipo: '' }, { ...natural(), renta: 'no' }, { ...natural(), cargas: 'si' }, { ...natural(), vendedorBusquedaNota: 'a'.repeat(2001) }]) assert.throws(() => dossierInput(input));
});

test('rental has exactly five groups and both parties without sale taxes or person conditions', () => {
  const status = dossierStatus(dossierDefaults(), [], 'alquiler');
  assert.deepEqual(status.sections.map(item => item.key), ['identificacion', 'inmueble', 'contratos', 'servicios', 'tasaciones']);
  assert.deepEqual(status.alerts, []);
  for (const key of ['ARRENDADOR_DNI', 'ARRENDADOR_PODER', 'ARRENDATARIO_DNI', 'ARRENDATARIO_PODER', 'COPIA_LITERAL_CRI', 'CONTRATO_ALQUILER', 'RECIBO_SERVICIO', 'PAGO_SERVICIO', 'TASACION_EXPRESS']) {
    assert.equal(status.items.find(item => item.key === key).state, 'pendiente', key);
  }
  assert.ok(!status.items.some(item => item.key.includes('ALCABALA') || item.key === 'HR_VENTA' || item.key.includes('RENTA')));
  const files = status.items.filter(item => item.required).map(item => file(item.key));
  assert.equal(dossierStatus(dossierDefaults(), files, 'alquiler').complete, true);
  assert.equal(dossierStatus(dossierDefaults(), files, 'alquiler').percent, 100);
  assert.equal(dossierStatus(dossierDefaults(), files.filter(item => item.tipoDocumento !== 'ARRENDATARIO_PODER'), 'alquiler').complete, false);
});
test('rental recognizes old party files without rewriting and keeps named contracts independently', () => {
  const files = ['VENDEDOR_DNI', 'COMPRADOR_DNI_GERENTE', 'VENDEDOR_PODER', 'COMPRADOR_PODER', 'COPIA_LITERAL', 'CONTRATO', 'CONTRATO_ALQUILER', 'VENDEDOR_RECIBO_AGUA', 'TASACION'].map(file);
  files[5].nombre = 'Contrato inicial'; files[6].nombre = 'Adenda de renovación';
  const status = dossierStatus({}, files, 'alquiler');
  for (const key of ['ARRENDADOR_DNI', 'ARRENDATARIO_DNI', 'ARRENDADOR_PODER', 'ARRENDATARIO_PODER', 'COPIA_LITERAL_CRI', 'RECIBO_SERVICIO', 'TASACION_EXPRESS']) assert.equal(status.items.find(item => item.key === key).state, 'completo', key);
  assert.deepEqual(status.items.find(item => item.key === 'CONTRATO_ALQUILER').documents.map(item => item.nombre), ['Contrato inicial', 'Adenda de renovación']);
  assert.equal(files[0].tipoDocumento, 'VENDEDOR_DNI');
});
test('file categories are restricted by operation for upload and reclassification', () => {
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'ARRENDADOR_DNI'), natural(), 'venta'), false);
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'VENDEDOR_FORMULARIO_RENTA'), natural(), 'alquiler'), false);
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'ARRENDATARIO_PODER'), dossierDefaults(), 'alquiler'), true);
});
