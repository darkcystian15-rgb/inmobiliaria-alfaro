import test from 'node:test';
import assert from 'node:assert/strict';
import {filterTaskProperties,taskPropertyMatches} from '../lib/property-task-list.mjs';

const items=[
  {id:90,posicion:'10',zona:'Chimbote',propietario:'María Campos',direccion:'Av. Meigss C. 4',codigo:'099-LOCAL-ANTERIOR',tipo:'Local',operacion:'venta'},
  {id:100,posicion:'02',zona:'Chimbote',propietario:'José Campos',direccion:'Avenida Meiggs 320'},
  {id:2,posicion:1,zona:'Lima',nombreContacto:'Luis Pérez',direccion:'Calle Lima'},
  {id:3,posicion:null,zona:'Lima',propietario:'Sin posición'},
  {id:4,posicion:'',zona:'Lima'},
];
test('numeric position order is independent of IDs, age and numeric strings; no input mutation',()=>{
  assert.deepEqual(filterTaskProperties(items).map(row=>row.id),[2,100,90,3,4]);
  assert.deepEqual(items.map(row=>row.id),[90,100,2,3,4]);
});
test('typing finds contacts and reference addresses without accents, punctuation or case',()=>{
  for(const query of ['campos','CAMPOS','av meiggs','AV. MEIGSS','avenida meiggs','meiggs campos'])assert.deepEqual(filterTaskProperties(items,query).map(row=>row.id),[100,90]);
  assert.deepEqual(filterTaskProperties(items,'jose campos').map(row=>row.id),[100]);
  assert.deepEqual(filterTaskProperties(items,'perez').map(row=>row.id),[2]);
  assert.deepEqual(filterTaskProperties(items,'no coincide'),[]);
  assert.equal(filterTaskProperties(items,'   ').length,5);
});
test('only contacts, addresses and the visible full ID are searchable',()=>{
  assert.ok(taskPropertyMatches(items[0],'010 venta local av meiggs c 4'));
  assert.ok(taskPropertyMatches(items[0],'010-venta-local-av. meigss c. 4'));
  for(const query of ['099-LOCAL-ANTERIOR','099','90','100','02','Chimbote','referencia privada']) {
    assert.equal(taskPropertyMatches({...items[0],nombre:'referencia privada',referencia:'referencia privada'},query),false,query);
  }
  assert.deepEqual(filterTaskProperties(items,'luis perez').map(row=>row.id),[2]);
});
test('equal positions use zone and identity for stable order, including unassigned positions',()=>{
  const rows=[{inmuebleId:10,posicion:2,zona:'Lima'},{inmuebleId:3,posicion:2,zona:'Chimbote'},{inmuebleId:2,posicion:2,zona:'Chimbote'}];
  assert.deepEqual(filterTaskProperties(rows).map(row=>row.inmuebleId),[2,3,10]);
});
