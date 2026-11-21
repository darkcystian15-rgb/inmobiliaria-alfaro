import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { promiseBase } from '../lib/promise-template.ts';
import { minutePdf } from '../lib/minute-export.ts';
import { emptyMinute, minuteInput } from '../lib/minute-document.ts';

test('contrato: nueve cláusulas, firmas y comprobantes alineados en filas de dos y tres', async () => {
  const base = promiseBase({ operation: 'venta' }, 'promise-contract');
  const marker = 'COMPROBANTES DEL PAGO A LA PROMESA: [Incorporar aquí las imágenes correspondientes a esta operación].';
  const after = base.text.indexOf(marker) + marker.length;
  const bytes = new Uint8Array(await sharp({ create: { width: 220, height: 160, channels: 3, background: '#bfe0ed' } }).png().toBuffer());
  await fs.mkdir('output/promesa-editor', { recursive: true });
  for (const columns of [2, 3]) {
    const data = minuteInput({ ...emptyMinute(), ...base, imageColumns: columns, watermark: { enabled: true, width: 120, opacity: 0.08 }, images: Array.from({ length: 8 }, (_, i) => ({ fileId: i + 1, after, width: 160, align: 'center', caption: `RECIBO ${i + 1}` })) });
    const images = Object.fromEntries(data.images.map(image => [image.fileId, bytes]));
    const result = await minutePdf(data, { kind: 'promise-contract', images });
    await fs.writeFile(`output/promesa-editor/contrato-${columns}-columnas.pdf`, result);
    const pdf = await getDocument({ data: new Uint8Array(result) }).promise;
    const text = [], captions = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber), content = await page.getTextContent(), ops = await page.getOperatorList();
      assert.ok(ops.fnArray.filter(op => op === OPS.paintImageXObject).length >= 2, 'Logo y marca de agua en cada página');
      for (const item of content.items) {
        text.push(item.str || '');
        if (/^RECIBO \d$/.test(item.str || '')) {
          captions.push({ label: item.str, pageNumber, x: item.transform[4], y: item.transform[5] });
          assert.ok(item.transform[5] > 70);
        }
      }
    }
    assert.equal(captions.length, 8);
    for (let i = 0; i < columns; i++) { assert.equal(captions[i].pageNumber, captions[0].pageNumber); assert.ok(Math.abs(captions[i].y - captions[0].y) < 0.1); if (i) assert.ok(captions[i].x > captions[i - 1].x + 100); }
    const allText = text.join(' ');
    for (const section of ['PRIMERO.', 'SEGUNDO.', 'TERCERO.', 'CUARTO.', 'QUINTO.', 'SEXTO.', 'SÉPTIMO.', 'OCTAVO.', 'NOVENO.', 'FIRMAS']) assert.ok(allText.includes(section), section);
    assert.ok(!/\d\. FIRMAS/.test(allText));
    assert.ok(allText.indexOf('RECIBO 1') < allText.indexOf('3.2. PAGO'));
    await pdf.destroy();
  }
  assert.throws(() => minuteInput({ ...emptyMinute(), imageColumns: 4 }));
});

test('alto y ancho: proporción natural opcional y dimensiones conservadas', async () => {
  const png = new Uint8Array(await sharp({ create: { width: 200, height: 100, channels: 3, background: '#bfe0ed' } }).png().toBuffer());
  for (const keepRatio of [false, true]) {
    const data = minuteInput({ ...emptyMinute(), text: 'Documento con dimensiones.', images: [{ fileId: 1, after: 0, width: 70, height: 40, keepRatio, align: 'left', caption: '' }] });
    assert.equal(minuteInput(JSON.parse(JSON.stringify(data))).images[0].height, 40);
    const pdf = await getDocument({ data: await minutePdf(data, { images: { 1: png } }) }).promise;
    const operators = await (await pdf.getPage(1)).getOperatorList();
    const mm = 72 / 25.4, expectedHeight = keepRatio ? 35 : 40;
    assert.ok(operators.fnArray.some((op, i) => op === OPS.transform && Math.abs(operators.argsArray[i][0] - 70 * mm) < 0.1 && Math.abs(operators.argsArray[i][3] - expectedHeight * mm) < 0.1));
    await pdf.destroy();
  }
  for (const patch of [{ height: 0 }, { height: 241 }, { height: null }, { keepRatio: 'no' }]) assert.throws(() => minuteInput({ ...emptyMinute(), images: [{ fileId: 1, after: 0, width: 70, align: 'center', caption: '', ...patch }] }));
});
