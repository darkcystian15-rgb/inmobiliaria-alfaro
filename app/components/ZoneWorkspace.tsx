"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSessionUser } from "./SessionProvider";
import { isAdministrator } from "@/lib/access.mjs";
import ZoneContext from "./ZoneContext";
import ZoneFolderCard from "./ZoneFolderCard";
import { zoneWorkflowPaths, workflowZoneHref } from "@/lib/zone-workflow";

export type WorkspaceZone = { id:number; nombre:string; capacidad:number; ocupados:number; disponibles:number; historicos:number };
const Workspace = createContext<{ zones:WorkspaceZone[]; zone:WorkspaceZone|null; requested:string|null; loading:boolean; error:string; reload:()=>Promise<void> }>({zones:[],zone:null,requested:null,loading:false,error:"",reload:async()=>{}});
export const useZoneWorkspace = () => useContext(Workspace);
export function ZoneWorkspaceProvider({children}:{children:ReactNode}) {
  const user=useSessionUser(), params=useSearchParams();
  const requested=params.get("zona"), pathname=usePathname();
  const [zones,setZones]=useState<WorkspaceZone[]>([]),[loading,setLoading]=useState(Boolean(user)),[error,setError]=useState("");
  const reload=useCallback(async()=>{
    if(!user)return;
    setLoading(true);
    try{const response=await fetch('/api/zonas',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudieron consultar las zonas.');setZones(data.zonas);setError('');}
    catch(e){setError(e instanceof Error?e.message:'No se pudieron consultar las zonas.');}
    finally{setLoading(false);}
  },[user]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>void reload(),0);
    return()=>window.clearTimeout(timer);
  },[reload,pathname,requested]);
  const zone=!error?zones.find(z=>z.nombre===requested)??null:null;
  return <Workspace.Provider value={{zones,zone,requested,loading,error,reload}}>{children}</Workspace.Provider>;
}

export function ZonePage({children}:{children:ReactNode}) {
  const {zone,zones,requested,loading,error,reload}=useZoneWorkspace();const path=usePathname();const params=useSearchParams();const user=useSessionUser();
  if(!isAdministrator(user))return <>{children}</>;
  const needsZone=zoneWorkflowPaths.has(path)||(path==='/liberar-inmuebles'&&Boolean(requested&&requested!=='*'));
  if(needsZone&&!zone)return <main className="p-6 sm:p-8"><div className="aa-card mx-auto max-w-6xl space-y-6 p-5 sm:p-7"><h1 className="text-xl font-bold">{loading?'Consultando zonas…':error?'No se pudieron consultar las zonas':'Selecciona una zona para trabajar'}</h1><p className="text-sm text-slate-600">{error||'El registro y los pendientes se gestionan dentro de una zona. Elige una para continuar con esta tarea.'}</p>{requested&&requested!=='*'&&!loading&&!error&&<p role="status" className="text-sm text-amber-800">La zona del enlace ya no está disponible. Selecciona una zona vigente.</p>}{error&&<button onClick={()=>void reload()} className="aa-button aa-button-secondary">Reintentar</button>}{!loading&&!error&&<nav aria-label="Seleccionar zona de trabajo" className="grid gap-x-4 gap-y-8 pt-5 sm:grid-cols-2 xl:grid-cols-3">{zones.map(item=><ZoneFolderCard key={item.id} name={item.nombre} href={workflowZoneHref(`${path}${params.toString()?`?${params}`:''}${typeof window==='undefined'?'':window.location.hash}`,item.nombre)!}><span className="mt-2 block text-xs leading-5 text-slate-500">{item.ocupados} / {item.capacidad} inmuebles en cartera</span><span className="mt-1 block text-xs font-semibold text-slate-600">Abrir carpeta de la zona</span></ZoneFolderCard>)}</nav>}<Link href="/cartera" className="aa-button aa-button-primary">Abrir cartera por zonas</Link></div></main>;

  const ownBanner=new Set(['/tasaciones-pendientes','/textos-pendientes','/registrar-textos','/publicaciones-pendientes','/registrar-publicaciones','/datos-inmuebles','/cartera','/visitas-pendientes','/tasaciones-textos-pendientes']);
  return <div key={path === "/datos-inmuebles" ? path : `${path}:${requested||''}`}>{zone&&!ownBanner.has(path)&&<div className="flex flex-wrap items-center gap-3 px-4 pt-5 sm:px-8"><Link href="/cartera" className="aa-button aa-button-secondary">← Todas las zonas</Link><ZoneContext name={zone.nombre}/><span className="text-xs text-slate-500">Capacidad: {zone.capacidad} inmuebles</span></div>}{children}</div>;
}
