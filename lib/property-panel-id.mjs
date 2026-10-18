const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-PE');

// Presentation only: preserve the stored code and numeric ID for routing/history.
export function propertyPanelId(property) {
  const code = property.codigo || (typeof property.id === 'string' ? property.id : '');
  const order = code.match(/^(\d+)-/)?.[1] || property.numeroOrden;
  const parts = [
    order ? String(order).padStart(3, '0') : null,
    clean(property.operacion),
    clean(property.tipo),
    clean(property.direccion || property.ubicacion) || 'ubicación por completar',
  ];
  return parts.filter(Boolean).join('-');
}
