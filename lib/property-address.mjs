const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');

export function propertyAddress(property, fallback = 'Ubicación por completar') {
  const street = [property?.direccion, property?.numeroDireccion].map(clean).filter(Boolean).join(' ');
  return [street, property?.distrito, property?.provincia, property?.departamento]
    .map(clean).filter(Boolean).join(', ') || fallback;
}
