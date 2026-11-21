import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { reviewedArea, needsDocumentOcr, reviewPage, reviewWorkbook, documentConflicts, applyReviewedToDraft } from '../lib/document-review.mjs';
import { publicationTextModel, HOUSE_SALE_DISTRIBUTION } from '../lib/publication-text-model.mjs';

test('rechaza separadores ambiguos y conserva formatos documentales explícitos', () => {
  for (const input of ['144,000', '1.630', '1296 MZ', '-20', '0', '12.1234']) assert.equal(reviewedArea(input), null, input);
  for (const [input, expected] of [['144 m²', '144.00'], ['389,50 m²', '389.50'], ['3,468.00 m²', '3468.00'], ['1.630,00 m²', '1630.00'], [120, '120.00']]) assert.equal(reviewedArea(input), expected);
});

test('encabezados SUNARP legibles no ocultan la necesidad de OCR del asiento', () => {
  assert.equal(needsDocumentOcr('Partida Registral N° 11000000\nSolicitud N°: 2026-999\nFecha Impresión: 31/10/2026\npágina 1 de 19 CHIMBOTE'), true);
  assert.equal(needsDocumentOcr('Descripción detallada del inmueble. '.repeat(40)), false);
});

test('preserva evidencia y alerta de matriz, rectificación y baja calidad OCR', () => {
  const result = reviewPage('TERRENO Área: 144 M2\nRECTIFICACIÓN DEL PREDIO MATRIZ', { page: 3, method: 'ocr', confidence: 51 });
  const proposal = result.proposals.find(item => item.field === 'areaParcial');
  assert.equal(proposal.value, '144 m²'); assert.equal(proposal.page, 3);
  assert.ok(proposal.warnings.some(item => /matriz/.test(item)));
  assert.ok(proposal.warnings.some(item => /baja calidad/.test(item)));
  const parcel = reviewPage('PARCELA 17561-2, con un ÁREA de 389.50 m?.');
  assert.equal(parcel.proposals.find(item => item.field === 'superficie').value, '389.50 m²');
  assert.deepEqual(documentConflicts([{ field: 'areaTerreno', value: '144 m²' }, { field: 'areaTerreno', value: '144,00 m²' }]), []);
  assert.deepEqual(documentConflicts([{ field: 'areaTerreno', value: '144 m²' }, { field: 'areaTerreno', value: '145 m²' }]), ['areaTerreno']);
});

test('Excel toma la fila del inmueble valuado y su columna, nunca comparables o precios', () => {
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Tasación');
  sheet.getCell('D10').value = 'DESCRIPCIÓN'; sheet.getCell('F10').value = 'ÁREA DEL TERRENO (M2)'; sheet.getCell('G10').value = 'PRECIO';
  sheet.getCell('D12').value = 'COMPARABLE'; sheet.getCell('F12').value = 999; sheet.getCell('G12').value = 100000;
  sheet.getCell('D16').value = 'TERRENO VALUADO'; sheet.getCell('F16').value = 120; sheet.getCell('G16').value = 35000;
  const result = reviewWorkbook(workbook);
  assert.deepEqual(result.proposals.map(p => [p.value, p.sheet, p.cell]), [['120.00 m²', 'Tasación', 'F16']]);
});

test('el modelo editable respeta la distribución existente y solo se aplica a venta de casa', () => {
  assert.ok(publicationTextModel({ tipo: 'casa', operacion: 'venta' }).includes(HOUSE_SALE_DISTRIBUTION));
  assert.ok(!publicationTextModel({ tipo: 'casa', operacion: 'alquiler' }).includes(HOUSE_SALE_DISTRIBUTION));
  const real = publicationTextModel({ tipo: 'casa', distribucion: 'Un solo nivel: sala y dos dormitorios.' });
  assert.ok(real.includes('Un solo nivel: sala y dos dormitorios.')); assert.ok(!real.includes('PISCINA'));
});

test('aplicación conjunta conserva ajustes manuales, no elige entre dos superficies ni pisa valores reales', () => {
  const draft = publicationTextModel({ tipo: 'casa', areaConstruida: '150' }) + '\nCONTACTO PERSONALIZADO';
  const result = applyReviewedToDraft(draft, [{ field: 'areaTerreno', value: '144 m²' }, { field: 'areaConstruida', value: '999 m²' }, { field: 'distribucion', value: 'Un piso, sala y comedor.' }]);
  assert.equal(result.applied, 2); assert.ok(result.text.includes('ÁREA DE TERRENO: 144 m²'));
  assert.ok(result.text.includes('ÁREA CONSTRUIDA TOTAL: 150 M²')); assert.ok(result.text.includes('CONTACTO PERSONALIZADO')); assert.ok(!result.text.includes('PISCINA'));
  assert.throws(() => applyReviewedToDraft(draft, [{ field: 'areaTerreno', value: '100 m²' }, { field: 'areaTerreno', value: '200 m²' }]));
});


test('separa áreas por piso y comparables del total confirmado', () => {
  const perFloor = reviewPage('ÁREA TECHADA: 80 m²\nPRIMER PISO\nÁREA TECHADA: 65 m²\nSEGUNDO PISO');
  assert.ok(perFloor.proposals.every(item => item.field === 'areaParcial'));
  assert.deepEqual(perFloor.proposals.map(item => item.value), ['80 m²','65 m²']);
  assert.equal(reviewPage('ÁREA TECHADA TOTAL: 145 m²').proposals[0].field, 'areaConstruida');
});

test('reemplaza valores existentes solo con opción explícita y conserva el resto', () => {
  const draft = 'TÍTULO PERSONALIZADO\nÁREA DE TERRENO: 100 M²\nCONTACTO PERSONALIZADO';
  const changes = [{field:'areaTerreno',value:'120 m²'}];
  assert.equal(applyReviewedToDraft(draft,changes).applied,0);
  assert.equal(applyReviewedToDraft(draft,changes,{replaceExisting:true}).text,'TÍTULO PERSONALIZADO\nÁREA DE TERRENO: 120 m²\nCONTACTO PERSONALIZADO');
  assert.equal(applyReviewedToDraft('ÁREA DE TERRENO: 100 M²',changes,{replaceExisting:true}).applied,1);
});

test('Excel conserva celda para distribución y conservación sin tomar comparables', () => {
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet('Ficha');
  sheet.getCell('A1').value='Distribución';sheet.getCell('B1').value='Sala y dos dormitorios';
  sheet.getCell('A2').value='Estado de conservación';sheet.getCell('B2').value='Bueno';
  sheet.getCell('A3').value='Domicilio del titular';sheet.getCell('B3').value='Dato privado';
  assert.deepEqual(reviewWorkbook(book).proposals.map(item=>[item.field,item.cell]),[['distribucion','B1'],['conservacion','B2']]);
});


test('un área existente no consume el marcador del siguiente campo', () => {
  const draft='ÁREA DE TERRENO: 100 M²\nÁREA CONSTRUIDA TOTAL: DATO POR CONFIRMAR';
  assert.equal(applyReviewedToDraft(draft,[{field:'areaTerreno',value:'120 m²'}]).text,draft);
  assert.equal(applyReviewedToDraft(draft,[{field:'areaTerreno',value:'120 m²'}],{replaceExisting:true}).text,'ÁREA DE TERRENO: 120 m²\nÁREA CONSTRUIDA TOTAL: DATO POR CONFIRMAR');
});
