import type { ReactNode } from "react";
import { formatPrice } from "@/lib/prices.mjs";
import { priceLabel } from "@/lib/operation.mjs";
import { propertyPanelId } from "@/lib/property-panel-id.mjs";
import type { PortfolioProperty } from "./PortfolioLabelRow";
import PropertySummary from "./PropertySummary";
import FolderIcon from "./FolderIcon";

export default function PortfolioPropertyCard({ property: x, onOpen, actionLabel = "Ver detalle", theme, showZone = false, showProgress = true, children }: {
  property: PortfolioProperty;
  onOpen: () => void;
  actionLabel?: string;
  theme?: { label: string; badge: string; position: string };
  showZone?: boolean;
  showProgress?: boolean;
  children?: ReactNode;
}) {
  const active = x.estado !== "Histórico";
  const tone = theme || {
    label: active ? "Activo" : "Histórico",
    badge: active ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-slate-200",
    position: "bg-amber-50 text-amber-800",
  };
  return <article data-folder-card="true" className="cartera-folder relative mt-4 flex h-full min-w-0 flex-col rounded-b-2xl rounded-tr-2xl border border-amber-200 bg-amber-50/40 shadow-[0_3px_14px_rgba(15,23,42,0.04)] transition duration-200 hover:border-amber-300 hover:shadow-lg">
    <span aria-hidden="true" className="cartera-folder-tab absolute -top-4 left-[-1px] h-4 w-24 rounded-t-xl border border-b-0 border-amber-200 bg-amber-100" />
    <button type="button" onClick={onOpen} aria-label={`${actionLabel} de ${x.propietario || "Sin contacto"}, ${x.posicion ? `posición ${x.posicion}` : "sin posición"}`} className="group flex min-h-[345px] w-full flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c80000]">
      <div aria-hidden="true" className="h-1.5 w-full rounded-tr-2xl bg-amber-100/70" />
      <div className="flex w-full flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          {showZone && <span className="text-xs text-slate-500">{x.zona}</span>}
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-bold tracking-tight ${tone.position}`}>{x.posicion ? String(x.posicion).padStart(2, "0") : "—"}</span>
          <FolderIcon className="h-7 w-7 shrink-0 text-amber-500" />
        </div>
        <span className={`mt-3 inline-flex self-start rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset ${tone.badge}`}>{tone.label}</span>
        <h3 className="mt-3 min-h-10 break-words text-sm font-bold leading-5 text-slate-900" title={x.propietario || "Sin contacto"}>{x.propietario || "Sin contacto"}</h3>
        <p className="mt-2 text-xs font-semibold text-slate-700"><PropertySummary operation={x.operacion} type={x.tipo} location={x.direccion} /></p>
        <p className="mt-1 break-words font-mono text-xs text-slate-500">{propertyPanelId(x)}</p>
        {showProgress && <div className="mt-3 flex min-h-12 content-start flex-wrap gap-1.5">
          {x.visitaPendiente && <span className="rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-amber-800">Visita pendiente</span>}
          {x.tasacionPendiente && <span className="rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-amber-900">Tasación pendiente</span>}
          {x.difusionPendiente && <span className="rounded-md bg-blue-50 px-1.5 py-1 text-xs font-semibold text-blue-900">Publicación pendiente</span>}
          {x.materialPendiente && <span className="rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-amber-900">Texto pendiente</span>}
        </div>}
        <div className="mt-auto pt-4">
          <div className="border-t border-slate-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{priceLabel(x.operacion)}</p><p className={`mt-1 break-words text-base font-bold tracking-tight ${x.precioVenta ? "text-slate-900" : "text-slate-500"}`}>{formatPrice(x.precioVenta, x.precioVentaMoneda)}{x.operacion === "alquiler" ? " / mes" : ""}</p></div>
          <p className="mt-3 text-xs font-semibold text-[#c80000] group-hover:text-[#a90000]">{actionLabel} <span aria-hidden="true">→</span></p>
        </div>
      </div>
    </button>
    {children}
  </article>;
}
