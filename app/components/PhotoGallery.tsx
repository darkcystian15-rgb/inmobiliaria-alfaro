"use client";

import Image from 'next/image';
import { useSessionUser } from './SessionProvider';
import { isAdministrator } from '@/lib/access.mjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoUploader, { type UploadedPhoto } from './PhotoUploader';

export type PropertyPhoto = UploadedPhoto & { tipoDocumento: string; tipoMime: string | null; almacenamiento: string; observacion: string | null; esPortada: boolean; visitaId: number | null; fechaRegistro: string };
export default function PhotoGallery({ propertyId, editable: requestedEditable = false, onChanged, onBusyChange, visitaId, allowUpload = true }: {
  visitaId?: number | null; allowUpload?: boolean; propertyId: number | string; editable?: boolean; onChanged?: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const canDelete = isAdministrator(useSessionUser());
  const editable = requestedEditable && canDelete;
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<PropertyPhoto | null>(null);
  const [deleting, setDeleting] = useState<PropertyPhoto | null>(null);
  const loadVersion = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const url = `/api/inmuebles/${encodeURIComponent(propertyId)}/archivos`;
  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++loadVersion.current;
    try {
      const response = await fetch(url, { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron consultar las fotos.');
      if (!signal?.aborted && version === loadVersion.current) { setError(''); setPhotos(data.archivos.filter((file: PropertyPhoto) => (visitaId === undefined || file.visitaId === visitaId) && file.tipoDocumento === 'FOTO_INMUEBLE' && file.almacenamiento === 'hosting' && file.tipoMime?.startsWith('image/')).sort((a: PropertyPhoto, b: PropertyPhoto) => Number(b.esPortada) - Number(a.esPortada) || b.id - a.id)); }
    } catch (error) { if (!signal?.aborted && version === loadVersion.current) setError(error instanceof Error ? error.message : 'No se pudieron cargar las fotos.'); }
    finally { if (!signal?.aborted && version === loadVersion.current) setLoading(false); }
  }, [url, visitaId]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); });
    return () => controller.abort();
  }, [load]);
  const photo = photos.find(photo => photo.id === selected);
  useEffect(() => {
    const element = dialog.current;
    if (selected !== null) element?.showModal(); else element?.close();
    return () => element?.close();
  }, [selected]);
  async function change(method: 'PATCH' | 'DELETE', photo: PropertyPhoto, cover = false) {
    if (busy) return;
    setBusy(true); onBusyChange?.(true); setError('');
    try {
      const response = await fetch(method === 'DELETE' ? `${url}?archivoId=${photo.id}` : url, {
        method, headers: method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'PATCH' ? JSON.stringify({ archivoId: photo.id, nombre: photo.nombre, observacion: photo.observacion || '', ...(cover ? { esPortada: true } : {}) }) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la foto.');
      if (method === 'DELETE' && selected === photo.id) setSelected(null);
      setEditing(null); setDeleting(null); await load(); onChanged?.();
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo actualizar la foto.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  function navigate(direction: number) {
    const index = photos.findIndex(photo => photo.id === selected);
    setSelected(photos[(index + direction + photos.length) % photos.length].id);
  }
  return <section className="space-y-4" aria-label={visitaId === undefined ? "Fotos del inmueble" : visitaId === null ? "Fotos anteriores sin visita" : "Fotos de la visita"}>
    <div><h3 className="text-sm font-bold text-slate-900">{visitaId === undefined ? "Fotos del inmueble" : visitaId === null ? "Fotos anteriores sin visita" : "Fotos de esta visita"}</h3><p className="mt-1 text-xs leading-5 text-slate-500">Las fotos de las visitas y de la ficha se guardan juntas. Pulsa una imagen para ampliarla.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Cargando fotos…</p> : !photos.length ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay fotos guardadas para este inmueble.</p> : <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
      {photos.map(photo => <article key={photo.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button type="button" onClick={() => setSelected(photo.id)} className="block w-full text-left" aria-label={`Ampliar ${photo.nombre}`}>
          <Image unoptimized src={photo.enlace} alt={photo.nombre} width={480} height={360} className="aspect-[4/3] w-full object-cover" />
          <div className="p-3"><p className="truncate text-xs font-semibold text-slate-800">{photo.nombre}</p><p className="mt-1 text-xs text-slate-500">{photo.visitaId ? 'Foto de visita' : 'Foto del inmueble'} · {new Date(photo.fechaRegistro).toLocaleDateString('es-PE')}</p>{photo.esPortada && <span className="mt-2 inline-block rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Portada</span>}</div>
        </button>
        {editable && <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2"><button type="button" disabled={busy} onClick={() => { setEditing(photo); setDeleting(null); }} className="text-xs font-semibold text-slate-600">Editar</button><button type="button" disabled={busy || photo.esPortada} onClick={() => { void change('PATCH', photo, true); }} className="text-xs font-semibold text-red-700 disabled:text-slate-500">Elegir portada</button>{canDelete && <button type="button" disabled={busy} onClick={() => { setDeleting(photo); setEditing(null); }} className="text-xs text-slate-500">Eliminar</button>}</div>}
      </article>)}
    </div>}
    {editable && editing && <form onSubmit={event => { event.preventDefault(); void change('PATCH', editing); }} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><h4 className="text-sm font-bold">Editar foto</h4><label className="block text-xs font-semibold">Nombre<input required maxLength={255} value={editing.nombre} disabled={busy} onChange={event => setEditing({ ...editing, nombre: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" /></label><label className="block text-xs font-semibold">Descripción<textarea maxLength={500} value={editing.observacion || ''} disabled={busy} onChange={event => setEditing({ ...editing, observacion: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" /></label><div className="flex gap-3"><button type="submit" disabled={busy} className="rounded-xl bg-[#c80000] px-4 py-2 text-xs font-semibold text-white">{busy ? 'Guardando…' : 'Guardar'}</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="text-xs font-semibold text-slate-600">Cancelar</button></div></form>}
    {editable && canDelete && deleting && <div role="region" aria-label="Confirmar eliminación de foto" className="rounded-2xl border border-red-200 bg-red-50/50 p-4"><p className="min-w-0 break-words text-sm font-semibold text-slate-800">¿Eliminar «{deleting.nombre}»?</p><p className="mt-1 text-xs text-slate-500">Se eliminará de la visita, la ficha y la galería. Esta acción no se puede deshacer.</p><div className="mt-4 flex gap-3"><button type="button" disabled={busy} onClick={() => setDeleting(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold">Cancelar</button><button type="button" disabled={busy} onClick={() => { void change('DELETE', deleting); }} className="rounded-xl bg-[#c80000] px-4 py-2 text-xs font-semibold text-white">{busy ? 'Eliminando…' : 'Eliminar foto'}</button></div></div>}
    {editable && allowUpload && <PhotoUploader propertyId={propertyId} visitaId={visitaId ?? undefined} photos={[]} showPreviews={false} disabled={busy} onUploaded={() => { void load(); onChanged?.(); }} onBusyChange={uploading => { setBusy(uploading); onBusyChange?.(uploading); }} />}
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); setSelected(null); }} aria-label="Imagen ampliada" className="fixed inset-0 m-auto max-h-[95vh] w-[calc(100%_-_2rem)] max-w-5xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl backdrop:bg-slate-950/70">
      {photo && <><div className="mb-3 flex items-center justify-between gap-3"><p className="min-w-0 break-words text-sm font-semibold text-slate-800">{photo.nombre}</p><button type="button" autoFocus onClick={() => setSelected(null)} className="min-h-11 shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Cerrar</button></div><Image unoptimized src={photo.enlace} alt={photo.nombre} width={1920} height={1440} className="max-h-[65vh] w-full object-contain" />{photo.observacion && <p className="mt-3 text-sm text-slate-500">{photo.observacion}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={photos.length < 2} onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold disabled:opacity-40">Anterior</button><a href={`${photo.enlace}?download=1`} className="text-xs font-semibold text-red-700">Descargar</a><button type="button" disabled={photos.length < 2} onClick={() => navigate(1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold disabled:opacity-40">Siguiente</button></div></>}
    </dialog>
  </section>;
}
