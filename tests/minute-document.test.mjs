import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { emptyMinute, minuteInput, updateMinuteText } from '../lib/minute-document.ts';
import { minutePdf } from '../lib/minute-export.ts';
import { extractMinuteWord } from '../lib/minute-word.ts';

export async function wordFixture() {
  const zip = new JSZip();
  const main = 'application/vnd.openxmlformats-officedocument.wordprocessingml.';
  zip.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="${main}document.main+xml"/><Override PartName="/word/header1.xml" ContentType="${main}header+xml"/><Override PartName="/word/footer1.xml" ContentType="${main}footer+xml"/></Types>`);
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Contenido de prueba: compraventa, señor y área.</w:t></w:r></w:p><w:p><w:r><w:t>Precio confirmado por las partes.</w:t></w:r></w:p></w:body></w:document>');
  zip.file('word/header1.xml', '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Encabezado de prueba</w:t></w:r></w:p></w:hdr>');
  zip.file('word/footer1.xml', '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Pie de prueba</w:t></w:r></w:p></w:ftr>');
  return zip.generateAsync({ type: 'nodebuffer' });
}
test('Word existente: extrae cuerpo, encabezado y pie conservando el original', async () => {
  const bytes = await wordFixture(), original = Buffer.from(bytes);
  const result = await extractMinuteWord(bytes);
  assert.match(result.text, /señor y área/); assert.match(result.text, /Precio confirmado/);
  assert.match(result.header, /Encabezado de prueba/); assert.match(result.footer, /Pie de prueba/);
  assert.deepEqual(bytes, original);
  await assert.rejects(() => extractMinuteWord(Buffer.from('No es Word')), /no es un Word/);
});
test('validación de texto y espacio reservado del encabezado y pie', () => {
  const data = emptyMinute(); data.text = 'Texto\r\ncon párrafos';
  assert.equal(minuteInput(data).text, 'Texto\ncon párrafos');
  for (const invalid of [{ title: '' }, { text: 'x'.repeat(20001) }, { header: '1\n2\n3\n4' }, { footer: '\u0000' }]) assert.throws(() => minuteInput({ ...data, ...invalid }));
});
test('PDF real: cuerpo paginado, encabezado y pie repetidos, sin invadir el pie', async () => {
  const data = { ...emptyMinute(), header: 'ENCABEZADO DE PRUEBA', footer: 'PIE DE PRUEBA', text: Array.from({ length: 160 }, (_, i) => `Párrafo ${i + 1}: contenido de prueba con señor y área.`).join('\n') };
  const bytes = await minutePdf(data); assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  assert.ok(pdf.numPages > 1);
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n), { items } = await page.getTextContent();
    assert.ok((await page.getOperatorList()).fnArray.includes(85), 'Cada página debe contener el logo');
    const text = items.map(item => item.str || '').join(' ');
    assert.match(text, /ENCABEZADO DE PRUEBA/); assert.match(text, /PIE DE PRUEBA/); assert.ok(text.includes(`Página ${n} de ${pdf.numPages}`));
    for (const item of items.filter(item => item.str?.startsWith('Párrafo'))) assert.ok(item.transform[5] > 70, 'El cuerpo debe quedar encima del pie');
  }
  await pdf.destroy(); await fs.mkdir('output/minuta-texto', { recursive: true }); await fs.writeFile('output/minuta-texto/muestra.pdf', bytes);
});

test('diseño editorial: secciones con su contenido, código y tipografía incrustada', async () => {
  const sentence = 'Las partes revisarán la identificación del inmueble, el precio y la forma de pago con los documentos del expediente. ';
  const sections = ['PARTES INTERVINIENTES', 'IDENTIFICACIÓN DEL INMUEBLE', 'PRECIO Y FORMA DE PAGO', 'ENTREGA DEL INMUEBLE', 'ACUERDOS ADICIONALES'];
  const data = { ...emptyMinute(), title: 'ESTRUCTURA DE MINUTA DE COMPRAVENTA', text: sections.map((title, i) => `${i + 1}. ${title}\n\nInicio de sección ${i + 1}. ${sentence.repeat(7)}\n\n${sentence.repeat(5)}`).join('\n\n') };
  const bytes = await minutePdf(data, { propertyCode: 'INM-PRUEBA-001' });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n), content = await page.getTextContent();
    const text = content.items.map(item => item.str || '').join(' '); pages.push(text);
    assert.ok(text.includes('Inmueble: INM-PRUEBA-001'));
    assert.ok(Object.values(content.styles).some(style => /Serif/i.test(style.fontFamily)));
    for (let i = 0; i < sections.length; i++) if (text.includes(`${i + 1}. ${sections[i]}`)) assert.ok(text.includes(`Inicio de sección ${i + 1}.`), 'El título debe acompañar a su párrafo');
  }
  for (let i = 0; i < sections.length; i++) assert.ok(pages.some(text => text.includes(`${i + 1}. ${sections[i]}`)));
  await pdf.destroy(); await fs.writeFile('output/minuta-texto/diseno-editorial.pdf', bytes);
});

test('pie completamente editable y resaltados conservados sin modificar el texto', async () => {
  const text = 'Importe confirmado: US$ 120 000. Entrega pendiente de confirmación.';
  const data = minuteInput({ ...emptyMinute(), text, footer: 'Contacto de prueba', footerReference: 'Referencia personalizada', footerPagination: 'Hoja {pagina} / {total}', highlights: [{ start: 19, end: 29, style: 'highlight' }, { start: 31, end: text.length, style: 'shade' }] });
  const bytes = await minutePdf(data, { propertyCode: 'CODIGO-NO-MOSTRAR' });
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await pdf.getPage(1), content = await page.getTextContent(), value = content.items.map(item => item.str || '').join(' ');
  assert.ok(value.includes(text)); assert.ok(value.includes('Referencia personalizada')); assert.ok(value.includes('Hoja 1 / 1'));
  assert.ok(!value.includes('CODIGO-NO-MOSTRAR')); assert.ok(!value.includes('Página 1 de'));
  const operators = await page.getOperatorList();
  assert.ok(operators.fnArray.filter(op => op === OPS.constructPath).length >= 5, 'Incluye los fondos de los resaltados');
  await pdf.destroy(); await fs.writeFile('output/minuta-texto/resaltados-pie-editable.pdf', bytes);
  const blank = await minutePdf({ ...data, footer: '', footerReference: '', footerPagination: '' }, { propertyCode: 'CODIGO-NO-MOSTRAR' });
  const blankPdf = await getDocument({ data: new Uint8Array(blank) }).promise;
  const blankText = (await (await blankPdf.getPage(1)).getTextContent()).items.map(item => item.str || '').join(' ');
  for (const excluded of ['Contacto de prueba', 'Referencia personalizada', 'Hoja 1', 'CODIGO-NO-MOSTRAR', 'Página 1 de']) assert.ok(!blankText.includes(excluded));
  await blankPdf.destroy();
});

test('ediciones desplazan marcas intactas y eliminan las que se reescriben', () => {
  const original = { ...emptyMinute(), text: 'Pago confirmado', highlights: [{ start: 5, end: 15, style: 'highlight' }] };
  const inserted = updateMinuteText(original, 'Hoy: Pago confirmado');
  assert.deepEqual(inserted.highlights, [{ start: 10, end: 20, style: 'highlight' }]);
  assert.deepEqual(updateMinuteText(original, 'Pago pendiente').highlights, []);
  for (const highlights of [[{ start: -1, end: 3, style: 'highlight' }], [{ start: 5, end: 99, style: 'shade' }], [{ start: 1, end: 7, style: 'shade' }, { start: 4, end: 9, style: 'highlight' }]]) assert.throws(() => minuteInput({ ...original, highlights }));
});

test('imágenes: validación, persistencia y desplazamiento al editar texto', () => {
  const image = { fileId: 12, after: 5, width: 100, align: 'center', caption: 'Plano de prueba' };
  const data = minuteInput({ ...emptyMinute(), text: 'Hola.\nSegundo párrafo.', images: [image], watermark: { enabled: false, width: 120, opacity: 0.08 } });
  assert.deepEqual(minuteInput(JSON.parse(JSON.stringify(data))), data);
  assert.equal(updateMinuteText(data, 'Hoy Hola.\nSegundo párrafo.').images[0].after, 9);
  assert.equal(updateMinuteText(data, '').images[0].after, 0);
  for (const patch of [{ fileId: -1 }, { after: 999 }, { width: 999 }, { align: 'float' }, { caption: '\u0000' }]) assert.throws(() => minuteInput({ ...data, images: [{ ...image, ...patch }] }));
  assert.throws(() => minuteInput({ ...data, images: Array(9).fill(image) }));
  assert.throws(() => minuteInput({ ...data, watermark: { enabled: true, width: 120, opacity: 1 } }));
});

test('PDF con imágenes paginadas y marca de agua opcional en cada página', async () => {
  const { default: sharp } = await import('sharp');
  const png = new Uint8Array(await sharp({ create: { width: 200, height: 800, channels: 3, background: '#bfe0ed' } }).png().toBuffer());
  const text = Array.from({ length: 70 }, (_, i) => `Párrafo ${i + 1}: texto de prueba para comprobar la paginación.`).join('\n');
  const data = minuteInput({ ...emptyMinute(), text, images: [{ fileId: 12, after: text.indexOf('\n'), width: 160, align: 'right', caption: 'Imagen alta de prueba' }, { fileId: 12, after: text.length, width: 80, align: 'center', caption: 'Segunda imagen' }] });
  await assert.rejects(() => minutePdf(data), /recuperar una imagen/);
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const enabled of [false, true]) {
    const bytes = await minutePdf({ ...data, watermark: { enabled, width: 120, opacity: 0.08 } }, { images: { 12: png } });
    const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
    assert.ok(pdf.numPages > 1);
    let images = 0; const allText = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n), operators = await page.getOperatorList();
      const imageCount = operators.fnArray.filter(op => op === OPS.paintImageXObject).length;
      images += imageCount; assert.ok(imageCount >= (enabled ? 2 : 1));
      const content = await page.getTextContent();
      allText.push(...content.items.map(item => item.str || ''));
      for (const item of content.items.filter(item => /Imagen alta|Segunda imagen/.test(item.str || ''))) assert.ok(item.transform[5] > 70, 'El pie de imagen queda dentro del cuerpo');
    }
    assert.equal(images, pdf.numPages * (enabled ? 2 : 1) + 2);
    assert.match(allText.join(' '), /Párrafo 70/); assert.match(allText.join(' '), /Imagen alta de prueba/); assert.match(allText.join(' '), /Segunda imagen/);
    await pdf.destroy(); await fs.writeFile(`output/minuta-texto/imagenes-${enabled ? 'con' : 'sin'}-marca.pdf`, bytes);
  }
});
