import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDocument, documentPath, storageConfigured, storeDocument, MAX_DOCUMENT_BYTES } from '../lib/document-files.mjs';
test('PDF, legacy Office and Office ZIP accepted; renamed executables and wrong Office type rejected', () => {
  assert.equal(validateDocument('dni.pdf', Buffer.from('%PDF-1.7\n%%EOF')).contentType, 'application/pdf');
  for (const extension of ['doc','xls']) assert.ok(validateDocument(`test.${extension}`, Buffer.from('d0cf11e0a1b11ae100000000','hex')));
  const fixtures = {'docx': 'UEsDBBQAAAAAAPYxQ13HHBc8CAAAAAgAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDxUeXBlcy8+UEsDBBQAAAAAAPYxQ11fW9FMCwAAAAsAAAARAAAAd29yZC9kb2N1bWVudC54bWw8ZG9jdW1lbnQvPlBLAQIUAxQAAAAAAPYxQ13HHBc8CAAAAAgAAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAAA9jFDXV9b0UwLAAAACwAAABEAAAAAAAAAAAAAAIABOQAAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAACAAIAgAAAAHMAAAAAAA==', 'xlsx': 'UEsDBBQAAAAAAPYxQ13HHBc8CAAAAAgAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDxUeXBlcy8+UEsDBBQAAAAAAPYxQ11fW9FMCwAAAAsAAAAPAAAAeGwvd29ya2Jvb2sueG1sPGRvY3VtZW50Lz5QSwECFAMUAAAAAAD2MUNdxxwXPAgAAAAIAAAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAAAPYxQ11fW9FMCwAAAAsAAAAPAAAAAAAAAAAAAACAATkAAAB4bC93b3JrYm9vay54bWxQSwUGAAAAAAIAAgB+AAAAcQAAAAAA'};
  for (const [extension, encoded] of Object.entries(fixtures)) {
    const zip = Buffer.from(encoded, "base64");
    assert.ok(validateDocument(`test.${extension}`, zip));
    assert.throws(() => validateDocument(`test.${extension === 'docx' ? 'xlsx' : 'docx'}`, zip));
  }
  assert.throws(() => validateDocument('fake.pdf', Buffer.from('MZ executable')));
  assert.throws(() => validateDocument('fake.docx', Buffer.from('PK')));
  assert.throws(() => validateDocument('fake.exe', Buffer.from('%PDF-')));
  assert.throws(() => validateDocument('empty.pdf', Buffer.alloc(0)));
  assert.throws(() => validateDocument('large.pdf', Buffer.alloc(MAX_DOCUMENT_BYTES + 1)));
});
test('position reuse separates properties; safe names and historic unassigned properties', () => {
  const input = { position: 11, propertyId: 11, propertyCode: 'INM-011', type: 'COPIA_LITERAL', name: '../../copia año.pdf', uniqueId: 'uuid' };
  const path = documentPath(input);
  assert.match(path, /^inmuebles\/INM-011-posicion-11\/copia-literal\/uuid-/);
  assert.equal(path.includes('/../'), false);
  assert.notEqual(path, documentPath({ ...input, propertyId: 12, propertyCode: 'INM-012' }));
  assert.match(documentPath({ ...input, position: null }), /sin-posicion/);
});
test('private upload cleans up when registration fails', async () => {
  const calls = [];
  const input = { pathname: 'p', bytes: Buffer.from('%PDF-'), upload: async (...args) => { calls.push(args);  }, remove: async url => calls.push(url), register: async () => { throw new Error('db failure'); } };
  await assert.rejects(storeDocument(input), /db failure/);
  assert.equal(calls[0][0], 'p');
  assert.equal(calls[1], 'p');
  calls.length = 0;
  assert.equal(await storeDocument({ ...input, register: async () => 42 }), 42);
  assert.equal(calls.length, 1);
});
test('only hosting credentials enable document storage', () => {
  assert.equal(storageConfigured({}), false);
  assert.equal(storageConfigured({ DOCUMENT_HOSTING_URL: 'https://files.example/documentos.php', DOCUMENT_HOSTING_TOKEN: 'secret' }), true);
  assert.equal(storageConfigured({ DOCUMENT_HOSTING_URL: 'https://files.example/documentos.php' }), false);
  for (const url of ['not-a-url', '/documentos.php', 'http://files.example/documentos.php', 'file:///tmp/documentos.php', 'https://user:password@files.example/documentos.php']) {
    assert.equal(storageConfigured({ DOCUMENT_HOSTING_URL: url, DOCUMENT_HOSTING_TOKEN: 'secret' }), false, 'Invalid hosting must not enable uploads');
  }
  assert.equal(storageConfigured({ DOCUMENT_HOSTING_URL: 'https://files.example/documentos.php', DOCUMENT_HOSTING_TOKEN: '  ' }), false);
});

test('property code and position appear in a safe folder with a unique filename', () => {
  const input = { position: 1, propertyId: 1, propertyCode: 'INM-001', type: 'DNI_PROPIETARIO', name: 'dni.pdf', uniqueId: 'first' };
  assert.equal(documentPath(input), 'inmuebles/INM-001-posicion-1/dni-propietario/first-dni.pdf');
  assert.notEqual(documentPath(input), documentPath({ ...input, uniqueId: 'second' }));
  assert.equal(documentPath({ ...input, position: null }), 'inmuebles/INM-001-sin-posicion/dni-propietario/first-dni.pdf');
  assert.equal(documentPath({ ...input, propertyCode: '../../código' }).includes('/../'), false);
});
