"use client";

import { useEffect, useState } from 'react';
import { ContextLink as Link } from './NavigationReturn';
import { informationFolders } from '@/lib/property-folders.mjs';
import { sectionsForOperation } from '@/lib/transaction-dossier.mjs';

type Section = { key: string; pending: number; completed: number; total: number };

export default function PortfolioDocumentChecklist({ propertyId, operation, zone }: {
  propertyId: number; operation: string; zone?: string;
}) {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/inmuebles/${propertyId}/expediente`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.status?.sections)) throw Error('Expediente no disponible');
        setSections(data.status.sections);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    })();
    return () => controller.abort();
  }, [propertyId, operation, attempt]);
  const keys = new Set(sectionsForOperation(operation).map(([key]: string[]) => key));
  const folders = informationFolders(operation, false).filter((folder: { key: string }) => keys.has(folder.key));
  return <section aria-label="Documentación antes de publicar" className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Antes de publicar</p>
      <h4 className="mt-1 text-base font-bold text-slate-900">Documentación del inmueble</h4>
      <p className="mt-1 text-xs leading-5 text-slate-600">Revisa las carpetas y completa cada apartado en Información del inmueble.</p>
      {error && <div role="alert" className="mt-3 text-sm text-red-700">No se pudo consultar el estado documental. <button type="button" className="underline" onClick={() => { setSections(null); setError(false); setAttempt(value => value + 1); }}>Reintentar</button></div>}
    </div>
    <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
      {folders.map((folder: { key: string; label: string; description: string }) => {
        const status = sections?.find(section => section.key === folder.key);
        const complete = status && status.total > 0 && status.pending === 0;
        const href = `/datos-inmuebles?${new URLSearchParams({ codigo: String(propertyId), ...(zone ? { zona: zone } : {}), carpeta: folder.key })}`;
        return <li key={folder.key} className="flex min-h-40 flex-col rounded-xl border border-slate-200 p-4">
          <h5 className="text-sm font-semibold text-slate-900">{folder.label}</h5>
          <p className="mt-1 text-xs leading-5 text-slate-600">{folder.description}</p>
          <p className="mt-2 text-xs text-slate-500">{status ? status.total ? `${status.completed} de ${status.total} documentos requeridos · ${status.pending} pendientes` : 'Sin documentos exigidos según las condiciones actuales' : error ? 'Estado no disponible' : 'Consultando estado…'}</p>
          <Link href={href} className="mt-auto inline-flex min-h-11 items-center pt-3 text-xs font-bold text-[#a40000]">{complete ? 'Ver registro' : status?.total ? 'Completar' : 'Abrir apartado'} <span aria-hidden="true" className="ml-1">→</span></Link>
        </li>;
      })}
    </ul>
    <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">Las condiciones del expediente determinan los documentos requeridos. Completar las carpetas no publica el anuncio automáticamente.</p>
  </section>;
}
