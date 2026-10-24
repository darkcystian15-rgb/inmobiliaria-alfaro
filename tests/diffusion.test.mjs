import test from 'node:test';import assert from 'node:assert/strict';
import {diffusionInput,diffusionState,parseReferences,textDone} from '../lib/diffusion.mjs';
test('draft, completed text and preserved legacy diffusion are distinct',()=>{
 assert.equal(diffusionState(null),'texto_pendiente');
 assert.equal(diffusionState({texto:'Borrador',textoRealizado:false}),'texto_pendiente');
 assert.equal(diffusionState({texto:'Texto completo',textoRealizado:true,publicado:false}),'difusion_pendiente');
 assert.equal(diffusionState({texto:'Anterior',textoRealizado:true,publicado:true,mediosDifusion:null}),'completada');
 assert.equal(textDone({texto:' ',textoRealizado:true}),false);
});
test('only the selected media determine completion; no dates or URLs are required',()=>{
 for(const mediosDifusion of ['cartel','redes','ambos'])for(const cartelColocado of [false,true])for(const redesPublicadas of [false,true]){
  const value=diffusionInput({mediosDifusion,cartelColocado,redesPublicadas});
  assert.equal(value.publicado,mediosDifusion==='cartel'?cartelColocado:mediosDifusion==='redes'?redesPublicadas:cartelColocado&&redesPublicadas);
  assert.equal(value.referenciasDifusion,'[]');
 }
});
test('references remain optional and reject executable or credential-bearing links',()=>{
 assert.deepEqual(parseReferences([]),[]);
 assert.deepEqual(parseReferences([{canal:' Facebook ',url:'https://facebook.com/example'}]),[{canal:'Facebook',url:'https://facebook.com/example'}]);
 for(const url of ['javascript:alert(1)','file:///tmp/x','https://user:password@example.com',''])assert.throws(()=>parseReferences([{canal:'Red',url}]));
 assert.throws(()=>diffusionInput({mediosDifusion:'otros',cartelColocado:false,redesPublicadas:true}));
 assert.throws(()=>diffusionInput({mediosDifusion:'redes',cartelColocado:false,redesPublicadas:'true'}));
});
