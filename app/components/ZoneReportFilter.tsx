"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useZoneWorkspace } from "./ZoneWorkspace";
export default function ZoneReportFilter(){
 const {zones,zone}=useZoneWorkspace();const router=useRouter(),params=useSearchParams();
 return <label className="mb-5 block max-w-sm text-sm font-semibold text-slate-700">Zona del reporte<select aria-label="Zona del reporte" value={zone?.nombre||"*"} onChange={event=>{const next=new URLSearchParams(params.toString());if(event.target.value==='*')next.delete('zona');else next.set('zona',event.target.value);router.push('/reportes?'+next.toString());}} className="aa-input mt-2 w-full"><option value="*">Todas las zonas · consolidado</option>{zones.map(z=><option key={z.id} value={z.nombre}>{z.nombre}</option>)}</select></label>;
}
