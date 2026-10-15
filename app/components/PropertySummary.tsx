import { operationLabel } from "@/lib/operation.mjs";

export default function PropertySummary({ operation, type, location }: {
  operation: string; type: string; location?: string | null;
}) {
  return <>{operationLabel(operation.toLowerCase())} · {type} · {location?.trim() || "Ubicación por completar"}</>;
}
