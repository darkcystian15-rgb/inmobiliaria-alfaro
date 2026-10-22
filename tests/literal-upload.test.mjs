import test from 'node:test';
import assert from 'node:assert/strict';
import { literalUploadInput, signLiteralUpload, verifyLiteralUpload } from '../lib/literal-upload.mjs';
import { documentByteLimit, MAX_LITERAL_BYTES, MAX_DOCUMENT_BYTES } from '../lib/document-limits.mjs';
import { validateDocument } from '../lib/document-files.mjs';
const secret = 'test-secret-'.repeat(6);
const claims = { filename: 'literal.pdf', nombre: 'Literal', size: 5 * 1048576, observacion: '', path: 'inmuebles/TEST-posicion-1/copia-literal-cri/uuid-literal.pdf', type: 'COPIA_LITERAL_CRI', propertyId: 3, userId: 8, expires: 2000000000 };
const context = { propertyId: 3, userId: 8, now: 1900000000 * 1000 };
test('only literal/CRI supports 50 MB and validates actual bytes at the boundary', () => {
  assert.equal(documentByteLimit('COPIA_LITERAL_CRI'), MAX_LITERAL_BYTES);
  assert.equal(documentByteLimit('COPIA_LITERAL'), MAX_LITERAL_BYTES);
  for (const type of ['VENDEDOR_DNI','COMPRADOR_ALCABALA','FOTO_INMUEBLE','OTRO','']) assert.equal(documentByteLimit(type), MAX_DOCUMENT_BYTES);
  const bytes = Buffer.alloc(MAX_LITERAL_BYTES); bytes.write('%PDF-1.7');
  assert.equal(validateDocument('literal.pdf', bytes, 'COPIA_LITERAL_CRI').contentType, 'application/pdf');
  assert.throws(() => validateDocument('dni.pdf', bytes, 'VENDEDOR_DNI'), /4 MB/);
  assert.throws(() => validateDocument('literal.pdf', Buffer.alloc(MAX_LITERAL_BYTES + 1), 'COPIA_LITERAL_CRI'), /50 MB/);
  assert.throws(() => validateDocument('literal.pdf', Buffer.from('MZ invalid'), 'COPIA_LITERAL_CRI'));
});
test('temporary authorization is scoped to the exact user, property, category, expiry and signed metadata', () => {
  const token = signLiteralUpload(claims, secret);
  assert.deepEqual(verifyLiteralUpload(token, secret, context), claims);
  for (const input of [{ ...context, userId: 9 }, { ...context, propertyId: 4 }, { ...context, now: 2000000001 * 1000 }]) assert.throws(() => verifyLiteralUpload(token, secret, input));
  assert.throws(() => verifyLiteralUpload(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'), secret, context));
  assert.throws(() => verifyLiteralUpload(token, 'other-secret'.repeat(5), context));
  for (const invalid of [{ ...claims, type: 'VENDEDOR_DNI' }, { ...claims, path: '../outside/copia-literal-cri/x.pdf' }]) assert.throws(() => verifyLiteralUpload(signLiteralUpload(invalid, secret), secret, context));
  for (const change of [{ size: MAX_LITERAL_BYTES + 1 }, { size: 0 }, { filename: 'literal.exe' }, { nombre: '' }]) assert.throws(() => literalUploadInput({ ...claims, ...change }));
});
