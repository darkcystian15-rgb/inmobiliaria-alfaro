"use client";

import { useCallback, useEffect, useState } from "react";
import { ContextLink as Link } from "@/app/components/NavigationReturn";
import {useZoneWorkspace} from "@/app/components/ZoneWorkspace";
import OperationSelect from "@/app/components/OperationSelect";
import PropertyTypeSelect from "@/app/components/PropertyTypeSelect";
import DraftRecovery from "@/app/components/DraftRecovery";
import RegistrationSuccess, { type NextRegistrationAction } from "@/app/components/RegistrationSuccess";
import MobileFormActions, { MobileFormFeedback } from "@/app/components/MobileFormActions";
import PageHeading from "@/app/components/PageHeading";
import { Feedback } from "@/app/components/InterfaceFeedback";
import { useReturnHref } from "@/app/components/NavigationReturn";
import { requestJson } from "@/lib/client-request";
import { propertyDisplayId } from "@/lib/property-display-id";

type Position = { numero: number; disponible: boolean };
const empty = { moneda: "PEN", operacion: "venta", tipo: "", direccion: "", nombreContacto: "" };
const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#c80000] disabled:opacity-50";

export default function RegistrarInmueblePage() {
  const {zone}=useZoneWorkspace();
  const returnHref = useReturnHref(zone?`/cartera?zona=${encodeURIComponent(zone.nombre)}`:"/cartera");
  const [form, setForm] = useState(empty);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selection, setSelection] = useState("");
  const [requested, setRequested] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [next, setNext] = useState<NextRegistrationAction | null>(null);
  const available = positions.filter(position => position.disponible);
  const position = available.some(item => String(item.numero) === selection) ? selection
    : available.some(item => String(item.numero) === requested) ? requested ?? "" : String(available[0]?.numero ?? "");
  const missing = [!position && "posición disponible", !form.tipo && "tipo de inmueble",
    !zone && "zona de trabajo",
    !form.direccion.trim() && "ubicación referencial", !form.nombreContacto.trim() && "nombre de contacto"].filter(Boolean);
  const canRegister = !loading && !loadError && !busy && missing.length === 0;
  const hint = loading ? "Consultando posiciones disponibles…" : loadError ? "Vuelve a consultar las posiciones antes de registrar."
    : missing.length ? `Completa: ${missing.join(", ")}.` : "";
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await requestJson<{ posiciones: Position[] }>("/api/posiciones", { signal });
      if (!signal?.aborted) { setPositions(data.posiciones); setLoadError(false); }
    } catch (error) {
      if (!signal?.aborted) { setLoadError(true); setError(error instanceof Error ? error.message : "No se pudieron consultar las posiciones."); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setRequested(new URLSearchParams(window.location.search).get("posicion"));
      void load(controller.signal);
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);
  function update(key: keyof typeof empty, value: string) { setForm(previous => ({ ...previous, [key]: value })); }
  async function register() {
    if (!canRegister) return;
    setBusy(true); setError(""); setMessage(""); setNext(null);
    try {
      const result = await requestJson<{ codigo: string; posicion: number; inmuebleId: number }>("/api/inmuebles", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, zonaId:zone?.id, posicion: Number(position) }),
      });
      setMessage(`Inmueble ${propertyDisplayId({ ...form, codigo: result.codigo })} registrado en la posición ${String(result.posicion).padStart(2, "0")}. Ya aparece en Visitas pendientes.`);
      setNext({ href: `/registrar-visitas?inmueble=${result.inmuebleId}`, label: "Registrar visita de este inmueble" });
      setForm(empty); setSelection(""); setRequested(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo registrar el inmueble.");
      await load();
    } finally { setBusy(false); }
  }
  return <main className="min-h-screen p-4 pb-40 sm:p-6 lg:p-8"><div className="mx-auto max-w-5xl">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><PageHeading href="/registrar-inmueble" /><Link href={returnHref} className="aa-button aa-button-secondary">Volver a cartera</Link></header>
    <DraftRecovery draftKey={`registro:zona-${zone?.id ?? "sin-zona"}`} data={{ ...form, seleccionPosicion: selection }} dirty={Object.entries(form).some(([key, value]) => !["operacion", "moneda"].includes(key) && Boolean(value))}
      onRestore={draft => { setForm(Object.fromEntries(Object.entries(empty).map(([key, fallback]) => [key, typeof draft[key] === "string" ? draft[key] : fallback])) as typeof empty); setSelection(String(draft.seleccionPosicion ?? "")); }} />
    <form id="registro-inmueble" onSubmit={event => { event.preventDefault(); void register(); }} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div><h2 className="text-lg font-bold text-slate-900">Datos de registro</h2><p className="mt-2 text-sm text-slate-600">Registra el inmueble dentro de la zona seleccionada. El DNI del propietario se adjunta después en Información de inmuebles → Documentación.</p></div>
      <fieldset disabled={busy} className="space-y-4"><legend className="mb-3 text-sm font-bold text-slate-800">Posición y operación</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold">Posición en esta zona *<select required value={position} disabled={loading || loadError || !available.length || busy} onChange={event => setSelection(event.target.value)} className={fieldClass}><option value="">{loading ? "Consultando…" : "Sin posiciones disponibles"}</option>{available.map(item => <option key={item.numero} value={item.numero}>{String(item.numero).padStart(2, "0")} · Disponible</option>)}</select></label>
          <label className="text-sm font-semibold">Moneda del inmueble *<select value={form.moneda} disabled={busy} onChange={event => update("moneda",event.target.value)} className={fieldClass}><option value="PEN">Soles (S/)</option><option value="USD">Dólares (US$)</option></select></label>
          <label className="text-sm font-semibold">Tipo de operación *<OperationSelect value={form.operacion} onChange={value => update("operacion", value)} disabled={busy} className={fieldClass} /></label>
          <label className="text-sm font-semibold">Tipo de inmueble *<PropertyTypeSelect value={form.tipo} onChange={value => update("tipo", value)} disabled={busy} className={fieldClass} /></label>
        </div><p className="text-xs text-slate-500">La primera posición libre se selecciona automáticamente. Puedes cambiarla antes de guardar.</p>
      </fieldset>
      <fieldset disabled={busy} className="space-y-4 border-t border-slate-100 pt-5"><legend className="mb-3 text-sm font-bold text-slate-800">Ubicación</legend>
        <label className="block text-sm font-semibold">Ubicación referencial *<input required maxLength={350} value={form.direccion} onChange={event => update("direccion", event.target.value)} placeholder="Ej. Av. Perú 325, frente al colegio" className={fieldClass} /><span className="mt-2 block text-xs font-normal text-slate-500">Escribe la dirección o una referencia para reconocer el inmueble. No necesitas separar calle, número o lote.</span></label>
      </fieldset>
      <fieldset disabled={busy} className="border-t border-slate-100 pt-5"><legend className="mb-3 text-sm font-bold text-slate-800">Contacto</legend><label className="block text-sm font-semibold">Nombre de contacto *<input required maxLength={281} value={form.nombreContacto} onChange={event => update("nombreContacto", event.target.value)} placeholder="Nombre de la persona con quien coordinas" className={fieldClass} /></label></fieldset>
      {error && <MobileFormFeedback value={error}><Feedback tone="error">{error}{loadError && <button type="button" disabled={loading} onClick={() => void load()} className="aa-button aa-button-secondary mt-3">Consultar posiciones de nuevo</button>}</Feedback></MobileFormFeedback>}
      {message && <MobileFormFeedback value={message}><RegistrationSuccess message={message} nextAction={next} /></MobileFormFeedback>}
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-slate-700">Al guardar se ocupa la posición de esta zona, se genera el código y el inmueble pasa a Visitas pendientes. Los documentos, las fotos y los precios se completan después.</p>
      {hint && <p id="ayuda-registro" role="status" className="text-sm text-slate-600">{hint}</p>}
      <div className="hidden justify-end gap-3 sm:flex"><Link href={returnHref} className="aa-button aa-button-secondary">Cancelar</Link><button type="submit" disabled={!canRegister} aria-describedby={hint ? "ayuda-registro" : undefined} className="aa-button aa-button-primary disabled:opacity-50">{busy ? "Registrando…" : "Registrar inmueble"}</button></div>
    </form>
  </div><MobileFormActions hint={hint || undefined}><Link href={returnHref} className="aa-button aa-button-secondary">Cancelar</Link><button type="submit" form="registro-inmueble" disabled={!canRegister} className="aa-button aa-button-primary disabled:opacity-50">{busy ? "Registrando…" : "Registrar inmueble"}</button></MobileFormActions></main>;
}
