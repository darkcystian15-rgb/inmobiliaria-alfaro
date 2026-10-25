import type { ReactNode } from "react";
import Link from "next/link";
import FolderIcon from "./FolderIcon";

// A folder always opens a commercial zone; status colors belong to its contents.
export default function ZoneFolderCard({ name, onOpen, href, children }: {
  name: string;
  children: ReactNode;
} & ({ onOpen: () => void; href?: never } | { href: string; onOpen?: never })) {
  const className = "cartera-folder relative flex min-h-24 w-full items-center gap-3 rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700";
  const content = <>
    <span aria-hidden="true" className="cartera-folder-tab absolute -top-4 -left-px h-4 w-20 rounded-t-lg border border-b-0 border-slate-200 bg-slate-100" />
    <FolderIcon className="h-9 w-9 shrink-0 text-slate-500" />
    <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold text-slate-900">{name}</span>{children}</span>
    <span aria-hidden="true" className="text-slate-400">→</span>
  </>;
  return href ? <Link href={href} aria-label={name} className={className}>{content}</Link>
    : <button type="button" onClick={onOpen} className={className}>{content}</button>;
}
