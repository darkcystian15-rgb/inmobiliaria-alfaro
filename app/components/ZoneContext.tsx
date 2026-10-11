import FolderIcon from "./FolderIcon";

export default function ZoneContext({ name, general = false, tone = "red" }: { name: string; general?: boolean; tone?: "red" | "violet" }) {
  return <div aria-current="page" className={`flex w-full min-w-0 items-center gap-3 rounded-2xl border border-l-4 ${tone === "violet" ? "border-violet-200 border-l-violet-600 bg-violet-50/70" : "border-red-200 border-l-[#c80000] bg-red-50/70"} px-5 py-3 shadow-sm sm:w-auto`}>
    <FolderIcon className={`h-8 w-8 shrink-0 ${tone === "violet" ? "text-violet-600" : "text-[#c80000]"}`} />
    <div className="min-w-0">
      <p className={`text-xs font-bold uppercase tracking-wider ${tone === "violet" ? "text-violet-800" : "text-red-800"}`}>{general ? "Vista actual" : "Zona actual"}</p>
      <p className="mt-1 break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{name}</p>
    </div>
  </div>;
}
