"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from './ConfirmDialog';

export default function DraftRecovery({draftKey,data,dirty,onRestore}:{draftKey:string;data:Record<string,unknown>;dirty:boolean;onRestore:(data:Record<string,unknown>)=>void}){
 const router=useRouter();const [candidate,setCandidate]=useState<Record<string,unknown>|null>(null);const [ready,setReady]=useState(false);const [status,setStatus]=useState('');const [destination,setDestination]=useState<string|null>(null);const revision=useRef(0);const queue=useRef<Promise<unknown>>(Promise.resolve());const savedDirty=useRef(false);const encoded=JSON.stringify(data);const url=`/api/borradores?clave=${encodeURIComponent(draftKey)}`;
 useEffect(()=>{const controller=new AbortController();fetch(url,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const result=await response.json();if(!controller.signal.aborted){setCandidate(result.borrador?.contenido??null);setReady(true);}}).catch(()=>{if(!controller.signal.aborted){setReady(true);setStatus('No se pudo consultar el borrador. Conserva esta pantalla hasta guardar.');}});return()=>controller.abort();},[url]);
 useEffect(()=>{
  if(!ready||candidate)return;
  if(!dirty&&!savedDirty.current)return;
  const version=revision;
  const current=++version.current;
  const timer=window.setTimeout(()=>{
   const contenido=dirty?JSON.parse(encoded):null; if(dirty)savedDirty.current=true;
   queue.current=queue.current.catch(()=>{}).then(async()=>{if(current!==revision.current)return;const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({contenido}),keepalive:true});if(current!==revision.current)return;if(!response.ok){setStatus('Borrador sin guardar. Guarda el formulario antes de salir.');return;}savedDirty.current=dirty;setStatus(dirty?'Borrador guardado por 14 días. La actividad todavía no está registrada; pulsa el botón de guardar o registrar para confirmarla.':'');});
  },dirty?700:0);
  return()=>{window.clearTimeout(timer);++version.current;};
 },[ready,candidate,dirty,encoded,url]);
 useEffect(()=>{
  if(!dirty)return;
  const before=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  const click=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const anchor=(event.target as Element).closest?.('a[href]') as HTMLAnchorElement|null;if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;const next=new URL(anchor.href);if(next.pathname===location.pathname&&next.search===location.search)return;event.preventDefault();event.stopPropagation();setDestination(anchor.href);};
  window.addEventListener('beforeunload',before);document.addEventListener('click',click,true);return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('click',click,true);};
 },[dirty]);
 async function discard(){++revision.current;await queue.current.catch(()=>{});const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({contenido:null})});if(response.ok){setCandidate(null);setStatus('');}else setStatus('No se pudo descartar el borrador.');}
 async function leave(){if(!destination)return;const target=destination;setDestination(null);await queue.current.catch(()=>{});try{const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({contenido:JSON.parse(encoded)})});if(!response.ok)throw new Error();}catch{setStatus('No se pudo guardar el borrador. Guarda los cambios antes de salir.');return;}const next=new URL(target);if(next.origin===location.origin)router.push(next.pathname+next.search+next.hash);else location.assign(target);}
 return <>{candidate&&<div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>Tienes un borrador sin confirmar. Recuperarlo solo rellena el formulario; después debes guardar o registrar la actividad.</p><div className="mt-2 flex flex-wrap gap-3"><button type="button" onClick={()=>{onRestore(candidate);setCandidate(null);}} className="min-h-11 font-semibold underline">Recuperar borrador</button><button type="button" onClick={()=>void discard()} className="min-h-11 font-semibold underline">Descartar borrador</button></div></div>}{status&&<p role="status" className="my-3 text-xs text-slate-600">{status}</p>}{destination&&<ConfirmDialog title="Cambios sin guardar" confirmLabel="Guardar borrador y salir" onCancel={()=>setDestination(null)} onConfirm={()=>void leave()}><p>Estos cambios todavía no están confirmados. Guardar el borrador conserva lo escrito para retomarlo; no registra la actividad.</p></ConfirmDialog>}</>;
}
