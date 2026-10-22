"use client";

import { useMemo, useState } from 'react';
import FolderIcon from './FolderIcon';
import ZoneFolderCard from './ZoneFolderCard';
import PropertySummary from './PropertySummary';
import ActiveFilters from './ActiveFilters';
import { filterProperties } from '@/lib/property-list.mjs';
import { propertyPanelId } from '@/lib/property-panel-id.mjs';

type Item = { zona: string; id: string; posicion: number | null; nombre: string; tipo: string; operacion: string; ubicacion: string; direccion: string | null; propietario: string; estado: string };
export default function PropertyFolderBrowser({ items, zoneNames, zone, loading, error, onZone, onOpen, onRetry }: {
  items: Item[]; zoneNames: string[]; zone: string; loading: boolean; error: string;
  onZone: (zone: string) => void; onOpen: (code: string) => void; onRetry: () => void;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('activo');
  const [operation, setOperation] = useState('todos');
  const [type, setType] = useState('todos');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const zones = Array.from(new Set([...zoneNames, ...items.map(item => item.zona || 'Sin zona')])).sort((a, b) => a.localeCompare(b, 'es'));
  const types = Array.from(new Set(items.map(item => item.tipo))).sort((a, b) => a.localeCompare(b, 'es'));
  const filtered = useMemo(() => filterProperties(items.filter(item => (zone === '*' || (item.zona || 'Sin zona') === zone) && (operation === 'todos' || item.operacion === operation) && (type === 'todos' || item.tipo === type)), query, state) as Item[], [items, zone, operation, type, query, state]);
  const clear = () => { setQuery(''); setState('activo'); setOperation('todos'); setType('todos'); };
  if (loading) return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Cargando carpetas de inmuebles…</div>;
  if (error) return <div role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-800"><p>{error}</p><button type="button" onClick={onRetry} className="aa-button aa-button-secondary mt-3">Reintentar</button></div>;
  return <section aria-label={zone === '*' ? 'Carpetas de zonas' : 'Inmuebles de la zona'} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{zone === '*' ? 'Zonas' : `Inmuebles · ${zone}`}</h2><p className="mt-1 text-sm text-slate-500">{zone === '*' ? 'Abre una zona para encontrar sus inmuebles.' : 'Busca un inmueble y abre su carpeta de información.'}</p></div>{zone !== '*' && <div className="flex gap-1 rounded-lg bg-slate-100 p-1" aria-label="Vista de inmuebles"><button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} className={`rounded-md px-3 py-2 text-xs font-semibold ${layout === 'grid' ? 'bg-white shadow-sm' : ''}`}>Cuadrícula</button><button type="button" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} className={`rounded-md px-3 py-2 text-xs font-semibold ${layout === 'list' ? 'bg-white shadow-sm' : ''}`}>Lista</button></div>}</div>
    {zone === '*' ? <><div className="mt-9 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">{zones.map(name => {
      const entries = items.filter(item => (item.zona || 'Sin zona') === name);
      return <ZoneFolderCard key={name} name={name} onOpen={() => onZone(name)}><span className="mt-2 block text-xs text-slate-600">{entries.filter(item => item.estado === 'activo').length} activos · {entries.filter(item => item.estado !== 'activo').length} históricos</span></ZoneFolderCard>;
    })}</div>{!zones.length && <p className="py-8 text-sm text-slate-500">No se encontraron zonas.</p>}</> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600">Buscar inmueble<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Contacto, dirección o ID" className="aa-input mt-2 w-full" /></label>
        <label className="text-xs font-semibold text-slate-600">Estado<select value={state} onChange={event => setState(event.target.value)} className="aa-input mt-2 w-full"><option value="activo">Activos</option><option value="historico">Históricos</option><option value="todos">Todos</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Operación<select value={operation} onChange={event => setOperation(event.target.value)} className="aa-input mt-2 w-full"><option value="todos">Todas</option><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Tipo de inmueble<select value={type} onChange={event => setType(event.target.value)} className="aa-input mt-2 w-full"><option value="todos">Todos</option>{types.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      </div>
      <ActiveFilters labels={[query.trim() && `Búsqueda: ${query}`, state !== 'activo' && `Estado: ${state === 'todos' ? 'Todos' : 'Históricos'}`, operation !== 'todos' && `Operación: ${operation}`, type !== 'todos' && `Tipo: ${type}`]} onClear={clear} />
      <p aria-live="polite" className="my-4 text-xs text-slate-500">{filtered.length} inmueble{filtered.length === 1 ? '' : 's'} · Ordenados por posición, activos primero</p>
      <div className={layout === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200'}>{filtered.map(item => layout === 'list' ? <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-amber-50/50 focus-visible:outline-2 focus-visible:outline-red-700 sm:px-4">
        <FolderIcon className="h-6 w-6 shrink-0 text-amber-500" />
        <span className="grid min-w-0 flex-1 gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"><span className="min-w-0"><span className="block break-words text-sm font-semibold text-slate-900">{item.propietario || 'Sin contacto'}</span><span className="block break-words text-xs text-slate-500">{propertyPanelId(item)}</span></span><span className="min-w-0 self-center break-words text-xs text-slate-500"><PropertySummary operation={item.operacion} type={item.tipo} location={item.direccion} /></span></span>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${item.estado === 'activo' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.estado === 'activo' ? 'Activo' : 'Histórico'}</span><span aria-hidden="true" className="text-slate-400">→</span>
      </button> : <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/40 focus-visible:outline-2 focus-visible:outline-red-700"><FolderIcon className="h-9 w-9 shrink-0 text-amber-500" /><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold text-slate-900">{item.propietario || 'Sin contacto'}</span><span className="mt-1 block break-words text-xs text-slate-500"><PropertySummary operation={item.operacion} type={item.tipo} location={item.direccion} /></span><span className="mt-2 block break-words text-xs text-slate-500">{propertyPanelId(item)}</span><span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${item.estado === 'activo' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.estado === 'activo' ? 'Activo' : 'Histórico'}</span></span><span aria-hidden="true" className="text-slate-400">→</span></button>)}</div>
      {!filtered.length && <div className="py-10 text-center"><p className="text-sm text-slate-500">No hay inmuebles con estos filtros.</p><button type="button" onClick={clear} className="aa-button aa-button-secondary mt-3">Limpiar filtros</button></div>}
    </>}
  </section>;
}
