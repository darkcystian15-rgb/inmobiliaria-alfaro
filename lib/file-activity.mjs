import { documentsForOperation, dossierSections, dossierDocumentType } from './transaction-dossier.mjs';

export const fileEventNames = {archivo_subido:'Archivo subido',archivo_enlazado:'Enlace de documento registrado',archivo_actualizado:'Archivo actualizado',archivo_eliminado:'Archivo eliminado'};
/** Capture only human-facing metadata, never storage paths, tokens or external links. */
export function fileActivitySnapshot(file, operation='venta') {
  const type=dossierDocumentType(file.tipoDocumento,operation);
  const definition=documentsForOperation(operation).find(item=>item.key===type);
  const party={vendedor:'Vendedor',comprador:'Comprador',arrendador:'Arrendador',arrendatario:'Arrendatario'}[definition?.party];
  const section=dossierSections.find(([key])=>key===definition?.section)?.[1]?.replace(/^\d+\.\s*/,'');
  const photo=type==='FOTO_INMUEBLE';
  const legacy={DOCUMENTO_PROPIEDAD:'Documento de propiedad',CONTRATO:'Contrato',TEXTO_PUBLICACION:'Texto de publicación',VIDEO_INMUEBLE:'Video del inmueble',PLANO:'Plano',OTRO:'Otro documento',POR_CLASIFICAR:'Por clasificar'};
  const bytes=Number(file.tamanoBytes);
  const formats={'application/pdf':'PDF','image/png':'Imagen PNG','image/jpeg':'Imagen JPG','image/webp':'Imagen WebP','application/msword':'Documento Word','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'Documento Word','application/vnd.ms-excel':'Hoja Excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'Hoja Excel'};
  return {
    archivoId:file.id,
    nombre:file.nombre,
    categoria:photo?'Foto del inmueble':definition?.label||legacy[type]||type.replaceAll('_',' '),
    seccion:photo?'Visitas':party?`${party}${section?` · ${section}`:''}`:`Inmueble${section?` · ${section}`:''}`,
    nombreOriginal:file.nombreOriginal||null,
    formato:formats[file.tipoMime]||file.tipoMime||null,
    tamano:file.tamanoBytes==null?null:bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(2)} MB`,
    visitaId:file.visitaId??null,
    portada:photo?Boolean(file.esPortada):undefined,
    observacion:file.observacion||null,
  };
}
export function fileActivitySummary(event, observation) {
  if(!fileEventNames[event])return null;
  try {
    const data=JSON.parse(observation||'null');
    const file=data?.nuevo||data?.archivo||data?.anterior;
    if(!file?.nombre)return null;
    return `${file.nombre} · ${file.categoria} · ${file.seccion}${file.nombreOriginal&&file.nombreOriginal!==file.nombre?` · Archivo: ${file.nombreOriginal}`:''}`;
  }catch{return null;}
}
