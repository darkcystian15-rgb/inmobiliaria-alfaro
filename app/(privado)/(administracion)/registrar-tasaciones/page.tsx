"use client";
import CurrencySelect from "@/app/components/CurrencySelect";
import { formatPrice } from "@/lib/prices.mjs";
import { zoneUrl } from "@/lib/zone-url";
import PropertyTaskSearch from "@/app/components/PropertyTaskSearch";
import { filterTaskProperties } from "@/lib/property-task-list.mjs";


import PropertySummary from "@/app/components/PropertySummary";

import { priceLabel, referenceLabel, targetLabel, operationLabel } from "@/lib/operation.mjs";
import { propertyDisplayId } from "@/lib/property-display-id";

import { MobileFormFeedback } from "@/app/components/MobileFormActions";
import FieldGuidance from "@/app/components/FieldGuidance";
import DraftRecovery from "@/app/components/DraftRecovery";
import RegistrationSuccess, { type NextRegistrationAction } from "@/app/components/RegistrationSuccess";
import { ReturnLink } from "@/app/components/NavigationReturn";
import PageHeading from "@/app/components/PageHeading";


import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

import { requestJson } from "@/lib/client-request";

import { ContextLink as Link } from "@/app/components/NavigationReturn";
import { todayInPeru } from "@/lib/calendar.mjs";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tasacion = {
  id: number;
  inmuebleId: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  direccion: string | null;
  tipo: string;
  operacion: string;
  propietario: string;
  fechaTasacion?: string | null;
  valorReferencia?: string | null;
  precioObjetivo?: string | null;
  precioVenta?: string | null;
  valorReferenciaMoneda?: string; precioObjetivoMoneda?: string; precioVentaMoneda?: string;
  situacion?: string | null;
  observacion?: string | null;
};

export default function Page() {
  const [items, setItems] = useState<Tasacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [aprobadas, setAprobadas] = useState<Tasacion[]>([]);
  const [fechas, setFechas] = useState<Record<number, string>>({});
  const [valores, setValores] = useState<Record<number, string>>({});
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [ventas, setVentas] = useState<Record<number, string>>({});
  const [monedas, setMonedas] = useState<Record<number, Record<string, string>>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [siguienteAccion, setSiguienteAccion] = useState<NextRegistrationAction | null>(null);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [registroIntentado, setRegistroIntentado] = useState<number | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);

  const hoy = useMemo(() => todayInPeru(), []);
  const filtrados = useMemo(() => filterTaskProperties(items, busqueda), [items, busqueda]);
  const aprobadasFiltradas = useMemo(() => filterTaskProperties(aprobadas, busqueda), [aprobadas, busqueda]);
  const totalBusqueda = new Set([...items, ...aprobadas].map(item => item.inmuebleId)).size;
  const totalFiltrados = new Set([...filtrados, ...aprobadasFiltradas].map(item => item.inmuebleId)).size;

  const cargar = useCallback((signal?: AbortSignal) => {
    if (!signal?.aborted) { setCargando(true); setError(""); setErrorCarga(false); }
    return requestJson<{ pendientes: Tasacion[]; aprobadas: Tasacion[] }>("/api/tasaciones", { signal }).then(data => {
      if (signal?.aborted) return;
      const selected = new URLSearchParams(window.location.search).get("inmueble");
      setItems((data.pendientes ?? []).filter(item=>!selected||String(item.inmuebleId)===selected));
      setAprobadas(data.aprobadas ?? []);
    }).catch(error => {
      if (!signal?.aborted) { setErrorCarga(true); setError(error instanceof Error ? error.message : "No se pudieron cargar las tasaciones."); }
    }).finally(() => {
      if (!signal?.aborted) setCargando(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { if (!controller.signal.aborted) void cargar(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [cargar]);

  const registrar = async (item: Tasacion) => {
    setRegistroIntentado(item.inmuebleId);
    setError("");
    setMensaje("");
    setSiguienteAccion(null);
    const fecha = fechas[item.inmuebleId];
    if (!fecha) return setError(`Registra la fecha de la tasación de “${item.nombre}”.`);
    if (![valores[item.inmuebleId], precios[item.inmuebleId], ventas[item.inmuebleId]].every(value => Number(value) > 0)) return setError("Ingresa los tres precios acordados, mayores que cero.");

    try {
      setGuardando(item.inmuebleId);
      const response = await fetch(zoneUrl("/api/tasaciones"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inmuebleId: item.inmuebleId,
          fechaTasacion: fecha,
          valorReferenciaMoneda: monedas[item.inmuebleId]?.valorReferencia ?? "PEN",
          precioObjetivoMoneda: monedas[item.inmuebleId]?.precioObjetivo ?? "PEN",
          precioVentaMoneda: monedas[item.inmuebleId]?.precioVenta ?? "PEN",
          valorReferencia: valores[item.inmuebleId] || null,
          precioObjetivo: precios[item.inmuebleId] || null,
          precioVenta: ventas[item.inmuebleId],
          observacion: observaciones[item.inmuebleId] || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible registrar la tasación.");
      for(const setter of [setFechas,setValores,setPrecios,setVentas,setObservaciones])setter(current=>{const next={...current};delete next[item.inmuebleId];return next;});
      setMonedas(current=>{const next={...current};delete next[item.inmuebleId];return next;});
      setMensaje(`Tasación de “${item.nombre}” registrada correctamente.`);
      setSiguienteAccion({ href: `/registrar-textos?inmueble=${item.inmuebleId}`, label: "Registrar texto de este inmueble" });
      setCargando(true);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la tasación.");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <main className="min-h-screen bg-background p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
      <DraftRecovery draftKey="tasaciones:actual" data={{fechas,valores,precios,ventas,observaciones,monedas}} dirty={[fechas,valores,precios,ventas,observaciones].some(record=>Object.values(record).some(Boolean))} onRestore={draft=>{if(draft.monedas)setMonedas(draft.monedas as Record<number,Record<string,string>>);if(draft.fechas)setFechas(draft.fechas as Record<number,string>);if(draft.valores)setValores(draft.valores as Record<number,string>);if(draft.precios)setPrecios(draft.precios as Record<number,string>);if(draft.ventas)setVentas(draft.ventas as Record<number,string>);if(draft.observaciones)setObservaciones(draft.observaciones as Record<number,string>);}}/>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <PageHeading href="/registrar-tasaciones" /><ReturnLink />
          <Link href="/tasaciones-pendientes" className="cartera-folder-navigation inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 shadow-sm hover:bg-violet-100">Ver tasaciones pendientes →</Link>
        </div>

        <section className="mt-6 aa-summary p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Acción principal</p>
              <p className="mt-1 text-sm font-semibold">Registra los tres precios una vez concluida la negociación con el propietario.</p>
            </div>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">Siguiente: registrar texto</span>
          </div>
        </section>

        {mensaje && <MobileFormFeedback value={mensaje}><RegistrationSuccess message={mensaje} nextAction={siguienteAccion} /></MobileFormFeedback>}
        {error && <MobileFormFeedback value={error}><Feedback tone="error" className="my-5">{error}{errorCarga && <button type="button" disabled={cargando} onClick={() => void cargar()} className="aa-button aa-button-secondary mt-3">{cargando ? "Cargando…" : "Reintentar"}</button>}</Feedback></MobileFormFeedback>}

        <section className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Por registrar</p><p className="mt-2 text-3xl font-bold text-slate-950">{items.length}</p><p className="mt-1 text-xs text-slate-500">inmuebles con visita realizada</p></div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Tasación vigente</p><p className="mt-2 text-3xl font-bold text-slate-950">{aprobadas.length}</p><p className="mt-1 text-xs text-violet-700/80">negociadas actualmente</p></div>
        </section>

        <section className="mt-7">
          <div className="mb-3"><h2 className="font-bold text-slate-900">Tasaciones por registrar</h2><p className="mt-1 text-sm text-slate-500">Estos inmuebles están activos, tienen posición asignada y todavía no tienen tasación registrada.</p></div>
          <div className="aa-card mb-4 p-4"><PropertyTaskSearch value={busqueda} onChange={setBusqueda} count={totalFiltrados} total={totalBusqueda} disabled={cargando} /></div>
          {cargando ? <LoadingCards label="Cargando inmuebles…" /> : items.length > 0 && filtrados.length === 0 ? (
            <div className="aa-card p-6 text-sm text-slate-600">No hay inmuebles que coincidan con la búsqueda. Prueba otro contacto, dirección o ID visible.</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">{error ? "!" : "✓"}</div><h3 className="mt-4 font-bold text-emerald-950">{error ? "No se pudo consultar las tasaciones" : "No hay tasaciones pendientes"}</h3><p className="mt-1 text-sm text-emerald-800/80">{error ? "Pulsa Reintentar para consultar los inmuebles." : "Las visitas realizadas ya tienen tasación registrada o no existen inmuebles pendientes."}</p></div>
          ) : (
            <div className="space-y-4">
              {filtrados.map((item) => (
                <article key={item.inmuebleId} className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-base font-bold text-violet-700">{item.posicion}</div><div className="min-w-0"><div className="flex min-w-0 flex-col items-start gap-2"><h3 className="font-semibold text-slate-900">{item.propietario || "Sin contacto"}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"><PropertySummary operation={item.operacion} type={item.tipo} location={item.direccion} /></span></div><p className="mt-1 text-xs text-slate-500">{propertyDisplayId(item)}</p></div></div>
                        <span className="self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Tasación pendiente</span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600">Fecha de tasación *<FieldGuidance showError={registroIntentado === item.inmuebleId} error={!fechas[item.inmuebleId] && "Indica la fecha de la tasación."} help="Usa la fecha real de la tasación."><input type="date" max={hoy} value={fechas[item.inmuebleId] ?? ""} onChange={(e) => setFechas(a => ({...a,[item.inmuebleId]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></FieldGuidance></label>
                        <div><label className="text-xs font-semibold text-slate-600">{referenceLabel(item.operacion)} *<FieldGuidance showError={registroIntentado === item.inmuebleId} error={!(Number(valores[item.inmuebleId]) > 0) && "Ingresa un importe mayor que cero."} help="Valor de referencia de la tasación; elige soles o dólares."><input type="number" min="0" step="0.01" value={valores[item.inmuebleId] ?? ""} onChange={(e) => setValores(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder={item.operacion === "alquiler" ? "1500" : "320000"} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></FieldGuidance></label><CurrencySelect label={referenceLabel(item.operacion)} value={monedas[item.inmuebleId]?.valorReferencia ?? "PEN"} onChange={value => setMonedas(current => ({...current, [item.inmuebleId]: {...current[item.inmuebleId], valorReferencia: value}}))} /></div>
                        <div><label className="text-xs font-semibold text-slate-600">{targetLabel(item.operacion)} *<FieldGuidance showError={registroIntentado === item.inmuebleId} error={!(Number(precios[item.inmuebleId]) > 0) && "Ingresa un importe mayor que cero."} help="Importe objetivo acordado con el propietario; elige soles o dólares."><input type="number" min="0" step="0.01" value={precios[item.inmuebleId] ?? ""} onChange={(e) => setPrecios(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder={item.operacion === "alquiler" ? "1500" : "315000"} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></FieldGuidance></label><CurrencySelect label={targetLabel(item.operacion)} value={monedas[item.inmuebleId]?.precioObjetivo ?? "PEN"} onChange={value => setMonedas(current => ({...current, [item.inmuebleId]: {...current[item.inmuebleId], precioObjetivo: value}}))} /></div>
                        <div><label className="text-xs font-semibold text-slate-600">{priceLabel(item.operacion)} *<FieldGuidance showError={registroIntentado === item.inmuebleId} error={!(Number(ventas[item.inmuebleId]) > 0) && "Ingresa un importe mayor que cero."} help="Precio de salida al mercado o renta mensual, según la operación."><input type="number" min="0.01" step="0.01" value={ventas[item.inmuebleId] ?? ""} onChange={e => setVentas(a => ({ ...a, [item.inmuebleId]: e.target.value }))} placeholder={item.operacion === "alquiler" ? "1500" : "450000"} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></FieldGuidance></label><CurrencySelect label={priceLabel(item.operacion)} value={monedas[item.inmuebleId]?.precioVenta ?? "PEN"} onChange={value => setMonedas(current => ({...current, [item.inmuebleId]: {...current[item.inmuebleId], precioVenta: value}}))} /></div>
                      </div>
                      <label className="text-xs font-semibold text-slate-600">Observación<textarea rows={3} value={observaciones[item.inmuebleId] ?? ""} onChange={(e) => setObservaciones(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder="Precio conversado, ajustes, comentarios del propietario..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-slate-200 bg-background p-4 shadow-sm sm:static sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Al guardar confirmas que el precio o renta mensual ya fue acordado con el propietario.</p><button disabled={guardando === item.inmuebleId} onClick={() => registrar(item)} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{guardando === item.inmuebleId ? "Guardando..." : "Registrar tasación"}</button></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-violet-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Tasaciones negociadas registradas</h2><p className="mt-1 text-xs text-slate-500">El precio o renta mensual y la observación se pueden modificar desde la bandeja de seguimiento.</p></div>
          <div className="divide-y divide-slate-100">
            {aprobadas.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Todavía no hay tasaciones negociadas.</div> : aprobadasFiltradas.length === 0 ? <div className="p-6 text-sm text-slate-500">No hay tasaciones negociadas que coincidan con la búsqueda.</div> : aprobadasFiltradas.map(item => (
              <div key={item.inmuebleId} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-semibold text-slate-900">{item.propietario || "Sin contacto"}</p><p className="mt-1 text-xs text-slate-500">{propertyDisplayId(item)} · {operationLabel(item.operacion)} · posición {item.posicion} · {item.ubicacion}</p><p className="mt-1 text-xs text-slate-500">{referenceLabel(item.operacion)}: {formatPrice(item.valorReferencia, item.valorReferenciaMoneda)} · {targetLabel(item.operacion)}: {formatPrice(item.precioObjetivo, item.precioObjetivoMoneda)} · {priceLabel(item.operacion)}: {formatPrice(item.precioVenta, item.precioVentaMoneda)}</p></div>
                <Link href={`/registrar-textos?inmueble=${item.inmuebleId}`} className="rounded-xl bg-[#c80000] px-4 py-2.5 text-sm font-semibold text-white">Registrar texto →</Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
