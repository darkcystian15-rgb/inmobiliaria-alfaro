"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FolderIcon from './FolderIcon';
type Contract = { id: number; inmuebleId: number; nombre: string; inicio: string | null; fin: string | null; estado: string; reingresoId: number | null };
function date(value: string | null) {
  return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin registrar';
}
export default function RentalAlerts() {
  const [items, setItems] = useState<Contract[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/alquileres', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) {
        const pending = (data.items as Contract[]).filter(item => !item.reingresoId && ['Vencido', 'Vence en 30 días', 'Sin fecha de fin'].includes(item.estado));
        pending.sort((a, b) => Number(!a.inicio) - Number(!b.inicio) || (a.inicio || '').localeCompare(b.inicio || '') || a.id - b.id);
        setItems(pending.slice(0, 2)); setError(false);
      }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  return <section aria-labelledby="rental-tracking-title" className="aa-card overflow-hidden">
    <header className="border-b border-slate-100 px-5 py-4"><h2 id="rental-tracking-title" className="font-bold">Seguimiento de alquileres</h2><p className="mt-1 text-xs text-slate-500">Los dos contratos más antiguos por atender, según su fecha de inicio.</p></header>
    {error ? <p role="alert" className="p-5 text-sm text-red-700">No se pudieron consultar los vencimientos.</p> : items === null ? <p className="p-5 text-sm">Consultando contratos…</p> : !items.length ? <p className="px-5 py-4 text-sm text-slate-600">No hay contratos pendientes de seguimiento.</p> : <ul className="divide-y divide-slate-100">{items.map(item => <li key={item.id} className="grid min-w-0 gap-2 px-5 py-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-2"><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" /><p className="truncate text-sm font-semibold" title={item.nombre}>{item.nombre}</p></div>
      <p className="text-xs text-slate-600">Inicio: {date(item.inicio)}</p><div><p className="text-xs font-semibold text-slate-700">{item.estado}</p><p className="text-xs text-slate-500">Fin: {date(item.fin)}</p></div>
      <Link href={`/datos-inmuebles?codigo=${item.inmuebleId}`} className="aa-button aa-button-secondary justify-self-start text-xs">Ver ficha →</Link>
    </li>)}</ul>}
    <Link href="/alquileres" className="aa-button m-3 text-sm font-semibold text-[#c80000]">Consultar contratos y renovaciones →</Link>
  </section>;
}
