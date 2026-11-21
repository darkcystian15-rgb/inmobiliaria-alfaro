import { DOCUMENT_TYPES } from './document-files.mjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { MAX_LITERAL_BYTES } from './document-limits.mjs';
const signature = (payload, secret) => createHmac('sha256', secret).update('literal-v1.' + payload).digest('hex');
export function literalUploadInput(body) {
  if (!body || typeof body !== 'object') throw Error('Datos de archivo no válidos.');
  const { filename, size, nombre, observacion = '', type = 'COPIA_LITERAL_CRI', subcarpetaId = '' } = body;
  if (!DOCUMENT_TYPES.has(type) || type === 'FOTO_INMUEBLE') throw Error('Datos de archivo no válidos.');
  if (typeof subcarpetaId !== 'string' || !/^[a-zA-Z0-9-]{0,64}$/.test(subcarpetaId)) throw Error('Datos de archivo no válidos.');
  if (typeof filename !== 'string' || !filename || filename.length > 255 || !/\.(pdf|doc|docx|xls|xlsx)$/i.test(filename)) throw Error('Selecciona un PDF, Word o Excel para el documento.');
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_LITERAL_BYTES) throw Error('El documento debe pesar como máximo 100 MB.');
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 255 || typeof observacion !== 'string' || observacion.trim().length > 500) throw Error('Revisa el nombre y la observación.');
  return { filename, size, nombre: nombre.trim(), observacion: observacion.trim(), type, subcarpetaId };
}
export function signLiteralUpload(claims, secret) {
  if (!secret || secret.length < 32) throw Error('Hosting no configurado.');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return 'literal-v1.' + payload + '.' + signature(payload, secret);
}
export function verifyLiteralUpload(token, secret, { propertyId, userId, now = Date.now() }) {
  if (typeof token !== 'string' || token.length > 8000 || !secret || secret.length < 32) throw Error('Autorización de subida no válida.');
  const [version, payload, supplied, extra] = token.split('.');
  if (version !== 'literal-v1' || !payload || !/^[a-f0-9]{64}$/.test(supplied || '') || extra || !timingSafeEqual(Buffer.from(supplied), Buffer.from(signature(payload, secret)))) throw Error('Autorización de subida no válida.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (claims.propertyId !== propertyId || claims.userId !== userId || !Number.isSafeInteger(claims.expires) || claims.expires < Math.floor(now / 1000)) throw Error('La autorización de subida venció o corresponde a otra sesión.');
  literalUploadInput(claims);
  if (typeof claims.path !== 'string' || !claims.path.startsWith('inmuebles/') || !claims.path.includes('/' + claims.type.toLowerCase().replaceAll('_', '-') + '/') || claims.path.includes('..')) throw Error('Ruta no válida.');
  return claims;
}
