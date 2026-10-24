import { ContextLink as Link } from "@/app/components/NavigationReturn";
import { propertyProgress, type PropertyProgressData } from "@/lib/property-progress";

export default function PropertyProgress({ data, administrator, propertyId }: { data: PropertyProgressData; administrator: boolean; propertyId?: number }) {
  const progress = propertyProgress(data);
  const currentStep = progress.steps.find(step => step.state === "current")?.label;
  const actionLabels: Record<string, string> = { Visita: "Registrar visita", Tasación: "Registrar tasación", Texto: "Registrar texto", Expediente: "Completar documentos y material", Publicación: "Revisar publicación" };
  const actionLabel = currentStep ? actionLabels[currentStep] : "Ver seguimiento";
  return <section aria-label="Progreso del inmueble" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="mb-4"><p className="aa-eyebrow">Seguimiento</p><h3 className="mt-1 text-base font-bold text-slate-900">Progreso del inmueble</h3><p className="mt-1 text-sm text-slate-600">Avances confirmados en el sistema.</p></div>
    <ol className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {progress.steps.map((step, index) => <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${step.state === "complete" ? "border-emerald-200 bg-emerald-50" : step.state === "current" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
        <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.state === "complete" ? "bg-emerald-100 text-emerald-800" : step.state === "current" ? "bg-blue-100 text-blue-800" : "bg-white text-slate-500"}`}>{step.state === "complete" ? "✓" : index + 1}</span>
        <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{step.label === "Expediente" ? "Documentos y material" : step.label}</p><p className={`mt-0.5 text-xs ${step.state === "complete" ? "text-emerald-800" : step.state === "current" ? "text-blue-800" : "text-slate-600"}`}>{step.state === "complete" ? "Completado" : step.state === "current" ? "Siguiente paso" : "Sin completar"}</p></div>
      </li>)}
    </ol>
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 text-sm leading-6 text-slate-600">{progress.next}</p>
      {administrator && progress.href && <Link href={propertyId ? progress.href.replace(/(#.*)?$/, `?inmueble=${propertyId}$1`) : progress.href} className="aa-button aa-button-primary shrink-0">{actionLabel} →</Link>}
    </div>
  </section>;
}
