import { dossierDocuments } from './transaction-dossier.mjs';
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_TYPES = new Set(['DNI_PROPIETARIO','DOCUMENTO_PROPIEDAD','COPIA_LITERAL','CONTRATO','TASACION','TEXTO_PUBLICACION','FOTO_INMUEBLE','VIDEO_INMUEBLE','PLANO','RECIBO_SERVICIO','OTRO']);
for (const document of dossierDocuments) DOCUMENT_TYPES.add(document.key);
DOCUMENT_TYPES.add('POR_CLASIFICAR');
const formats = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
export function storageConfigured(env = process.env) {
  if (!env.DOCUMENT_HOSTING_URL?.trim() || !env.DOCUMENT_HOSTING_TOKEN?.trim()) return false;
  try {
    const endpoint = new URL(env.DOCUMENT_HOSTING_URL);
    return endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password;
  } catch { return false; }
}
// Read ZIP directory names without inflating user-controlled content.
function officeEntries(bytes) {
  const b = Buffer.from(bytes);
  for (let end = b.length - 22; end >= Math.max(0, b.length - 65557); end--) {
    if (b.readUInt32LE(end) !== 0x06054b50 || end + 22 + b.readUInt16LE(end + 20) !== b.length) continue;
    const count = b.readUInt16LE(end + 10), size = b.readUInt32LE(end + 12);
    let offset = b.readUInt32LE(end + 16);
    if (offset + size !== end || count > 10000) return [];
    const names = [];
    for (let i = 0; i < count; i++) {
      if (offset + 46 > end || b.readUInt32LE(offset) !== 0x02014b50) return [];
      const length = b.readUInt16LE(offset + 28), extra = b.readUInt16LE(offset + 30), comment = b.readUInt16LE(offset + 32);
      if (offset + 46 + length + extra + comment > end) return [];
      names.push(b.subarray(offset + 46, offset + 46 + length).toString('utf8'));
      offset += 46 + length + extra + comment;
    }
    return offset === end ? names : [];
  }
  return [];
}
export function validateDocument(name, bytes) {
  if (!bytes.length) throw new Error('El archivo está vacío.');
  if (bytes.length > MAX_DOCUMENT_BYTES) throw new Error('El archivo debe pesar como máximo 4 MB.');
  const extension = String(name).split('.').pop().toLowerCase();
  if (!formats[extension]) throw new Error('Selecciona un PDF, Word (.doc, .docx) o Excel (.xls, .xlsx).');
  const b = Buffer.from(bytes);
  let valid = false;
  if (extension === 'pdf') valid = b.subarray(0, 5).toString() === '%PDF-';
  else if (extension === 'doc' || extension === 'xls') valid = b.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1','hex'));
  else {
    const names = officeEntries(b);
    valid = names.includes('[Content_Types].xml') && names.includes(extension === 'docx' ? 'word/document.xml' : 'xl/workbook.xml');
  }
  if (!valid) throw new Error('El contenido del archivo no corresponde a su formato.');
  return { extension, contentType: formats[extension] };
}
export function documentPath({ position, propertyId, propertyCode, type, name, uniqueId }) {
  const filename = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-160) || 'documento';
  const positionFolder = Number.isInteger(position) && position > 0 ? `posicion-${position}` : 'sin-posicion';
  if (!Number.isSafeInteger(propertyId) || propertyId < 1 || !DOCUMENT_TYPES.has(type)) throw new Error('Inmueble o tipo inválido.');
  const code = String(propertyCode || `inmueble-${propertyId}`).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
  return `inmuebles/${code}-${positionFolder}/${type.toLowerCase().replaceAll('_','-')}/${uniqueId}-${filename}`;
}
export async function storeDocument({ pathname, bytes, upload, remove, register }) {
  await upload(pathname, bytes);
  try { return await register({ pathname }); }
  catch (error) {
    try { await remove(pathname); } catch { throw new Error('No se registró el documento y no se pudo limpiar el archivo subido. Contacta al administrador.'); }
    throw error;
  }
}
