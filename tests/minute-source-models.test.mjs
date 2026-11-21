import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { applyMinuteBase } from '../lib/minute-template.ts';
import { emptyMinute, minuteInput, updateMinuteText } from '../lib/minute-document.ts';
import { minuteRuns, formatMinuteRange } from '../lib/minute-format.mjs';
import { minuteDocx } from '../lib/minute-docx.ts';
import { minutePdf } from '../lib/minute-export.ts';
const correction = text => {
  for (const [a,b] of [['P.Jurírida','persona jurídica'],['Atrazo','atraso'],['Autoavaluo','autoavalúo'],['AUTOAVALUO','AUTOAVALÚO'],['Compra venta','compraventa'],['Compra Venta','compraventa'],['COMPRA VENTA','COMPRAVENTA'],['NUMERO','NÚMERO'],['PERSONA JURÍDICA :   :','PERSONA JURÍDICA :'],['PARTIDA DE SEPARACIÓN PATRIMONIAL','PARTIDA DE SEPARACIÓN DE PATRIMONIOS']]) text = text.replaceAll(a,b);
  return text.replace('Se deja constancia, que la MINUTA de la Escritura Pública  deberá celebrarse ante cualquier Notaría a más tardar en el día XXXXX','Se deja constancia de que la escritura pública deberá celebrarse ante notaría a más tardar el día XXXXX.');
};
for (const operation of ['venta','alquiler']) test(`Word original → modelo → guardado → Word/PDF: ${operation}`, async () => {
  const filename = operation === 'venta' ? 'ESTRUCTURA  MINUTA DE CV.docx' : 'ESTRUCTURA  CONTRATO ALQUILER.docx';
  const source = await JSZip.loadAsync(await fs.readFile(`tests/info1/${filename}`));
  const xml = await source.file('word/document.xml').async('string');
  const original = [...xml.matchAll(/<w:p(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/w:p>)/g)].map(match => [...match[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(part => part[1]).join(''));
  const data = minuteInput(applyMinuteBase(emptyMinute(operation), {operation}, 'replace'));
  const actual = data.text.split('\n').map(line => line.replace(/^(?:● |[a-z]\) )/, '').replaceAll('\t',''));
  const expected = original.slice(1).filter(line => line.trim() !== 'La Escritura Pública será firmada cuando XXXXXXXXXXXXXXXXXX.').map(correction);
  assert.deepEqual(actual, expected, 'Todos los párrafos, espacios y campos del Word deben conservarse');
  assert.equal(data.paragraphs.length, expected.length);
  const heading = operation === 'venta' ? 'DATOS VENDEDORES' : 'DATOS ARRENDADORES';
  const from = data.text.indexOf(heading);
  assert.ok(minuteRuns(data, from, from + heading.length).every(run => run.bold && run.underline && run.size === 11));
  const observations = data.text.indexOf('OBSERVACIONES');
  assert.ok(minuteRuns(data, observations, observations + 13).every(run => run.bold && run.size === (operation === 'venta' ? 16 : 14)));
  assert.ok(data.text.includes('● ')); assert.ok(data.text.includes('a) ')); assert.ok(data.text.includes('\t'));
  assert.ok(data.paragraphs.some(p => p.firstLine < 0));
  const toggled = formatMinuteRange(data, from, from + heading.length, {underline:false});
  assert.ok(minuteInput(toggled).formats.some(p => p.underline === false));
  const edited = minuteInput(updateMinuteText(data, 'Texto añadido\n' + data.text));
  assert.ok(edited.paragraphs.some(p => p.start === data.paragraphs[1].start + 14));
  assert.ok(edited.formats.some(mark => mark.underline));
  const bytes = await minuteDocx(data, 'PRUEBA', {});
  const doc = await JSZip.loadAsync(bytes);
  const exported = await doc.file('word/document.xml').async('string');
  assert.ok(exported.includes('<w:u w:val="single"/>'));
  assert.ok(exported.includes('w:hanging="360"'));
  assert.ok(exported.includes(`w:sz w:val="${operation === 'venta' ? 32 : 28}"`));
  assert.ok((await doc.file('word/styles.xml').async('string')).includes('w:ascii="Calibri"'));
  const pdfBytes = await minutePdf(data);
  const {getDocument} = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({data:new Uint8Array(pdfBytes),useSystemFonts:false}).promise;
  let text='', observedSize=0;
  for (let n=1;n<=pdf.numPages;n++) {
    const content=await (await pdf.getPage(n)).getTextContent();
    text+=content.items.map(item=>item.str||'').join(' ');
    const item=content.items.find(item=>item.str?.includes('OBSERVACIONES'));
    if (item) observedSize=Math.abs(item.transform[0]);
  }
  assert.ok(text.includes('OBSERVACIONES')); assert.ok(text.includes('PERSONA NATURAL'));
  assert.equal(observedSize,operation==='venta'?16:14);
  // La familia del PDF identifica la variante compatible con Calibri.
  assert.ok(Buffer.from(pdfBytes).toString('latin1').includes('MinuteCalibri'));
  await fs.mkdir('output/minuta-formatos',{recursive:true});
  await fs.writeFile(`output/minuta-formatos/${operation}.pdf`,pdfBytes);
  await fs.writeFile(`output/minuta-formatos/${operation}.docx`,bytes);
  // Comprobar también la representación de glifos compuestos, no solo extraer texto.
  const {createCanvas} = await import('@napi-rs/canvas');
  const warnings = [], log = console.log;
  console.log = (...args) => { if (String(args[0]).startsWith('Warning:')) warnings.push(args.join(' ')); else log(...args); };
  try {
    for (const n of [1, pdf.numPages]) {
      const page = await pdf.getPage(n), viewport = page.getViewport({scale:1.25});
      const canvas = createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      await fs.writeFile(`output/minuta-formatos/${operation}-pagina-${n}.png`,canvas.toBuffer('image/png'));
    }
  } finally { console.log = log; }
  assert.deepEqual(warnings, [], 'El PDF no debe perder glifos al representarse');
  await pdf.destroy();
});
test('rechaza subrayados y párrafos inválidos sin cambiar borradores anteriores',()=>{
  const data={...emptyMinute(),text:'Uno\nDos'};
  assert.throws(()=>minuteInput({...data,formats:[{start:0,end:3,underline:'sí'}]}));
  assert.throws(()=>minuteInput({...data,layout:'otro'}));
  const p={start:0,end:3,align:'left',indent:0,firstLine:0,before:0,after:8,line:1.08};
  for (const patch of [{start:1},{end:2},{indent:Infinity},{line:0},{align:'invalid'}]) assert.throws(()=>minuteInput({...data,paragraphs:[{...p,...patch}]}));
  assert.equal(minuteInput(data).layout,undefined);
});
