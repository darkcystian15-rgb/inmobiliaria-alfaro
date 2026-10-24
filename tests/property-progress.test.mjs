import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyProgress } from '../lib/property-progress.ts';

const initial = { estado: 'activo', visitaRealizada: false, tasacionRegistrada: false, situacionTasacion: null, publicado: false };
test('workflow follows agreed prices and a complete dossier without a separate approval step', () => {
  assert.equal(propertyProgress(initial).href, '/registrar-visitas');
  assert.equal(propertyProgress({...initial,visitaRealizada:true}).href, '/registrar-tasaciones');
  const valued = {...initial,visitaRealizada:true,tasacionRegistrada:true,situacionTasacion:'aprobado'};
  assert.equal(propertyProgress(valued).steps[3].label, 'Texto');
  assert.equal(propertyProgress(valued).steps[3].state, 'current');
  assert.equal(propertyProgress(valued).href, '/registrar-textos');
  assert.equal(propertyProgress({...valued,textoRealizado:true}).href, '/registrar-publicaciones');
  assert.equal(propertyProgress({...valued,textoRealizado:true}).steps[4].state, 'current');
});
test('historical and published properties have no new operational action', () => {
  assert.equal(propertyProgress({...initial,estado:'historico'}).href, null);
  assert.ok(!propertyProgress({...initial,estado:'historico'}).steps.some(step=>step.state==='current'));
  const published = propertyProgress({...initial,publicado:true});
  assert.equal(published.href, null);
  assert.equal(published.steps[1].state, 'pending', 'Publication does not invent an unrecorded completed visit');
  assert.equal(published.steps[4].state, 'complete');
});
