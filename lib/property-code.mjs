function segment(value, maximum) {
  const text = String(value ?? '').trim();
  if (!text || text.length > maximum) throw new Error('Nombre o tipo de inmueble no válido.');
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('es-PE')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'INMUEBLE';
}

export function propertyCode(order, type, name) {
  if (!Number.isSafeInteger(order) || order < 1) throw new Error('Número de orden no válido.');
  return `${String(order).padStart(3, '0')}-${segment(type, 30)}-${segment(name, 255)}`;
}
