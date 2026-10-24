"use client";
import AppraisalCurrencyField from "./AppraisalCurrencyField";
import { applyAppraisalCurrency } from "@/lib/appraisal-currency.mjs";
import { formatPrice } from "@/lib/prices.mjs";
import { zoneUrl } from "@/lib/zone-url";

import { priceLabel, referenceLabel, targetLabel } from "@/lib/operation.mjs";
import FieldGuidance from "./FieldGuidance";
import { Feedback } from "./InterfaceFeedback";
import { useEffect, useState } from "react";

export type PropertyPrices = {
  inmuebleId: number;
  operacion?: string;
  valorReferencia?: string | null;
  precioObjetivo?: string | null;
  precioVenta?: string | null;
  valorReferenciaMoneda?: string; precioObjetivoMoneda?: string; precioVentaMoneda?: string;
  observacion?: string | null;
};

export default function SalePriceEditor({ item, onSaved, onBusyChange, onDirtyChange, initialEditing = false }: { initialEditing?: boolean; item: PropertyPrices; onSaved: () => Promise<void>; onBusyChange?: (value: boolean) => void; onDirtyChange?: (value: boolean) => void }) {
  const label = priceLabel(item.operacion);
  const [editing, setEditing] = useState(initialEditing);
  const initialPrices = () => Object.fromEntries(["valorReferencia", "precioObjetivo", "precioVenta"].flatMap(key => [[key, item[key as keyof PropertyPrices] ?? ""], [`${key}Moneda`, item[`${key}Moneda` as keyof PropertyPrices] ?? "PEN"]])) as Record<string, string>;
  const [prices, setPrices] = useState(initialPrices);
  const [observation, setObservation] = useState(item.observacion ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { onDirtyChange?.(editing); return () => onDirtyChange?.(false); }, [editing, onDirtyChange]);
  useEffect(() => { onBusyChange?.(pending); return () => onBusyChange?.(false); }, [pending, onBusyChange]);
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700";

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(zoneUrl("/api/tasaciones"), {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inmuebleId: item.inmuebleId, ...prices, observacion: observation }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo guardar el precio.");
      await onSaved();
      setEditing(false);
      setMessage("Valores de tasación actualizados.");
      window.dispatchEvent(new Event("workflow-updated"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el precio.");
    } finally { setPending(false); }
  }

  return <div className="mt-4">
    <div className="grid gap-3 sm:grid-cols-3">
      {[[referenceLabel(item.operacion), "valorReferencia"], [targetLabel(item.operacion), "precioObjetivo"], [label, "precioVenta"]].map(([title, key]) =>
        <div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-1 text-sm font-bold text-slate-800">{formatPrice(item[key as keyof PropertyPrices], String(item[`${key}Moneda` as keyof PropertyPrices] ?? "PEN"))}</p></div>)}
    </div>
    {editing ? <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
      <AppraisalCurrencyField values={prices} disabled={pending} onChange={currency => setPrices(current => applyAppraisalCurrency(current, currency))} />
      {[[referenceLabel(item.operacion), "valorReferencia"], [targetLabel(item.operacion), "precioObjetivo"], [label, "precioVenta"]].map(([title, key]) => <div key={key}><label className="block text-xs font-semibold text-slate-600">{title} <span className="text-slate-400">({prices[`${key}Moneda`] === "USD" ? "US$" : "S/"})</span><FieldGuidance error={!(Number(prices[key]) > 0) && "Ingresa un importe mayor que cero."} help="Importe positivo, con hasta dos decimales."><input required type="number" min="0.01" max="9999999999999.99" step="0.01" value={prices[key]} disabled={pending} onChange={event => setPrices(current => ({...current, [key]: event.target.value}))} className={inputClass} /></FieldGuidance></label></div>)}
      <label className="block text-xs font-semibold text-slate-600">Observación<textarea rows={3} value={observation} disabled={pending} onChange={event => setObservation(event.target.value)} className={inputClass} /></label>
      <p className="text-xs text-slate-500">El precio puede cambiar incluso después de publicar. El inmueble conserva su etapa actual.</p>
      <div className="flex gap-3"><button disabled={pending} className="rounded-xl bg-[#c80000] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{pending ? "Guardando…" : "Guardar cambios"}</button><button type="button" disabled={pending} onClick={() => { setEditing(false); setError(""); }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Cancelar</button></div>
    </form> : <div className="mt-4 rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">Observación</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.observacion || "Sin observaciones registradas."}</p><button type="button" onClick={() => { setPrices(initialPrices()); setObservation(item.observacion ?? ""); setError(""); setMessage(""); setEditing(true); }} className="mt-3 text-xs font-bold text-[#c80000]">Actualizar valores</button></div>}
    {error && <Feedback tone="error" className="mt-3">{error}</Feedback>}
    {message && <Feedback className="mt-3">{message}</Feedback>}
  </div>;
}
