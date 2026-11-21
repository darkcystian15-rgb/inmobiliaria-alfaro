import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs/promises';import ExcelJS from 'exceljs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {emptyLiquidations,newLiquidation} from '../lib/liquidation.ts';
await fs.mkdir('output/liquidaciones',{recursive:true});
await build({entryPoints:['lib/liquidation-export.ts'],outfile:'output/liquidaciones/export.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'server-only',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
const {liquidationFile}=await import('../output/liquidaciones/export.mjs');
const data=emptyLiquidations();Object.assign(data.common,{address:'Dirección de prueba',owner:'Empresa de prueba',counterparty:'Comprador de prueba',price:'210000',currency:'USD',exchange:'3.4',taxStatus:'exonerado',taxNote:'Sustento de prueba'});const doc=newLiquidation('test','venta','owner',data.common,'juridica');doc.sections[0].rows[0].kind='renta';doc.sections[0].rows[3].kind='percent';doc.sections[0].rows[0].formats={label:{bold:true,size:18,background:'highlight'},PEN:{background:'shade'}};doc.identity='20123456789';doc.notes='Observación de prueba';for(const r of doc.sections[0].rows){if(r.kind==='amount')r.amount='0';if(r.kind==='percent'){r.rate='3';r.base='210000';}}
test('Excel real contiene logo, fórmulas, valores calculados y totales separados',async()=>{const bytes=await liquidationFile(doc,data.common,'INM-PRUEBA','xlsx');const w=new ExcelJS.Workbook();await w.xlsx.load(bytes);const s=w.worksheets[0];assert.equal(s.getImages().length,1);let formula=false,exempt=false;const texts=[];s.eachRow(r=>r.eachCell(c=>{texts.push(c.text);if(c.value?.formula?.includes('*3/100')){assert.equal(c.value.result,6300);formula=true;}if(c.value===0)exempt=true;}));assert.ok(formula);assert.ok(exempt);assert.ok(texts.includes('Gastos USD'));let styled=false;s.eachRow(r=>{if(r.getCell(1).value==='Impuesto a la renta'){assert.equal(r.getCell(1).font.bold,true);assert.equal(r.getCell(1).font.size,18);assert.equal(r.getCell(1).fill.fgColor.argb,'FFFEF08A');assert.equal(r.getCell(3).fill.fgColor.argb,'FFE2E8F0');styled=true;}});assert.ok(styled);assert.ok(texts.includes('Persona jurídica'));assert.ok(texts.includes('Precio de referencia menos gastos (USD)'));await fs.writeFile('output/liquidaciones/muestra.xlsx',bytes);});
test('PDF con logo y múltiples páginas para conceptos extensos',async()=>{const long=structuredClone(doc);for(let i=0;i<8;i++)long.sections.push({...structuredClone(doc.sections[0]),id:'section'+i,title:'Sección '+i});const bytes=await liquidationFile(long,data.common,'INM-PRUEBA','pdf');assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.ok(bytes.length>10000);const parsed=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;assert.ok(parsed.numPages>1);let formatted=false;for(let i=1;i<=parsed.numPages;i++){const page=await parsed.getPage(i);const content=await page.getTextContent();const text=content.items.map(x=>x.str||'').join(' ');assert.ok(text.includes('Inmobiliaria Alberto Alfaro'));assert.ok(text.includes(`${i}/${parsed.numPages}`));assert.ok(text.includes(doc.title));if(content.items.some(x=>x.str?.includes('Impuesto')&&Math.round(x.height)===18))formatted=true;}assert.ok(formatted);await parsed.destroy();await fs.writeFile('output/liquidaciones/muestra.pdf',bytes);});

test('Excel distingue importe vacío de cero y conserva fuente y pie personalizados', async () => {
  const draft = structuredClone(doc);
  const [empty, zero] = draft.sections[0].rows;
  Object.assign(empty, { kind: 'amount', amount: '', formats: { label: { font: 'times', italic: true } } });
  Object.assign(zero, { kind: 'amount', amount: '0' });
  draft.page = { logo: false, numbers: false, footer: 'Pie de prueba' };
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await liquidationFile(draft, data.common, 'INM-PRUEBA', 'xlsx'));
  const sheet = workbook.worksheets[0];
  const rows = sheet.getRows(1, sheet.rowCount);
  const emptyRow = rows.find(row => row.getCell(1).value === empty.label);
  const zeroRow = rows.find(row => row.getCell(1).value === zero.label);
  assert.equal(emptyRow.getCell(3).value, null);
  assert.equal(zeroRow.getCell(3).value, 0);
  assert.equal(emptyRow.getCell(1).font.name, 'Times New Roman');
  assert.equal(emptyRow.getCell(1).font.italic, true);
  assert.equal(sheet.getImages().length, 0);
  assert.equal(sheet.headerFooter.oddFooter, '&LPie de prueba');
});
