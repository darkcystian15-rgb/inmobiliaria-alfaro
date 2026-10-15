"use client";

type Value = { departamento: string | null; provincia: string | null; distrito: string | null };
export default function GeographySelect({ value, onChange, disabled = false }: { value: Value; onChange: (value: Value) => void; disabled?: boolean }) {
  return <details className="rounded-xl border border-slate-200 p-4">
    <summary className="cursor-pointer text-sm font-semibold text-slate-700">Información geográfica opcional</summary>
    <p className="mt-3 text-xs leading-5 text-slate-500">La zona de Cartera organiza el trabajo del inmueble. Estos datos solo precisan su ubicación; puedes completar cualquiera sin registrar los demás. No cambian su carpeta.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">{([['departamento', 'Departamento'], ['provincia', 'Provincia'], ['distrito', 'Distrito']] as const).map(([key, label]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<input maxLength={100} value={value[key] || ''} disabled={disabled} onChange={event => onChange({ ...value, [key]: event.target.value || null })} className="aa-input mt-2 w-full" /></label>)}</div>
  </details>;
}
