export const diffusionMedia = ['cartel', 'redes', 'ambos'];
export const mediaLabel = value => ({cartel:'Cartel físico',redes:'Redes sociales',ambos:'Cartel y redes sociales'})[value] ?? 'Sin especificar';
export function textDone(publication) {
  return Boolean(publication?.texto?.trim() && publication.textoRealizado !== false);
}
export function diffusionState(publication) {
  if (publication?.publicado) return 'completada';
  return textDone(publication) ? 'difusion_pendiente' : 'texto_pendiente';
}
export class DiffusionInputError extends Error {}
export function parseReferences(value) {
  if (!Array.isArray(value) || value.length > 12) throw new DiffusionInputError('Admite hasta 12 referencias de redes sociales.');
  return value.map(item => {
    if (!item || typeof item.canal !== 'string' || typeof item.url !== 'string') throw new DiffusionInputError('Referencia no válida.');
    const canal=item.canal.trim(), url=item.url.trim();
    let parsed;try{parsed=new URL(url);}catch{throw new DiffusionInputError('Indica un enlace válido o retira la referencia vacía.');}
    if (!canal || canal.length>80 || url.length>1000 || !['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new DiffusionInputError('Indica la red social y un enlace HTTP o HTTPS válido.');
    return {canal,url};
  });
}
export function readReferences(value) {
  try {return parseReferences(typeof value==='string'?JSON.parse(value):value??[]);}catch{return [];}
}
export function diffusionInput(body) {
  if (!diffusionMedia.includes(body?.mediosDifusion)) throw new DiffusionInputError('Selecciona cartel físico, redes sociales o ambos.');
  if (typeof body.cartelColocado !== 'boolean' || typeof body.redesPublicadas !== 'boolean') throw new DiffusionInputError('Confirma las acciones realizadas.');
  const cartelColocado=body.mediosDifusion!=='redes'&&body.cartelColocado;
  const redesPublicadas=body.mediosDifusion!=='cartel'&&body.redesPublicadas;
  const publicado=(body.mediosDifusion==='redes'||cartelColocado)&&(body.mediosDifusion==='cartel'||redesPublicadas);
  return {mediosDifusion:body.mediosDifusion,cartelColocado,redesPublicadas,publicado,referenciasDifusion:JSON.stringify(parseReferences(body.referencias??[]))};
}
