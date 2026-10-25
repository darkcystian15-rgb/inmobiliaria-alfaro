"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Tasacion } from "@/lib/appraisal";
import { requestJson } from "@/lib/client-request";
import { filterTaskProperties } from "@/lib/property-task-list.mjs";
import { formatPrice } from "@/lib/prices.mjs";
import { priceLabel, referenceLabel, targetLabel, operationLabel } from "@/lib/operation.mjs";
import { propertyDisplayId } from "@/lib/property-display-id";
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
          <div className="border-b border-slate-200 px-5 py-4"><p className="mt-1 text-xs text-slate-500">Actualiza los valores desde Tasaciones del inmueble; el texto y la publicación conservan su estado.</p></div>
          <div className="border-b border-slate-100 p-4"><PropertyTaskSearch value={busquedaRegistradas} onChange={setBusquedaRegistradas} count={aprobadasFiltradas.length} total={aprobadas.length} disabled={cargando} /></div>
          <div className="divide-y divide-slate-100">
            {cargando ? <LoadingCards label="Cargando tasaciones registradas…" /> : aprobadas.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Esta zona no tiene tasaciones negociadas registradas.</div> : aprobadasFiltradas.length === 0 ? <div className="p-6 text-sm text-slate-500">No hay tasaciones negociadas que coincidan con la búsqueda.</div> : aprobadasFiltradas.map(item => (
              <div key={item.inmuebleId} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-semibold text-slate-900">{item.propietario || "Sin contacto"}</p><p className="mt-1 text-xs text-slate-500">{propertyDisplayId(item)} · {operationLabel(item.operacion)} · posición {item.posicion} · {item.ubicacion}</p><p className="mt-1 text-xs text-slate-500">{referenceLabel(item.operacion)}: {formatPrice(item.valorReferencia, item.valorReferenciaMoneda)} · {targetLabel(item.operacion)}: {formatPrice(item.precioObjetivo, item.precioObjetivoMoneda)} · {priceLabel(item.operacion)}: {formatPrice(item.precioVenta, item.precioVentaMoneda)}</p></div>
                <div className="flex shrink-0 flex-wrap gap-2"><Link href={`/datos-inmuebles?${new URLSearchParams({ codigo: String(item.inmuebleId), zona: item.zona, carpeta: "precios", editar: "precios" })}`} className="aa-button aa-button-secondary">Actualizar valores →</Link><Link href={`/registrar-textos?${new URLSearchParams({ inmueble: String(item.inmuebleId), zona: item.zona })}`} className="aa-button aa-button-secondary">Ir a textos →</Link></div>
              </div>
            ))}
          </div>
        </section>
      </>}
    </div>
  </main>;
}
