import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { emptyMinute, minuteInput, updateMinuteText } from '../lib/minute-document.ts';
import { formatMinuteRange, minuteRuns } from '../lib/minute-format.mjs';
import { minutePdf } from '../lib/minute-export.ts';

test('combina negrita, tamaño y resaltado sin cambiar el contenido', () => {
  const original = { ...emptyMinute(), text: 'Precio total confirmado.', highlights: [{ start: 0, end: 12, style: 'highlight' }] };
  let data = formatMinuteRange(original, 0, 12, { bold: true });
  data = formatMinuteRange(data, 7, 12, { size: 18 });
  assert.equal(data.text, original.text); assert.deepEqual(data.highlights, original.highlights);
  assert.deepEqual(minuteRuns(data, 7, 12).map(run => [run.bold, run.size, run.background]), [[true, 18, 'highlight']]);
  const cleared = formatMinuteRange(data, 7, 12, null);
  assert.deepEqual(cleared.formats, [{ start: 0, end: 7, bold: true }]);
  assert.equal(minuteInput(data).formats[1].size, 18);
  assert.equal(original.formats, undefined);
});

test('validación de formato y compatibilidad con borradores anteriores', () => {
  const original = { ...emptyMinute(), text: 'Documento de prueba.' };
  assert.equal(minuteInput(original).formats, undefined);
  for (const formats of [
    [{ start: 0, end: 6, size: 99 }], [{ start: 0, end: 6, size: '18' }],
    [{ start: 0, end: 6, bold: 'true' }], [{ start: 0, end: 99, bold: true }],
    [{ start: 0, end: 8, bold: true }, { start: 4, end: 9, size: 18 }],
    [{ start: 0, end: 6 }],
  ]) assert.throws(() => minuteInput({ ...original, formats }));
  const data = formatMinuteRange(original, 0, 9, { bold: true, size: 16 });
  assert.deepEqual(updateMinuteText(data, 'Nuevo: Documento de prueba.').formats, [{ start: 7, end: 16, bold: true, size: 16 }]);
  assert.deepEqual(updateMinuteText(data, 'Contenido de prueba.').formats, []);
});

test('PDF conserva fuentes, tamaños, resaltados y paginación de fragmentos grandes', async () => {
  const text = 'Normal NEGRITA GRANDE\n\n' + ('Contenido amplio con formato y palabras para comprobar la distribución del documento. '.repeat(65));
  let data = { ...emptyMinute(), title: 'Formato de texto de prueba', text, footerReference: 'Referencia de prueba' };
  data = formatMinuteRange(data, 7, 14, { bold: true });
  data = formatMinuteRange(data, 15, 21, { size: 24, bold: true });
  data = formatMinuteRange(data, 23, text.length, { size: 20 });
  data.highlights = [{ start: 7, end: 21, style: 'highlight' }, { start: 23, end: 180, style: 'shade' }];
  const bytes = await minutePdf(minuteInput(data));
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  assert.ok(pdf.numPages > 1);
  let firstItems, firstFonts;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n), { items } = await page.getTextContent();
    if (n === 1) {
      firstItems = items;
      const operators = await page.getOperatorList();
      firstFonts = operators.fnArray.flatMap((op, i) => op === OPS.setFont ? [operators.argsArray[i]] : []);
    }
    for (const item of items.filter(item => item.str?.trim())) {
      assert.ok(item.transform[4] >= 24 * 72 / 25.4 - 1, 'El texto queda dentro del margen izquierdo');
      assert.ok(item.transform[4] + item.width <= 186 * 72 / 25.4 + 1, 'El texto queda dentro del margen derecho');
      if (Math.abs(item.transform[0] - 20) < 0.1) assert.ok(item.transform[5] > 80, 'El cuerpo grande no invade el pie');
    }
  }
  const large = firstItems.find(item => item.str?.includes('GRANDE'));
  // PDF text extraction can merge adjacent regular/bold words sharing metrics.
  // The actual drawing operators must switch between the two embedded fonts.
  assert.equal(new Set(firstFonts.filter(([, size]) => size === 11.5).map(([name]) => name)).size, 2);
  assert.equal(Math.round(large.transform[0]), 24);
  await pdf.destroy(); await fs.mkdir('output/minuta-texto', { recursive: true });
  await fs.writeFile('output/minuta-texto/negrita-tamanos.pdf', bytes);
});
