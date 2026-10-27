import test from 'node:test';
import assert from 'node:assert/strict';
import { readUploadFile } from '../lib/client-upload-file.mjs';

test('a provider-backed PDF becomes an independent file before multipart encoding', async () => {
  const bytes = new Uint8Array(2 * 1024 * 1024);
  bytes.set(new TextEncoder().encode('%PDF-1.7\n'));
  let readable = true;
  const source = { name: 'copia.pdf', size: bytes.length, type: 'application/pdf', lastModified: 123,
    async arrayBuffer() { if (!readable) throw new DOMException('Provider unavailable', 'NotReadableError'); return bytes.buffer.slice(0); } };
  const prepared = await readUploadFile(source);
  readable = false;
  assert.equal(prepared.name, source.name);
  assert.equal(prepared.type, source.type);
  assert.equal(prepared.lastModified, source.lastModified);
  const form = new FormData();
  form.set('archivo', prepared);
  const received = await new Request('https://intranet.example/upload', { method: 'POST', body: form }).formData();
  assert.deepEqual(new Uint8Array(await received.get('archivo').arrayBuffer()), bytes);
  await assert.rejects(readUploadFile(source), /Descargas de tu celular/);
});

test('an incomplete provider read fails before sending a document', async () => {
  await assert.rejects(readUploadFile({ size: 100, async arrayBuffer() { return new ArrayBuffer(10); } }), /archivo completo/);
});
