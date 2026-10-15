// Run only against an isolated local clone, with the new zone migration already rehearsed.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const database=new URL(process.env.TEST_DATABASE_URL||'http://invalid');
assert.ok(['127.0.0.1','localhost'].includes(database.hostname)&&database.pathname==='/alfaro_zones_test','Requires isolated local alfaro_zones_test');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3152';assert.equal(new URL(base).hostname,'127.0.0.1');
const db=await mysql.createConnection(process.env.TEST_DATABASE_URL);
const suffix=randomBytes(5).toString('hex');
async function session(rol){
 const [user]=await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,rol,activo) VALUES(?,?,?,?,1)',['Ensayo zonas',`zones-${rol}-${suffix}@example.invalid`,`zones-${rol}-${suffix}`,rol]);
 const token=randomBytes(32).toString('hex');await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 1 HOUR),NOW(),NOW())',[createHash('sha256').update(token).digest('hex'),user.insertId]);return token;
}
let admin;
async function request(path,method='GET',body,cookie=admin){
 const response=await fetch(base+path,{method,headers:{Origin:base,...(cookie?{Cookie:`aa_session=${cookie}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 const data=await response.json();return {status:response.status,data};
}
try{
 admin=await session('administrador');const operator=await session('usuario');
 let r=await request('/api/zonas');assert.equal(r.status,200);assert.equal(r.data.zonas.length,7);assert.equal(r.data.zonas.reduce((s,z)=>s+z.capacidad,0),200);
 assert.equal((await request('/api/zonas','GET',null,operator)).status,403);
 assert.equal((await request('/api/inmuebles','GET',null,operator)).status,200);
 r=await request('/api/cartera');assert.equal(r.status,200);assert.equal(r.data.inmuebles.length,15);assert.equal(r.data.resumen.enCartera,14);assert.equal(r.data.resumen.capacidad,200);assert.equal(r.data.resumen.disponibles,186);
 const allIds=new Set(r.data.inmuebles.map(p=>p.inmuebleId));
 for(const [zone,cap,count]of [['Chimbote',50,6],['Nuevo Chimbote',90,3],['Tortugas',20,1],['Casma',10,1]]){
  const query='?zona='+encodeURIComponent(zone);
  r=await request('/api/cartera'+query);assert.equal(r.status,200);assert.equal(r.data.resumen.capacidad,cap);assert.equal(r.data.resumen.enCartera,count);assert.ok(r.data.inmuebles.every(p=>p.zona===zone&&allIds.has(p.inmuebleId)));
  const positions=await request('/api/posiciones'+query);assert.equal(positions.status,200);assert.equal(positions.data.posiciones.length,cap);assert.ok(positions.data.posiciones.every(p=>p.zona===zone));assert.equal(positions.data.posiciones.filter(p=>p.disponible).length,cap-count);
  for(const endpoint of ['visitas','tasaciones','publicaciones','liberaciones','alquileres']){
   const result=await request('/api/'+endpoint+query);assert.equal(result.status,200,endpoint+': '+JSON.stringify(result.data));
   const items=Object.values(result.data).filter(Array.isArray).flat();assert.ok(items.every(p=>p.zona===zone),endpoint+' mixed zones');
  }
  for(const report of ['Cartera activa','Posición ocupada','Posiciones disponibles','Histórico de inmuebles']){
   const reportResult=await request('/api/reportes'+query+'&reporte='+encodeURIComponent(report)+'&todos=1');assert.equal(reportResult.status,200,JSON.stringify(reportResult.data));assert.ok(reportResult.data.rows.every(p=>p.zona===zone),'mixed report '+report);
   if(report==='Posiciones disponibles')assert.equal(reportResult.data.rows.length,cap-count);
  }
 }
 console.log('Reconciliación API: cupos, libres, cartera, visitas, tasaciones, publicaciones, cierres, alquileres y reportes separados por zona.');
 const name='Zona ensayo '+suffix;
 assert.equal((await request('/api/zonas','POST',{nombre:name},operator)).status,403);
 assert.equal((await request('/api/zonas','POST',{nombre:name})).status,201);
 const zone=(await request('/api/zonas')).data.zonas.find(z=>z.nombre===name);assert.equal(zone.capacidad,10);
 const capture={zonaId:zone.id,posicion:1,operacion:'venta',tipo:'Terreno',direccion:'Referencia de ensayo local',nombreContacto:'Contacto de ensayo'};
 assert.equal((await request('/api/inmuebles','POST',{...capture,zonaId:undefined})).status,400);
 assert.equal((await request('/api/inmuebles?zona='+encodeURIComponent(name),'POST',{...capture,posicion:11})).status,400);
 assert.equal((await request('/api/inmuebles?zona=Chimbote','POST',capture)).status,400);
 const race=await Promise.all([request('/api/inmuebles?zona='+encodeURIComponent(name),'POST',capture),request('/api/inmuebles?zona='+encodeURIComponent(name),'POST',capture)]);
 assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
 for(let posicion=2;posicion<=10;posicion++)assert.equal((await request('/api/inmuebles?zona='+encodeURIComponent(name),'POST',{...capture,posicion})).status,201);
 const positions=(await request('/api/posiciones?zona='+encodeURIComponent(name))).data.posiciones;assert.equal(positions.filter(p=>p.disponible).length,0);
 assert.equal((await request('/api/inmuebles?zona='+encodeURIComponent(name),'POST',{...capture,posicion:10})).status,409);
 const [[outside]]=await db.query('SELECT COUNT(*) n FROM inm_asignaciones_zona a JOIN inm_posiciones_zona p ON p.id=a.posicion_id JOIN inm_inmuebles i ON i.id=a.inmueble_id JOIN inm_zonas z ON z.id=p.zona_id WHERE a.activa=1 AND (p.zona_id<>i.zona_id OR p.numero>z.capacidad)');assert.equal(Number(outside.n),0);
 await mkdir('output',{recursive:true});await writeFile('output/zones-test-session.json',JSON.stringify({admin,operator,base}),{mode:0o600});
 console.log('Integración correcta: nueva zona de 10, captura sin geografía, rechazo de zona/cupo inválidos, concurrencia sin duplicados y permisos de operador conservados.');
}finally{await db.end();}
