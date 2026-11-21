import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import { analyzeDocument } from '../lib/document-analysis.mjs';

test('lee Excel XLSX real conservando celda y área del inmueble valuado', async () => {
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet('Hoja1');
  sheet.getCell('C8').value = 'UBICACIÓN'; sheet.getCell('E8').value = 'AREA (M2)';
  sheet.getCell('C19').value = 'INMUEBLE VALUADO'; sheet.getCell('E19').value = 356.5;
  const result = await analyzeDocument(await book.xlsx.writeBuffer(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(result.proposals[0].value, '356.50 m²'); assert.equal(result.proposals[0].cell, 'E19'); assert.equal(result.nextPage, null);
});

test('PDF mixto: lee texto nativo y reconoce una página escaneada con OCR español local', { timeout: 120000 }, async () => {
  const image = createCanvas(1500, 900), context = image.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, 1500, 900); context.fillStyle = '#000'; context.font = '50px sans-serif';
  context.fillText('TERRENO Area: 144 M2', 100, 240);
  const pdf = new jsPDF();
  for (let n = 0; n < 14; n++) pdf.text('Descripcion detallada del inmueble y sus ambientes registrados.', 10, 20 + n * 8);
  pdf.text('Area de terreno: 120 m2', 10, 150);
  pdf.addImage(image.toBuffer('image/png'), 'PNG', 10, 180, 190, 114);
  pdf.addPage(); pdf.addImage(image.toBuffer('image/png'), 'PNG', 10, 10, 190, 114);
  const result = await analyzeDocument(new Uint8Array(pdf.output('arraybuffer')), 'application/pdf');
  assert.equal(result.totalPages, 2); assert.equal(result.pages[0].method, 'native'); assert.equal(result.pages[1].method, 'ocr');
  assert.ok(result.proposals.some(item => item.page === 1 && item.value === '120 m²'));
  assert.ok(result.proposals.some(item => item.page === 2 && item.value === '144 m²'), JSON.stringify(result));
  const forced = await analyzeDocument(new Uint8Array(pdf.output('arraybuffer')), 'application/pdf', 1, {forceOcr:true});
  assert.equal(forced.pages[0].method,'ocr');
  assert.ok(forced.proposals.some(item=>item.page===1 && item.value==='120 m²' && item.method==='native'),'Forcing OCR preserves digital proposals');
  assert.ok(forced.proposals.some(item=>item.page===1 && item.value==='144 m²'),'Forced OCR recovers the image on a page with long digital text');
});
