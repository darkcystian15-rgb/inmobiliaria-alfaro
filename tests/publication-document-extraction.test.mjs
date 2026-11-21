import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCommercialProposals } from '../lib/publication-document-extraction.mjs';
import { getDocumentProxy } from 'unpdf';
import { jsPDF } from 'jspdf';

test('extrae propuestas con página y respaldo, sin precio ni datos personales', () => {
  const pages = ['DOMICILIO DEL TITULAR: Jr. Privado 99\nDNI: 12345678\nUBICACIÓN DEL INMUEBLE: Urb. Buenos Aires Mz H Lt 20\nÁrea de terreno: 246.90 m2\nPrecio: US$ 495000', 'Área construida: 180,50 m²\nAntigüedad: 10 años\nEstado de conservación: Bueno'];
  const proposals = extractCommercialProposals(pages);
  assert.equal(proposals.find(item => item.field === 'direccion').value, 'Urb. Buenos Aires Mz H Lt 20');
  assert.equal(proposals.find(item => item.field === 'areaTerreno').value, '246.90 m²');
  assert.equal(proposals.find(item => item.field === 'areaParcial').page, 2);
  assert.ok(proposals.every(item => item.evidence && item.page > 0));
  assert.ok(!proposals.some(item => /precio|dni|titular/.test(item.field)));
});

test('conserva alternativas entre documentos y no adivina un resultado único', () => {
  const proposals = extractCommercialProposals(['Área de terreno: 200 m2', 'Área de terreno: 220 m2']);
  assert.equal(proposals.length, 2);
  assert.deepEqual(proposals.map(item => item.page), [1, 2]);
});

test('no convierte el área de un piso en área total ni deduce del domicilio del titular', () => {
  assert.deepEqual(extractCommercialProposals(['Área del primer piso: 90 m2\nDomicilio del titular: Calle 123\n']), []);
  assert.deepEqual(extractCommercialProposals(['', ' ']), []);
});

test('lector serverless recupera páginas de un PDF real generado localmente', async () => {
  const fixture = new jsPDF(); fixture.text('Area de terreno: 246.90 m2', 10, 20); fixture.addPage(); fixture.text('Area construida: 180 m2', 10, 20);
  const pdf = await getDocumentProxy(new Uint8Array(fixture.output('arraybuffer')));
  try {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); const content = await page.getTextContent();
      pages.push(content.items.map(part => 'str' in part ? part.str : '').join(' '));
    }
    const proposals = extractCommercialProposals(pages);
    assert.equal(proposals.find(item => item.field === 'areaTerreno').value, '246.90 m²');
    assert.equal(proposals.find(item => item.field === 'areaParcial').page, 2);
  } finally { await pdf.destroy(); }
});
