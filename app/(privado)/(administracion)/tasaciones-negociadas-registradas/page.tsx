"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Tasacion } from "@/lib/appraisal";
import { requestJson } from "@/lib/client-request";
import { filterTaskProperties } from "@/lib/property-task-list.mjs";
import { formatPrice } from "@/lib/prices.mjs";
import { priceLabel, referenceLabel, targetLabel } from "@/lib/operation.mjs";
import FolderIcon from "@/app/components/FolderIcon";
import PropertyListIdentity from "@/app/components/PropertyListIdentity";
import PropertyTaskSearch from "@/app/components/PropertyTaskSearch";
import PageHeading from "@/app/components/PageHeading";
import { ContextLink as Link, ReturnLink } from "@/app/components/NavigationReturn";
import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

export default function Page() {
  const [aprobadas, setAprobadas] = useState<Tasacion[]>([]);
  const [busquedaRegistradas, setBusquedaRegistradas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const aprobadasFiltradas = useMemo(() => filterTaskProperties(aprobadas, busquedaRegistradas), [aprobadas, busquedaRegistradas]);
  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError("");
    try {
      const data = await requestJson<{ aprobadas: Tasacion[] }>("/api/tasaciones", { signal });
      if (!signal?.aborted) setAprobadas(data.aprobadas ?? []);
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : "No se pudieron consultar las tasaciones.");
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void cargar(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [cargar]);

  return <main className="min-h-screen bg-background p-5 lg:p-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <PageHeading href="/tasaciones-negociadas-registradas" /><ReturnLink />
        <Link href="/registrar-tasaciones" className="aa-button aa-button-secondary">Registrar tasaciones →</Link>
      </div>
      {error ? <Feedback tone="error" className="my-5">{error}<button type="button" disabled={cargando} onClick={() => void cargar()} className="aa-button aa-button-secondary mt-3">{cargando ? "Cargando…" : "Reintentar"}</button></Feedback> : <>
        <section aria-label="Listado de tasaciones registradas" className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><FolderIcon className="h-5 w-5 shrink-0 text-emerald-600" />Tasaciones negociadas registradas</h2><p className="mt-2 text-xs leading-5 text-slate-600">Actualiza los valores desde Tasaciones del inmueble; el texto y la publicación conservan su estado.</p></div>
          <div className="border-b border-slate-100 p-4"><PropertyTaskSearch value={busquedaRegistradas} onChange={setBusquedaRegistradas} count={aprobadasFiltradas.length} total={aprobadas.length} disabled={cargando} /></div>
          <div className="p-4 sm:p-5">
            {cargando ? <LoadingCards label="Cargando tasaciones registradas…" /> : aprobadas.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Esta zona no tiene tasaciones negociadas registradas.</div> : aprobadasFiltradas.length === 0 ? <div className="p-6 text-sm text-slate-500">No hay tasaciones negociadas que coincidan con la búsqueda.</div> : <ul className="grid gap-x-4 gap-y-8 pt-4 lg:grid-cols-2">{aprobadasFiltradas.map(item => (
              <li key={item.inmuebleId} className="cartera-folder relative flex min-w-0 flex-col rounded-b-2xl rounded-tr-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm hover:border-emerald-300">
                <span aria-hidden="true" className="cartera-folder-tab absolute -top-4 -left-px h-4 w-24 rounded-t-lg border border-b-0 border-emerald-200 bg-emerald-100" />
                <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800"><FolderIcon className="h-5 w-5 shrink-0 text-emerald-600" />Tasación registrada</span>
                  <span className="min-w-0 break-words text-right text-xs text-slate-500">{item.zona}</span>
                </div>
                <div className="p-4">
                  <PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.ubicacion || item.direccion} positionClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-100/70 font-mono text-xs font-bold text-emerald-900" />
                  <dl className="mt-4 grid gap-3 rounded-xl border border-emerald-100 bg-white p-3 sm:grid-cols-3">
                    {[
                      [referenceLabel(item.operacion), formatPrice(item.valorReferencia, item.valorReferenciaMoneda)],
                      [targetLabel(item.operacion), formatPrice(item.precioObjetivo, item.precioObjetivoMoneda)],
                      [priceLabel(item.operacion), formatPrice(item.precioVenta, item.precioVentaMoneda)],
                    ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs leading-5 text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-slate-900">{value}</dd></div>)}
                  </dl>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-emerald-100 px-4 py-3"><Link href={`/datos-inmuebles?${new URLSearchParams({ codigo: String(item.inmuebleId), zona: item.zona, carpeta: "precios", editar: "precios" })}`} className="aa-button aa-button-secondary text-xs">Actualizar valores →</Link><Link href={`/registrar-textos?${new URLSearchParams({ inmueble: String(item.inmuebleId), zona: item.zona })}`} className="aa-button aa-button-secondary text-xs">Ir a textos →</Link></div>
              </li>
            ))}</ul>}
          </div>
        </section>
      </>}
    </div>
  </main>;
}
