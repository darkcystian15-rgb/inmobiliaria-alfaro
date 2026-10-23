"use client";
export default function CurrencySelect({ value, onChange, label, disabled = false }: { value: string; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  return <select aria-label={`Moneda de ${label}`} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="PEN">Soles (S/)</option><option value="USD">Dólares (US$)</option></select>;
}
