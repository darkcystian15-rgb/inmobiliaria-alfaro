'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import { columnName, gridRowCells, editGridCell, changeGridRow, gridDisplay, gridEvaluator, type GridStyle, type LiquidationGrid } from '@/lib/liquidation-grid';
import { liquidationFonts } from '@/lib/liquidation';
export function modelCellStyle(style?:GridStyle):CSSProperties { return {fontFamily:liquidationFonts[style?.font||'helvetica'].css,fontSize:`${style?.size||11}pt`,fontWeight:style?.bold?700:400,fontStyle:style?.italic?'italic':undefined,backgroundColor:style?.background,color:style?.color||'#111827',textAlign:style?.align==='center'?'center':style?.align==='right'?'right':'left',border:style?.border?'1px solid #64748b':undefined,verticalAlign:'middle'}; }
type ModelPage = { title:string; header:string; footer:string; logo:boolean; numbers:boolean };
export default function LiquidationModelEditor({grid,onChange,readOnly=false,preview=false,page}:{grid:LiquidationGrid;page?:ModelPage;onChange:(grid:LiquidationGrid)=>void;readOnly?:boolean;preview?:boolean}) {
 const [selected,setSelected]=useState('C3'),[editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState(''),[advanced,setAdvanced]=useState(false);
 const evaluate=useMemo(()=>gridEvaluator(grid),[grid]);const current=grid.cells[selected],style=grid.styles[current?.s??-1]||{};
 function commit(address:string,value:string){onChange(editGridCell(grid,address,value));setEditing(null);}
 function format(patch:Partial<GridStyle>){const next={...style,...patch};let index=grid.styles.findIndex(s=>JSON.stringify(s)===JSON.stringify(next));const styles=[...grid.styles];if(index<0){if(styles.length>=250)return;index=styles.length;styles.push(next);}onChange({...grid,styles,cells:{...grid.cells,[selected]:{...(current||{v:''}),s:index}}});}
 return <div className="min-w-0 space-y-3">
 {!preview&&!readOnly&&<div className="sticky top-0 z-10 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
 <div role="toolbar" aria-label="Formato del modelo" className="flex flex-wrap items-center gap-2">
 <span className="min-w-12 text-xs font-bold text-slate-600">{selected}</span>
 <button type="button" className="aa-button border" aria-label="Negrita del modelo" aria-pressed={!!style.bold} onClick={()=>format({bold:!style.bold})}><b>N</b></button>
 <button type="button" className="aa-button border" aria-label="Cursiva del modelo" aria-pressed={!!style.italic} onClick={()=>format({italic:!style.italic})}><i>K</i></button>
 <select aria-label="Fuente del modelo" className="rounded border p-2 text-sm" value={style.font||'helvetica'} onChange={e=>format({font:e.target.value as GridStyle['font']})}>{Object.entries(liquidationFonts).map(([key,f])=><option key={key} value={key}>{f.label}</option>)}</select>
 <select aria-label="Tamaño del modelo" className="rounded border p-2 text-sm" value={style.size||11} onChange={e=>format({size:Number(e.target.value)})}>{[8,9,10,11,12,14,16,18,20,24,28,32,36].map(n=><option key={n}>{n}</option>)}</select>
 <label className="flex items-center gap-1 text-xs">Fondo<input aria-label="Color de fondo del modelo" type="color" value={style.background||'#ffffff'} onChange={e=>format({background:e.target.value})}/></label>
 <select aria-label="Alineación del modelo" className="rounded border p-2 text-sm" value={style.align||'left'} onChange={e=>format({align:e.target.value})}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select>
 <button type="button" className="aa-button border" onClick={()=>{const row=Number(selected.match(/\d+$/)?.[0]||1);onChange(changeGridRow(grid,row+1));}}>+ Fila debajo</button>
 <button type="button" className="aa-button border" onClick={()=>{if(window.confirm('¿Quitar la fila seleccionada? Las referencias a ella mostrarán #REF!. Puedes deshacer.'))onChange(changeGridRow(grid,Number(selected.match(/\d+$/)?.[0]||1),true));}}>Quitar fila</button>
 </div>
 <p className="text-xs text-slate-500">Haz clic en un texto o importe y escribe. Las celdas con ƒ se calculan automáticamente.</p>
 {current?.f&&<div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-800">ƒ Cálculo automático</span><button type="button" className="aa-button border" onClick={()=>setAdvanced(!advanced)} aria-expanded={advanced}>Editar fórmula</button><button type="button" className="aa-button border" onClick={()=>{setDraft(String(evaluate(selected)));setEditing(selected);}}>Escribir importe manual</button></div>}
 {!current?.f&&current?.originalFormula&&<button type="button" className="aa-button border text-xs" onClick={()=>commit(selected,'='+current.originalFormula)}>Recuperar fórmula</button>}
 {!current?.f&&<button type="button" className="text-xs font-semibold text-red-700" onClick={()=>setAdvanced(!advanced)} aria-expanded={advanced}>Texto, valor o fórmula</button>}
 {advanced&&<label className="block text-xs font-semibold">Contenido de {selected}<input key={selected+String(current?.f)+String(current?.v)} aria-label="Texto o fórmula de celda" className="mt-1 w-full rounded border p-2 font-mono text-sm" defaultValue={current?.f?'='+current.f:String(current?.v??'')} onBlur={e=>{if(e.target.value!==(current?.f?'='+current.f:String(current?.v??'')))commit(selected,e.target.value);}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/><span className="mt-1 block font-normal text-slate-500">Empieza con = para calcular. Ejemplo: =D9*D37. Admite +, −, *, /, %, SUM, ROUND, MIN, MAX y ABS.</span></label>}
 </div>}
 <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 sm:p-4">
 {page && <p className="mb-2 text-xs font-semibold text-slate-500">A4 · Horizontal</p>}
 <div aria-label={page ? 'Hoja A4 horizontal' : undefined} style={page ? {width:1122,minHeight:794,padding:32,backgroundColor:'white'} : undefined}>
 {page && <header aria-label="Encabezado de liquidación" className="mb-5 flex items-center gap-6 border-b-2 border-red-700 pb-4">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {page.logo && <img src="/branding/logo.png" width={160} height={55} alt="Inmobiliaria Alberto Alfaro" className="h-auto w-40 shrink-0"/>}
 <div className="min-w-0"><p className="whitespace-pre-wrap break-words text-sm text-slate-600">{page.header}</p><h3 className="mt-1 whitespace-pre-wrap break-words text-xl font-bold text-red-800">{page.title}</h3></div>
 </header>}
 <table aria-label={preview?'Vista previa del modelo':'Modelo de liquidación editable'} className="border-collapse" style={{tableLayout:'fixed',width:page?'100%':grid.widths.slice(grid.startCol-1).reduce((a,b)=>a+b,0)+(!preview?36:0)}}>
 <colgroup>{!preview&&<col style={{width:36}}/>}{Array.from({length:grid.cols-grid.startCol+1},(_,i)=><col key={i} style={{width:grid.widths[i+grid.startCol-1]}}/>)}</colgroup>
 {!preview&&<thead><tr><th className="text-xs text-slate-400"/>{Array.from({length:grid.cols-grid.startCol+1},(_,i)=><th key={i} className="h-7 bg-slate-50 text-xs font-normal text-slate-400">{columnName(i+grid.startCol)}</th>)}</tr></thead>}
 <tbody>{Array.from({length:grid.rows},(_,ri)=><tr key={ri}>{!preview&&<th scope="row" className="bg-slate-50 text-xs font-normal text-slate-400">{ri+1}</th>}{gridRowCells(grid,ri+1).map(({address,span})=>{
 const cell=grid.cells[address],value=evaluate(address),text=cell?gridDisplay(grid,address,value):'',cellStyle=grid.styles[cell?.s??-1];
 return <td key={address} colSpan={span} style={modelCellStyle(cellStyle)} className={`relative h-6 p-0 align-middle ${!preview&&selected===address?'outline-2 -outline-offset-2 outline-red-600':''}`}>
 {preview||readOnly?<div className="whitespace-pre-wrap break-words px-2 py-1">{text||'\u00a0'}</div>:editing===address?<textarea autoFocus aria-label={`Editar ${address}`} value={draft} className="block min-h-12 w-full resize-y bg-white px-2 py-1 text-slate-900 outline-none" onChange={e=>setDraft(e.target.value)} onBlur={()=>commit(address,draft)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setEditing(null);}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commit(address,draft);}}}/>:<button type="button" aria-label={`Celda ${address}${cell?.f?' con fórmula':''}`} className="block min-h-7 w-full whitespace-pre-wrap break-words px-2 py-1 text-inherit" style={{textAlign:'inherit'}} onFocus={()=>setSelected(address)} onClick={()=>{setSelected(address);if(!cell?.f){setEditing(address);setDraft(String(cell?.v??''));}}} onKeyDown={e=>{if(e.key==='Enter'&&cell?.f){setAdvanced(true);}else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();setEditing(address);setDraft(e.key);}}}>{text||'\u00a0'}{cell?.f&&<span className="absolute right-0 top-0 bg-blue-50 px-0.5 text-[9px] font-normal text-blue-700">ƒ</span>}</button>}
 </td>;
 })}</tr>)}</tbody></table>
 {page && <footer aria-label="Pie de liquidación" className="mt-5 flex justify-between gap-4 border-t border-slate-300 pt-3 text-xs text-slate-500"><span className="whitespace-pre-wrap break-words">{page.footer}</span>{page.numbers && <span>Numeración de páginas activada</span>}</footer>}
 </div></div></div>;
}
