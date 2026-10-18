"use client";

import { useCallback, useEffect, useState } from 'react';
import PhotoUploader from './PhotoUploader';
import PhotoGallery from './PhotoGallery';

type Visit = { id: number; fecha: string | null; observaciones: string | null; responsable: string | null; fotos: number; pendienteEvidencia: boolean };

export default function PropertyVisits({ propertyId, onBusyChange, onChanged }: { propertyId: number; onBusyChange: (busy: boolean) => void; onChanged: () => void }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/inmuebles/${propertyId}/visitas`, { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron consultar las visitas.');
      if (!signal?.aborted) { setVisits(data.visitas); setError(''); }
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'No se pudieron consultar las visitas.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [propertyId]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); });
    return () => controller.abort();
  }, [load]);

  return <section className="space-y-4" aria-label="Visitas y evidencia">
    <div><h3 className="text-sm font-bold text-slate-900">Visitas y evidencia</h3><p className="mt-1 text-xs leading-5 text-slate-500">Agrega al menos una foto a cada visita pendiente de evidencia. Consulta las fotos dentro de cada visita. Las fotos antiguas sin visita se conservan al final.</p></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}<button type="button" disabled={busy} onClick={() => void load()} className="ml-3 underline">Reintentar</button></div>}
    {loading ? <p role="status" className="text-sm text-slate-500">Cargando visitas…</p> : !visits.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Todavía no hay visitas realizadas.</p> : visits.map(visit => <article key={visit.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-sm font-bold">Visita del {visit.fecha ? visit.fecha.slice(0, 10).split('-').reverse().join('/') : 'fecha sin definir'}</h4>{visit.responsable && <p className="mt-1 text-xs text-slate-500">Registrada por {visit.responsable}</p>}</div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${visit.pendienteEvidencia ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{visit.pendienteEvidencia ? 'Pendiente de evidencia' : `Con evidencia · ${visit.fotos} foto(s)`}</span></div>
      {visit.observaciones && <p className="whitespace-pre-wrap text-sm text-slate-600">{visit.observaciones}</p>}
      <PhotoGallery key={`${visit.id}-${visit.fotos}`} propertyId={propertyId} visitaId={visit.id} editable allowUpload={false} onBusyChange={value => { setBusy(value); onBusyChange(value); }} onChanged={() => { void load(); onChanged(); }} />
      <PhotoUploader propertyId={propertyId} visitaId={visit.id} photos={[]} disabled={busy} showPreviews={false} onBusyChange={value => { setBusy(value); onBusyChange(value); }} onUploaded={() => { void load(); onChanged(); }} />
    </article>)}
  </section>;
}
