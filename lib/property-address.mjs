const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');

export function propertyAddress(property, fallback = 'Ubicación por completar') {
  const street = [property?.direccion, property?.numeroDireccion].map(clean).filter(Boolean).join(' ');
  const geography = [property?.distrito, property?.provincia, property?.departamento].map(clean).filter(Boolean);
  return [street, ...(geography.length ? geography : [property?.zona])]
    .map(clean).filter(Boolean).join(', ') || fallback;
}
