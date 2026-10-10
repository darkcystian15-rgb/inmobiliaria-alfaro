import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyZones, inZone, propertyZone, NO_ZONE, ALL_ZONES } from '../lib/property-zones.ts';
const items=[{distrito:'Chimbote',estado:'Activo'},{distrito:' chimbote ',estado:'Histórico'},{distrito:'Nuevo Chimbote',estado:'Activo'},{distrito:'Tortugas',estado:'Activo'},{distrito:null,estado:'Activo'}];
test('zonas agrupan nombres equivalentes y conservan activos e históricos',()=>{const group=propertyZones(items).find(x=>x.nombre==='Chimbote');assert.deepEqual(group,{nombre:'Chimbote',activos:1,historicos:1,total:2});assert.equal(propertyZones(items).length,4);});
test('seleccionar Chimbote excluye Nuevo Chimbote y Tortugas',()=>assert.deepEqual(items.filter(x=>inZone(x,'Chimbote')),items.slice(0,2)));
test('listado general y pantalla inicial conservan todas las fichas',()=>{for(const zone of [null,ALL_ZONES])assert.equal(items.filter(x=>inZone(x,zone)).length,5);});
test('sin ubicación tiene carpeta propia sin perder registros',()=>{assert.equal(propertyZone(items[4]),NO_ZONE);assert.deepEqual(items.filter(x=>inZone(x,NO_ZONE)),[items[4]]);});
test('zona vacía no produce un listado global accidental',()=>assert.equal(items.filter(x=>inZone(x,'Otra zona')).length,0));
