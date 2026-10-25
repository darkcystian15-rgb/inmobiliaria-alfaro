"use client";
import { useCallback, useEffect, useState } from 'react';
import { requestJson } from '@/lib/client-request';
import type { PropertyProgressData } from '@/lib/property-progress';
import DeadlineNotice from './DeadlineNotice';
import { deadlineStages } from '@/lib/deadline-stages';
type Task={actividad:string;fechaLimite:string|null;observacion:string|null};
type Current={actividad:string;fechaLimite:string|null;estadoPlazo:string;plazoOrigen:string};
const labels:Record<string,string>={visita:'Visita',tasacion:'Tasación',expediente:'Texto comercial',publicacion:'Publicación',documentacion:'Expediente documental de la operación'};
export default function OperationalTracking({propertyId,administrator,progress,documentaryComplete,onChanged,onBusyChange}:{propertyId:number;administrator:boolean;progress:PropertyProgressData;documentaryComplete:boolean;onChanged?:()=>void;onBusyChange?:(busy:boolean)=>void}){
 const [tasks,setTasks]=useState<Task[]>([]),[current,setCurrent]=useState<Current|null>(null);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const url=`/api/inmuebles/${propertyId}/seguimiento`;
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const data=await requestJson<{items:Task[];vigente:Current|null}>(url,{signal});if(signal?.aborted)return;
   setTasks(Object.keys(labels).map(actividad=>data.items.find(item=>item.actividad===actividad)??{actividad,fechaLimite:null,observacion:null}));setCurrent(data.vigente);setError('');
  }catch(error){if(!signal?.aborted)setError(error instanceof Error?error.message:'No se pudo cargar el seguimiento.');}finally{if(!signal?.aborted)setLoading(false);}
 },[url]);
 useEffect(()=>{if(!administrator)return;const controller=new AbortController();void Promise.resolve().then(()=>load(controller.signal));return()=>controller.abort();},[load,administrator]);
 const completed:Record<string,boolean>={visita:progress.visitaRealizada,tasacion:progress.tasacionRegistrada,expediente:!!progress.textoRealizado,publicacion:progress.publicado,documentacion:documentaryComplete};
 async function save(task:Task){setBusy(true);onBusyChange?.(true);setError('');setMessage('');try{await requestJson(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(task)});await load();onChanged?.();window.dispatchEvent(new Event('workflow-updated'));setMessage('Plazo del inmueble guardado. Las alertas usan la nueva fecha.');}catch(error){setError(error instanceof Error?error.message:'No se pudo guardar.');}finally{setBusy(false);onBusyChange?.(false);}}
 function update(activity:string,change:Partial<Task>){setTasks(previous=>previous.map(task=>task.actividad===activity?{...task,...change}:task));}
 if(!administrator)return null;
 return <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Solo este inmueble</p><h3 className="mt-2 text-lg font-bold">Plazos de este inmueble</h3><p className="mt-2 text-sm text-slate-600">Puedes ajustar la fecha límite de cada etapa sin afectar a los demás inmuebles. Si no asignas una fecha, se aplica el plazo general.</p>
 {current&&<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-semibold">Actividad actual: {labels[current.actividad]}</p><DeadlineNotice date={current.fechaLimite} state={current.estadoPlazo}/><p className="mt-1 text-xs text-slate-500">{current.plazoOrigen==='asignado'?'Plazo particular':'Plazo general'}</p></div>}
 {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-emerald-800">{message}</p>}
 {loading?<p className="mt-3 text-sm">Cargando seguimiento…</p>:<details className="mt-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-bold text-slate-800">Ajustar fechas de este inmueble</summary><p className="mt-2 text-xs leading-5 text-slate-500">Abre la etapa que necesitas ajustar y guarda su fecha. Para volver al plazo general, deja la fecha vacía y guarda. Las etapas completadas se conservan como consulta.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{tasks.map(task=><fieldset key={task.actividad} disabled={busy||progress.estado!=='activo'||completed[task.actividad]} className="rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">{labels[task.actividad]} · {completed[task.actividad]?'Completado':progress.estado==='activo'?'Pendiente':'Histórico'}</legend>
 <p className="mb-3 text-sm leading-6 text-slate-500">{deadlineStages[task.actividad]?.description}</p><p className="mb-3 text-xs font-semibold text-slate-600">{task.fechaLimite ? "Fecha particular asignada" : "Sin fecha particular · Usa el plazo general"}</p><label className="block text-xs font-semibold">Fecha límite particular<input type="date" value={task.fechaLimite??''} onChange={event=>update(task.actividad,{fechaLimite:event.target.value||null})} className="mt-2 block w-full rounded-lg border border-slate-200 p-3"/></label>
 <label className="mt-3 block text-xs font-semibold">Observación<input maxLength={500} value={task.observacion??''} onChange={event=>update(task.actividad,{observacion:event.target.value})} className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label>
 {progress.estado==='activo'&&!completed[task.actividad]&&<button type="button" onClick={()=>void save(task)} className="aa-button aa-button-primary mt-3">Guardar seguimiento</button>}</fieldset>)}</div></details>}</section>;
}
