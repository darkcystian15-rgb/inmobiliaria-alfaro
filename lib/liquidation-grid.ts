import models from './liquidation-source-models';
export type GridStyle = { font?: 'helvetica'|'times'|'courier'; size?: number; bold?: boolean; italic?: boolean; background?: string; color?: string; align?: string; border?: boolean; numFmt?: string };
export type GridCell = { v: string|number; f?: string; originalFormula?: string; s?: number };
export type LiquidationGrid = { rows: number; cols: number; startCol: number; widths: number[]; styles: GridStyle[]; cells: Record<string,GridCell> };
export function originalLiquidationGrid(side: 'owner'|'counterparty'): LiquidationGrid { return structuredClone(models[side]) as LiquidationGrid; }
export function sourceLiquidationGrid(side: 'owner'|'counterparty'): LiquidationGrid {
 const grid = originalLiquidationGrid(side);
 for (const cell of Object.values(grid.cells)) if (!cell.f && typeof cell.v === 'number') cell.v = 'XXXXX';
 if (side === 'owner') {
  // This literal was a prior purchase amount from the example case, not a rate.
  // Expose it as an input instead of retaining it inside a calculation.
  grid.cells.F15 = { v: 'Compra anterior (US$)', s: grid.cells.F13?.s };
  grid.cells.G15 = { v: 'XXXXX', s: grid.cells.D9?.s };
  grid.cells.D15 = { ...grid.cells.D15, f: 'G15*E7' };
 }
 return grid;
}
export function columnName(n: number): string { let s=''; for(;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s; }
export function cellPosition(address: string) { const m=/^([A-Z]+)(\d+)$/.exec(address); if(!m)throw Error('#REF!');return {col:[...m[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),row:Number(m[2])}; }
export function gridInput(value: unknown): LiquidationGrid {
 if(!value || typeof value!=='object')throw Error('Modelo no válido.');
 const g=value as LiquidationGrid;
 if(!Number.isInteger(g.rows)||g.rows<1||g.rows>200||!Number.isInteger(g.cols)||g.cols<1||g.cols>12||!Number.isInteger(g.startCol)||g.startCol<1||g.startCol>g.cols||!Array.isArray(g.widths)||g.widths.length!==g.cols||g.widths.some(w=>!Number.isFinite(w)||w<30||w>600)||!Array.isArray(g.styles)||g.styles.length>250||!g.cells||typeof g.cells!=='object'||Array.isArray(g.cells)||Object.keys(g.cells).length>1200)throw Error('Dimensiones del modelo no válidas.');
 const styles=g.styles.map(s=>{
  if(!s||typeof s!=='object'||(s.font!==undefined&&!['helvetica','times','courier'].includes(s.font))||(s.size!==undefined&&(!Number.isFinite(s.size)||s.size<8||s.size>36))||(s.bold!==undefined&&typeof s.bold!=='boolean')||(s.italic!==undefined&&typeof s.italic!=='boolean')||(s.border!==undefined&&typeof s.border!=='boolean')||[s.color,s.background].some(c=>c!==undefined&&!/^#[0-9a-f]{6}$/i.test(c))||(s.align!==undefined&&!['left','center','right','justify','fill','distributed','centerContinuous'].includes(s.align))||(s.numFmt!==undefined&&(typeof s.numFmt!=='string'||s.numFmt.length>100)))throw Error('Formato del modelo no válido.');
  const {font,size,bold,italic,background,color,align,border,numFmt}=s;return {font,size,bold,italic,background,color,align,border,numFmt};
 });
 const cells: Record<string,GridCell>={};for(const [address,c] of Object.entries(g.cells)){
  const p=cellPosition(address);if(p.row<1||p.row>g.rows||p.col<1||p.col>g.cols||!c||typeof c!=='object'||!['number','string'].includes(typeof c.v)||(typeof c.v==='number'&&!Number.isFinite(c.v))||(typeof c.v==='string'&&c.v.length>2000)||(c.s!==undefined&&(!Number.isInteger(c.s)||c.s<0||c.s>=styles.length))||[c.f,c.originalFormula].some(f=>f!==undefined&&(typeof f!=='string'||f.length>500)))throw Error('Celda del modelo no válida.');
  for (const formula of [c.f,c.originalFormula]) if (formula && (!/^[A-Za-z0-9$+\-*/^%():,;.\s#!?=]*$/.test(formula) || [...formula.matchAll(/([A-Za-z]+)\s*\(/g)].some(m=>!['SUM','ROUND','MIN','MAX','ABS'].includes(m[1].toUpperCase())))) throw Error('Usa operaciones, referencias de celda, SUM, ROUND, MIN, MAX o ABS en las fórmulas.');
  cells[address]={v:c.v,...(c.f?{f:c.f}:{}),...(c.originalFormula?{originalFormula:c.originalFormula}:{}),...(c.s===undefined?{}:{s:c.s})};
 }
 return {rows:g.rows,cols:g.cols,startCol:g.startCol,widths:[...g.widths],styles,cells};
}
// A bounded arithmetic parser. Never executes JavaScript, external links or macros.
export function gridEvaluator(grid: LiquidationGrid) {
 const cache=new Map<string,string|number>(), visiting=new Set<string>();let work=0;
 const fail=(s:string):never=>{throw Error(s);};
 function cell(address:string):string|number {
  address=address.replaceAll('$','').toUpperCase();if(cache.has(address))return cache.get(address)!;
  if(visiting.has(address))return '#CIRC!';if(++work>30000)return '#LIMIT!';
  const c=grid.cells[address];if(!c)return 0;if(!c.f)return c.v;
  visiting.add(address);let result:string|number;
  try {result=parse(c.f);}catch(e){result=e instanceof Error?e.message:'#ERROR!';}visiting.delete(address);cache.set(address,result);return result;
 }
 function number(v:string|number):number {if(typeof v==='number')return v;if(v.startsWith('#'))return fail(v);if(/^[Xx*]+$/.test(v.trim()))return fail('XXXXX');if(v.trim()==='')return fail('XXXXX');return fail('#VALUE!');}
 function parse(formula:string):number {
  const source=formula.replace(/^=/,'').toUpperCase();const tokens=source.match(/\$?[A-Z]+\$?\d+|\d+(?:\.\d*)?(?:E[+-]?\d+)?|\.\d+|[A-Z]+|[+\-*/^%():,;]/g)||[];
  if(tokens.join('')!==source.replace(/\s/g,''))return fail('#FORMULA!');let i=0,depth=0;
  function primary():number {
   if(++depth>80)fail('#LIMIT!');let value:number;const t=tokens[i++];
   if(t==='+')value=primary();else if(t==='-')value=-primary();else if(t==='('){value=expression();if(tokens[i++]!==')')fail('#FORMULA!');}
   else if(t&&/^\$?[A-Z]+\$?\d+$/.test(t))value=number(cell(t));
   else if(t&&/^[\d.]/.test(t))value=Number(t);
   else if(t&&['SUM','ROUND','MIN','MAX','ABS'].includes(t)) {
    if(tokens[i++]!=='(')fail('#FORMULA!');const args:number[]=[];
    while(tokens[i]!==')'){
     if(args.length>2400)fail('#LIMIT!');
     if(tokens[i]&&/^\$?[A-Z]+\$?\d+$/.test(tokens[i])&&tokens[i+1]===':'){
      const a=cellPosition(tokens[i++].replaceAll('$',''));i++;const b=cellPosition((tokens[i++]||'').replaceAll('$',''));
      if(Math.abs(a.row-b.row)>200||Math.abs(a.col-b.col)>12)fail('#REF!');
      for(let r=Math.min(a.row,b.row);r<=Math.max(a.row,b.row);r++)for(let col=Math.min(a.col,b.col);col<=Math.max(a.col,b.col);col++){const v=cell(columnName(col)+r);if(typeof v==='number')args.push(v);else if(/^[Xx*]*$/.test(v.trim()))fail('XXXXX');else if(v.startsWith('#'))fail(v);}
     }else args.push(expression());
     if(tokens[i]===','||tokens[i]===';')i++;else if(tokens[i]!==')')fail('#FORMULA!');
    }i++;
    if(t==='ROUND'){if(args.length!==2||Math.abs(args[1])>12)fail('#FORMULA!');const p=10**args[1];value=Math.round(args[0]*p)/p;}
    else if(t==='ABS'){if(args.length!==1)fail('#FORMULA!');value=Math.abs(args[0]);}
    else value=t==='SUM'?args.reduce((a,b)=>a+b,0):t==='MIN'?Math.min(...args):Math.max(...args);
   }else return fail('#FORMULA!');
   if(tokens[i]==='%'){i++;value/=100;}depth--;return value;
  }
  function power():number{let a=primary();if(tokens[i]==='^'){i++;a=a**power();}return a;}
  function product():number{let a=power();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],b=power();if(op==='/'&&b===0)fail('#DIV/0!');a=op==='*'?a*b:a/b;}return a;}
  function expression():number{let a=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],b=product();a=op==='+'?a+b:a-b;}return a;}
  const value=expression();if(i!==tokens.length)fail('#FORMULA!');if(!Number.isFinite(value))fail('#NUM!');return value;
 }
 return cell;
}
export function gridDisplay(grid:LiquidationGrid,address:string,value:string|number):string {
 if(value === 'XXXXX' && grid.cells[address]?.f) return '';
 if(typeof value==='string')return value;const format=grid.styles[grid.cells[address]?.s??-1]?.numFmt||'';
 if(format.includes('%'))return (value*100).toLocaleString('es-PE',{maximumFractionDigits:2})+'%';
 if(format&&format!=='General')return (format.includes('S/')||format.includes('S/.')?'S/ ':format.includes('$')?'US$ ':'')+value.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
 return String(value);
}
export function editGridCell(grid:LiquidationGrid,address:string,input:string):LiquidationGrid {
 const c=grid.cells[address]||{v:''};const next:GridCell=input.startsWith('=')?{...c,f:input.slice(1),v:'',originalFormula:input.slice(1)}:{...c,v:input.trim()!==''&&/^-?(?:\d+\.?\d*|\.\d+)$/.test(input)?Number(input):input,originalFormula:c.f||c.originalFormula};if(!input.startsWith('='))delete next.f;
 return {...grid,cells:{...grid.cells,[address]:next}};
}
export function changeGridRow(grid:LiquidationGrid,row:number,remove=false):LiquidationGrid {
 if((!remove&&grid.rows>=200)||(remove&&grid.rows<=1))return grid;
 const cells:Record<string,GridCell>={};const shift=(f:string)=>f.replace(/(\$?[A-Z]+)(\$?)(\d+)/g,(_,col,absolute,n)=>{const r=Number(n);return remove&&r===row?'#REF!':col+absolute+(r>=row?r+(remove?-1:1):r);});
 for(const [address,c]of Object.entries(grid.cells)){const p=cellPosition(address);if(remove&&p.row===row)continue;cells[columnName(p.col)+(p.row>=row?p.row+(remove?-1:1):p.row)]={...c,...(c.f?{f:shift(c.f)}:{}),...(c.originalFormula?{originalFormula:shift(c.originalFormula)}:{})};}
 return {...grid,rows:grid.rows+(remove?-1:1),cells};
}
// Excel lets a title flow across empty neighbours. Reproduce that in document views.
export function gridRowCells(grid:LiquidationGrid,row:number) {
 const result:{address:string;col:number;span:number}[]=[];
 for(let col=grid.startCol;col<=grid.cols;col++){
  const address=columnName(col)+row,c=grid.cells[address],s=grid.styles[c?.s??-1];let span=1;
  if(c&&!c.f&&typeof c.v==='string'&&c.v.trim()&&!s?.border){while(col+span<=grid.cols){const next=grid.cells[columnName(col+span)+row];if(next&&(next.f||next.v!==''))break;span++;}}
  result.push({address,col,span});col+=span-1;
 }
 return result;
}
