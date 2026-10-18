import { propertyPanelId } from "@/lib/property-panel-id.mjs";
import type { ReactNode } from "react";
import PropertySummary from "./PropertySummary";

type Props = {
  code?: string | null;
  position: string | number | null;
  contact?: string | null;
  operation: string;
  type?: string | null;
  location?: string | null;
  positionClassName: string;
  icon?: ReactNode;
};

// A single identity for task lists: position, contact, then the reference summary.
export default function PropertyListIdentity({ code, position, contact, operation, type, location, positionClassName, icon }: Props) {
  const number = position != null && /^\d+$/.test(String(position))
    ? String(position).padStart(2, "0") : "—";
  const name = contact?.trim() || "Sin contacto";
  return <div className="flex min-w-0 flex-1 items-start gap-3">
    <span aria-label={`Posición ${number}`} className={`shrink-0 ${positionClassName}`}>{number}</span>
    {icon}
    <div className="min-w-0 flex-1">
      <h3 className="break-words text-sm font-semibold leading-5 text-slate-900">{name}</h3>
      <p className="mt-1 break-words text-xs leading-5 text-slate-500"><PropertySummary operation={operation} type={type || "Tipo por completar"} location={location} /></p>
      {code && <p className="mt-1 break-words font-mono text-xs text-slate-500">{propertyPanelId({ codigo: code, posicion: position, operacion: operation, tipo: type, direccion: location })}</p>}
    </div>
  </div>;
}
