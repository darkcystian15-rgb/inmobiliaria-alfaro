"use client";

import { priceLabel, referenceLabel, targetLabel } from "@/lib/operation.mjs";
import FieldGuidance from "./FieldGuidance";
import { Feedback } from "./InterfaceFeedback";
import { useState } from "react";

export type PropertyPrices = {
  inmuebleId: number;
  operacion?: string;
  valorReferencia?: string | null;
  precioObjetivo?: string | null;
  precioVenta?: string | null;
  observacion?: string | null;
};

const money = (value?: string | null) => value ? `S/ ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

export default function SalePriceEditor({ item, onSaved }: { item: PropertyPrices; onSaved: () => Promise<void> }) {
  const label = priceLabel(item.operacion);
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(item.precioVenta ?? "");
  const [observation, setObservation] = useState(item.observacion ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700";

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/tasaciones", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inmuebleId: item.inmuebleId, precioVenta: price, observacion: observation }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo guardar el precio.");
      await onSaved();
      setEditing(false);
      setMessage(`${label} y observación guardados.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el precio.");
    } finally { setPending(false); }
  }

  return <div className="mt-4">
    <div className="grid gap-3 sm:grid-cols-3">
      {[[referenceLabel(item.operacion), item.valorReferencia], [targetLabel(item.operacion), item.precioObjetivo], [label, item.precioVenta]].map(([label, value]) =>
        <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{money(value)}</p></div>)}
    </div>
    {editing ? <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
      <label className="block text-xs font-semibold text-slate-600">{label} (S/)<FieldGuidance error={!(Number(price) > 0) && "Ingresa un importe mayor que cero."} help="Importe en soles; puedes usar hasta dos decimales."><input required type="number" min="0.01" max="9999999999999.99" step="0.01" value={price} disabled={pending} onChange={event => setPrice(event.target.value)} className={inputClass} /></FieldGuidance></label>
      <label className="block text-xs font-semibold text-slate-600">Observación<textarea rows={3} value={observation} disabled={pending} onChange={event => setObservation(event.target.value)} className={inputClass} /></label>
      <p className="text-xs text-slate-500">El precio puede cambiar incluso después de publicar. El inmueble conserva su etapa actual.</p>
      <div className="flex gap-3"><button disabled={pending} className="rounded-xl bg-[#c80000] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{pending ? "Guardando…" : "Guardar cambios"}</button><button type="button" disabled={pending} onClick={() => { setEditing(false); setError(""); }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Cancelar</button></div>
    </form> : <div className="mt-4 rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">Observación</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.observacion || "Sin observaciones registradas."}</p><button type="button" onClick={() => { setPrice(item.precioVenta ?? ""); setObservation(item.observacion ?? ""); setError(""); setMessage(""); setEditing(true); }} className="mt-3 text-xs font-bold text-[#c80000]">Modificar {label.toLowerCase()} y observación</button></div>}
    {error && <Feedback tone="error" className="mt-3">{error}</Feedback>}
    {message && <Feedback className="mt-3">{message}</Feedback>}
  </div>;
}
