import type { ReactNode } from "react";
import FolderIcon from "./FolderIcon";

// A folder always opens a commercial zone; status colors belong to its contents.
export default function ZoneFolderCard({ name, onOpen, children }: {
  name: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return <button type="button" onClick={onOpen} className="cartera-folder relative flex min-h-28 w-full items-center gap-3 rounded-b-2xl rounded-tr-2xl border border-amber-200 bg-amber-50/40 p-5 text-left shadow-sm hover:border-amber-300">
    <span aria-hidden="true" className="cartera-folder-tab absolute -top-4 -left-px h-4 w-20 rounded-t-lg border border-b-0 border-amber-200 bg-amber-100" />
    <FolderIcon className="h-9 w-9 shrink-0 text-amber-500" />
    <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold text-slate-900">{name}</span>{children}</span>
    <span aria-hidden="true" className="text-slate-400">→</span>
  </button>;
}
