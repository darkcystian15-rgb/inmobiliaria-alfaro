import test from 'node:test';
import assert from 'node:assert/strict';
import { observationCurrencyHints } from '../lib/appraisal-currency-observations.mjs';
test('dollar observations are detected without guessing the scope of a price', () => {
  for (const note of ['dólares americanos','DOLARES','US$ 50000','USD 50000','50 mil dólares']) assert.equal(observationCurrencyHints(note).mentionsDollars,true,note);
  for (const note of ['',null,'precio en soles','S/ 50000']) assert.equal(observationCurrencyHints(note).mentionsDollars,false);
  assert.deepEqual(observationCurrencyHints('Precio de salida: USD 50000').fields,['precioVenta']);
  assert.deepEqual(observationCurrencyHints('Precio objetivo en dólares americanos').fields,['precioObjetivo']);
  assert.deepEqual(observationCurrencyHints('Tasación de Inmobiliaria en US$').fields,['valorReferencia']);
  assert.deepEqual(observationCurrencyHints('Todos los precios en dólares americanos').fields,['valorReferencia','precioObjetivo','precioVenta']);
  assert.deepEqual(observationCurrencyHints('Dólares americanos').fields,[]);
  assert.deepEqual(observationCurrencyHints('Antes en dólares, ahora en soles').fields,[]);
});
