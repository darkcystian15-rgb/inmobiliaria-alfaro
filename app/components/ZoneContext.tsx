import FolderIcon from "./FolderIcon";

export default function ZoneContext({ name, general = false }: { name: string; general?: boolean }) {
  return <div aria-current="page" className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-red-200 border-l-4 border-l-[#c80000] bg-red-50/70 px-5 py-3 shadow-sm sm:w-auto">
    <FolderIcon className="h-8 w-8 shrink-0 text-[#c80000]" />
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-red-800">{general ? "Vista actual" : "Zona actual"}</p>
      <p className="mt-1 break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{name}</p>
    </div>
  </div>;
}
