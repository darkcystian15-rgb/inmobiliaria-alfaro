export default function ActiveFilters({ labels, onClear }: { labels: (string | false | null | undefined)[]; onClear: () => void }) {
  const active = labels.filter(Boolean);
  if (!active.length) return null;
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><p className="min-w-0 break-words"><span className="font-semibold">Filtros activos: </span>{active.join(" · ")}</p><button type="button" onClick={onClear} className="min-h-9 shrink-0 font-semibold text-[#c80000]">Limpiar filtros</button></div>;
}
