"use client";

import { useMemo, useState } from 'react';
import ZoneFolderCard from './ZoneFolderCard';
import ActiveFilters from './ActiveFilters';
import { filterProperties } from '@/lib/property-list.mjs';
import PortfolioLabelRow from './PortfolioLabelRow';
import PortfolioPropertyCard from './PortfolioPropertyCard';

export type PropertyBrowserItem = { zona: string; id: string; posicion: number | null; nombre: string; tipo: string; operacion: string; ubicacion: string; direccion: string | null; propietario: string; estado: string; precioVenta?: string | null; precioVentaMoneda?: string };
type Item = PropertyBrowserItem;
export default function PropertyFolderBrowser({ items, zoneNames, zone, loading, error, onZone, onOpen, onRetry }: {
  items: Item[]; zoneNames: string[]; zone: string; loading: boolean; error: string;
  onZone: (zone: string) => void; onOpen: (code: string) => void; onRetry: () => void;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('activo');
  const [operation, setOperation] = useState('todos');
  const [type, setType] = useState('todos');
  const [layout, setLayout] = useState<'grid' | 'list'>('list');
  const zones = Array.from(new Set([...zoneNames, ...items.map(item => item.zona || 'Sin zona')])).sort((a, b) => a.localeCompare(b, 'es'));
  const types = Array.from(new Set(items.map(item => item.tipo))).sort((a, b) => a.localeCompare(b, 'es'));
  const filtered = useMemo(() => filterProperties(items.filter(item => (zone === '*' || (item.zona || 'Sin zona') === zone) && (operation === 'todos' || item.operacion === operation) && (type === 'todos' || item.tipo === type)), query, state) as Item[], [items, zone, operation, type, query, state]);
  const clear = () => { setQuery(''); setState('activo'); setOperation('todos'); setType('todos'); };
  if (loading) return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Cargando carpetas de inmuebles…</div>;
  if (error) return <div role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-800"><p>{error}</p><button type="button" onClick={onRetry} className="aa-button aa-button-secondary mt-3">Reintentar</button></div>;
  return <section aria-label={zone === '*' ? 'Carpetas de zonas' : 'Inmuebles de la zona'}>
    <div><h2 className="text-lg font-bold text-slate-900">{zone === '*' ? 'Zonas' : `INMUEBLES ${zone.toLocaleUpperCase('es-PE')}`}</h2><p className="mt-1 text-sm text-slate-500">{zone === '*' ? 'Abre una zona para encontrar sus inmuebles.' : 'Selecciona un inmueble para continuar con sus fases.'}</p></div>
    {zone === '*' ? <><div className="mt-9 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">{zones.map(name => {
      const entries = items.filter(item => (item.zona || 'Sin zona') === name);
      return <ZoneFolderCard key={name} name={name} onOpen={() => onZone(name)}><span className="mt-2 block text-xs text-slate-600">{entries.filter(item => item.estado === 'activo').length} activos · {entries.filter(item => item.estado !== 'activo').length} históricos</span></ZoneFolderCard>;
    })}</div>{!zones.length && <p className="py-8 text-sm text-slate-500">No se encontraron zonas.</p>}</> : <>
      <section aria-label="Buscar y filtrar inmuebles" className="aa-card mt-5 p-4 sm:p-5">
        <label className="relative block min-w-0"><span className="sr-only">Buscar inmueble</span><svg aria-hidden="true" className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por contacto, dirección o ID…" className="aa-input w-full pl-10" /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600">Estado<select value={state} onChange={event => setState(event.target.value)} className="aa-input mt-2 w-full"><option value="activo">Activo</option><option value="todos">Todos</option><option value="historico">Histórico</option></select></label>
          <label className="text-xs font-semibold text-slate-600">Tipo de operación<select value={operation} onChange={event => setOperation(event.target.value)} className="aa-input mt-2 w-full"><option value="todos">Todas</option><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
          <label className="text-xs font-semibold text-slate-600">Tipo de inmueble<select value={type} onChange={event => setType(event.target.value)} className="aa-input mt-2 w-full"><option value="todos">Todos</option>{types.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        </div>
      <ActiveFilters labels={[query.trim() && `Búsqueda: ${query}`, state !== 'activo' && `Estado: ${state === 'todos' ? 'Todos' : 'Históricos'}`, operation !== 'todos' && `Operación: ${operation}`, type !== 'todos' && `Tipo: ${type}`]} onClear={clear} />
      </section>
      <div className="mt-5 flex justify-end"><div aria-label="Vista de inmuebles" className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${layout === 'grid' ? 'bg-[#c80000] text-white' : 'text-slate-600'}`}>Tarjetas</button>
        <button type="button" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${layout === 'list' ? 'bg-[#c80000] text-white' : 'text-slate-600'}`}>Lista compacta</button>
      </div></div>
      <p role="status" aria-live="polite" className="my-4 text-xs text-slate-500">Mostrando {filtered.length} de {items.filter(item => (item.zona || 'Sin zona') === zone).length} inmuebles de la zona · Ordenados por posición, activos primero</p>
      {layout === 'grid' ? <div className="property-position-grid mt-3 grid gap-4">{filtered.map(item => <PortfolioPropertyCard key={item.id} property={{...item, estado: item.estado === 'activo' ? 'Activo' : 'Histórico'}} onOpen={() => onOpen(item.id)} actionLabel="Abrir fases" showProgress={false} />)}</div> : <section aria-label="Lista compacta de inmuebles" className="aa-card mt-3 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500"><span>Inmueble</span><span className="hidden sm:block">Precio</span></div>
        <ul className="divide-y divide-slate-100">{filtered.map(item => <li key={item.id}><PortfolioLabelRow property={{...item, estado: item.estado === 'activo' ? 'Activo' : 'Histórico'}} onOpen={() => onOpen(item.id)} actionLabel="Abrir fases" statusMode="lifecycle" /></li>)}</ul>
      </section>}
      {!filtered.length && <div className="py-10 text-center"><p className="text-sm text-slate-500">No hay inmuebles con estos filtros.</p><button type="button" onClick={clear} className="aa-button aa-button-secondary mt-3">Limpiar filtros</button></div>}
    </>}
  </section>;
}
