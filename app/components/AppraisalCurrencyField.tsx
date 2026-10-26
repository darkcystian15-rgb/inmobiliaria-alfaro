"use client";
import { commonAppraisalCurrency } from '@/lib/appraisal-currency.mjs';

export default function AppraisalCurrencyField({ values, onChange, disabled = false, selectionRequired = false }: {
  values: Record<string, string | undefined>; onChange: (currency: string) => void; disabled?: boolean; selectionRequired?: boolean;
}) {
  const currency = commonAppraisalCurrency(values);
  return <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
    <div className="min-w-0"><p className="text-sm font-semibold text-slate-800">Moneda de la tasación</p><p className="mt-1 text-xs leading-5 text-slate-500">{selectionRequired ? 'Selecciona soles o dólares para los tres importes de la tasación.' : currency ? 'La moneda se aplica a todos los importes del inmueble. Ingresa manualmente la conversión si corresponde.' : 'Este registro tiene monedas distintas. Se conservan hasta que elijas una moneda común para los tres importes.'}</p></div>
    <select aria-label="Moneda de la tasación" value={currency} required={selectionRequired} disabled={disabled} onChange={event => onChange(event.target.value)} className="aa-input mt-2 w-full shrink-0 sm:mt-0 sm:w-52">{!currency && <option value="" disabled={selectionRequired}>{selectionRequired ? "Seleccionar moneda" : "Conservar monedas actuales"}</option>}<option value="PEN">Soles (S/)</option><option value="USD">Dólares (US$)</option></select>
  </div>;
}
