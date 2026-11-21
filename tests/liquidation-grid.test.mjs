import './resolve-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import {sourceLiquidationGrid,originalLiquidationGrid,gridInput,gridEvaluator,editGridCell,changeGridRow,gridDisplay,cellPosition,columnName} from '../lib/liquidation-grid.ts';
import {emptyLiquidations,newLiquidation,liquidationInput,liquidationPage} from '../lib/liquidation.ts';
for(const [side,file]of [['owner','LIQUIDACION VENDEDOR.xlsx'],['counterparty','LIQUIDACION DEL COMPRADOR.xlsx']])test(`modelo ${side}: cotejo de todas las celdas y fórmulas con Excel original`,async()=>{
 const book=new ExcelJS.Workbook();await book.xlsx.readFile('tests/info1/'+file);const grid=originalLiquidationGrid(side);let count=0;
 book.worksheets[0].eachRow(row=>row.eachCell(c=>{if(c.value===null)return;count++;assert.equal(grid.cells[c.address]?.f,c.value?.formula);assert.equal(grid.cells[c.address]?.v,c.value?.formula?'':c.value);}));assert.equal(Object.keys(grid.cells).length,count);
 assert.deepEqual(gridInput(grid),gridInput(JSON.parse(JSON.stringify(grid))));
 const data=emptyLiquidations();data.documents=[{...newLiquidation('test','venta',side,data.common),grid,sections:[]}];assert.ok(liquidationInput(data).documents[0].grid);
});
test('recalcula dependencias y conserva fórmulas inconsistentes',()=>{
 let grid=originalLiquidationGrid('owner');let e=gridEvaluator(grid);assert.equal(e('D24'),7990);assert.equal(e('D40'),8650.03);assert.equal(e('E40'),'#VALUE!');assert.equal(grid.cells.E40.f,'D40*E9');
 grid=editGridCell(grid,'D9','220000');e=gridEvaluator(grid);assert.equal(e('D38'),6600);assert.equal(e('D46'),220000);
 grid=editGridCell(grid,'D38','42');assert.equal(gridEvaluator(grid)('D38'),42);assert.equal(grid.cells.D38.originalFormula,'D9*D37');grid=editGridCell(grid,'D38','='+grid.cells.D38.originalFormula);assert.equal(gridEvaluator(grid)('D38'),6600);
 grid=editGridCell(grid,'D38','=ROUND(D9*4%,2)');assert.equal(gridEvaluator(grid)('D38'),8800);
});
test('errores, referencias circulares y código no se ejecutan',()=>{
 let grid=originalLiquidationGrid('owner');for(const [formula,error]of [['=D38','#CIRC!'],['=1/0','#DIV/0!'],['=globalThis.process.exit()','#FORMULA!'],['=SUM(D34:D38)','#CIRC!']]){grid=editGridCell(grid,'D38',formula);assert.equal(gridEvaluator(grid)('D38'),error);}
});
test('insertar y quitar filas desplaza referencias; conserva referencias absolutas',()=>{
 const grid=originalLiquidationGrid('owner'),inserted=changeGridRow(grid,9);assert.equal(inserted.cells.D10.v,210000);assert.equal(inserted.cells.D39.f,'D10*D38');assert.equal(gridEvaluator(inserted)('D39'),6300);assert.deepEqual(changeGridRow(inserted,9,true),grid);
 const removed=changeGridRow(grid,9,true);assert.ok(removed.cells.D37.f.includes('#REF!'));
});
test('validación impide estilos y dimensiones arbitrarios',()=>{
 const grid=sourceLiquidationGrid('owner');for(const mutate of [g=>g.rows=1000000,g=>g.cells.Z999={v:'x'},g=>g.styles[0].background='url(x)',g=>g.cells.C2.v={}]){const bad=structuredClone(grid);mutate(bad);assert.throws(()=>gridInput(bad));}
 const data=emptyLiquidations();data.documents=['owner','counterparty'].map(side=>({...newLiquidation(side,'venta',side,data.common),grid:sourceLiquidationGrid(side),sections:[]}));assert.ok(JSON.stringify(liquidationInput(data)).length<55000);
});
await fs.mkdir('output/liquidaciones-modelos',{recursive:true});
await build({entryPoints:['lib/liquidation-grid-export.ts'],outfile:'output/liquidaciones-modelos/export.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'server-only',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
const {liquidationGridFile}=await import('../output/liquidaciones-modelos/export.mjs');
for(const side of ['owner','counterparty'])test(`exportaciones reales ${side}: Excel con fórmulas, PDF y Word`,async()=>{
 const grid=originalLiquidationGrid(side);const original=JSON.stringify(grid);const settings={title:`Liquidación de prueba ${side}`,header:'Encabezado editable & marca',footer:'Pie editable & referencia',logo:true,numbers:true};for(const format of ['xlsx','pdf','docx']){const bytes=await liquidationGridFile(grid,format,settings);assert.equal(JSON.stringify(grid),original);await fs.writeFile(`output/liquidaciones-modelos/${side}.${format}`,bytes);
 if(format==='xlsx'){const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);for(const [address,c]of Object.entries(grid.cells)){const actual=book.worksheets[0].getCell(columnName(cellPosition(address).col)+(cellPosition(address).row+4));if(c.f)assert.equal(actual.value.formula,c.f.replace(/(\$?[A-Z]+\$?)(\d+)/g,(_,col,row)=>col+(Number(row)+4)));else assert.equal(actual.value,c.v);}if(side==='owner')assert.equal(book.worksheets[0].getCell('E44').value.result.error,'#VALUE!');assert.equal(book.worksheets[0].pageSetup.orientation,'landscape');assert.equal(book.worksheets[0].pageSetup.printTitlesRow,'1:4');assert.equal(book.worksheets[0].getImages().length,1);assert.ok(book.worksheets[0].headerFooter.oddFooter.includes('Pie editable && referencia'));assert.ok(book.worksheets[0].headerFooter.oddFooter.includes('&P'));}
 if(format==='pdf'){assert.equal(bytes.subarray(0,4).toString(),'%PDF');const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;let text='';for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);assert.ok(page.view[2]>page.view[3]);const pageText=(await page.getTextContent()).items.map(i=>i.str||'').join(' ');assert.ok(pageText.includes(settings.header));assert.ok(pageText.includes(settings.title));assert.ok(pageText.includes(settings.footer));assert.ok(pageText.includes(`${n}/${pdf.numPages}`));text+=pageText;}assert.ok(text.includes(side==='owner'?'SALDO A FAVOR':'TOTAL GASTOS COMPRADOR'));assert.ok(!text.includes('undefined'));await pdf.destroy();}
 if(format==='docx'){const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(bytes);const text=await zip.file('word/document.xml').async('string');assert.ok(text.includes('<w:tbl>'));assert.ok(text.includes('XXXXX'));assert.ok(text.includes('w:orient="landscape"'));const header=await zip.file('word/header1.xml').async('string');assert.ok(header.includes('Encabezado editable &amp; marca'));assert.ok(header.includes(settings.title));assert.ok(zip.file('word/media/logo.png'));assert.ok((await zip.file('word/footer1.xml').async('string')).includes('NUMPAGES'));}
 }
});


test('encabezado compatible con borradores antiguos y validación de texto',()=>{
 const data=emptyLiquidations(),doc=newLiquidation('header','venta','owner',data.common);data.documents=[doc];
 doc.page={footer:'Anterior',logo:false,numbers:false};assert.equal(liquidationPage(doc,'INM').header,'Inmobiliaria Alberto Alfaro');assert.equal(liquidationInput(data).documents[0].page.header,undefined);
 doc.page.header='Mi encabezado';assert.equal(liquidationInput(data).documents[0].page.header,'Mi encabezado');doc.page.header='x'.repeat(151);assert.throws(()=>liquidationInput(data));
});
test('opciones de logo y numeración se respetan en todas las descargas',async()=>{
 const grid=sourceLiquidationGrid('counterparty'),settings={title:'Sin logo',header:'Encabezado sin logo',footer:'Pie sin número',logo:false,numbers:false};
 const book=new ExcelJS.Workbook();await book.xlsx.load(await liquidationGridFile(grid,'xlsx',settings));assert.equal(book.worksheets[0].getImages().length,0);assert.equal(book.worksheets[0].headerFooter.oddFooter,'&LPie sin número');
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await liquidationGridFile(grid,'docx',settings));assert.equal(zip.file('word/media/logo.png'),null);assert.ok(!(await zip.file('word/footer1.xml').async('string')).includes('NUMPAGES'));
 const {getDocument,OPS}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(await liquidationGridFile(grid,'pdf',settings)),useSystemFonts:true}).promise;const operators=await(await pdf.getPage(1)).getOperatorList();assert.ok(!operators.fnArray.includes(OPS.paintImageXObject));await pdf.destroy();
});


test('modelo base no precarga números de ejemplo ni oculta importes en fórmulas',()=>{
 for(const side of ['owner','counterparty']){const grid=sourceLiquidationGrid(side);assert.ok(Object.values(grid.cells).every(c=>typeof c.v!=='number'));const evaluate=gridEvaluator(grid);assert.equal(evaluate('D24'),'XXXXX');assert.equal(gridDisplay(grid,'D24',evaluate('D24')),'');assert.equal(evaluate(side==='owner'?'D40':'D37'),'XXXXX');assert.ok(!JSON.stringify(grid).includes('50000'));}
 const grid=sourceLiquidationGrid('owner');assert.equal(grid.cells.G15.v,'XXXXX');assert.equal(grid.cells.D15.f,'G15*E7');assert.equal(originalLiquidationGrid('owner').cells.D15.f,'50000*E7');
});
test('los datos ingresados recalculan; cambiar solo un dato no recupera otros ejemplos',()=>{
 let grid=sourceLiquidationGrid('owner');grid=editGridCell(grid,'D9','210000');assert.equal(gridEvaluator(grid)('D38'),'XXXXX');
 for(const [address,value]of Object.entries({E7:'3.4',D10:'110000',G15:'50000',D16:'1.06',D35:'0',D36:'0',D37:'0.03'}))grid=editGridCell(grid,address,value);
 const evaluate=gridEvaluator(grid);assert.equal(evaluate('D15'),170000);assert.equal(evaluate('D24'),7990);assert.equal(evaluate('D38'),6300);assert.equal(evaluate('D40'),8650.03);assert.equal(evaluate('E40'),'#VALUE!');
 grid=editGridCell(grid,'D37','');assert.equal(gridDisplay(grid,'D38',gridEvaluator(grid)('D38')),'');
});


test('descargas del modelo base presentan entradas XXXXX y resultados pendientes vacíos',async()=>{
 const grid=sourceLiquidationGrid('owner');const book=new ExcelJS.Workbook();await book.xlsx.load(await liquidationGridFile(grid,'xlsx'));const sheet=book.worksheets[0];assert.equal(sheet.getCell('D13').value,'XXXXX');assert.equal(sheet.getCell('D44').value.result??'','');assert.equal(sheet.getCell('D19').value.formula,'G19*E11');
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await liquidationGridFile(grid,'docx'));const text=await zip.file('word/document.xml').async('string');assert.ok(text.includes('XXXXX'));assert.ok(!text.includes('210,000'));assert.ok(!text.includes('8,650'));
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(await liquidationGridFile(grid,'pdf')),useSystemFonts:true}).promise;let all='';for(let n=1;n<=pdf.numPages;n++)all+=(await(await pdf.getPage(n)).getTextContent()).items.map(i=>i.str||'').join(' ');assert.ok(!all.includes('210,000'));assert.ok(!all.includes('8,650'));assert.ok(all.includes('XXXXX'));await pdf.destroy();
});
