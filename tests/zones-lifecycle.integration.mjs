import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {randomBytes} from 'node:crypto';
const url=new URL(process.env.TEST_DATABASE_URL||'http://invalid');assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/alfaro_zones_test');
const {admin,base}=JSON.parse(await readFile('output/zones-test-session.json','utf8'));assert.equal(new URL(base).hostname,'127.0.0.1');
const db=await mysql.createConnection(process.env.TEST_DATABASE_URL);
async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{Origin:base,Cookie:`aa_session=${admin}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});return {status:r.status,data:await r.json()};}
try{
 const name='Alquiler ensayo '+randomBytes(4).toString('hex');assert.equal((await req('/api/zonas','POST',{nombre:name})).status,201);
 const zone=(await req('/api/zonas')).data.zonas.find(z=>z.nombre===name);const q='?zona='+encodeURIComponent(name);
 let r=await req('/api/inmuebles'+q,'POST',{zonaId:zone.id,posicion:1,operacion:'alquiler',tipo:'Casa',direccion:'Referencia local de alquiler',nombreContacto:'Contacto de ensayo'});assert.equal(r.status,201);const id=r.data.inmuebleId;
 r=await req('/api/liberaciones'+q,'POST',{inmuebleId:id,motivo:'alquilado',fechaAlquiler:'2026-01-01',rentaMensual:'1000',fechaInicioAlquiler:'2026-01-01',fechaFinAlquiler:'2026-02-01'});assert.equal(r.status,201,JSON.stringify(r.data));
 assert.equal((await req('/api/posiciones'+q)).data.posiciones.filter(p=>p.disponible).length,10);
 const contract=(await req('/api/alquileres'+q)).data.items.find(i=>i.inmuebleId===id);assert.ok(contract);
 assert.equal((await req('/api/alquileres?zona=Chimbote','POST',{id:contract.id,posicion:1})).status,409);
 r=await req('/api/alquileres'+q,'POST',{id:contract.id,posicion:1});assert.equal(r.status,201,JSON.stringify(r.data));
 const [[created]]=await db.query('SELECT zona_id,inmueble_origen_id,estado FROM inm_inmuebles WHERE id=?',[r.data.id]);assert.equal(Number(created.zona_id),zone.id);assert.equal(Number(created.inmueble_origen_id),id);assert.equal(created.estado,'activo');
 assert.equal((await req('/api/posiciones'+q)).data.posiciones.filter(p=>p.disponible).length,9);
 assert.equal((await req('/api/alquileres'+q,'POST',{id:contract.id,posicion:2})).status,409);
 const [[legacy]]=await db.query('SELECT COUNT(*) n FROM inm_asignaciones_posicion');assert.equal(Number(legacy.n),15);
 assert.equal((await req('/api/dashboard')).status,200);
 console.log('Ciclo correcto: liberación devuelve el cupo a su zona; reingreso conserva origen y zona; se rechazan otra zona y reingresos repetidos. Tablas antiguas intactas.');
}finally{await db.end();}
