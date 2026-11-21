import assert from 'node:assert/strict';
import test from 'node:test';
import { editWordLines } from '../lib/word-editor-lines.ts';

test('editar el texto completo conserva las referencias de los párrafos no modificados', () => {
  const original = ['Inicio', 'Cláusula', 'Final'].map((text, paragraph) => ({ text, paragraph }));
  const inserted = editWordLines(original, 'Inicio\n\nCláusula editada\nAnexo\nFinal');
  assert.deepEqual(inserted, [
    original[0],
    { text: '', paragraph: 1 },
    { text: 'Cláusula editada', paragraph: undefined },
    { text: 'Anexo', paragraph: undefined },
    original[2],
  ]);
  assert.deepEqual(editWordLines(inserted, 'Inicio\nAnexo\nFinal'), [original[0], inserted[3], original[2]]);
  assert.deepEqual(editWordLines(original, 'Texto nuevo'), [{ text: 'Texto nuevo', paragraph: 0 }]);
});
