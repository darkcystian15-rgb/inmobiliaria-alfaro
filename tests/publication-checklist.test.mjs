import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationChecklist } from '../lib/publication-checklist.mjs';
const ready = { documentoDni: true, archivoTasacion: true, fotosVisita: true, texto: 'Anuncio' };
test('publication requires the four documentary requirements without a typed DNI', () => {
  assert.equal(publicationChecklist(ready).complete, true);
  for (const [key, value] of [['documentoDni', false], ['archivoTasacion', false], ['fotosVisita', false], ['texto', '  ']]) {
    const result = publicationChecklist({ ...ready, [key]: value });
    assert.equal(result.complete, false, key);
    assert.equal(result.missing.length, 1, key);
  }
});

test('a typed DNI cannot replace the hosted DNI document', () => {
  assert.equal(publicationChecklist({ ...ready, dni: '12345678', documentoDni: false }).complete, false);
  assert.equal(publicationChecklist({ ...ready, dni: null }).complete, true);
  assert.equal(publicationChecklist(ready).items.some(item => item.key === 'dni'), false);
});
