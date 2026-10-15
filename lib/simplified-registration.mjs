// Data conversion shared by migration preview, apply and regression tests.
const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
export function simplifiedRegistration(row, owner) {
  const location = [clean(row.direccion), clean(row.numero_direccion)].filter(Boolean).join(' ') || clean(row.referencia);
  const contact = clean(row.nombre_contacto) || [clean(owner?.nombres), clean(owner?.apellidos)].filter(Boolean).join(' ');
  if (location.length > 350 || contact.length > 281) throw new Error('Un registro excede la longitud permitida; revisa la migración antes de aplicar.');
  return { nombre_contacto: contact || null, direccion: location || null, numero_direccion: null,
    referencia: location ? location.slice(0, 255) : row.referencia, propietario_id: null };
}
export const simplifiedFields = ['nombre_contacto', 'direccion', 'numero_direccion', 'referencia', 'propietario_id'];
