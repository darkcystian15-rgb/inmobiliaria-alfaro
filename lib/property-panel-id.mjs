const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-PE');

// The visible prefix follows the zone position. Stored keys remain stable for routing/history.
export function propertyPanelId(property) {
  const code = property.codigo || (typeof property.id === 'string' ? property.id : '');
  const position = Number(property.posicion);
  const order = Number.isSafeInteger(position) && position > 0
    ? position : code.match(/^(\d+)-/)?.[1] || property.numeroOrden;
  const parts = [
    order ? String(order).padStart(3, '0') : null,
    clean(property.operacion),
    clean(property.tipo),
    clean(property.direccion || property.ubicacion) || 'ubicación por completar',
  ];
  return parts.filter(Boolean).join('-');
}

// Contact is appended only where explicitly requested: portfolio detail and file listing.
export function propertyPanelContactId(property) {
  return `${propertyPanelId(property)}-${clean(property.nombreContacto || property.nombre_contacto || property.propietario) || 'sin contacto'}`;
}
