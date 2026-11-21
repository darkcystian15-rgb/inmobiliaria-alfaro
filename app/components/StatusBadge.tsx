import type { ReactNode } from "react";

export type StatusTone = "complete" | "pending" | "progress" | "neutral" | "text" | "publication";
export const statusStyles: Record<StatusTone, string> = {
  text: "border-blue-200 bg-blue-50 text-blue-900",
  publication: "border-red-200 bg-red-50 text-[#c80000]",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  progress: "border-blue-200 bg-blue-50 text-blue-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};
export default function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-5 ${statusStyles[tone]}`}>
    <span aria-hidden="true" className="shrink-0">{tone === "complete" ? "✓" : tone === "pending" ? "◷" : tone === "progress" ? "→" : "•"}</span>
    <span className="min-w-0 break-words">{children}</span>
  </span>;
}
