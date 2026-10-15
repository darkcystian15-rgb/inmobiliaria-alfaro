"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSessionUser } from "./SessionProvider";
import { isAdministrator } from "@/lib/access.mjs";
import ZoneContext from "./ZoneContext";

export type WorkspaceZone = { id:number; nombre:string; capacidad:number; ocupados:number; disponibles:number; historicos:number };
const Workspace = createContext<{ zones:WorkspaceZone[]; zone:WorkspaceZone|null; requested:string|null; loading:boolean; error:string; reload:()=>Promise<void> }>({zones:[],zone:null,requested:null,loading:false,error:"",reload:async()=>{}});
export const useZoneWorkspace = () => useContext(Workspace);
export function ZoneWorkspaceProvider({children}:{children:ReactNode}) {
  const user=useSessionUser(), params=useSearchParams();
  const requested=params.get("zona"), pathname=usePathname();
  const [zones,setZones]=useState<WorkspaceZone[]>([]),[loading,setLoading]=useState(isAdministrator(user)),[error,setError]=useState("");
  const reload=useCallback(async()=>{
    if(!isAdministrator(user))return;
    setLoading(true);
    try{const response=await fetch('/api/zonas',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudieron consultar las zonas.');setZones(data.zonas);setError('');}
    catch(e){setError(e instanceof Error?e.message:'No se pudieron consultar las zonas.');}
    finally{setLoading(false);}
  },[user]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>void reload(),0);
    return()=>window.clearTimeout(timer);
  },[reload,pathname,requested]);
  const zone=isAdministrator(user)?zones.find(z=>z.nombre===requested)??null:null;
  return <Workspace.Provider value={{zones,zone,requested,loading,error,reload}}>{children}</Workspace.Provider>;
}
const required=new Set(['/registrar-inmueble','/visitas-pendientes','/registrar-visitas','/registrar-tasaciones','/tasaciones-textos-pendientes','/liberar-inmuebles']);
export function ZonePage({children}:{children:ReactNode}) {
  const {zone,requested,loading,error,reload}=useZoneWorkspace();const path=usePathname();const user=useSessionUser();
  if(!isAdministrator(user))return <>{children}</>;
  if(required.has(path)&&!zone)return <main className="p-6 sm:p-8"><div className="aa-card mx-auto max-w-3xl p-6"><h1 className="text-xl font-bold">{loading?'Consultando zona…':error?'No se pudieron consultar las zonas':'Selecciona una zona para trabajar'}</h1><p className="mt-3 text-sm text-slate-600">{error||'Abre una carpeta de la cartera para registrar y gestionar sus inmuebles.'}</p>{error&&<button onClick={()=>void reload()} className="aa-button aa-button-secondary mt-4">Reintentar</button>}<Link href="/cartera" className="aa-button aa-button-primary mt-4">Abrir cartera por zonas</Link></div></main>;
  const ownBanner=new Set(['/cartera','/visitas-pendientes','/tasaciones-textos-pendientes']);
  return <div key={`${path}:${requested||''}`}>{zone&&!ownBanner.has(path)&&<div className="flex flex-wrap items-center gap-3 px-4 pt-5 sm:px-8"><Link href="/cartera" className="aa-button aa-button-secondary">← Todas las zonas</Link><ZoneContext name={zone.nombre}/><span className="text-xs text-slate-500">Capacidad: {zone.capacidad} inmuebles</span></div>}{children}</div>;
}
