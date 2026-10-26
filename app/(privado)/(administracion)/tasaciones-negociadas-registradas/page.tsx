"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Tasacion } from "@/lib/appraisal";
import { requestJson } from "@/lib/client-request";
import { filterTaskProperties } from "@/lib/property-task-list.mjs";
import { formatPrice } from "@/lib/prices.mjs";
import { priceLabel, referenceLabel, targetLabel } from "@/lib/operation.mjs";
import FolderIcon from "@/app/components/FolderIcon";
import PropertyTaskRow from "@/app/components/PropertyTaskRow";
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
          <div>
            {cargando ? <LoadingCards label="Cargando tasaciones registradas…" /> : aprobadas.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Esta zona no tiene tasaciones negociadas registradas.</div> : aprobadasFiltradas.length === 0 ? <div className="p-6 text-sm text-slate-500">No hay tasaciones negociadas que coincidan con la búsqueda.</div> : <ul className="divide-y divide-slate-100">{aprobadasFiltradas.map(item => (
              <li key={item.inmuebleId}>
                <PropertyTaskRow position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.ubicacion || item.direccion}
                  color="emerald" label="Tasación registrada" actions={<>
                    <Link href={`/datos-inmuebles?${new URLSearchParams({ codigo: String(item.inmuebleId), zona: item.zona, carpeta: "precios", editar: "precios" })}`} className="aa-button aa-button-secondary text-xs">Actualizar valores →</Link>
                    <Link href={`/registrar-textos?${new URLSearchParams({ inmueble: String(item.inmuebleId), zona: item.zona })}`} className="aa-button aa-button-secondary text-xs">Ir a textos →</Link>
                  </>}>
                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                    {[
                      [referenceLabel(item.operacion), formatPrice(item.valorReferencia, item.valorReferenciaMoneda)],
                      [targetLabel(item.operacion), formatPrice(item.precioObjetivo, item.precioObjetivoMoneda)],
                      [priceLabel(item.operacion), formatPrice(item.precioVenta, item.precioVentaMoneda)],
                    ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs leading-5 text-slate-500">{label}</dt><dd className="break-words text-xs font-semibold text-slate-900">{value}</dd></div>)}
                  </dl>
                </PropertyTaskRow>
              </li>
            ))}</ul>}
          </div>
        </section>
      </>}
    </div>
  </main>;
}
