import { workflowDeadline } from "@/lib/workflow-deadline.mjs";

export default function DeadlineNotice({ date, state }: { date: string | null; state?: string }) {
  if (!date) return <p className="mt-1 text-xs text-slate-500">Plazo sin definir</p>;
  const status = state ?? workflowDeadline(null, 2, date).estadoPlazo;
  const label = status === "vencido" ? "Vencido" : status === "vence_hoy" ? "Vence hoy" : "Límite";
  const formatted = new Date(`${date}T12:00:00Z`).toLocaleDateString("es-PE", {
    timeZone: "America/Lima", day: "numeric", month: "short", year: "numeric",
  });
  return <p className={`mt-1 text-xs ${status === "vencido" ? "font-semibold text-red-700" : status === "vence_hoy" ? "font-semibold text-amber-800" : "text-slate-500"}`}>{label}: {formatted}</p>;
}
