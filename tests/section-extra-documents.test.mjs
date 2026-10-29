import test from 'node:test';
import assert from 'node:assert/strict';
import { dossierDefaults, dossierStatus, dossierClosureStatus, documentsForOperation, sectionsForOperation, documentApplies, isSectionExtraDocument, validateExtraDocumentDescription } from '../lib/transaction-dossier.mjs';
import { DOCUMENT_TYPES, documentPath } from '../lib/document-files.mjs';
import { filesByInformationFolder } from '../lib/property-folders.mjs';
import { fileActivitySnapshot } from '../lib/file-activity.mjs';

const config = operation => operation === 'alquiler'
  ? { ...dossierDefaults(), arrendadorTipo: 'natural', arrendatarioTipo: 'juridica', arrendadorRepresentante: 'no' }
  : { ...dossierDefaults(), vendedorTipo: 'juridica', compradorAsignado: true, compradorTipo: 'natural', compradorBusquedaNota: 'En trámite', renta: 'exonerado', cargas: false };

for (const operation of ['venta', 'alquiler']) {
  test(`${operation}: each numbered folder has independent optional uploads, including unconfigured parties and charges`, () => {
    const extras = documentsForOperation(operation).filter(item => isSectionExtraDocument(item.key));
    assert.deepEqual(extras.map(item => item.section), sectionsForOperation(operation).map(([key]) => key));
    const defaultStatus = dossierStatus(dossierDefaults(), [], operation);
    for (const item of extras) {
      assert.equal(item.required, false);
      assert.equal(documentApplies(item, dossierDefaults(), operation), true);
      assert.equal(defaultStatus.items.find(row => row.key === item.key).state, 'opcional');
      assert.ok(DOCUMENT_TYPES.has(item.key));
      assert.match(documentPath({ position: 1, propertyId: 1, propertyCode: 'INM-001', type: item.key, name: 'especial.pdf', uniqueId: 'test' }), /\/otros-[a-z]+\/test-especial.pdf$/);
    }
    const files = extras.flatMap((item, index) => [1, 2].map(number => ({ id: index * 2 + number, tipoDocumento: item.key, almacenamiento: 'hosting', nombre: `${item.section} ${number}`, observacion: `Descripción ${index} ${number}` })));
    const original = structuredClone(files);
    const status = dossierStatus(dossierDefaults(), files, operation);
    const groups = filesByInformationFolder(files, status, operation);
    for (const item of extras) {
      assert.deepEqual(groups[item.section], files.filter(file => file.tipoDocumento === item.key));
      const snapshot = fileActivitySnapshot(groups[item.section][0], operation);
      assert.equal(snapshot.categoria, 'Otros documentos');
      assert.equal(snapshot.observacion, groups[item.section][0].observacion);
      assert.notEqual(snapshot.seccion, 'Inmueble');
    }
    assert.equal(groups.otros.length, 0);
    assert.equal(Object.values(groups).flat().length, files.length);
    assert.deepEqual(files, original);
    if (operation === 'alquiler') for (const key of ['OTROS_CARGAS', 'OTROS_IMPUESTOS']) {
      assert.equal(extras.some(item => item.key === key), false);
      const previous = { tipoDocumento: key, almacenamiento: 'hosting' };
      assert.deepEqual(filesByInformationFolder([previous], status, operation).otros, [previous]);
    }
  });

  test(`${operation}: extras neither complete missing requirements nor block an otherwise complete closing`, () => {
    const configuration = config(operation);
    const empty = dossierStatus(configuration, [], operation);
    const extras = empty.items.filter(item => isSectionExtraDocument(item.key)).map(item => ({ tipoDocumento: item.key, almacenamiento: 'hosting', observacion: 'Documento especial' }));
    const withExtras = dossierStatus(configuration, extras, operation);
    for (const field of ['completed', 'total', 'percent', 'complete']) assert.equal(withExtras[field], empty[field]);
    assert.deepEqual(withExtras.sections, empty.sections);
    assert.deepEqual(dossierClosureStatus(configuration, extras, operation), dossierClosureStatus(configuration, [], operation));
    const required = empty.items.filter(item => item.applies && item.required).map(item => ({ tipoDocumento: item.key, almacenamiento: 'hosting' }));
    assert.equal(dossierClosureStatus(configuration, required, operation).complete, true);
    assert.deepEqual(dossierClosureStatus(configuration, [...required, ...extras], operation), dossierClosureStatus(configuration, required, operation));
  });
}

test('special documents require a short description when uploaded or reclassified; ordinary files keep optional observations', () => {
  for (const description of ['', '   ', null, undefined, 'a'.repeat(501)]) assert.throws(() => validateExtraDocumentDescription('OTROS_CONTRATOS', description), /descripción/);
  for (const description of ['Adenda especial del contrato', 'a'.repeat(500)]) assert.doesNotThrow(() => validateExtraDocumentDescription('OTROS_CONTRATOS', description));
  assert.doesNotThrow(() => validateExtraDocumentDescription('CONTRATO_ALQUILER', ''));
  assert.equal(isSectionExtraDocument('OTRO'), false);
  assert.equal(isSectionExtraDocument('OTROS_INVALIDO'), false);
});
