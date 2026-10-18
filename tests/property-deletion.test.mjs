import test from 'node:test';
import assert from 'node:assert/strict';
import { deletionInput, pruneDraft, propertyDraftMatches } from '../lib/property-deletion-input.mjs';
import { propertyPanelId, propertyPanelContactId } from '../lib/property-panel-id.mjs';
test('contact identity is scoped; stored and base identifiers stay unchanged',()=>{
 const property={codigo:'012-LOCAL-LIDIA',operacion:'venta',tipo:'Local',direccion:'Av Meigss C3',propietario:'  Lidia Chavarria '};
 assert.equal(propertyPanelContactId(property),'012-venta-local-av meigss c3-lidia chavarria');
 assert.equal(propertyPanelId(property),'012-venta-local-av meigss c3');
 assert.equal(propertyPanelContactId({...property,propietario:null}),'012-venta-local-av meigss c3-sin contacto');
 assert.equal(propertyPanelContactId({...property,propietario:null,nombre_contacto:'Lidia Chavarria'}),'012-venta-local-av meigss c3-lidia chavarria');
 assert.equal(property.codigo,'012-LOCAL-LIDIA');
});
test('permanent deletion requires a valid reason and rejects historical closure reasons',()=>{
 assert.deepEqual(deletionInput({inmuebleId:1,motivo:'otro',detalle:'  Retirado  '}),{inmuebleId:1,motivo:'otro',detalle:'Retirado'});
 for(const body of [{inmuebleId:0,motivo:'desistimiento'},{inmuebleId:1,motivo:'vendido'},{inmuebleId:1,motivo:'otro'},{inmuebleId:1,motivo:'otro',detalle:'x'.repeat(501)}])assert.throws(()=>deletionInput(body));
});
test('deleted draft entries are removed without damaging other properties or unrelated fields',()=>{
 const original={textos:{1:'Eliminar',2:'Conservar'},textosListos:{1:'Eliminar también'},preferencia:'Mantener'};
 const result=pruneDraft('textos:actual',original,new Set([2]));
 assert.deepEqual(result,{textos:{2:'Conservar'},textosListos:{},preferencia:'Mantener'});
 assert.equal(original.textos[1],'Eliminar');
 assert.deepEqual(pruneDraft('registro:zona-1',original,new Set()),original);
});

test('legacy numeric keys, code aliases and form identities are removed only for the selected property',()=>{
 assert.equal(propertyDraftMatches('ficha:4',null,4,['CODE','OLD']),true);
 assert.equal(propertyDraftMatches('ficha:OLD',{},4,['CODE','OLD']),true);
 assert.equal(propertyDraftMatches('ficha:legacy',{form:{id:4}},4,['CODE']),true);
 assert.equal(propertyDraftMatches('ficha:5',{form:{id:5,codigo:'OTHER'}},4,['CODE']),false);
 assert.equal(propertyDraftMatches('textos:actual',{form:{id:4}},4,['CODE']),false);
});
