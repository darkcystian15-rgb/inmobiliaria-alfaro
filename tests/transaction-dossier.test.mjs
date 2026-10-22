import test from 'node:test';
import assert from 'node:assert/strict';
import { dossierDefaults, dossierInput, dossierDocuments, dossierStatus, documentApplies } from '../lib/transaction-dossier.mjs';
import { DOCUMENT_TYPES } from '../lib/document-files.mjs';

const natural = () => ({ ...dossierDefaults(), vendedorTipo: 'natural', compradorAsignado: true, compradorTipo: 'natural', renta: 'afecto', rentaObservacion: 'Sustento de prueba del pago de renta.' });
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

test('municipal voucher preserves existing uploads and adds a separate no-debt certificate', () => {
  const status = dossierStatus(natural(), [file('VENDEDOR_PAGO_MUNICIPAL')]);
  const voucher = status.items.find(item => item.key === 'VENDEDOR_PAGO_MUNICIPAL');
  assert.equal(voucher.label, 'Voucher de Pago de Impuestos Municipales, autovalúo y arbitrios');
  assert.equal(voucher.state, 'completo');
  const certificate = status.items.find(item => item.key === 'VENDEDOR_CONSTANCIA_NO_ADEUDO_MUNICIPAL');
  assert.equal(certificate.section, 'impuestos');
  assert.equal(certificate.party, 'vendedor');
  assert.equal(certificate.state, 'pendiente');
  assert.ok(DOCUMENT_TYPES.has(certificate.key));
  assert.equal(dossierStatus(natural(), [file(certificate.key)]).items.find(item => item.key === certificate.key).state, 'completo');
});
test('assigning the buyer in identification activates taxes for both person types and preserves files when unassigned', () => {
  for (const compradorTipo of ['natural', 'juridica']) {
    const assigned = dossierInput({ ...natural(), compradorTipo });
    const status = dossierStatus(assigned);
    assert.deepEqual(status.items.filter(item => item.party === 'comprador' && item.applies).map(item => item.section).filter((value, index, all) => all.indexOf(value) === index), ['identificacion', 'impuestos']);
    for (const key of ['COMPRADOR_LIQUIDACION', 'COMPRADOR_FORMULARIO_ALCABALA', 'COMPRADOR_ALCABALA']) {
      assert.equal(status.items.find(item => item.key === key).state, 'pendiente');
      const saved = [file(key)];
      const inactive = dossierStatus({ ...assigned, compradorAsignado: false }, saved).items.find(item => item.key === key);
      assert.equal(inactive.applies, false);
      assert.equal(inactive.documents.length, 1);
      assert.equal(dossierStatus(assigned, saved).items.find(item => item.key === key).state, 'completo');
    }
  }
});

test('buyer assignment preserves shared documents and seller requirements across all seven folders', () => {
  const before = dossierStatus({ ...natural(), compradorAsignado: false });
  const after = dossierStatus(natural());
  assert.equal(after.sections.length, 7);
  for (const item of before.items.filter(item => item.party !== 'comprador')) {
    assert.deepEqual(after.items.find(next => next.key === item.key), item);
  }
  for (const key of ['PROMESA_ARRAS', 'MINUTA_COMPRAVENTA', 'ESCRITURA_PUBLICA']) {
    const item = after.items.find(item => item.key === key);
    assert.equal(item.party, 'inmueble');
    assert.equal(item.applies, true);
    assert.equal(dossierStatus(natural(), [file(key)]).items.find(item => item.key === key).state, 'completo');
  }
});

test('buyer liquidation, payment receipt and cancellation form are independent upload categories', () => {
  const config = natural();
  const keys = ['COMPRADOR_LIQUIDACION', 'COMPRADOR_ALCABALA', 'COMPRADOR_FORMULARIO_ALCABALA'];
  const status = dossierStatus(config, [file('COMPRADOR_ALCABALA')]);
  for (const key of keys) {
    const item = status.items.find(item => item.key === key);
    assert.equal(item.section, 'impuestos');
    assert.equal(item.party, 'comprador');
    assert.ok(DOCUMENT_TYPES.has(key));
    assert.equal(item.state, key === 'COMPRADOR_ALCABALA' ? 'completo' : 'pendiente');
  }
  const completed = dossierStatus(config, keys.map(file));
  assert.ok(completed.items.filter(item => keys.includes(item.key)).every(item => item.state === 'completo'));
});

test('no payment requires the uploaded national search in taxes for natural and legal sellers, never a note or external link', () => {
  for (const vendedorTipo of ['natural', 'juridica']) {
    const config = { ...natural(), vendedorTipo, renta: 'exonerado', vendedorBusquedaNota: 'Una nota anterior' };
    const find = files => dossierStatus(config, files).items.find(item => item.key === 'VENDEDOR_BUSQUEDA_NACIONAL');
    assert.equal(find([]).section, 'impuestos');
    assert.equal(find([]).state, 'pendiente');
    assert.equal(find([{tipoDocumento: 'VENDEDOR_BUSQUEDA_NACIONAL', almacenamiento: 'enlace'}]).state, 'pendiente');
    assert.equal(find([file('VENDEDOR_BUSQUEDA_NACIONAL')]).state, 'completo');
    assert.equal(find([file('VENDEDOR_BUSQUEDA_NACIONAL')]).documents.length, 1);
    for (const key of ['VENDEDOR_FORMULARIO_RENTA','VENDEDOR_VOUCHER_RENTA']) assert.equal(dossierStatus(config).items.find(item => item.key === key).applies, false);
  }
});
test('payment requires a nonempty explanation validated by server and reflected in old dossier alerts', () => {
  for (const rentaObservacion of ['', '   ', 7, 'a'.repeat(2001)]) assert.throws(() => dossierInput({...natural(), rentaObservacion}));
  assert.equal(dossierInput({...natural(), rentaObservacion:'  Motivo registrado  '}).rentaObservacion, 'Motivo registrado');
  const old = {...natural()}; delete old.rentaObservacion;
  assert.ok(dossierStatus(old).alerts.some(text=>text.includes('observación')));
  assert.equal(dossierStatus(old).complete,false);
  assert.equal(dossierInput({...old,renta:'exonerado'}).rentaObservacion,'');
});
test('changing rent decision keeps the same national search and previous payment files without rewriting', () => {
  const files = [file('VENDEDOR_BUSQUEDA_NACIONAL'),file('VENDEDOR_VOUCHER_RENTA')];
  const copy = structuredClone(files);
  const noPay = dossierStatus({...natural(),renta:'exonerado'}, files);
  const pay = dossierStatus(natural(),files);
  assert.equal(noPay.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL').section,'impuestos');
  assert.equal(pay.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL').section,'identificacion');
  assert.equal(pay.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL').state,'completo');
  assert.equal(noPay.items.find(item=>item.key==='VENDEDOR_VOUCHER_RENTA').documents.length,1);
  assert.deepEqual(files,copy);
});

test('tax catalog follows the seven seller and three buyer items and removes standalone Alcabala', () => {
  const status = dossierStatus(natural());
  assert.deepEqual(status.items.filter(item=>item.section==='impuestos' && item.party==='vendedor').map(item=>item.key), ['VENDEDOR_LIQUIDACION','VENDEDOR_FORMULARIO_RENTA','VENDEDOR_VOUCHER_RENTA','VENDEDOR_EXONERACION_RENTA','VENDEDOR_LIQUIDACION_MUNICIPAL','VENDEDOR_PAGO_MUNICIPAL','VENDEDOR_CONSTANCIA_NO_ADEUDO_MUNICIPAL']);
  assert.deepEqual(status.items.filter(item=>item.section==='impuestos' && item.party==='comprador').map(item=>item.label), ['Liquidación de alcabala','Voucher de pago de alcabala','Formulario de cancelación de alcabala']);
  assert.ok(!status.items.some(item=>item.key==='COMPRADOR_ALCABALA_DOCUMENTO'));
  assert.equal(DOCUMENT_TYPES.has('COMPRADOR_ALCABALA_DOCUMENTO'),false);
  assert.equal(status.items.find(item=>item.key==='VENDEDOR_EXONERACION_RENTA').applies,false);
});
test('no payment needs separate exemption and national-search uploads; neither completes the other', () => {
  const config = {...natural(),renta:'exonerado'};
  const find = (files,key) => dossierStatus(config,files).items.find(item=>item.key===key);
  const exemption = 'VENDEDOR_EXONERACION_RENTA', search = 'VENDEDOR_BUSQUEDA_NACIONAL';
  assert.equal(find([file(search)],exemption).state,'pendiente');
  assert.equal(find([file(exemption)],search).state,'pendiente');
  assert.equal(find([file(search),file(exemption)],search).state,'completo');
  assert.equal(find([file(search),file(exemption)],exemption).state,'completo');
  assert.ok(DOCUMENT_TYPES.has(exemption));
  assert.equal(documentApplies(dossierDocuments.find(item=>item.key===exemption),natural()),false);
});
