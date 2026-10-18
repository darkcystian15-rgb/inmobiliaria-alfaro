"use client";

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import PageHeading from '@/app/components/PageHeading';
import FileViewer from '@/app/components/FileViewer';
import { useZoneWorkspace } from '@/app/components/ZoneWorkspace';
import { fileListTypes } from '@/lib/file-list.mjs';

type FileRow = { id: number; inmuebleId: number; inmueble: string; zona: string; tipo: string; nombre: string; tipoMime: string | null; enlace: string; almacenamiento: string };
type Result = { archivos: FileRow[]; paginacion: { pagina: number; paginas: number; total: number } };

export default function FileListPage() {
  const params = useSearchParams(), pathname = usePathname();
  const { zones, loading: zonesLoading, error: zonesError, reload } = useZoneWorkspace();
  const zone = params.get('zona') || '*', type = params.get('tipo') || '*', page = params.get('pagina') || '1';
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [viewer, setViewer] = useState<FileRow | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true); setError(''); setResult(null); setViewer(null);
      try {
        const response = await fetch(`/api/listado-archivos?${new URLSearchParams({ zona: zone, tipo: type, pagina: page })}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'No se pudieron consultar los archivos.');
        if (!controller.signal.aborted) setResult(data);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudieron consultar los archivos.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    });
    return () => controller.abort();
  }, [zone, type, page, retry]);
  function filter(key: string, value: string) {
    // Read the URL synchronously so rapid changes merge both filters before React renders.
    const next = new URLSearchParams(window.location.search);
    next.set(key, value);
    if (key !== 'pagina') next.delete('pagina');
    window.history.replaceState(null, '', `${pathname}?${next}`);
  }
  const missingZone = zone !== '*' && !zonesLoading && !zones.some(item => item.nombre === zone);
  return <main className="min-h-screen p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl">
    <PageHeading href="/listado-archivos" />
    <p className="mt-3 text-sm text-slate-600">Consulta los archivos cargados en Información de inmuebles. Los resultados se actualizan al cambiar los filtros.</p>
    <section aria-label="Filtros de archivos" className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Zona<select aria-label="Zona" value={zone} disabled={zonesLoading} onChange={event => filter('zona', event.target.value)} className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm">
        <option value="*">Todas las zonas activas</option>{missingZone && <option value={zone}>{zone} (no disponible)</option>}{zones.map(item => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
      </select></label>
      <label className="text-sm font-semibold">Tipo de archivo<select aria-label="Tipo de archivo" value={type} onChange={event => filter('tipo', event.target.value)} className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm">
        <option value="*">Todos los tipos</option>{fileListTypes.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
      </select></label>
      {zonesError && <p role="alert" className="text-sm text-red-700">{zonesError} <button type="button" onClick={() => void reload()} className="underline">Reintentar zonas</button></p>}
    </section>
    <section aria-label="Resultados de archivos" aria-busy={loading} className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Archivos encontrados</h2><p role="status" className="mt-1 text-sm text-slate-500">{loading ? 'Consultando archivos…' : error ? 'No se pudo completar la consulta.' : `${result?.paginacion.total || 0} archivo(s)`}</p></div>
      {error ? <div role="alert" className="p-5 text-sm text-red-700">{error}<button type="button" onClick={() => setRetry(value => value + 1)} className="aa-button aa-button-secondary ml-3">Reintentar</button></div> : loading ? <p className="p-6 text-sm text-slate-500">Cargando resultados…</p> : !result?.archivos.length ? <p className="p-6 text-sm text-slate-500">No hay archivos cargados que coincidan con estos filtros.</p> : <div className="overflow-x-auto"><table className="w-full table-fixed text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th scope="col" className="w-[43%] p-4">ID del inmueble</th><th scope="col" className="w-[35%] p-4">Tipo de archivo</th><th scope="col" className="w-[22%] p-4">Archivo</th></tr></thead><tbody className="divide-y divide-slate-100">{result.archivos.map(file => <tr key={file.id}><td className="break-words p-3 font-mono text-xs sm:p-4">{file.inmueble}<span className="mt-1 block font-sans text-slate-500">{file.zona}</span></td><td className="break-words p-3 sm:p-4"><p className="font-semibold">{file.tipo}</p><p className="mt-1 text-xs text-slate-500">{file.nombre}</p></td><td className="p-2 sm:p-4"><button type="button" aria-label={`Ver ${file.tipo} de ${file.inmueble}`} onClick={() => setViewer(file)} className="min-h-11 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-[#c80000] hover:bg-red-50">Ver archivo</button></td></tr>)}</tbody></table></div>}
      {result && result.paginacion.paginas > 1 && !loading && <nav aria-label="Páginas de archivos" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm"><button type="button" disabled={result.paginacion.pagina <= 1} onClick={() => filter('pagina', String(result.paginacion.pagina - 1))} className="aa-button aa-button-secondary disabled:opacity-40">Anterior</button><span>Página {result.paginacion.pagina} de {result.paginacion.paginas}</span><button type="button" disabled={result.paginacion.pagina >= result.paginacion.paginas} onClick={() => filter('pagina', String(result.paginacion.pagina + 1))} className="aa-button aa-button-secondary disabled:opacity-40">Siguiente</button></nav>}
    </section>
    {viewer && <FileViewer file={viewer} onClose={() => setViewer(null)} />}
  </div></main>;
}
