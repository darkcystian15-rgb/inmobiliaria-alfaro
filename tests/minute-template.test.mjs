import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { emptyMinute, minuteInput } from '../lib/minute-document.ts';
import { minuteBase, applyMinuteBase, minuteCategory } from '../lib/minute-template.ts';
import { minutePdf } from '../lib/minute-export.ts';

test('modelos de info1 conservan los campos propios de venta y alquiler', () => {
  const sale = minuteBase({ operation: 'venta' });
  const rental = minuteBase({ operation: 'alquiler' });
  for (const base of [sale, rental]) {
    for (const field of ['PERSONA NATURAL', 'PERSONA JURÍDICA', 'RUC', 'DNI', 'Fecha de Caducidad', 'OBSERVACIONES', 'autoavalúo']) assert.ok(base.text.includes(field), field);
    assert.ok(!/Jurírida|Atrazo|Autoavaluo/.test(base.text));
    assert.ok(base.text.length < 20000);
  }
  for (const field of ['DATOS VENDEDORES', 'DATOS COMPRADORES', 'Valor Arancelario', 'A LA FIRMA DE LA MINUTA', 'A LA FIRMA DE LA ESCRITURA', 'TÍTULOS EN TRÁMITE']) assert.ok(sale.text.includes(field), field);
  assert.equal((sale.text.match(/se firmará cuando/g) || []).length, 1);
  for (const field of ['DATOS ARRENDADORES', 'DATOS ARRENDATARIO', 'AÑO 5', 'GARANTÍA', 'CCI', 'Por atraso', 'Internet']) assert.ok(rental.text.includes(field), field);
  assert.ok(!rental.text.includes('MONTO DE LA VENTA'));
});

test('incorporar conserva texto anterior, títulos propios, encabezado, pie y marcas', () => {
  const before = { ...emptyMinute(), title: 'Documento de un caso especial', header: 'Mi encabezado', footer: '', footerReference: 'Mi referencia', footerPagination: '', text: 'Texto previo', highlights: [{ start: 0, end: 5, style: 'shade' }], formats: [{ start: 0, end: 5, bold: true, size: 18 }] };
  const original = structuredClone(before), property = { operation: 'venta', type: 'Casa' };
  const appended = applyMinuteBase(before, property, 'append');
  assert.ok(appended.text.startsWith('Texto previo\n\n')); assert.deepEqual(appended.highlights, before.highlights);
  assert.deepEqual(appended.formats.slice(0, before.formats.length), before.formats);
  assert.ok(appended.formats.some(mark => mark.underline));
  minuteInput(appended);
  const replaced = applyMinuteBase(before, property, 'replace');
  assert.ok(!replaced.text.includes('Texto previo')); assert.deepEqual(replaced.highlights, []);
  assert.ok(replaced.formats.some(mark => mark.underline));
  assert.equal(replaced.layout, 'word-model');
  minuteInput(replaced);
  for (const key of ['title', 'header', 'footer', 'footerReference', 'footerPagination']) assert.equal(replaced[key], before[key]);
  assert.deepEqual(before, original);
  assert.throws(() => applyMinuteBase({ ...before, text: 'x'.repeat(19000) }, property, 'append'), /20 000/);
});

test('ambas estructuras son guardables y generan PDFs reales completos', async () => {
  await fs.mkdir('output/minuta-texto', { recursive: true });
  for (const operation of ['venta', 'alquiler']) {
    const data = minuteInput(applyMinuteBase(emptyMinute(operation), { operation, type: 'Departamento', address: 'Ubicación de prueba' }, 'replace'));
    const bytes = await minutePdf(data, { propertyCode: 'INM-PRUEBA' });
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
    let text = '';
    for (let n = 1; n <= pdf.numPages; n++) text += (await (await pdf.getPage(n)).getTextContent()).items.map(item => item.str || '').join(' ');
    assert.ok(text.includes('OBSERVACIONES')); assert.ok(text.includes('PERSONA NATURAL'));
    assert.equal(minuteCategory(operation), operation === 'venta' ? 'ESTRUCTURA_MINUTA' : 'ESTRUCTURA_CONTRATO_ALQUILER');
    await pdf.destroy(); await fs.writeFile(`output/minuta-texto/estructura-base-${operation}.pdf`, bytes);
  }
});
