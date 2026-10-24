import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesWorkflowScreen, workflowPropertyHref } from '../lib/publication-workflow.mjs';
import { diffusionState } from '../lib/diffusion.mjs';
import { zoneHref } from '../lib/zone-url.ts';
import { safeReturnHref, withReturnHref } from '../lib/navigation-return.ts';

test('draft, completed text without media and completed legacy publication keep separate queues', () => {
  const draft = { texto: 'Borrador conservado', textoRealizado: false, publicado: false };
  const text = { texto: 'Texto final sin medios elegidos', textoRealizado: true, publicado: false, mediosDifusion: null };
  const legacy = { texto: 'Texto anterior', publicado: true, mediosDifusion: null };
  const rows = [draft, text, legacy].map(row => ({ ...row, etapa: diffusionState(row) }));
  assert.deepEqual(rows.map(row => matchesWorkflowScreen(row, 'texto')), [true, false, false]);
  assert.deepEqual(rows.map(row => matchesWorkflowScreen(row, 'publicacion')), [false, true, false]);
  assert.deepEqual(rows.map(row => matchesWorkflowScreen(row, 'texto', true)), [false, true, true]);
  assert.deepEqual(rows.map(row => matchesWorkflowScreen(row, 'publicacion', true)), [false, false, true]);
  assert.equal(legacy.mediosDifusion, null);
});

test('new destinations retain property, zone and return context safely', () => {
  for (const route of ['/tasaciones-pendientes', '/textos-pendientes', '/registrar-textos', '/publicaciones-pendientes', '/registrar-publicaciones']) {
    const target = workflowPropertyHref(route, { zona: 'Nuevo Chimbote', inmuebleId: 42 });
    const url = new URL(target, 'https://intranet.invalid');
    assert.equal(url.searchParams.get('inmueble'), '42');
    assert.equal(url.searchParams.get('zona'), 'Nuevo Chimbote');
    assert.equal(safeReturnHref(target), target);
    assert.equal(new URL(withReturnHref(target, '/cartera?zona=Centro'), 'https://intranet.invalid').searchParams.get('volver'), '/cartera?zona=Centro');
    assert.equal(new URL(zoneHref(route, 'Centro'), 'https://intranet.invalid').searchParams.get('zona'), 'Centro');
  }
  assert.equal(safeReturnHref('//example.com/registrar-textos'), null);
});
