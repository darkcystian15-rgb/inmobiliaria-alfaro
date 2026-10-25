import FolderIcon from "./FolderIcon";

export default function ZoneContext({ name, general = false, tone = "red" }: { name: string; general?: boolean; tone?: "red" | "violet" | "folder" }) {
  const colors = tone === "folder" ? { panel: "border-slate-200 border-l-slate-400 bg-white", icon: "text-slate-500", label: "text-slate-600" }
    : tone === "violet" ? { panel: "border-slate-200 border-l-slate-400 bg-white", icon: "text-slate-500", label: "text-slate-600" }
    : { panel: "border-slate-200 border-l-[#c80000] bg-white", icon: "text-[#c80000]", label: "text-red-800" };
  return <div aria-current="page" className={`flex w-full min-w-0 items-center gap-3 rounded-2xl border border-l-4 ${colors.panel} px-4 py-2 shadow-sm sm:w-auto`}>
    <FolderIcon className={`h-8 w-8 shrink-0 ${colors.icon}`} />
    <div className="min-w-0">
      <p className={`text-xs font-bold uppercase tracking-wider ${colors.label}`}>{general ? "Vista actual" : "Zona actual"}</p>
      <p className={`mt-1 break-words font-bold leading-tight text-slate-950 ${tone === "folder" ? "text-base sm:text-lg" : "text-base sm:text-lg"}`}>{name}</p>
    </div>
  </div>;
}
