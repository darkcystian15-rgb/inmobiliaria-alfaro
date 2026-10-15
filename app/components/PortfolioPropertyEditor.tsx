"use client";

import { useEffect, useState, type FormEvent } from "react";
import { canChangeOperation } from "@/lib/property-edit-policy.mjs";
import OperationSelect from "./OperationSelect";
import PropertyTypeSelect from "./PropertyTypeSelect";

type Values = { operacion: string; tipo: string; nombreContacto: string };
type Details = { inmueble: Values & { estado: string }; tasacion: unknown; publicacion: unknown };

export default function PortfolioPropertyEditor({ propertyId, onSaved }: { propertyId: number; onSaved: () => Promise<void> }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [form, setForm] = useState<Values | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/inmuebles/${propertyId}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron consultar los datos.");
      if (!controller.signal.aborted) { setDetails(data); setForm({ operacion: data.inmueble.operacion, tipo: data.inmueble.tipo, nombreContacto: data.inmueble.nombreContacto || "" }); }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudieron consultar los datos."); });
    return () => controller.abort();
  }, [propertyId, reload]);
  const operationLocked = !details || !canChangeOperation({ estado: details.inmueble.estado, hasPrices: Boolean(details.tasacion), hasPublication: Boolean(details.publicacion) });
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || !details || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const changes = Object.fromEntries(Object.entries(form).filter(([key, value]) => value !== details.inmueble[key as keyof Values]));
      if (Object.keys(changes).length) {
        const response = await fetch(`/api/inmuebles/${propertyId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron guardar los cambios.");
      }
      setEditing(false); setMessage("Cambios guardados correctamente."); setReload(value => value + 1);
      await onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudieron guardar los cambios."); }
    finally { setBusy(false); }
  }
  const inputClass = "aa-input mt-2 w-full";
  return <section className="mt-5 rounded-2xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-slate-900">Datos del inmueble</h4>{!editing && <button type="button" disabled={!details || busy} onClick={() => { setEditing(true); setMessage(""); }} className="text-sm font-semibold text-[#c80000] disabled:opacity-50">Editar datos</button>}</div>
    <p id="portfolio-operation-note" className="mt-2 text-xs leading-5 text-slate-500">La operación solo puede cambiarse mientras el inmueble esté activo y antes de registrar precios o preparar una publicación.</p>
    {editing && form && <form onSubmit={save} className="mt-4 space-y-4">
      <label className="block text-xs font-semibold text-slate-600">Tipo de operación<OperationSelect value={form.operacion} disabled={busy || operationLocked} onChange={operacion => setForm({ ...form, operacion })} className={inputClass} /></label>
      {operationLocked && <p className="text-xs text-amber-800">Operación bloqueada: el inmueble es histórico o ya tiene precios o publicación registrados.</p>}
      <label className="block text-xs font-semibold text-slate-600">Tipo de inmueble<PropertyTypeSelect value={form.tipo} preserveCurrent disabled={busy} onChange={tipo => setForm({ ...form, tipo })} className={inputClass} /></label>
      <label className="block text-xs font-semibold text-slate-600">Nombre de contacto<input required maxLength={281} value={form.nombreContacto} disabled={busy} onChange={event => setForm({ ...form, nombreContacto: event.target.value })} className={inputClass} /></label>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="aa-button aa-button-primary">{busy ? "Guardando…" : "Guardar cambios"}</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setError(""); setForm({ operacion: details!.inmueble.operacion, tipo: details!.inmueble.tipo, nombreContacto: details!.inmueble.nombreContacto || "" }); }} className="aa-button aa-button-secondary">Cancelar</button></div>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}{!details && <button type="button" onClick={() => { setError(""); setReload(value => value + 1); }} className="ml-2 underline">Reintentar</button>}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
  </section>;
}
