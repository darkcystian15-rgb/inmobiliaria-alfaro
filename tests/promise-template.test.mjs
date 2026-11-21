import test from 'node:test';
import assert from 'node:assert/strict';
import { promiseBase } from '../lib/promise-template.ts';
import { applyMinuteBase } from '../lib/minute-template.ts';
import { emptyMinute, minuteInput } from '../lib/minute-document.ts';
import { documentEditorConfig, documentEditorKind, documentEditorForCategory } from '../lib/document-editor.ts';

const property = { operation: 'venta', type: 'Departamento', address: 'Dirección sintética' };
test('estructura de promesa incorpora el modelo de info1 con formato y campos neutros', () => {
  const base = promiseBase(property, 'promise-structure');
  const data = minuteInput(applyMinuteBase(emptyMinute(), property, 'replace', 'promise-structure'));
  assert.equal(data.text, base.text);
  assert.equal(data.layout, 'word-model');
  assert.equal(data.paragraphs.length, 78);
  assert.ok(data.formats.some(mark => mark.bold));
  assert.ok(data.formats.some(mark => mark.underline));
  for (const heading of ['Vendedores', 'Compradores', 'A LA FIRMA DE LA PROMESA', 'A LA FIRMA DE LA MINUTA', 'A LA FIRMA DE LA ESCRITURA', 'OBSERVACIONES']) assert.ok(data.text.includes(heading), heading);
  assert.doesNotMatch(data.text, /Lali|Pinedo|Rodriguez|Scotiabank|BCP|90,000|100,000|529,250|210,000|719,250|3\.425|2026|NINGUNO|100%/i);
  base.formats[0].bold = !base.formats[0].bold;
  assert.deepEqual(promiseBase(property, 'promise-structure').formats, data.formats);
  assert.throws(() => documentEditorKind('promise-contract'));
});
test('incorporar promesa no sobrescribe documentos guardados ni encabezado y título propios', () => {
  const before = { ...emptyMinute(), title: 'Título propio', header: 'Encabezado propio', text: 'Texto existente', formats: [{ start: 0, end: 5, bold: true }] };
  const original = structuredClone(before);
  const appended = minuteInput(applyMinuteBase(before, property, 'append', 'promise-structure'));
  assert.ok(appended.text.startsWith('Texto existente\n\n'));
  assert.ok(appended.paragraphs.some(mark => mark.start === before.text.length + 2));
  const replaced = minuteInput(applyMinuteBase(before, property, 'replace', 'promise-structure'));
  assert.ok(!replaced.text.includes('Texto existente'));
  assert.equal(replaced.title, before.title);
  assert.equal(replaced.header, before.header);
  assert.deepEqual(before, original);
});
test('configuraciones de cada apartado y operación válidas', () => {
  assert.throws(() => documentEditorKind('otro'));
  assert.throws(() => promiseBase({ operation: 'alquiler' }, 'promise-contract'));
  assert.equal(documentEditorForCategory('PROMESA_ARRAS', 'venta'), null);
  assert.equal(documentEditorForCategory('PROMESA_ARRAS', 'alquiler'), null);
  assert.equal(documentEditorForCategory('ESTRUCTURA_PROMESA_VENTA', 'venta'), 'promise-structure');
  assert.equal(documentEditorForCategory('ESTRUCTURA_MINUTA', 'venta'), 'minute');
  assert.equal(documentEditorForCategory('ESTRUCTURA_CONTRATO_ALQUILER', 'alquiler'), 'minute');
});
