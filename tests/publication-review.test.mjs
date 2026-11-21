import test from 'node:test';
import assert from 'node:assert/strict';
import { textNeedsReview, socialNetwork } from '../lib/publication-review.mjs';
import { matchesWorkflowScreen } from '../lib/publication-workflow.mjs';
import { diffusionState } from '../lib/diffusion.mjs';

test('texto registrado con marcadores entra a revisión sin deshacer publicación', () => {
 for (const publicado of [false,true]) {
  const item={texto:'Área: DATO POR CONFIRMAR',textoRealizado:true,publicado};
  item.etapa=diffusionState(item);
  assert.equal(textNeedsReview(item),true);
  assert.equal(matchesWorkflowScreen(item,'texto'),true);
  assert.equal(matchesWorkflowScreen(item,'texto',true),false);
  assert.equal(item.etapa,publicado?'completada':'difusion_pendiente');
  assert.equal(matchesWorkflowScreen(item,'publicacion',publicado),true);
  const corrected={...item,texto:'Área: 120 m²'};
  assert.equal(textNeedsReview(corrected),false);
  assert.equal(matchesWorkflowScreen(corrected,'texto'),false);
  assert.equal(matchesWorkflowScreen(corrected,'texto',true),true);
 }
});
test('un borrador pendiente no se presenta como un registro por revisar', () => {
 assert.equal(textNeedsReview({texto:'DATO POR CONFIRMAR',textoRealizado:false,publicado:false}),false);
 assert.equal(textNeedsReview({texto:'[COMPLETAR ÁREA]',textoRealizado:true}),true);
 assert.equal(textNeedsReview({texto:'[AGREGAR DATOS]',publicado:true}),true);
 assert.equal(textNeedsReview(null),false);
});
test('redes reconocibles y nombres históricos se clasifican sin modificar el dato', () => {
 for(const channel of ['Facebook',' facebook ','FB'])assert.equal(socialNetwork(channel),'Facebook');
 for(const channel of ['Instagram','INSTAGRAM','ig'])assert.equal(socialNetwork(channel),'Instagram');
 for(const channel of ['TikTok','Portal regional',''])assert.equal(socialNetwork(channel),'Otra red');
});
