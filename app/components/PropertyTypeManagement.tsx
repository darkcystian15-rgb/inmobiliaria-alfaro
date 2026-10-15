"use client";

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import ConfirmDialog from './ConfirmDialog';
import PageHeading from './PageHeading';

type Type = { id: number; nombre: string; activo: boolean; inmuebles: number };
export default function PropertyTypeManagement() {
  const [types, setTypes] = useState<Type[]>([]);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<Type | null>(null);
  const [editing, setEditing] = useState<Type | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/tipos-inmueble', { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron consultar los tipos.');
      if (!signal?.aborted) { setTypes(data.tipos); setError(''); }
    } catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'No se pudieron consultar los tipos.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); });
    return () => controller.abort();
  }, [load]);
  async function mutate(method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/tipos-inmueble', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el tipo.');
      if (method === 'DELETE') { setDeleting(null); if (editing?.id === body.id) { setEditing(null); setName(''); } }
      if (body.nombre !== undefined) { setEditing(null); setName(''); }
      await load(); setMessage(method === 'DELETE' ? 'Tipo eliminado correctamente.' : 'Cambio guardado. Las opciones están disponibles en el registro y la ficha.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar el tipo.'); }
    finally { setBusy(false); setDeleting(null); }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void mutate(editing ? 'PATCH' : 'POST', { ...(editing ? { id: editing.id } : {}), nombre: name.trim() });
  }
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeading href="/tipos-inmueble" />
    <p className="text-sm leading-6 text-slate-600">Agrega tipos para el registro y la ficha. Renombrar un tipo actualiza su nombre en todos los inmuebles vinculados. Desactivarlo conserva esos inmuebles y evita seleccionarlo en registros nuevos. Solo puedes eliminar tipos sin inmuebles vinculados, incluidos los históricos.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" disabled={busy} onClick={() => void load()} className="ml-3 underline">Recargar</button></p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <form onSubmit={save} className="aa-card space-y-4 p-5"><h2 className="text-base font-bold">{editing ? 'Editar tipo' : 'Agregar tipo'}</h2>
      <label className="block text-sm font-semibold">Nombre del tipo<input required maxLength={30} value={name} disabled={busy || loading} onChange={event => setName(event.target.value)} placeholder="Ej. Almacén, dúplex o cochera" className="mt-2 block w-full rounded-xl border border-slate-200 p-3 font-normal sm:max-w-md" /></label>
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || loading || !name.trim()} className="aa-button aa-button-primary">{busy ? 'Guardando…' : editing ? 'Guardar nombre' : 'Agregar tipo'}</button>{editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setName(''); }} className="aa-button aa-button-secondary">Cancelar</button>}</div>
    </form>
    <section className="aa-card p-5" aria-label="Tipos de inmueble registrados"><h2 className="text-base font-bold">Tipos registrados</h2>
      {loading ? <p role="status" className="mt-4 text-sm text-slate-500">Cargando tipos…</p> : <ul className="mt-3 divide-y divide-slate-200">{types.map(type => <li key={type.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0"><p className="break-words text-sm font-bold">{type.nombre} <span className={`ml-2 rounded-full px-2 py-1 text-xs ${type.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{type.activo ? 'Activo' : 'Inactivo'}</span></p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { setEditing(type); setName(type.nombre); setMessage(''); }} className="aa-button aa-button-secondary">Editar nombre</button><button type="button" disabled={busy} onClick={() => void mutate('PATCH', { id: type.id, activo: !type.activo })} className="aa-button aa-button-secondary">{type.activo ? 'Desactivar' : 'Activar'}</button><button type="button" disabled={busy || Number(type.inmuebles) > 0} title={Number(type.inmuebles) > 0 ? 'Tiene inmuebles vinculados; puedes desactivarlo' : 'Eliminar tipo sin inmuebles vinculados'} onClick={() => setDeleting(type)} className="aa-button aa-button-secondary disabled:cursor-not-allowed disabled:opacity-50">Eliminar</button></div>
      </li>)}</ul>}
    </section>
    {deleting && <ConfirmDialog title={`Eliminar «${deleting.nombre}»`} confirmLabel="Eliminar tipo" busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void mutate('DELETE', { id: deleting.id })}><p>Este tipo no tiene inmuebles vinculados. Se quitará del catálogo y de las opciones del registro.</p></ConfirmDialog>}
  </main>;
}
