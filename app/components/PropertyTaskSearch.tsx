"use client";

import { useId } from "react";

export default function PropertyTaskSearch({ value, onChange, count, total, disabled = false }: {
  value: string; onChange: (value: string) => void; count: number; total: number; disabled?: boolean;
}) {
  const id = useId();
  return <div className="w-full min-w-0">
    <label htmlFor={id} className="text-xs font-semibold text-slate-700">Buscar inmueble</label>
    <div className="mt-2 flex min-w-0 gap-2">
      <input id={id} type="search" value={value} disabled={disabled} onChange={event => onChange(event.target.value)}
        placeholder="Contacto, dirección, ID o posición…" aria-describedby={`${id}-results`}
        className="aa-input min-w-0 flex-1" />
      {value && <button type="button" onClick={() => onChange("")} className="aa-button aa-button-secondary shrink-0">Limpiar búsqueda</button>}
    </div>
    <p id={`${id}-results`} role="status" aria-live="polite" className="mt-2 text-xs text-slate-500">
      {disabled ? "Cargando inmuebles…" : `${count} de ${total} inmuebles`} · Filtra al escribir · Orden por posición
    </p>
  </div>;
}
