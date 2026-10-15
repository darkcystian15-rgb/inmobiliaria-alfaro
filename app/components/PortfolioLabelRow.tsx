import PropertySummary from "@/app/components/PropertySummary";
import FolderIcon from "./FolderIcon";

type Property = {
  nombre: string;
  posicion?: number;
  operacion: string;
  tipo: string;
  direccion: string | null;
  propietario: string;
  distrito: string | null;
  estado: string;
  precioVenta: string | null;
  visitaPendiente: boolean;
  tasacionPendiente: boolean;
  materialPendiente: boolean;
  negociacionEnCurso: boolean;
  actividades: { publicacion: { publicado: boolean }; tasacion: { situacion: string | null } };
};

const tones = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  visit: "border-amber-200 bg-amber-50 text-amber-900",
  valuation: "border-violet-200 bg-violet-50 text-violet-900",
  material: "border-blue-200 bg-blue-50 text-blue-900",
  published: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export default function PortfolioLabelRow({ property: x, onOpen }: { property: Property; onOpen: () => void }) {
  const states: { label: string; tone: keyof typeof tones }[] = [];
  if (x.estado === "Histórico") states.push({ label: "Histórico", tone: "neutral" });
  else {
    if (x.visitaPendiente) states.push({ label: "Visita pendiente", tone: "visit" });
    if (x.tasacionPendiente) states.push({ label: "Tasación pendiente", tone: "valuation" });
    if (x.materialPendiente) states.push({ label: "Material pendiente", tone: "material" });
    if (x.actividades.publicacion.publicado) states.push({ label: "Publicado", tone: "published" });
    if (x.actividades.tasacion.situacion === "pendiente_aprobacion") states.push({ label: "Tasación anterior por revisar", tone: "valuation" });
    if (x.negociacionEnCurso) states.push({ label: "Seguimiento anterior", tone: "material" });
    if (!states.length) states.push({ label: "En seguimiento", tone: "material" });
  }
  const price = x.precioVenta ? `S/ ${Number(x.precioVenta).toLocaleString("es-PE", { maximumFractionDigits: 2 })}` : "Por definir";

  return <button type="button" onClick={onOpen} aria-label={`Ver detalle de ${x.propietario || "Sin contacto"}, ${x.posicion ? `posición ${x.posicion}` : "sin posición"}`} className="group grid w-full grid-cols-[4rem_minmax(0,1fr)] items-start gap-3 px-4 py-4 text-left transition hover:bg-red-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c80000] sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center">
    <span className="flex min-h-8 items-center gap-2"><span className="font-mono text-sm font-semibold text-slate-500">{x.posicion ? String(x.posicion).padStart(2, "0") : "—"}</span><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" /></span>
    <span className="min-w-0">
      <span className="block break-words text-sm font-semibold leading-6 text-slate-900 group-hover:text-[#c80000] sm:text-base">{x.propietario || "Sin contacto"}</span>
      <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 break-words text-xs leading-5 text-slate-600 sm:text-sm"><PropertySummary operation={x.operacion} type={x.tipo} location={x.direccion || x.distrito} /></span>
        {states.map(state => <span key={state.label} className={`inline-flex min-w-0 max-w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold leading-5 sm:text-sm ${tones[state.tone]}`}><span className="break-words">{state.label}</span></span>)}
      </span>
    </span>
    <span className="col-start-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800 sm:col-start-auto sm:justify-end"><span>{price}{x.operacion === "alquiler" && <span className="block text-xs font-normal text-slate-500">/ mes</span>}</span><span aria-hidden="true" className="text-slate-300 group-hover:text-[#c80000]">→</span></span>
  </button>;
}
