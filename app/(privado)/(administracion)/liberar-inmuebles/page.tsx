"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContextLink as Link } from '@/app/components/NavigationReturn';
import PageHeading from '@/app/components/PageHeading';
import PropertySummary from '@/app/components/PropertySummary';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { Feedback, LoadingCards } from '@/app/components/InterfaceFeedback';
import { requestJson } from '@/lib/client-request';
import { propertyPanelContactId } from '@/lib/property-panel-id.mjs';
import { deletionReasons } from '@/lib/property-deletion-input.mjs';
import { saleResult } from '@/lib/sale-result.mjs';
import { rentalResult } from '@/lib/rental-result.mjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useZoneWorkspace } from '@/app/components/ZoneWorkspace';
import { ReturnLink } from '@/app/components/NavigationReturn';

type Item = { inmuebleId: number; codigo: string; posicion: string; tipo: string; operacion: string; direccion: string | null; propietario: string; moneda: string; tieneAnuncioWeb: boolean; cierreDocumental: { complete: boolean; missing: string[]; completed: number; total: number } };
type Mode = 'historico' | 'suspender' | 'eliminar';
type Confirmation = { item: Item; mode: Mode; stage: 1 | 2; eliminacionId?: string; archivos?: number };
type Result = { completo: boolean; mensaje: string };
const inputClass = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm';

export default function ReleasePage() {
  const router = useRouter(), params = useSearchParams();
  const { zone, zones, loading: zonesLoading, error: zonesError, reload } = useZoneWorkspace();
  const target = params.get('inmueble');
  const [items, setItems] = useState<Item[]>([]), [pending, setPending] = useState<{ id: string }[]>([]);
  const [query, setQuery] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [modes, setModes] = useState<Record<number, Mode>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({}), [details, setDetails] = useState<Record<number, string>>({});
  const [amounts, setAmounts] = useState<Record<number, Record<string, string>>>({});
  const [retirarWeb, setRetirarWeb] = useState<Record<number, boolean>>({});
  const [retiroPendiente, setRetiroPendiente] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!zone) { setLoading(false); return; }
    try {
      const data = await requestJson<{ items: Item[]; eliminacionesPendientes: { id: string }[] }>('/api/liberaciones', { signal });
      if (!signal?.aborted) { setItems(data.items); setPending(data.eliminacionesPendientes || []); setError(''); }
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No se pudo consultar la zona.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [zone]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load]);
  const filtered = useMemo(() => items.filter(item => (!target || String(item.inmuebleId) === target) && `${propertyPanelContactId(item)} ${item.codigo} ${item.posicion}`.toLocaleLowerCase('es-PE').includes(query.trim().toLocaleLowerCase('es-PE'))), [items, query, target]);
  function chooseZone(name: string) {
    const next = new URLSearchParams(params.toString());
    next.delete('inmueble');
    if (name) next.set('zona', name); else next.delete('zona');
    router.push(`/liberar-inmuebles${next.size ? `?${next}` : ''}`);
  }
  function showZone() {
    const next = new URLSearchParams(params.toString()); next.delete('inmueble');
    router.replace(`/liberar-inmuebles?${next}`);
  }
  function review(item: Item) {
    setError(''); setMessage('');
    const mode = modes[item.inmuebleId];
    if (!mode) { setError('Selecciona cómo deseas liberar el inmueble.'); return; }
    if (mode === 'eliminar') {
      const reason = reasons[item.inmuebleId];
      if (!reason || (reason === 'otro' && !details[item.inmuebleId]?.trim())) { setError('Selecciona y completa el motivo de eliminación.'); return; }
    } else if (mode === 'suspender') {
      if (item.operacion !== 'venta' || !details[item.inmuebleId]?.trim()) { setError('Indica el motivo de suspensión de la venta.'); return; }
    } else {
      if (!item.cierreDocumental.complete) { setError('Completa todos los documentos obligatorios del expediente antes de cerrar.'); return; }
      try { if (item.operacion === 'alquiler') rentalResult(amounts[item.inmuebleId] || {}); else saleResult(amounts[item.inmuebleId] || {}); }
      catch (e) { setError(e instanceof Error ? e.message : 'Completa el cierre.'); return; }
    }
    setConfirmation({ item, mode, stage: 1 });
  }
  async function confirm() {
    if (!confirmation || busy) return;
    setBusy(true); setError(''); setRetiroPendiente(false);
    const { item, mode, stage } = confirmation;
    try {
      if (mode === 'eliminar' && stage === 1) {
        const prepared = await requestJson<{ eliminacionId: string; archivos: number }>('/api/liberaciones/eliminacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inmuebleId: item.inmuebleId, motivo: reasons[item.inmuebleId], detalle: details[item.inmuebleId] || '' }) });
        setConfirmation({ item, mode, stage: 2, ...prepared }); return;
      }
      if (mode === 'eliminar') {
        const result = await requestJson<Result>('/api/liberaciones/eliminacion', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eliminacionId: confirmation.eliminacionId, confirmacion: 'ELIMINAR' }) });
        setMessage(result.mensaje);
      } else {
        const result = await requestJson<{retiroWeb: {synced:boolean;error:string}|null}>('/api/liberaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inmuebleId: item.inmuebleId, ...amounts[item.inmuebleId], motivo: mode === 'suspender' ? 'venta_suspendida' : item.operacion === 'alquiler' ? 'alquilado' : 'vendido', detalleOtro: details[item.inmuebleId] || '', retirarAnuncioWeb: Boolean(retirarWeb[item.inmuebleId]), moneda: amounts[item.inmuebleId]?.moneda ?? item.moneda, monedaEsperada: item.moneda }) });
        const message = mode === 'suspender' ? 'Venta suspendida. La ficha queda en Histórico y puede retomarse con una nueva posición disponible.' : 'Operación cerrada. El inmueble pasó a Histórico y su posición está disponible.';
        setRetiroPendiente(Boolean(result.retiroWeb && !result.retiroWeb.synced));
        setMessage(message + (result.retiroWeb ? result.retiroWeb.synced ? ' El anuncio web fue retirado.' : ' El retiro del anuncio web está pendiente de confirmación. Reintenta desde Publicaciones activas.' : ''));
      }
      setConfirmation(null); await load();
    } catch (e) { await load(); setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }
  async function retry(id: string) {
    setBusy(true); setError('');
    try { const result = await requestJson<Result>('/api/liberaciones/eliminacion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eliminacionId: id }) }); setMessage(result.mensaje); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar el borrado de archivos.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl">
    <PageHeading href="/liberar-inmuebles" />
    <p className="mt-3 text-sm text-slate-600">Puedes cerrar una operación, suspender temporalmente una venta o eliminar definitivamente un inmueble. Todas las opciones liberan su posición; las ventas suspendidas se pueden retomar desde Histórico.</p>
    <label className="mt-5 block text-sm font-semibold">Zona de cartera<select value={zone?.nombre || ''} disabled={zonesLoading || busy} onChange={event => chooseZone(event.target.value)} className={inputClass}><option value="">Seleccionar zona</option>{zones.map(item => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}</select></label>
    {params.get('volver') && <div className="mt-4"><ReturnLink /></div>}
    {zonesError && <Feedback tone="error" className="mt-5">{zonesError}<button type="button" onClick={() => void reload()} className="aa-button aa-button-secondary ml-3">Reintentar</button></Feedback>}
    {!zone ? <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm">{zonesLoading ? 'Consultando zonas…' : 'Selecciona una zona para consultar sus inmuebles activos y elegir cuál liberar.'}</p> : <>
    {target && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold">Inmueble seleccionado desde Cartera</p><button type="button" disabled={busy} onClick={showZone} className="aa-button aa-button-secondary">Ver todos los inmuebles de la zona</button></div>}
    {message && <Feedback tone="success" className="mt-5">{message}</Feedback>}
    {retiroPendiente && <Link href="/portal-web/activas" className="aa-button aa-button-secondary mt-3">Reintentar retiro del anuncio →</Link>}
    {error && !confirmation && <Feedback tone="error" className="mt-5">{error}<button type="button" onClick={() => void load()} className="aa-button aa-button-secondary ml-3">Actualizar</button></Feedback>}
    {pending.length > 0 && <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold">Eliminaciones pendientes de archivos</h2><p className="mt-2 text-sm">Estas fichas ya se eliminaron. Completa el borrado de sus archivos cuando el almacenamiento vuelva a responder.</p>{pending.map((job, index) => <div key={job.id} className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-sm">Eliminación pendiente {index + 1}</span><button type="button" disabled={busy} onClick={() => void retry(job.id)} className="aa-button aa-button-secondary">Completar eliminación de archivos</button></div>)}</section>}
    {!target && <label className="mt-6 block text-sm font-semibold">Buscar inmueble<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ID, contacto, ubicación o posición…" className={inputClass} /></label>}
    <section className="mt-5 space-y-3" aria-label="Inmuebles de la zona">
      {loading ? <LoadingCards label="Cargando inmuebles…" /> : !filtered.length ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">{target ? 'El inmueble seleccionado ya no está activo o no pertenece a esta zona. No se ha aplicado ninguna acción. Puedes consultar los demás inmuebles de la zona.' : 'No hay inmuebles activos que coincidan con esta búsqueda.'}</p> : filtered.map(item => {
        const mode = modes[item.inmuebleId], rental = item.operacion === 'alquiler';
        const currency = amounts[item.inmuebleId]?.moneda ?? item.moneda;
        const symbol = currency === 'USD' ? 'US$' : 'S/';
        const fields = rental ? [['fechaAlquiler','Fecha de cierre','date',true],['rentaMensual',`Renta mensual (${symbol})`,'number',true],['comision',`Comisión (${symbol})`,'number',false],['garantia',`Garantía (${symbol})`,'number',false],['adelanto',`Adelanto (${symbol})`,'number',false],['fechaInicioAlquiler','Inicio del alquiler','date',false],['fechaFinAlquiler','Fin del alquiler','date',false]] : [['fechaVenta','Fecha de venta','date',true],['precioFinal',`Precio final (${symbol})`,'number',true],['comision',`Comisión de la inmobiliaria (${symbol})`,'number',true]];
        return <details key={item.inmuebleId} open={target === String(item.inmuebleId) ? true : undefined} className="rounded-2xl border border-slate-200 bg-white open:border-red-200"><summary className="cursor-pointer p-5"><span className="text-xs font-semibold text-slate-500">Posición {item.posicion}</span><span className="mt-1 block break-words font-semibold">{item.propietario || 'Sin contacto'}</span><span className="mt-1 block break-words text-xs text-slate-500"><PropertySummary operation={item.operacion} type={item.tipo} location={item.direccion} /></span><span className="mt-2 block text-sm font-semibold text-[#c80000]">Elegir cómo liberar →</span></summary>
          <div className="space-y-5 border-t border-slate-100 p-5"><p className="break-words font-mono text-xs">{propertyPanelContactId(item)}</p><Link href={`/datos-inmuebles?codigo=${item.inmuebleId}`} className="inline-block text-sm font-semibold text-[#c80000]">Abrir ficha completa →</Link>
            <fieldset disabled={busy} className="space-y-3"><legend className="mb-3 text-sm font-bold">Forma de liberar</legend>{([['historico','Cerrar operación y conservar en Histórico','Para una venta o alquiler realizado por la inmobiliaria. Se conservan ficha, archivos e historial.'],['suspender','Suspender venta y conservar en Histórico','Para una pausa solicitada por el propietario. Conserva la misma ficha y permite retomarla con una nueva posición disponible.'],['eliminar','Eliminar definitivamente','Para desistimiento, venta por otro canal u otro motivo. Se borran ficha, documentos, fotos e historial.']] as const).filter(([value]) => value !== 'suspender' || !rental).map(([value,title,description]) => <label key={value} className={`flex items-start gap-3 rounded-xl border p-4 ${mode === value ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}><input type="radio" name={`forma-${item.inmuebleId}`} value={value} checked={mode === value} onChange={() => setModes(old => ({ ...old, [item.inmuebleId]: value }))} className="mt-1" /><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-slate-600">{description}</span></span></label>)}</fieldset>
            {mode === 'historico' && <fieldset disabled={busy} className="rounded-xl bg-slate-50 p-4"><legend className="text-sm font-bold">{rental ? 'Cierre de alquiler' : 'Cierre de venta'}</legend><label className="mt-3 block text-sm font-semibold">Moneda del inmueble<select aria-label="Moneda del inmueble" value={currency} onChange={event => setAmounts(old => ({...old,[item.inmuebleId]:{...old[item.inmuebleId],moneda:event.target.value}}))} className={inputClass}>{!currency && <option value="">Selecciona una moneda común</option>}<option value="PEN">Soles (S/)</option><option value="USD">Dólares (US$)</option></select><span className="mt-1 block text-xs font-normal text-slate-600">Se aplica a todos los importes del inmueble. Los números se conservan; ingresa manualmente la conversión si corresponde.</span></label><div className="grid gap-4 sm:grid-cols-3">{fields.map(([key,label,type,required]) => <label key={String(key)} className="text-xs font-semibold">{label}{required ? ' *' : ''}<input type={String(type)} value={amounts[item.inmuebleId]?.[String(key)] || ''} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.01' : undefined} onChange={event => setAmounts(old => ({ ...old, [item.inmuebleId]: { ...old[item.inmuebleId], [String(key)]: event.target.value } }))} className={inputClass} /></label>)}</div></fieldset>}
            {mode === 'historico' && <section aria-label="Documentación para cerrar" className={`rounded-xl border p-4 ${item.cierreDocumental.complete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><h3 className="font-semibold">{item.cierreDocumental.complete ? 'Documentación completa para cerrar' : 'Completa la documentación antes de cerrar'}</h3><p className="mt-1 text-sm">{item.cierreDocumental.completed} de {item.cierreDocumental.total} documentos obligatorios cargados.</p>{item.cierreDocumental.missing.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{item.cierreDocumental.missing.map(text => <li key={text}>{text}</li>)}</ul>}<Link href={`/datos-inmuebles?codigo=${item.inmuebleId}&carpeta=estado`} className="aa-button aa-button-secondary mt-3">Completar expediente →</Link><button type="button" onClick={() => void load()} disabled={busy} className="aa-button aa-button-secondary ml-2 mt-3">Actualizar documentos</button></section>}
            {mode === 'suspender' && <label className="block text-sm font-semibold">Motivo de suspensión *<textarea maxLength={500} value={details[item.inmuebleId] || ''} onChange={event => setDetails(old => ({ ...old, [item.inmuebleId]: event.target.value }))} className={inputClass} /></label>}
            {mode === 'eliminar' && <fieldset disabled={busy} className="space-y-4"><label className="block text-sm font-semibold">Motivo de eliminación *<select value={reasons[item.inmuebleId] || ''} onChange={event => setReasons(old => ({ ...old, [item.inmuebleId]: event.target.value }))} className={inputClass}><option value="">Seleccionar motivo</option>{deletionReasons.map(reason => <option key={reason.key} value={reason.key}>{reason.label}</option>)}</select></label><label className="block text-sm font-semibold">Detalle{reasons[item.inmuebleId] === 'otro' ? ' *' : ' (opcional)'}<textarea maxLength={500} value={details[item.inmuebleId] || ''} onChange={event => setDetails(old => ({ ...old, [item.inmuebleId]: event.target.value }))} className={inputClass} /></label></fieldset>}
            {(mode === 'historico' || mode === 'suspender') && item.tieneAnuncioWeb && <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" checked={Boolean(retirarWeb[item.inmuebleId])} disabled={busy} onChange={event => setRetirarWeb(old => ({...old, [item.inmuebleId]: event.target.checked}))} className="mt-1" /><span><span className="block font-semibold">Retirar anuncio del Portal web al {mode === 'suspender' ? 'suspender' : 'cerrar'}</span><span className="mt-1 block text-xs text-slate-600">Elige si deseas retirar el anuncio. Las publicaciones en redes y el cartel se gestionan por separado.</span></span></label>}
            {mode && <button type="button" disabled={busy || (mode === 'historico' && !item.cierreDocumental.complete)} onClick={() => review(item)} className="aa-button aa-button-primary">{mode === 'eliminar' ? 'Revisar eliminación' : mode === 'suspender' ? 'Revisar suspensión' : 'Revisar cierre'}</button>}
          </div>
        </details>;
      })}
    </section>
    {confirmation && <ConfirmDialog key={`${confirmation.mode}-${confirmation.stage}`} title={confirmation.mode === 'suspender' ? 'Suspender venta temporalmente' : confirmation.mode === 'historico' ? 'Confirmar cierre de operación' : confirmation.stage === 1 ? 'Eliminar inmueble' : '¿Seguro que quieres eliminar este inmueble?'} confirmLabel={confirmation.mode === 'suspender' ? 'Suspender y pasar a Histórico' : confirmation.mode === 'historico' ? 'Cerrar y pasar a Histórico' : confirmation.stage === 1 ? 'Continuar con la eliminación' : 'Sí, eliminar definitivamente'} busy={busy} onCancel={() => { setConfirmation(null); setError(''); }} onConfirm={() => void confirm()}>
      <p className="break-words font-semibold">{propertyPanelContactId(confirmation.item)}</p>
      {confirmation.mode === 'suspender' ? <p>Se conserva la ficha con todos sus antecedentes en Histórico como Venta suspendida. La posición {confirmation.item.posicion} queda libre. Podrás retomarla asignando una nueva posición disponible.</p> : confirmation.mode === 'historico' ? <p>Se conservarán la ficha, los documentos, las fotos y el resultado de la operación. La posición {confirmation.item.posicion} quedará libre.</p> : confirmation.stage === 1 ? <p>Se eliminará este inmueble en lugar de enviarlo a Histórico. Se borrarán también sus documentos, fotos e historial.</p> : <p className="font-semibold text-red-800">Esta es la segunda y última confirmación. Se borrarán completamente la ficha, sus {confirmation.archivos} archivo(s), documentos e historial. No podrás recuperarlos desde la intranet. La posición quedará libre.</p>}
      {confirmation.mode !== 'eliminar' && confirmation.item.tieneAnuncioWeb && <p className="font-semibold">{retirarWeb[confirmation.item.inmuebleId] ? 'También se solicitará retirar el anuncio del Portal web.' : 'El anuncio del Portal web se conservará sin cambios.'}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </ConfirmDialog>}
    </>}
  </div></main>;
}
