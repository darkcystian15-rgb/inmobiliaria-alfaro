import { sectionsForOperation, dossierDocumentType } from './transaction-dossier.mjs';

const descriptions = {
  identificacion: 'Identificación y representación de las partes',
  inmueble: 'Documentación registral y del inmueble',
  contratos: 'Contratos y documentos de la operación',
  impuestos: 'Liquidaciones, comprobantes y constancias',
  servicios: 'Recibos y pagos de los servicios',
  cargas: 'Documentos según las cargas declaradas',
  tasaciones: 'Archivos de tasación express y otras tasaciones',
};
export const informationFolderPhase = key => ['visitas', 'precios', 'publicacion'].includes(key) ? 1 : 2;

export function informationFolders(operation, administrator, otherFiles = 0) {
  return [
    ...sectionsForOperation(operation).map(([key, label]) => ({ key, label, description: descriptions[key], tab: 'Inmueble' })),
    { key: 'estado', label: 'Estado del expediente', description: 'Condiciones, requisitos y pendientes documentales', tab: 'Estado del expediente' },
    { key: 'visitas', label: 'Visitas y fotos', description: 'Visitas, fotografías y evidencia registrada', tab: 'Visitas' },
    { key: 'precios', label: 'Valores de tasación', description: 'Precios acordados y observaciones de tasación', tab: 'Tasación' },
    { key: 'publicacion', label: 'Texto y difusión', description: 'Texto comercial, cartel físico y redes sociales', tab: 'Publicación' },
    ...(administrator ? [{ key: 'seguimiento', label: 'Seguimiento e historial', description: 'Plazos particulares e historial de la operación', tab: 'Seguimiento' }] : []),
    ...(otherFiles > 0 ? [{ key: 'otros', label: 'Otros archivos conservados', description: 'Documentos anteriores y archivos por clasificar', tab: 'Inmueble' }] : []),
    // Keep old deep links to party views; the explorer groups these documents by section.
  ].map(folder => ({ ...folder, phase: informationFolderPhase(folder.key) }));
}
export function folderForLegacyTab(tab) {
  return ({ Resumen: '', 'Estado del expediente': 'estado', Vendedor: 'vendedor', Comprador: 'comprador', Inmueble: 'inmueble', Visitas: 'visitas', Tasación: 'precios', Publicación: 'publicacion', Seguimiento: 'seguimiento' })[tab] || '';
}

// Presentation only: every non-photo record belongs to one folder, including old
// types and documents which no longer apply to the current dossier conditions.
export function filesByInformationFolder(files, status, operation) {
  const groups = Object.fromEntries(sectionsForOperation(operation).map(([key]) => [key, []]));
  groups.otros = [];
  for (const file of files) {
    if (file.tipoDocumento === 'FOTO_INMUEBLE') continue;
    const normalized = dossierDocumentType(file.tipoDocumento, operation);
    const definition = status?.items.find(item => item.key === normalized);
    (groups[definition?.section] || groups.otros).push(file);
  }
  return groups;
}
