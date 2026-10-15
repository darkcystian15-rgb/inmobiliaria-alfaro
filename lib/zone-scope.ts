import { sql } from "drizzle-orm";
import { inmInmuebles, inmPosiciones } from "@/db/schema";

export const propertyZoneName = sql<string>`(SELECT z.nombre FROM inm_zonas z WHERE z.id=${inmInmuebles.zonaId})`;
export function selectedZone(request: Request) {
  const name = new URL(request.url).searchParams.get("zona")?.trim();
  return name && name !== "*" ? name : null;
}
export function zoneCondition(request: Request) {
  const name = selectedZone(request);
  return name ? sql`${inmInmuebles.zonaId}=(SELECT z.id FROM inm_zonas z WHERE z.nombre=${name} AND z.activo=1)` : sql`1=1`;
}
export function positionZoneCondition(request: Request) {
  const name=selectedZone(request);
  return name ? sql`${inmPosiciones.zonaId}=(SELECT z.id FROM inm_zonas z WHERE z.nombre=${name} AND z.activo=1)` : sql`1=1`;
}
