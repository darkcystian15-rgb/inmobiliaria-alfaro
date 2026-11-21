import { propertyAddress } from './property-address.mjs';
import { formatPrice } from './prices.mjs';

export const UNCONFIRMED = 'DATO POR CONFIRMAR';
// Editable suggestions supplied by the user; never inferred property features.
export const HOUSE_SALE_DISTRIBUTION = `1ER NIVEL: ${UNCONFIRMED}
2DO NIVEL (SI EXISTE): ${UNCONFIRMED}`;
const clean = value => String(value ?? '').trim();
const normalized = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]/g, ' ');

/** @param {Record<string, unknown>} property */
export function publicationTemplate(property = {}) {
  const type = normalized(property.tipo);
  const operation = normalized(property.operacion) === 'alquiler' ? 'alquiler' : 'venta';
  let kind = 'general', icon = '🏠';
  if (/terreno|lote/.test(type)) { kind = /comercial/.test(type) ? 'terreno_comercial' : /urbano/.test(type) ? 'terreno_urbano' : 'terreno'; icon = '📐'; }
  else if (/departamento|dpto/.test(type)) { kind = 'departamento'; icon = '🏢'; }
  else if (/casa/.test(type)) { kind = 'casa'; icon = '🏡'; }
  else if (/hotel/.test(type)) { kind = 'hotel'; icon = '🏨'; }
  else if (/edificio/.test(type)) { kind = 'edificio'; icon = '🏙️'; }
  else if (/local/.test(type)) { kind = 'local_comercial'; icon = '🏪'; }
  const specific = ['casa', 'departamento', 'local_comercial', 'terreno_comercial'].includes(kind) || (operation === 'venta' && ['terreno_urbano', 'edificio', 'hotel'].includes(kind));
  return { key: `${kind}_${operation}`, kind, operation, icon, specific, label: `${clean(property.tipo) || 'Inmueble'} · ${operation === 'alquiler' ? 'Alquiler' : 'Venta'}` };
}

/** Creates a starting point only. Saved text is never passed through this generator.
 * @param {Record<string, unknown>} property
 */
export function publicationTextModel(property = {}) {
  const template = publicationTemplate(property);
  const {kind, operation, icon} = template;
  const rent = operation === 'alquiler', land = kind.startsWith('terreno');
  const value = key => clean(property[key]) || UNCONFIRMED;
  const area = key => Number(property[key]) > 0 ? `${clean(property[key])} M²` : UNCONFIRMED;
  const location = [propertyAddress(property, ''), property.distrito, property.provincia].map(clean).filter(Boolean).filter((item, i, items) => items.indexOf(item) === i).join(' - ');
  const lines = [
    `${icon} ${rent ? 'SE ALQUILA' : 'SE VENDE'} ${(clean(property.tipo).replaceAll('_', ' ') || UNCONFIRMED).toUpperCase()}`,
    '', '📍 UBICACIÓN', location.toUpperCase() || UNCONFIRMED,
    `REFERENCIAS: ${value('referenciasUbicacion')}`, '',
  ];
  if (kind === 'departamento') lines.push(`🏢 PISO: ${value('piso')}`, `📐 ÁREA CONSTRUIDA: ${area('areaConstruida')}`);
  else {
    lines.push(`📐 ÁREA DE TERRENO: ${area('areaTerreno')}`);
    if (land || kind === 'casa' || kind === 'local_comercial') lines.push(`↔️ MEDIDAS (FRENTE Y FONDO): ${value('medidas')}`);
    if (!land || Number(property.areaConstruida) > 0) lines.push(`🏗️ ÁREA CONSTRUIDA TOTAL: ${area('areaConstruida')}`);
  }
  if (kind === 'casa' && rent) lines.push(`🪑 AMOBLADO / EQUIPAMIENTO: ${value('equipamiento')}`);
  if (['casa', 'departamento', 'hotel', 'general'].includes(kind)) {
    if (Number(property.habitaciones) > 0) lines.push(`🛏️ HABITACIONES: ${property.habitaciones}`);
    if (Number(property.banos) > 0) lines.push(`🚿 BAÑOS: ${property.banos}`);
  }
  if (kind === 'hotel' || kind === 'edificio') lines.push(`🏢 NÚMERO DE PISOS: ${value('pisos')}`);
  if (!land) lines.push('', kind === 'edificio' || kind === 'casa' ? '🛋️ DISTRIBUCIÓN POR NIVELES' : kind === 'local_comercial' ? '⚙️ CONSTRUCCIÓN E INSTALACIONES' : '🛋️ DISTRIBUCIÓN', clean(property.distribucion) || clean(property.caracteristicas) || (kind === 'casa' && !rent ? HOUSE_SALE_DISTRIBUTION : UNCONFIRMED));
  else lines.push('', '✨ CARACTERÍSTICAS DEL TERRENO', clean(property.caracteristicas) || UNCONFIRMED);
  if (kind === 'hotel') lines.push(`🚗 ESTACIONAMIENTOS: ${value('estacionamientos')}`, `🛎️ INSTALACIONES Y SERVICIOS: ${value('instalaciones')}`, `🗓️ ANTIGÜEDAD: ${value('antiguedad')}`, `✨ ESTADO DE CONSERVACIÓN: ${value('conservacion')}`, `🏗️ POSIBILIDAD DE AMPLIACIÓN: ${value('ampliacion')}`);
  if (kind === 'edificio') lines.push(`🏗️ POSIBILIDAD DE AMPLIACIÓN: ${value('ampliacion')}`);
  if (['terreno_comercial', 'local_comercial', 'edificio'].includes(kind)) lines.push('', '💡 IDEAL PARA', value('usosPosibles'));
  lines.push('', `💵 ${rent ? 'ALQUILER MENSUAL' : 'PRECIO DE VENTA'}: ${Number(property.precioVenta) > 0 && ['USD', 'PEN'].includes(String(property.precioVentaMoneda)) ? formatPrice(property.precioVenta, property.precioVentaMoneda) : UNCONFIRMED}`);
  if (rent) lines.push('', '📋 CONDICIONES', `GARANTÍA: ${value('garantia')}`, `ADELANTO: ${value('adelanto')}`);
  lines.push('', '📲 CONTACTO', 'INMOBILIARIA ALBERTO ALFARO', clean(property.telefonoPublicacion) || '940221494', '', '🤝 TU INMUEBLE EN LAS MEJORES MANOS');
  return lines.join('\n');
}

export function unconfirmedCount(text = '') {
  return (text.match(/DATO POR CONFIRMAR|\[COMPLETAR[^\]]*\]|\[AGREGAR[^\]]*\]/gi) || []).length;
}

export function insertHouseSaleDistribution(text = '') {
  const lines = text.split('\n');
  const heading = lines.findIndex(line => line.includes('DISTRIBUCIÓN POR NIVELES'));
  if (heading >= 0 && lines[heading + 1]?.trim() === UNCONFIRMED) lines[heading + 1] = HOUSE_SALE_DISTRIBUTION;
  return lines.join('\n');
}

/** Apply only to an explicitly selected pending line; never rebuild a user's draft. */
export function applyDocumentProposal(text, target, proposed) {
  if (!clean(proposed)) return text;
  const lines = text.split('\n');
  const index = Number(target);
  if (!Number.isSafeInteger(index) || index < 0 || !lines[index]?.includes(UNCONFIRMED)) return text;
  lines[index] = lines[index].replace(UNCONFIRMED, clean(proposed));
  return lines.join('\n');
}
