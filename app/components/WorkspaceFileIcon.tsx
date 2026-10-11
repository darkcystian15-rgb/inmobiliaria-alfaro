export default function WorkspaceFileIcon({ name, report = false }: { name?: string | null; report?: boolean }) {
  const extension = name?.split(".").pop()?.toLowerCase();
  const kind = report ? "INF" : extension === "pdf" ? "PDF" : ["doc", "docx"].includes(extension || "") ? "DOC" : ["xls", "xlsx", "csv"].includes(extension || "") ? "XLS" : ["jpg", "jpeg", "png", "webp"].includes(extension || "") ? "IMG" : "FILE";
  const tone = kind === "PDF" ? "bg-red-50 text-red-700" : kind === "XLS" ? "bg-emerald-50 text-emerald-700" : kind === "IMG" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700";
  return <span aria-hidden="true" className={`relative flex h-12 w-10 shrink-0 items-end justify-center rounded-md border border-current/15 pb-2 ${tone}`}><svg className="absolute right-0 top-0 h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M1 0v15h15M1 0l15 15" /></svg><span className="text-[9px] font-bold tracking-wide">{kind}</span></span>;
}
