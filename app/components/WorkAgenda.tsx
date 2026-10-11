"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FolderIcon from './FolderIcon';
import { propertyDisplayId } from '@/lib/property-display-id';

type Task = { id: number; codigo: string; nombre: string; posicion: number | null; tipo: string | null; propietarioNombres: string | null; propietarioApellidos: string | null; distrito: string | null; actividad: string; fechaLimite: string | null; plazoOrigen: 'asignado' | 'automatico'; responsable: string | null };
const labels: Record<string, string> = { visita: 'Registrar visita', tasacion: 'Registrar precios', expediente: 'Completar expediente', publicacion: 'Confirmar publicación' };
const destinations: Record<string, string> = { visita: '/registrar-visitas', tasacion: '/registrar-tasaciones', expediente: '/tasaciones-textos-pendientes', publicacion: '/tasaciones-textos-pendientes' };
function deadline(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', year: 'numeric' });
}
export default function WorkAgenda() {
  const [items, setItems] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/seguimiento?orden=antiguedad&limite=3', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) { setItems(data.items); setError(''); }
    }).catch(() => { if (!controller.signal.aborted) setError('No se pudieron consultar las prioridades.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  return <section aria-labelledby="work-priorities-title" className="aa-card w-full max-w-5xl overflow-hidden">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
      <h2 id="work-priorities-title" className="text-lg font-bold">Prioridades de trabajo</h2>
      <p className="text-xs text-slate-500">Los 3 más antiguos · Fechas de Perú</p>
    </header>
    {loading ? <p className="p-5 text-sm">Cargando prioridades…</p> : error ? <p role="alert" className="p-5 text-sm text-red-700">{error}<button type="button" onClick={() => { setLoading(true); setReload(current => current + 1); }} className="ml-3 min-h-11 underline">Reintentar</button></p> : !items.length ? <p className="p-5 text-sm text-emerald-800">No hay próximos pasos pendientes en la cartera.</p> : <div>
      <ul className="divide-y divide-slate-100">{items.map(item => {
        const identity = `${propertyDisplayId(item)} · ${item.distrito || 'Sin zona registrada'}`;
        const tone = item.actividad === 'visita' ? 'bg-amber-50 text-amber-800' : item.actividad === 'tasacion' ? 'bg-violet-50 text-violet-800' : item.actividad === 'expediente' ? 'bg-blue-50 text-blue-800' : 'bg-emerald-50 text-emerald-800';
        return <li key={item.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
          <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
            <FolderIcon className="h-7 w-7 shrink-0 text-amber-500" />
            <div className="min-w-0"><p title={item.nombre} className="truncate text-sm font-semibold leading-5 text-slate-900">{item.nombre}</p><p title={identity} className="mt-0.5 break-words text-xs leading-5 text-slate-500 sm:truncate">{identity}</p></div>
          </div>
          <div className="min-w-0 sm:max-w-64"><p className={`w-fit rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>{labels[item.actividad] || 'Revisar ficha'}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{item.fechaLimite ? <>Límite: {deadline(item.fechaLimite)} · {item.plazoOrigen === 'asignado' ? 'Asignado' : 'Automático'}</> : 'Plazo sin definir'}</p></div>
          <Link aria-label={`Abrir ${item.nombre}: ${labels[item.actividad] || 'Revisar ficha'}`} href={`${destinations[item.actividad] || '/datos-inmuebles'}?inmueble=${item.id}${item.actividad === 'expediente' ? '#material' : item.actividad === 'publicacion' ? '#listos' : ''}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Abrir →</Link>
        </li>;
      })}</ul>
      <div className="border-t border-slate-100 px-4 py-2 sm:px-5"><Link href="/cartera?zona=*" className="inline-flex min-h-9 items-center text-xs font-semibold text-[#c80000]">Ver toda la cartera →</Link></div>
    </div>}
  </section>;
}
