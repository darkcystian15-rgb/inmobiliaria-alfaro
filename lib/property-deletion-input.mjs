export const deletionReasons = [
  { key: 'desistimiento', label: 'El propietario ya no desea que lo gestionemos' },
  { key: 'venta_externa', label: 'Vendido o alquilado por otro canal' },
  { key: 'otro', label: 'Otro motivo' },
];
const draftMaps = ['fechas','observaciones','valores','precios','ventas','textos','textosListos'];
export function deletionInput(body) {
  if (!body || !Number.isSafeInteger(body.inmuebleId) || body.inmuebleId < 1 || !deletionReasons.some(reason => reason.key === body.motivo)) throw Error('Selecciona inmueble y motivo de eliminación.');
  const detalle = typeof body.detalle === 'string' ? body.detalle.trim() : '';
  if (detalle.length > 500 || (body.motivo === 'otro' && !detalle)) throw Error('Describe el motivo de eliminación (hasta 500 caracteres).');
  return { inmuebleId: body.inmuebleId, motivo: body.motivo, detalle };
}
export function pruneDraft(key, data, allowed) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  if (!['visitas:actual','tasaciones:actual','textos:actual'].includes(key)) return data;
  const result = structuredClone(data);
  for (const field of draftMaps) if (result[field] && typeof result[field] === 'object' && !Array.isArray(result[field])) {
    for (const id of Object.keys(result[field])) if (/^\d+$/.test(id) && !allowed.has(Number(id))) delete result[field][id];
  }
  return result;
}

export function propertyDraftMatches(key, data, id, codes) {
  if (!key.startsWith('ficha:')) return false;
  return [`ficha:simple-${id}`, `ficha:${id}`, ...codes.map(code => `ficha:${code}`)].includes(key)
    || Number(data?.form?.id) === id || codes.includes(data?.form?.codigo);
}
