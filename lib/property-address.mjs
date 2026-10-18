const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');

// Operational descriptions use only the reference address. Zone is a separate context.
export function propertyAddress(property, fallback = 'Ubicación por completar') {
  return [property?.direccion, property?.numeroDireccion].map(clean).filter(Boolean).join(' ') || fallback;
}
