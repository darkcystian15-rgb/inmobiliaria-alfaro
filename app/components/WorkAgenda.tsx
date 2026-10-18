"use client";
import { zoneUrl } from '@/lib/zone-url';
import PropertyListIdentity from './PropertyListIdentity';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DeadlineNotice from './DeadlineNotice';
type Task={id:number;zona:string;posicion:number|null;tipo:string|null;operacion:string;direccion:string|null;propietarioNombres:string|null;actividad:string;fechaLimite:string|null;estadoPlazo:string;plazoOrigen:string;diasRetraso:number};
type Data={items:Task[];total:number;resumen:{vencidos:number;hoy:number;proximos:number}};
const labels:Record<string,string>={visita:'Registrar visita',tasacion:'Registrar tasación',expediente:'Completar material',publicacion:'Confirmar publicación'};
const statuses:Record<string,string>={visita:'Visita pendiente',tasacion:'Tasación pendiente',expediente:'Material pendiente',publicacion:'Publicación pendiente'};
const destinations:Record<string,string>={visita:'/registrar-visitas',tasacion:'/registrar-tasaciones',expediente:'/tasaciones-textos-pendientes',publicacion:'/tasaciones-textos-pendientes'};
export default function WorkAgenda(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 const [filter,setFilter]=useState('prioridad'),[page,setPage]=useState(1);
 useEffect(()=>{
  const controller=new AbortController();
  async function load(){try{
   const url=(state:string)=>zoneUrl(`/api/seguimiento?limite=10&estado=${state}&pagina=${page}`);
   const response=await fetch(url(filter),{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();
   const result:Data=await response.json();
   if(!controller.signal.aborted){setData(result);setError('');}
  }catch{if(!controller.signal.aborted)setError('No se pudieron consultar las alertas.');}finally{if(!controller.signal.aborted)setLoading(false);}}
  void load();const refresh=()=>{setPage(1);setReload(value=>value+1);};
  const timer=window.setInterval(refresh,60000);window.addEventListener('focus',refresh);window.addEventListener('workflow-updated',refresh);
  return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('workflow-updated',refresh);};
 },[filter,page,reload]);
 function select(value:string){setFilter(value);setPage(1);setLoading(true);}
 return <section aria-labelledby="work-priorities-title" className="aa-card w-full overflow-hidden">
 <header className="border-b border-slate-100 p-4 sm:p-5"><h2 id="work-priorities-title" className="text-lg font-bold">Alertas de actividades</h2><p className="mt-1 text-xs text-slate-500">Primero las más atrasadas · Fechas de Perú</p>
 <div className="mt-3 flex flex-wrap gap-2">{[['vencidos','Vencidos'],['hoy','Vencen hoy'],['proximos','Próximos 2 días']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>select(value)} className={`aa-button aa-button-secondary ${value==='vencidos'?'text-red-700':''}`}>{label}: {data?.resumen[value as keyof Data['resumen']]??'—'}</button>)}</div>
 <label className="mt-3 block text-xs font-semibold">Mostrar<select value={filter} onChange={e=>select(e.target.value)} className="aa-input ml-2 max-w-full"><option value="prioridad">Prioridad actual</option><option value="vencidos">Vencidos</option><option value="hoy">Vencen hoy</option><option value="proximos">Próximos 2 días</option><option value="todos">Todos los pendientes</option></select></label></header>
 {loading?<p className="p-5 text-sm">Cargando alertas…</p>:error?<p role="alert" className="p-5 text-sm text-red-700">{error}<button onClick={()=>{setLoading(true);setReload(v=>v+1);}} className="ml-3 underline">Reintentar</button></p>:!data?.items.length?<p className="p-5 text-sm text-emerald-800">No hay actividades en este grupo.</p>:<>
 <ul className="divide-y divide-slate-100">{data.items.map(item=><li key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:px-5"><div className="min-w-0 flex-1 basis-52"><p className="mb-1 text-xs font-semibold text-slate-500">{item.zona}</p><PropertyListIdentity position={item.posicion} contact={item.propietarioNombres} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="font-mono text-sm font-bold text-slate-500"/></div><div className="min-w-0"><p className="text-xs font-semibold">{statuses[item.actividad]}</p><DeadlineNotice date={item.fechaLimite} state={item.estadoPlazo}/>{item.diasRetraso>0&&<p className="text-xs font-semibold text-red-700">{item.diasRetraso} {item.diasRetraso===1?'día':'días'} de atraso</p>}{item.plazoOrigen==='asignado'&&<p className="text-xs text-slate-500">Plazo particular</p>}</div><div className="flex flex-wrap gap-2"><Link href={`${destinations[item.actividad]}?zona=${encodeURIComponent(item.zona)}&inmueble=${item.id}${item.actividad==='expediente'?'#material':item.actividad==='publicacion'?'#listos':''}`} className="aa-button aa-button-secondary">{labels[item.actividad]} →</Link><Link aria-label={`Ajustar plazo: ${item.propietarioNombres||'Sin contacto'}`} href={`/datos-inmuebles?codigo=${item.id}&zona=${encodeURIComponent(item.zona)}&pestana=seguimiento`} className="aa-button aa-button-secondary">Ajustar plazo</Link></div></li>)}</ul>
 <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-4 text-xs"><p>Mostrando {data.items.length} de {data.total} actividades{page>1?` · Página ${page}`:''}</p><div className="flex gap-2">{page>1&&<button className="aa-button aa-button-secondary" onClick={()=>{setPage(v=>v-1);setLoading(true);}}>Anterior</button>}{page*10<data.total&&<button className="aa-button aa-button-secondary" onClick={()=>{setPage(v=>v+1);setLoading(true);}}>Ver más →</button>}</div></footer></>}
 </section>;
}
