import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { applyMinuteBase } from '../lib/minute-template.ts';
import { emptyMinute, minuteInput } from '../lib/minute-document.ts';
import { minuteDocx } from '../lib/minute-docx.ts';
import { minutePdf } from '../lib/minute-export.ts';

test('modelo de promesa conserva apartados y formato del Word y exporta sin datos del ejemplo', async () => {
  const zip = await JSZip.loadAsync(await fs.readFile('tests/info1/ESTRUCTURA  PROMESA DE CV .docx'));
  const xml = await zip.file('word/document.xml').async('string');
  const original = [...xml.matchAll(/<w:p(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/w:p>)/g)].map(match => [...match[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(part => part[1]).join(''));
  const data = minuteInput(applyMinuteBase(emptyMinute(), {operation:'venta'}, 'replace', 'promise-structure'));
  const paragraphs = data.text.split('\n').map(line=>line.replace(/^(?:● |[a-z]\) )/,'').replaceAll('\t',''));
  assert.equal(paragraphs.length, original.length - 1);
  const generalized = new Set([10,17,24,27,28,29,30,31,44,48,52,54,59,69,71,75,76,78]);
  const corrected = text=>text.replaceAll('Autoavaluo','autoavalúo').replaceAll('Compra Venta','compraventa').replace('Se deja constancia, que la MINUTA de la Escritura Pública  deberá celebrarse ante cualquier Notaría a más tardar en el día XXXXX','Se deja constancia de que la escritura pública deberá celebrarse ante notaría a más tardar el día XXXXX.');
  for(let i=1;i<original.length;i++) {
    if(!generalized.has(i)) assert.equal(paragraphs[i-1],corrected(original[i]),`Párrafo ${i}`);
    else assert.match(paragraphs[i-1],/XXX|DIRECCIÓN COMPLETA/,`Campo ${i}`);
  }
  const bytes=await minuteDocx(data,'PRUEBA',{});
  const exported=await JSZip.loadAsync(bytes);const docxml=await exported.file('word/document.xml').async('string');
  assert.match(docxml,/A LA FIRMA DE LA PROMESA DE VENTA/);assert.match(docxml,/<w:b\/>/);assert.match(docxml,/<w:u w:val="single"\/>/);assert.match(await exported.file('word/styles.xml').async('string'),/w:ascii="Calibri"/);
  assert.doesNotMatch(docxml,/Pinedo|Scotiabank|90,000|2026/i);
  const pdfBytes=await minutePdf(data,{kind:'promise-structure'});
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(pdfBytes)}).promise;
  let text='';for(let i=1;i<=pdf.numPages;i++)text+=(await(await pdf.getPage(i)).getTextContent()).items.map(item=>item.str||'').join(' ');
  assert.match(text,/PROMESA DE VENTA/);assert.match(text,/OBSERVACIONES/);assert.doesNotMatch(text,/Pinedo|Scotiabank|90,000|2026/i);
  await fs.mkdir('output/promesa-modelo',{recursive:true});await fs.writeFile('output/promesa-modelo/estructura.docx',bytes);await fs.writeFile('output/promesa-modelo/estructura.pdf',pdfBytes);await pdf.destroy();
});
