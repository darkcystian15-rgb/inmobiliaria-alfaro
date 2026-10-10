export const ALL_ZONES = "*";
export const NO_ZONE = "Sin zona registrada";
type ZonedProperty = { distrito?: string | null; estado: string; visitaPendiente?: boolean; tasacionPendiente?: boolean };
const key = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE");
export function propertyZone(property: Pick<ZonedProperty, "distrito">) {
  return property.distrito?.trim().replace(/\s+/g, " ") || NO_ZONE;
}
export function inZone(property: Pick<ZonedProperty, "distrito">, zone: string | null) {
  return zone === null || zone === ALL_ZONES || key(propertyZone(property)) === key(zone);
}
export function propertyZones(properties: ZonedProperty[]) {
  const groups = new Map<string, { nombre: string; activos: number; historicos: number; total: number }>();
  for (const property of properties) {
    const nombre = propertyZone(property), id = key(nombre);
    const group = groups.get(id) || { nombre, activos: 0, historicos: 0, total: 0 };
    group.total++;
    if (property.estado === "Activo") group.activos++; else group.historicos++;
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-PE"));
}
