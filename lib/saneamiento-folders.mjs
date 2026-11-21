// Folder metadata lives in the property's versioned dossier. File bytes and paths never move.
export const emptySaneamiento = () => ({
  folders: /** @type {{id: string, nombre: string}[]} */ ([]),
  files: /** @type {Record<string, string>} */ ({}),
});
export const isSaneamientoType = type => ['LEVANTAMIENTO_CARGAS', 'OTROS_CARGAS'].includes(type);
export function saneamientoInput(value = emptySaneamiento()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.folders) || !value.files || typeof value.files !== 'object' || Array.isArray(value.files)) throw Error('Carpetas de saneamiento no válidas.');
  const result = emptySaneamiento(), names = new Set(), ids = new Set();
  for (const folder of value.folders) {
    if (!folder || Object.keys(folder).some(key => !['id', 'nombre'].includes(key)) || typeof folder.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(folder.id) || typeof folder.nombre !== 'string') throw Error('Subcarpeta no válida. Solo se admite un nivel.');
    const nombre = folder.nombre.trim(), key = nombre.toLocaleLowerCase('es');
    if (!nombre || nombre.length > 120 || /[\\/\u0000-\u001f]/.test(nombre) || ids.has(folder.id) || names.has(key)) throw Error('Usa un nombre de carpeta único, de 1 a 120 caracteres y sin barras.');
    ids.add(folder.id); names.add(key); result.folders.push({ id: folder.id, nombre });
  }
  for (const [fileId, folderId] of Object.entries(value.files)) {
    if (!/^[1-9]\d*$/.test(fileId) || !Number.isSafeInteger(Number(fileId)) || !ids.has(folderId)) throw Error('Ubicación de documento no válida.');
    result.files[fileId] = folderId;
  }
  return result;
}
export function changeSaneamiento(value, action, files, newId = '') {
  const next = saneamientoInput(value);
  // Remove obsolete references only; never remove or rewrite an actual document.
  const allowed = new Set(files.filter(file => isSaneamientoType(file.tipoDocumento)).map(file => String(file.id)));
  next.files = Object.fromEntries(Object.entries(next.files).filter(([id]) => allowed.has(id)));
  if (action.action === 'create') next.folders.push({ id: newId, nombre: action.nombre });
  else if (action.action === 'rename') {
    const folder = next.folders.find(folder => folder.id === action.folderId);
    if (!folder) throw Error('La subcarpeta ya no existe.');
    folder.nombre = action.nombre;
  } else if (action.action === 'move') {
    if (!allowed.has(String(action.fileId))) throw Error('El documento no pertenece al saneamiento de este inmueble.');
    if (action.folderId) next.files[String(action.fileId)] = action.folderId;
    else delete next.files[String(action.fileId)];
  } else if (action.action === 'delete') {
    if (!next.folders.some(folder => folder.id === action.folderId)) throw Error('La subcarpeta ya no existe.');
    if (Object.values(next.files).includes(action.folderId)) throw Error('Mueve primero los documentos; solo se pueden eliminar subcarpetas vacías.');
    next.folders = next.folders.filter(folder => folder.id !== action.folderId);
  } else throw Error('Acción de subcarpeta no válida.');
  return saneamientoInput(next);
}
