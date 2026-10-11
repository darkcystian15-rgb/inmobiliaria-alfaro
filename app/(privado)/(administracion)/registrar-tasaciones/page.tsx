"use client";

import { priceLabel, referenceLabel, targetLabel, operationLabel } from "@/lib/operation.mjs";
import { propertyDisplayId } from "@/lib/property-display-id";

import DraftRecovery from "@/app/components/DraftRecovery";
import PageHeading from "@/app/components/PageHeading";


import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

import { requestJson } from "@/lib/client-request";

import Link from "next/link";
import { todayInPeru } from "@/lib/calendar.mjs";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tasacion = {
  id: number;
  inmuebleId: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  tipo: string;
  operacion: string;
  propietario: string;
  dni: string;
  fechaTasacion?: string | null;
  valorReferencia?: string | null;
  precioObjetivo?: string | null;
  precioVenta?: string | null;
  situacion?: string | null;
  observacion?: string | null;
};

export default function Page() {
  const [items, setItems] = useState<Tasacion[]>([]);
  const [aprobadas, setAprobadas] = useState<Tasacion[]>([]);
  const [fechas, setFechas] = useState<Record<number, string>>({});
  const [valores, setValores] = useState<Record<number, string>>({});
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [ventas, setVentas] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);

  const hoy = useMemo(() => todayInPeru(), []);

  const cargar = useCallback((signal?: AbortSignal) => {
    return requestJson<{ pendientes: Tasacion[]; aprobadas: Tasacion[] }>("/api/tasaciones", { signal }).then(data => {
      if (signal?.aborted) return;
      const selected = new URLSearchParams(window.location.search).get("inmueble");
      setItems((data.pendientes ?? []).filter(item=>!selected||String(item.inmuebleId)===selected));
      setAprobadas(data.aprobadas ?? []);
    }).catch(error => {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : "No se pudieron cargar las tasaciones.");
    }).finally(() => {
      if (!signal?.aborted) setCargando(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const registrar = async (item: Tasacion) => {
    setError("");
    setMensaje("");
    const fecha = fechas[item.inmuebleId];
    if (!fecha) return setError(`Registra la fecha de la tasación de “${item.nombre}”.`);
    if (![valores[item.inmuebleId], precios[item.inmuebleId], ventas[item.inmuebleId]].every(value => Number(value) > 0)) return setError("Ingresa los tres precios acordados, mayores que cero.");

    try {
      setGuardando(item.inmuebleId);
      const response = await fetch("/api/tasaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inmuebleId: item.inmuebleId,
          fechaTasacion: fecha,
          valorReferencia: valores[item.inmuebleId] || null,
          precioObjetivo: precios[item.inmuebleId] || null,
          precioVenta: ventas[item.inmuebleId],
          observacion: observaciones[item.inmuebleId] || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible registrar la tasación.");
      for(const setter of [setFechas,setValores,setPrecios,setVentas,setObservaciones])setter(current=>{const next={...current};delete next[item.inmuebleId];return next;});
      setMensaje(`Tasación de “${item.nombre}” registrada correctamente.`);
      setCargando(true);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la tasación.");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
      <DraftRecovery draftKey="tasaciones:actual" data={{fechas,valores,precios,ventas,observaciones}} dirty={[fechas,valores,precios,ventas,observaciones].some(record=>Object.values(record).some(Boolean))} onRestore={draft=>{if(draft.fechas)setFechas(draft.fechas as Record<number,string>);if(draft.valores)setValores(draft.valores as Record<number,string>);if(draft.precios)setPrecios(draft.precios as Record<number,string>);if(draft.ventas)setVentas(draft.ventas as Record<number,string>);if(draft.observaciones)setObservaciones(draft.observaciones as Record<number,string>);}}/>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <PageHeading href="/registrar-tasaciones" />
          <Link href="/tasaciones-textos-pendientes" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300">Ver seguimiento →</Link>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Acción principal</p>
              <p className="mt-1 text-sm font-semibold">Registra los tres precios una vez concluida la negociación con el propietario.</p>
            </div>
            <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-xs font-bold text-orange-200">Siguiente: seguimiento</span>
          </div>
        </section>

        {mensaje && <Feedback tone="success" className="my-5">{mensaje}</Feedback>}
        {error && <Feedback tone="error" className="my-5">{error}</Feedback>}

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)]"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Por registrar</p><p className="mt-2 text-3xl font-bold text-slate-950">{items.length}</p><p className="mt-1 text-xs text-slate-500">inmuebles con visita realizada</p></div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Tasación vigente</p><p className="mt-2 text-3xl font-bold text-slate-950">{aprobadas.length}</p><p className="mt-1 text-xs text-orange-700/80">negociadas actualmente</p></div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Fuente</p><p className="mt-2 text-lg font-bold text-cyan-950">Base de datos</p><p className="mt-1 text-xs text-cyan-700/80">precios y observaciones guardados</p></div>
        </section>

        <section className="mt-7">
          <div className="mb-3"><h2 className="font-bold text-slate-900">Tasaciones por registrar</h2><p className="mt-1 text-sm text-slate-500">Estos inmuebles están activos, tienen posición asignada y todavía no tienen tasación registrada.</p></div>
          {cargando ? <LoadingCards label="Cargando inmuebles…" /> : items.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div><h3 className="mt-4 font-bold text-emerald-950">No hay tasaciones pendientes</h3><p className="mt-1 text-sm text-emerald-800/80">Las visitas realizadas ya tienen tasación registrada o no existen inmuebles pendientes.</p></div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.inmuebleId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-base font-bold text-orange-700">{item.posicion}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{item.nombre}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.tipo} · {operationLabel(item.operacion)}</span></div><p className="mt-1 text-xs text-slate-500">{item.ubicacion} · {item.codigo}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario} · DNI {item.dni}</p></div></div>
                        <span className="self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Tasación pendiente</span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600">Fecha de tasación *<input type="date" max={hoy} value={fechas[item.inmuebleId] ?? ""} onChange={(e) => setFechas(a => ({...a,[item.inmuebleId]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                        <label className="text-xs font-semibold text-slate-600">{referenceLabel(item.operacion)} *<input type="number" min="0" step="0.01" value={valores[item.inmuebleId] ?? ""} onChange={(e) => setValores(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder={item.operacion === "alquiler" ? "1500" : "320000"} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                        <label className="text-xs font-semibold text-slate-600">{targetLabel(item.operacion)} *<input type="number" min="0" step="0.01" value={precios[item.inmuebleId] ?? ""} onChange={(e) => setPrecios(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder={item.operacion === "alquiler" ? "1500" : "315000"} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                        <label className="text-xs font-semibold text-slate-600">{priceLabel(item.operacion)} acordada/o *<input type="number" min="0.01" step="0.01" value={ventas[item.inmuebleId] ?? ""} onChange={e => setVentas(a => ({ ...a, [item.inmuebleId]: e.target.value }))} placeholder={item.operacion === "alquiler" ? "1500" : "450000"} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                      </div>
                      <label className="text-xs font-semibold text-slate-600">Observación<textarea rows={3} value={observaciones[item.inmuebleId] ?? ""} onChange={(e) => setObservaciones(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder="Precio conversado, ajustes, comentarios del propietario..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                      <div className="flex flex-col gap-3 rounded-xl bg-[#f7f7f5] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Al guardar confirmas que el precio o renta mensual ya fue acordado con el propietario.</p><button disabled={guardando === item.inmuebleId} onClick={() => registrar(item)} className="rounded-xl bg-[#c80000] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{guardando === item.inmuebleId ? "Guardando..." : "Registrar tasación"}</button></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Tasaciones negociadas registradas</h2><p className="mt-1 text-xs text-slate-500">El precio o renta mensual y la observación se pueden modificar desde la bandeja de seguimiento.</p></div>
          <div className="divide-y divide-slate-100">
            {aprobadas.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Todavía no hay tasaciones negociadas.</div> : aprobadas.map(item => (
              <div key={item.inmuebleId} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-semibold text-slate-900">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">{propertyDisplayId(item)} · {operationLabel(item.operacion)} · posición {item.posicion} · {item.ubicacion}</p><p className="mt-1 text-xs text-slate-500">{referenceLabel(item.operacion)}: {item.valorReferencia ? `S/ ${item.valorReferencia}` : "sin valor"}{item.precioObjetivo ? ` · objetivo S/ ${item.precioObjetivo}` : ""}{item.precioVenta ? ` · ${priceLabel(item.operacion).toLowerCase()} S/ ${item.precioVenta}` : ""}</p></div>
                <Link href={`/tasaciones-textos-pendientes?inmueble=${item.inmuebleId}#material`} className="rounded-xl bg-[#c80000] px-4 py-2.5 text-sm font-semibold text-white">Ver precios y preparar texto →</Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
