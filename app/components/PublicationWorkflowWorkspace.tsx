"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { requestJson } from '@/lib/client-request';
import { filterTaskProperties } from '@/lib/property-task-list.mjs';
import { workflowScreens, matchesWorkflowScreen, workflowPropertyHref } from '@/lib/publication-workflow.mjs';
import { ALL_ZONES, inZone } from '@/lib/property-zones';
import { ContextLink as Link, NavigationReturnProvider, ReturnLink } from './NavigationReturn';
import { useZoneWorkspace } from './ZoneWorkspace';
import PageHeading from './PageHeading';
import WorkflowNavigationGuard from './WorkflowNavigationGuard';
import PropertyTaskSearch from './PropertyTaskSearch';
import PropertyListIdentity from './PropertyListIdentity';
import PropertyPublicationEditor, { type PublicationWorkflow } from './PropertyPublicationEditor';
import SalePriceEditor, { type PropertyPrices } from './SalePriceEditor';
import { Feedback, LoadingCards } from './InterfaceFeedback';

type Screen = keyof typeof workflowScreens;
type Item = PropertyPrices & PublicationWorkflow & {
  inmuebleId: number; id: number | null; codigo: string; zona: string; posicion: string;
  propietario: string; tipo: string; operacion: string; direccion: string | null;
  ubicacion?: string; texto: string; etapa: string;
};
export default function PublicationWorkflowWorkspace({ screen }: { screen: Screen }) {
  return <Suspense fallback={<LoadingCards label="Cargando inmuebles…" />}><Workspace screen={screen} /></Suspense>;
}
function Workspace({ screen }: { screen: Screen }) {
  const config = workflowScreens[screen], path = `/${screen}`, registration = screen.startsWith('registrar-');
  const params = useSearchParams(), { zones } = useZoneWorkspace();
  const selected = params.get('inmueble'), zone = params.get('zona') || (selected ? ALL_ZONES : null);
  const [items, setItems] = useState<Item[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(''), [registered, setRegistered] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const query = zone ? `?zona=${encodeURIComponent(zone)}` : '';
      const data = config.stage === 'tasacion'
        ? (await requestJson<{ pendientes: Item[] }>(`/api/tasaciones${query}`, { signal })).pendientes
        : (await requestJson<{ todas: Item[] }>(`/api/publicaciones${query}`, { signal })).todas;
      if (!signal?.aborted) { setItems(data); setError(''); }
    } catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'No se pudo consultar la bandeja.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [config.stage, zone]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);
  const reload = useCallback(async () => { await load(); window.dispatchEvent(new Event('workflow-updated')); }, [load]);
  const scoped = useMemo(() => items.filter(item => !zone || zone === ALL_ZONES || inZone(item, zone)), [items, zone]);
  const eligible = scoped.filter(item => matchesWorkflowScreen(item, config.stage, registration && registered));
  const visible = filterTaskProperties(eligible, search);
  const chosen = selected ? scoped.find(item => String(item.inmuebleId) === selected) : null;
  const groups = Array.from(new Set([...zones.map(item => item.nombre), ...items.map(item => item.zona)])).sort();
  const pendingPath = config.stage === 'texto' ? '/textos-pendientes' : '/publicaciones-pendientes';
  const currentHref = `${path}${params.toString() ? `?${params}` : ''}`;
  return <NavigationReturnProvider href={currentHref} zone={zone}><main className="min-h-screen bg-background p-5 lg:p-8"><WorkflowNavigationGuard dirty={dirty} busy={busy} />
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4"><PageHeading href={path} /><ReturnLink /></header>
      <p className="text-sm leading-6 text-slate-600">{config.description}</p>
      <nav aria-label="Pasos de seguimiento" className="flex flex-wrap gap-2">
        {['tasaciones-pendientes', 'textos-pendientes', 'publicaciones-pendientes'].map(key => <Link key={key} href={`/${key}${zone ? `?zona=${encodeURIComponent(zone)}` : ''}`} aria-current={path === `/${key}` ? 'page' : undefined} className={`aa-button ${path === `/${key}` ? 'aa-button-primary' : 'aa-button-secondary'}`}>{workflowScreens[key as Screen].title}</Link>)}
      </nav>
      {error && <Feedback tone="error">{error}<button type="button" className="aa-button aa-button-secondary ml-3" onClick={() => void load()}>Reintentar</button></Feedback>}
      {loading ? <LoadingCards label="Consultando inmuebles…" /> : error ? null : !zone ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(name => <Link key={name} className="aa-card p-5" href={`${path}?zona=${encodeURIComponent(name)}`}><span className="font-bold">{name}</span><span className="mt-2 block text-sm text-slate-500">{items.filter(item => inZone(item, name) && matchesWorkflowScreen(item, config.stage)).length} pendientes →</span></Link>)}
        <Link className="aa-button aa-button-secondary" href={`${path}?zona=*`}>Ver todas las zonas</Link>
      </section> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><Link className="aa-button aa-button-secondary" href={path}>← Volver a zonas</Link><p className="font-bold">{zone === ALL_ZONES ? 'Todas las zonas' : zone}</p>{registration ? <Link href={`${pendingPath}?zona=${encodeURIComponent(zone)}`} className="aa-button aa-button-secondary">Ver pendientes</Link> : <Link href={`${config.register}?zona=${encodeURIComponent(zone)}`} className="aa-button aa-button-primary">{config.stage === 'tasacion' ? 'Registrar tasaciones' : config.stage === 'texto' ? 'Registrar textos' : 'Registrar publicaciones'}</Link>}</div>
        {registration && selected ? chosen ? <article className="aa-card space-y-5 p-5 sm:p-6">
          <PropertyListIdentity code={chosen.codigo} position={chosen.posicion} contact={chosen.propietario} operation={chosen.operacion} type={chosen.tipo} location={chosen.ubicacion || chosen.direccion} positionClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold" />
          {config.stage === 'publicacion' && chosen.etapa === 'texto_pendiente' ? <Feedback tone="error">Primero completa el texto comercial.<Link href={workflowPropertyHref('/registrar-textos', chosen)} className="aa-button aa-button-primary mt-3">Registrar texto</Link></Feedback> : <PropertyPublicationEditor key={`${screen}:${chosen.inmuebleId}`} propertyId={chosen.inmuebleId} text={chosen.texto} exists={Boolean(chosen.id)} publication={chosen} onSaved={reload} onDirtyChange={setDirty} onBusyChange={setBusy} mode={config.stage === 'texto' ? 'text' : 'publication'} initialEditing={config.stage === 'texto' && chosen.etapa === 'texto_pendiente'} initialEditingDiffusion={config.stage === 'publicacion' && chosen.etapa === 'difusion_pendiente'} />}
          {config.stage === 'texto' && chosen.etapa !== 'texto_pendiente' && <Feedback tone="success">Texto realizado. {chosen.etapa === 'completada' ? 'La publicación registrada se conserva.' : 'Continúa con el registro de la publicación.'}<Link href={workflowPropertyHref('/registrar-publicaciones', chosen)} className="aa-button aa-button-primary mt-3">{chosen.etapa === 'completada' ? 'Consultar publicación' : 'Registrar publicación'}</Link></Feedback>}
          {config.stage === 'publicacion' && chosen.etapa === 'completada' && <Feedback tone="success">Publicación registrada. Todas las acciones elegidas están confirmadas.</Feedback>}
          <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Consultar o editar valores de tasación</summary><SalePriceEditor item={chosen} onSaved={reload} /></details>
          <Link className="text-sm font-semibold text-red-700" href={`/datos-inmuebles?zona=${encodeURIComponent(chosen.zona)}&codigo=${chosen.inmuebleId}&carpeta=${config.stage === 'texto' ? 'textos' : 'publicaciones'}`}>Abrir ficha del inmueble →</Link>
          <Link className="aa-button aa-button-secondary" href={`${path}?zona=${encodeURIComponent(zone)}`}>Volver al listado</Link>
        </article> : <Feedback tone="error">El inmueble no está disponible en esta etapa o zona. Consulta el listado o revisa primero su tasación.</Feedback> : <>
          {registration && <div className="flex flex-wrap gap-2" role="group" aria-label="Estado de los registros"><button type="button" aria-pressed={!registered} onClick={() => setRegistered(false)} className={`aa-button ${!registered ? 'aa-button-primary' : 'aa-button-secondary'}`}>Pendientes ({scoped.filter(item => matchesWorkflowScreen(item, config.stage)).length})</button><button type="button" aria-pressed={registered} onClick={() => setRegistered(true)} className={`aa-button ${registered ? 'aa-button-primary' : 'aa-button-secondary'}`}>{config.stage === 'texto' ? 'Textos registrados' : 'Publicaciones registradas'} ({scoped.filter(item => matchesWorkflowScreen(item, config.stage, true)).length})</button></div>}
          <div className="aa-card p-4"><PropertyTaskSearch value={search} onChange={setSearch} count={visible.length} total={eligible.length} /></div>
          {!visible.length ? <div className="aa-card p-6 text-sm text-slate-500">{search ? 'No hay inmuebles que coincidan con la búsqueda.' : registered ? 'No hay registros completados en esta selección.' : 'No hay pendientes en esta selección.'}</div> : <section className="space-y-4" aria-label={config.title}>{visible.map(item => <article key={item.inmuebleId} className="aa-card space-y-4 p-5"><PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.ubicacion || item.direccion} positionClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold" />
            <p className="text-sm text-slate-600">{config.stage === 'tasacion' ? 'Tasación pendiente' : item.etapa === 'completada' ? 'Publicación registrada' : item.etapa === 'difusion_pendiente' ? 'Texto realizado · Publicación pendiente' : item.texto?.trim() ? 'Borrador guardado · Texto pendiente' : 'Texto pendiente'}</p>
            <Link className="aa-button aa-button-primary" href={workflowPropertyHref(config.register, item)}>{registered ? config.stage === 'texto' ? 'Consultar o editar texto' : 'Consultar o actualizar publicación' : config.action}</Link>
          </article>)}</section>}
        </>}
      </>}
    </div>
  </main></NavigationReturnProvider>;
}
