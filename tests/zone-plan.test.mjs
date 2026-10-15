import test from 'node:test';
import assert from 'node:assert/strict';
import {planZones} from '../lib/zone-plan.mjs';
const property=(id,distrito,estado='activo')=>({id,distrito,estado});
test('each zone has independent positions, and aliases use the same capacity',()=>{
 const p=planZones([property(1,'Chimbote'),property(2,'Nvo. Chimbote'),property(3,'Casma')],[{inmueble_id:1,posicion_id:1,activa:1},{inmueble_id:2,posicion_id:1,activa:1},{inmueble_id:3,posicion_id:80,activa:1}],[{id:1,numero:1},{id:80,numero:80}]);
 assert.deepEqual(p.allocations.map(x=>x.numero),[1,1,1]);
 assert.equal(p.zones.find(z=>z.nombre==='Casma').capacidad,10);
 assert.equal(p.zones.find(z=>z.nombre==='Nuevo Chimbote').capacidad,90);
});
test('overcapacity aborts instead of discarding or moving properties',()=>{
 assert.throws(()=>planZones(Array.from({length:11},(_,i)=>property(i+1,'Casma')),[],[]),/admite 10/);
 assert.throws(()=>planZones(Array.from({length:51},(_,i)=>property(i+1,'Chimbote')),[],[]),/admite 50/);
});
test('missing zones require an explicit decision; valid positions remain reserved',()=>{
 assert.throws(()=>planZones([property(1,null)],[],[]),/sin zona/);
 const p=planZones([property(1,null),property(2,'Chimbote')],[{inmueble_id:1,posicion_id:80,activa:1},{inmueble_id:2,posicion_id:1,activa:1}],[{id:1,numero:1},{id:80,numero:80}],'Chimbote');
 assert.equal(p.allocations.find(a=>a.inmuebleId===2).numero,1);
 assert.equal(p.allocations.find(a=>a.inmuebleId===1).numero,2);
});
test('inconsistent assignments abort the migration',()=>{
 assert.throws(()=>planZones([property(1,'Chimbote')],[{inmueble_id:1,posicion_id:1,activa:1},{inmueble_id:1,posicion_id:1,activa:1}],[{id:1,numero:1}]),/más de una/);
 assert.throws(()=>planZones([property(1,'Chimbote','historico')],[{inmueble_id:1,posicion_id:1,activa:1}],[{id:1,numero:1}]),/histórica/);
});
