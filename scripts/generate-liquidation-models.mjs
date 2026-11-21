import ExcelJS from 'exceljs';
import { writeFile } from 'node:fs/promises';
const models = {};
for (const [side, filename] of [['counterparty','LIQUIDACION DEL COMPRADOR.xlsx'],['owner','LIQUIDACION VENDEDOR.xlsx']]) {
 const book = new ExcelJS.Workbook(); await book.xlsx.readFile(`tests/info1/${filename}`);
 const sheet = book.worksheets[0], cells = {}, styles = [], keys = new Map(); let rows=1, cols=1;
 sheet.eachRow(row => row.eachCell(cell => {
  if(cell.value===null || cell.value===undefined) return;
  rows=Math.max(rows,row.number);cols=Math.max(cols,cell.col);
  const color = c => c?.argb ? '#'+c.argb.slice(-6) : undefined;
  const style={font:cell.font?.name==='Calibri'?'helvetica':cell.font?.name==='Times New Roman'?'times':'helvetica',size:cell.font?.size||11,...(cell.font?.bold?{bold:true}:{}),...(cell.font?.italic?{italic:true}:{}),...(color(cell.fill?.fgColor)?{background:color(cell.fill.fgColor)}:{}),...(color(cell.font?.color)?{color:color(cell.font.color)}:{}),align:cell.alignment?.horizontal||'left',...(Object.keys(cell.border||{}).length?{border:true}:{}),...(cell.numFmt?{numFmt:cell.numFmt}:{})};
  const key=JSON.stringify(style); if(!keys.has(key)){keys.set(key,styles.length);styles.push(style);}
  const value=cell.value;cells[cell.address]={v:typeof value==='object'?('formula'in value?'':cell.text):value,...(value?.formula?{f:value.formula}:{}),s:keys.get(key)};
 }));
 models[side]={rows,cols,startCol:2,widths:Array.from({length:cols},(_,i)=>Math.min(500,Math.max(42,(sheet.getColumn(i+1).width||10)*7))),styles,cells};
}
await writeFile('lib/liquidation-source-models.ts','// Generated from tests/info1. Do not edit by hand.\nexport default '+JSON.stringify(models)+';\n');
console.log('Modelos extraídos sin cambios de texto, valores ni fórmulas.');
