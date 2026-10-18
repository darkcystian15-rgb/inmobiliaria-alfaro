import { propertyPanelId } from './property-panel-id.mjs';
const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function filterProperties(items, query, status) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter(item => {
    if (status !== "todos" && item.estado !== status) return false;
    const searchable = normalize([propertyPanelId(item), item.id, item.nombre, item.tipo, item.ubicacion, item.propietario,
      item.posicion, item.posicion == null ? "" : `pos. ${String(item.posicion).padStart(2, "0")}`].join(" "));
    return terms.every(term => searchable.includes(term));
  }).sort((a, b) => {
    const activeOrder = Number(a.estado !== "activo") - Number(b.estado !== "activo");
    return activeOrder || (a.posicion ?? Infinity) - (b.posicion ?? Infinity) ||
      a.nombre.localeCompare(b.nombre, "es", { numeric: true }) || a.id.localeCompare(b.id);
  });
}
