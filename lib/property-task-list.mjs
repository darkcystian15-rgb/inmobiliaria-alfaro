import { propertyPanelId } from './property-panel-id.mjs';

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-PE')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim()
    .replace(/\bavenida\b/g,'av').replace(/\bmeigss\b/g,'meiggs');
}
function position(item) {
  const n=Number(item.posicion);
  return Number.isInteger(n)&&n>0?n:Infinity;
}
export function compareTaskPositions(a,b) {
  const first=position(a),second=position(b);
  if(first!==second)return first<second?-1:1;
  const zone=normalize(a.zona).localeCompare(normalize(b.zona),'es-PE',{numeric:true});
  if(zone)return zone;
  return String(a.inmuebleId??a.id??a.codigo??'').localeCompare(String(b.inmuebleId??b.id??b.codigo??''),'es-PE',{numeric:true});
}
export function taskPropertyMatches(item,query) {
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  if(!terms.length)return true;
  const text=normalize([
    propertyPanelId(item),
    item.propietario,item.nombreContacto,item.nombre_contacto,
    item.direccion || item.ubicacion,
  ].filter(value=>value!=null).join(' '));
  return terms.every(term=>text.includes(term));
}
/** @template T @param {T[]} items @param {string} [query] @returns {T[]} */
export function filterTaskProperties(items,query='') {
  return items.filter(item=>taskPropertyMatches(item,query)).sort(compareTaskPositions);
}
