// Disposable local database only. Never loads .env.local.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import { businessSnapshot, snapshotHash, replaceChimbote, replacementManifest, replaceFiveZones, fiveZonesManifest, fiveZonePositions } from '../lib/zone-replacement.mjs';

const uri=process.env.TEST_DATABASE_URL, location=new URL(uri||'http://invalid');
assert.ok(['127.0.0.1','localhost'].includes(location.hostname) && location.pathname==='/alfaro_zone_import_test');
const db=await mysql.createConnection({uri,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
try {
  assert.equal((await db.query('SHOW TABLES'))[0].length,0,'La base desechable debe estar vacía.');
  const schema=execFileSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','export','--dialect=mysql','--schema=./db/schema.ts'],{encoding:'utf8'});
  for(const query of schema.slice(schema.indexOf('CREATE TABLE')).split(';').map(x=>x.trim()).filter(Boolean)) await db.query(query);
  await db.query("INSERT INTO inm_usuarios(id,nombre,email,rol) VALUES(1,'Administrador local','local@example.invalid','administrador')");
  await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'chimbote','Chimbote',50),(2,'lima','Lima',10)");
  await db.query("INSERT INTO inm_tipos_inmueble(nombre) VALUES('Casa')");
  for(let n=1;n<=50;n++) await db.query('INSERT INTO inm_posiciones_zona(zona_id,numero) VALUES(1,?)',[n]);
  await db.query('INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(100,2,1)');
  await db.query("INSERT INTO inm_propietarios(id,nombres,apellidos) VALUES(1,'Compartido','Local')");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,zona_id,propietario_id,tipo,referencia,direccion,nombre_contacto,estado) VALUES(1,'001-CASA-ANTERIOR',1,1,1,'Casa','Anterior','Anterior','Anterior','activo'),(2,'002-CASA-HISTORICA',2,1,NULL,'Casa','Histórica','Histórica','Histórica','historico'),(3,'003-CASA-LIMA',3,2,1,'Casa','Lima','Lima','Lima','activo')");
  await db.query("INSERT INTO inm_secuencias VALUES('inmueble',3)");
  await db.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(1,1),(3,100)');
  await db.query("INSERT INTO inm_visitas(inmueble_id,completada,usuario_id) VALUES(1,1,1),(3,1,1)");
  for(const [id,path] of [[1,'private/shared.pdf'],[1,'private/delete.pdf'],[3,'private/shared.pdf']]) await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,usuario_id) VALUES(?,'TASACION','Archivo','private','hosting',?,1)",[id,path]);
  await db.query("INSERT INTO inm_borradores(usuario_id,clave,contenido) VALUES(1,'visitas:actual',?),(1,'ficha:001-CASA-ANTERIOR','{}'),(1,'ficha:003-CASA-LIMA','{}')",[JSON.stringify({fechas:{1:'2026-01-01',3:'2026-02-01',999:'conservar'}})]);
  const pending=[1,4,5,7,8,9,10,11,12,15,19,23,25,27,28,29,31,32,33,36,37,38,39,41,42];
  const sales=[14,16,17,21,24,26,30,43,45,46];
  const manifest={zona:'Chimbote',inmuebles:Array.from({length:46},(_,i)=>i+1).filter(n=>![35,40,44].includes(n)).map(n=>({posicion:n,operacion:sales.includes(n)?'venta':'alquiler',tipo:'Casa',direccion:`Dirección local ${n}`,nombreContacto:[7,32].includes(n)?`CONTACTO${n}-FTO`:`Persona local ${n}${pending.includes(n)?'-FTO':''}`}))};
  const invalid=structuredClone(manifest);invalid.inmuebles[1].posicion=1;assert.throws(()=>replacementManifest(invalid));
  invalid.inmuebles[1].posicion=2;invalid.inmuebles[0].nombreContacto='Sin marca';assert.throws(()=>replacementManifest(invalid));
  const before=await businessSnapshot(db), backup={tables:before};
  assert.equal((await replaceChimbote(db,manifest,backup,false)).eliminar,2);
  assert.equal(snapshotHash(await businessSnapshot(db)),snapshotHash(before),'Preview sin escrituras.');
  await db.query('CREATE TABLE unexpected_reference(id INT PRIMARY KEY,inmueble_id BIGINT UNSIGNED,FOREIGN KEY(inmueble_id) REFERENCES inm_inmuebles(id))');
  await db.query('INSERT INTO unexpected_reference VALUES(1,1)');
  await assert.rejects(()=>replaceChimbote(db,manifest,backup,true),/foreign key constraint/i);
  assert.equal(snapshotHash(await businessSnapshot(db)),snapshotHash(before),'Rollback de borradores y relaciones ante FK desconocida.');
  await db.query('DROP TABLE unexpected_reference');
  await db.query("UPDATE inm_inmuebles SET direccion='Cambio posterior' WHERE id=1");
  await assert.rejects(()=>replaceChimbote(db,manifest,backup,true),/base cambió/);
  const fresh={tables:await businessSnapshot(db)};
  const result=await replaceChimbote(db,manifest,fresh,true);
  assert.equal(result.created.length,43);assert.equal(result.eliminar,2);
  const after=await businessSnapshot(db);
  assert.deepEqual(after.inm_inmuebles.find(row=>Number(row.id)===3),before.inm_inmuebles.find(row=>Number(row.id)===3));
  assert.equal(after.inm_inmuebles.filter(row=>Number(row.zona_id)===1 && row.estado==='activo' && row.etapa==='visita_pendiente').length,43);
  assert.equal(after.inm_propietarios.length,1,'Propietario compartido conservado.');
  assert.equal(after.inm_visitas.length,1);assert.equal(after.inm_archivos.length,1);
  assert.deepEqual(JSON.parse(after.inm_eliminaciones_pendientes[0].rutas),['private/delete.pdf']);
  const draft=after.inm_borradores.find(row=>row.clave==='visitas:actual');assert.deepEqual(JSON.parse(draft.contenido).fechas,{'3':'2026-02-01','999':'conservar'});
  assert.equal(after.inm_borradores.filter(row=>row.clave==='ficha:001-CASA-ANTERIOR').length,0);
  assert.ok(after.inm_borradores.some(row=>row.clave==='ficha:003-CASA-LIMA'));
  assert.equal(after.inm_timeline.length,43);assert.equal(after.inm_asignaciones_zona.length,44);
  assert.deepEqual(result.created.map(row=>row.posicion),manifest.inmuebles.map(row=>row.posicion));
  assert.equal(new Set(after.inm_inmuebles.map(row=>row.numero_orden)).size,44);
  await assert.rejects(()=>replaceChimbote(db,manifest,fresh,true),/base cambió/);
  // A second atomic delivery replaces five zones while preserving Chimbote and Nuevo Chimbote.
  await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(3,'tortugas','Tortugas',20),(4,'huarmey','Huarmey',10),(5,'casma','Casma',10),(6,'trujillo','Trujillo',10),(7,'nuevo-chimbote','Nuevo Chimbote',90)");
  for(const [id,capacity] of [[3,20],[4,10],[5,10],[6,10],[7,90]]) for(let n=1;n<=capacity;n++) await db.query('INSERT INTO inm_posiciones_zona(zona_id,numero) VALUES(?,?)',[id,n]);
  const secondIds=[];
  for(const id of [3,4,5,6,7]) {
    const [insert]=await db.query("INSERT INTO inm_inmuebles(codigo,numero_orden,zona_id,propietario_id,tipo,referencia,direccion,nombre_contacto) VALUES(?,?,?,1,'Casa','Anterior local','Anterior local','Anterior local')",[`LOCAL-${id}`,100+id,id]);
    secondIds.push(insert.insertId);
    const [[position]]=await db.query('SELECT id FROM inm_posiciones_zona WHERE zona_id=? AND numero=1',[id]);
    await db.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(?,?)',[insert.insertId,position.id]);
  }
  await db.query("UPDATE inm_secuencias SET valor=107 WHERE nombre='inmueble'");
  for(const [id,path] of [[secondIds[0],'private/five-shared.pdf'],[secondIds[3],'private/five-shared.pdf'],[secondIds[2],'private/preserve.pdf'],[secondIds[4],'private/preserve.pdf']]) await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,usuario_id) VALUES(?,'TASACION','Archivo local','private','hosting',?,1)",[id,path]);
  const five={zonas:Object.entries(fiveZonePositions).map(([zona,positions])=>({zona,inmuebles:positions.map(posicion=>({posicion,operacion:'alquiler',tipo:'Casa',direccion:`Ubicación local ${posicion}`,nombreContacto:['Huarmey','Trujillo'].includes(zona)&&posicion===1?'CONTACTO1-FTO':'Persona local-FTO'}))}))};
  const excluded=structuredClone(five);excluded.zonas[0].inmuebles[0].posicion=8;assert.throws(()=>fiveZonesManifest(excluded));
  const extraZone=structuredClone(five);extraZone.zonas[0].zona='Chimbote';assert.throws(()=>fiveZonesManifest(extraZone));
  const noContact=structuredClone(five);noContact.zonas.find(z=>z.zona==='Huarmey').inmuebles[0].nombreContacto='Otro-FTO';assert.throws(()=>fiveZonesManifest(noContact));
  const beforeConcurrentEdit=await businessSnapshot(db), secondBackup={tables:beforeConcurrentEdit};
  await db.query("UPDATE inm_inmuebles SET direccion='Edición concurrente conservada' WHERE zona_id=1 ORDER BY id LIMIT 1");
  const secondBefore=await businessSnapshot(db);
  const preview=await replaceFiveZones(db,five,secondBackup,false);assert.equal(preview.registrar,18);assert.equal(preview.eliminar,5);assert.equal(preview.otrasZonas,44);
  assert.equal(snapshotHash(await businessSnapshot(db)),snapshotHash(secondBefore));
  await db.query('CREATE TABLE unexpected_reference(id INT PRIMARY KEY,inmueble_id BIGINT UNSIGNED,FOREIGN KEY(inmueble_id) REFERENCES inm_inmuebles(id))');
  await db.query('INSERT INTO unexpected_reference VALUES(1,?)',[secondIds[3]]);
  await assert.rejects(()=>replaceFiveZones(db,five,secondBackup,true),/foreign key constraint/i);
  assert.equal(snapshotHash(await businessSnapshot(db)),snapshotHash(secondBefore),'Las cinco zonas revierten juntas.');
  await db.query('DROP TABLE unexpected_reference');
  const replacement=await replaceFiveZones(db,five,secondBackup,true), secondAfter=await businessSnapshot(db);
  assert.equal(replacement.created.length,18);assert.equal(replacement.contactosFTO,18);assert.equal(replacement.alquileres,18);
  for(const [zona,positions] of Object.entries(fiveZonePositions)) assert.deepEqual(replacement.created.filter(row=>row.zona===zona).map(row=>row.posicion),positions);
  const preservedIds=new Set(secondBefore.inm_inmuebles.filter(row=>[1,7].includes(Number(row.zona_id))).map(row=>Number(row.id)));
  for(const table of ['inm_inmuebles',...['inm_timeline','inm_asignaciones_zona','inm_archivos','inm_visitas']]) {
    const key=table==='inm_inmuebles'?'id':'inmueble_id';
    assert.equal(snapshotHash({rows:secondAfter[table].filter(row=>preservedIds.has(Number(row[key])))}),snapshotHash({rows:secondBefore[table].filter(row=>preservedIds.has(Number(row[key])))}),'Chimbote/Nuevo Chimbote conservados en '+table);
  }
  assert.equal(secondAfter.inm_propietarios.length,1,'Propietario compartido de Nuevo Chimbote conservado.');
  const newIds=new Set(replacement.created.map(row=>Number(row.id)));
  for(const table of ['inm_visitas','inm_archivos','inm_publicaciones','inm_tasaciones','inm_liberaciones']) assert.equal(secondAfter[table].filter(row=>newIds.has(Number(row.inmueble_id))).length,0);
  const paths=replacement.cleanupJobs.flatMap(job=>JSON.parse(secondAfter.inm_eliminaciones_pendientes.find(row=>row.id===job.id).rutas));
  assert.deepEqual(paths.sort(),['private/five-shared.pdf','private/shared.pdf']);
  await assert.rejects(()=>replaceFiveZones(db,five,secondBackup,true),/base cambió/);
  console.log('PASS cinco zonas: 18 altas, exclusiones estrictas, rollback atómico, archivos compartidos y Chimbote/Nuevo Chimbote conservados.');
  console.log('PASS reemplazo local: 43 registros, posiciones, pendientes, preview sin escritura, rechazo de respaldo desactualizado, rollback ante FK, archivos compartidos, borradores y conservación de otras zonas.');
} finally { await db.end(); }
