"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FolderIcon from './FolderIcon';
import { propertyDisplayId } from '@/lib/property-display-id';
import { todayInPeru } from '@/lib/calendar.mjs';

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
  const [today, setToday] = useState(() => todayInPeru());
  useEffect(() => {
    const update = () => setToday(todayInPeru());
    const timer = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/seguimiento', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) { setItems(data.items); setError(''); }
    }).catch(() => { if (!controller.signal.aborted) setError('No se pudieron consultar las prioridades.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const groups = [
    { label: 'Vencidos', tone: 'text-red-700', items: items.filter(item => item.fechaLimite && item.fechaLimite < today) },
    { label: 'Para hoy', tone: 'text-amber-800', items: items.filter(item => item.fechaLimite === today) },
    { label: 'Próximos', tone: 'text-slate-700', items: items.filter(item => item.fechaLimite && item.fechaLimite > today) },
    { label: 'Sin plazo definido', tone: 'text-slate-500', items: items.filter(item => !item.fechaLimite) },
  ];
  return <section aria-labelledby="work-priorities-title" className="aa-card overflow-hidden">
    <header className="border-b border-slate-100 p-5 sm:p-6">
      <h2 id="work-priorities-title" className="text-lg font-bold">Prioridades de trabajo</h2>
      <p className="mt-2 text-sm text-slate-600">El siguiente paso pendiente de cada inmueble, ordenado por plazo.</p>
      <p className="mt-2 text-xs text-slate-500">Fechas de Perú. Puedes ajustar el responsable y el plazo en la ficha, en «Responsables y plazos».</p>
    </header>
    {loading ? <p className="p-5 text-sm">Cargando prioridades…</p> : error ? <p role="alert" className="p-5 text-sm text-red-700">{error}<button type="button" onClick={() => { setLoading(true); setReload(current => current + 1); }} className="ml-3 min-h-11 underline">Reintentar</button></p> : !items.length ? <p className="p-5 text-sm text-emerald-800">No hay próximos pasos pendientes en la cartera.</p> : groups.filter(group => group.items.length).map(group => <div key={group.label}>
      <h3 className={`flex items-center justify-between bg-slate-50 px-5 py-3 text-sm font-bold ${group.tone}`}><span>{group.label}</span><span>{group.items.length}</span></h3>
      <div aria-hidden="true" className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-3 border-b border-slate-100 px-5 py-2 text-xs font-semibold text-slate-500 xl:grid"><span>Inmueble</span><span>Zona</span><span>Próxima acción</span><span>Responsable</span><span>Plazo</span><span>Abrir</span></div>
      <ul className="divide-y divide-slate-100">{group.items.map(item => <li key={item.id} className="grid min-w-0 gap-3 p-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-2"><FolderIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div className="min-w-0"><p className="break-words text-sm font-bold">{item.nombre}</p><p className="mt-1 break-words text-xs text-slate-500">{propertyDisplayId(item)}</p></div></div>
        <p className="break-words text-sm text-slate-600"><span className="text-xs font-semibold xl:hidden">Zona: </span>{item.distrito || 'Sin zona registrada'}</p>
        <p className="text-sm font-semibold text-slate-700">{labels[item.actividad] || 'Revisar ficha'}</p>
        <p className="break-words text-sm text-slate-600"><span className="text-xs font-semibold xl:hidden">Responsable: </span>{item.responsable?.trim() || 'Sin asignar'}</p>
        <div><p className={`text-sm font-semibold ${group.tone}`}>{item.fechaLimite ? deadline(item.fechaLimite) : 'Sin definir'}</p>{item.fechaLimite && <p className="mt-1 text-xs text-slate-500">{item.plazoOrigen === 'asignado' ? 'Asignado' : 'Calculado automáticamente'}</p>}</div>
        <Link aria-label={`Abrir ${item.nombre}: ${labels[item.actividad] || 'Revisar ficha'}`} href={`${destinations[item.actividad] || '/datos-inmuebles'}?inmueble=${item.id}${item.actividad === 'expediente' ? '#material' : item.actividad === 'publicacion' ? '#listos' : ''}`} className="aa-button aa-button-secondary justify-self-start">Abrir →</Link>
      </li>)}</ul>
    </div>)}
  </section>;
}
