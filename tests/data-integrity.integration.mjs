// Only disposable local databases are accepted. Exercises actual MySQL transactions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import mysql from 'mysql2/promise';
import {prepareUpload,cleanFileJob,assertPropertyWritable,deleteFileJob} from '../lib/data-integrity.mjs';
import {prepareDeletion,commitDeletion,finishDeletion} from '../lib/property-deletion.mjs';
const uri=new URL(process.env.TEST_DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(uri.hostname)&&uri.pathname==='/alfaro_integrity_test');
const db=await mysql.createConnection(uri.toString());
const stored=new Set();const remove=async p=>{stored.delete(p);};
try{
 assert.equal((await db.query('SHOW TABLES'))[0].length,0,'Use an empty test database');
 const schema=execFileSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','export','--dialect=mysql','--schema=./db/schema.ts'],{encoding:'utf8'});
 for(const q of schema.slice(schema.indexOf('CREATE TABLE')).split(';').map(s=>s.trim()).filter(Boolean))await db.query(q);
 for(const q of fs.readFileSync('db/migrations/0030_portal_web.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.query(q);
 await db.query("INSERT INTO inm_usuarios(id,nombre,email) VALUES(1,'Ensayo','integrity@example.invalid')");
 await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'integrity','Integridad',10)");
 await db.query("INSERT INTO inm_inmuebles(id,codigo,tipo,referencia,zona_id) VALUES(1,'TEST-1','Casa','Ensayo',1),(2,'TEST-2','Casa','Ensayo',1)");
 // Abandoned upload cleaned even with no browser; a committed upload is retained.
 const abandoned=await prepareUpload(db,1,'abandoned',new Date(0));stored.add('abandoned');
 assert.equal(await cleanFileJob(db,abandoned,remove),true);assert.equal(stored.has('abandoned'),false);
 const registered=await prepareUpload(db,1,'registered',new Date(0));stored.add('registered');
 await db.query("INSERT INTO inm_archivos(id,inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,usuario_id) VALUES(1,1,'OTRO','Documento','registered','hosting','registered',1)");
 await cleanFileJob(db,registered,remove);assert.equal(stored.has('registered'),true);
 // DB rollback preserves the file and job until an eventual retry.
 await db.beginTransaction();const [[file]]=await db.query('SELECT * FROM inm_archivos WHERE id=1');const deleted=await deleteFileJob(db,file,1);await db.commit();
 assert.equal((await db.query('SELECT * FROM inm_archivos WHERE id=1'))[0].length,0);
 await assert.rejects(cleanFileJob(db,deleted,async()=>{throw Error('network');}));
 assert.equal((await db.query('SELECT * FROM inm_tareas_archivos WHERE id=?',[deleted]))[0].length,1);
 assert.equal(stored.has('registered'),true);await cleanFileJob(db,deleted,remove);assert.equal(stored.has('registered'),false);
 assert.equal(await cleanFileJob(db,deleted,remove),false);
 // Closed records are protected independently of UI; suspended sales remain editable.
 await db.query("INSERT INTO inm_liberaciones(inmueble_id,motivo,confirmado,usuario_registro_id) VALUES(2,'vendido',1,1)");
 await assert.rejects(assertPropertyWritable(db,2),/cerrado/);await assertPropertyWritable(db,1);
 // Deletion persists while remote confirmation fails. No remaining portal content on success.
 await db.query("INSERT INTO inm_portal_web(clave,contenido,version,usuario_id) VALUES('live:1',?,4,1),('draft:1','{}',1,1)",[JSON.stringify({portalId:44,snapshot:{photos:[]}})]);
 const prepared=await prepareDeletion(db,1,'Integridad',{inmuebleId:1,motivo:'desistimiento',detalle:''});
 await commitDeletion(db,1,'Integridad',prepared.eliminacionId);
 assert.equal((await db.query('SELECT * FROM inm_inmuebles WHERE id=1'))[0].length,0);
 assert.equal(await finishDeletion(db,'Integridad',prepared.eliminacionId,remove,async()=>{throw Error('portal unavailable');}),false);
 assert.equal((await db.query("SELECT * FROM inm_portal_web WHERE clave='live:1'"))[0].length,1);
 let called=0;assert.equal(await finishDeletion(db,'Integridad',prepared.eliminacionId,remove,async(id,revision)=>{assert.equal(id,1);assert.equal(revision,5);called++;}),true);
 assert.equal(called,1);assert.equal((await db.query('SELECT * FROM inm_portal_web'))[0].length,0);
 // Real portal deletion transaction + idempotence + delayed publication rejection.
 const portal=await import(pathToFileURL(process.env.PORTAL_REPO_PATH+'/server/intranet-sync.js'));
 await db.query('CREATE TABLE properties(id INT UNSIGNED PRIMARY KEY)');
 await db.query('CREATE TABLE publications(property_id INT UNSIGNED PRIMARY KEY,FOREIGN KEY(property_id) REFERENCES properties(id))');
 await db.query('CREATE TABLE publication_events(id INT PRIMARY KEY,property_id INT UNSIGNED,FOREIGN KEY(property_id) REFERENCES properties(id))');
 await db.query('CREATE TABLE sub_properties(property_id INT,property_ref_id INT UNSIGNED)');
 await db.query('CREATE TABLE mas_info(id_properties INT,property_ref_id INT UNSIGNED)');
 await db.query('CREATE TABLE portal_intranet_sync(clave VARCHAR(100) PRIMARY KEY,revision INT,property_id INT NULL,contenido JSON,body_hash VARCHAR(64))');
 await db.query('INSERT INTO properties VALUES(44)');await db.query('INSERT INTO publications VALUES(44)');await db.query('INSERT INTO publication_events VALUES(1,44)');await db.query('INSERT INTO sub_properties VALUES(44,44)');await db.query('INSERT INTO mas_info VALUES(44,44)');
 await db.query("INSERT INTO portal_intranet_sync VALUES('property:1',4,44,?,''),('map:44',1,NULL,'{}','')",[JSON.stringify({status:'published'})]);
 const body={kind:'property',sourceId:1,revision:5,status:'deleted'};
 assert.deepEqual(await portal.applySync(db,body,'https://example.invalid'),{ok:true,deleted:true,sourceId:1});
 for(const table of ['properties','publications','publication_events','sub_properties','mas_info'])assert.equal((await db.query('SELECT COUNT(*) n FROM ??',[table]))[0][0].n,0);
 assert.equal((await portal.applySync(db,body,'https://example.invalid')).deleted,true);
 assert.equal((await portal.applySync(db,{...body,revision:1},'https://example.invalid')).deleted,true);
 await assert.rejects(portal.applySync(db,{kind:'property',sourceId:1,revision:6,status:'withdrawn'},'https://example.invalid'),/stale/);
 console.log('PASS: abandoned uploads, referenced files, durable deletion/retry, closed protection, portal physical row deletion, idempotence and resurrection prevention.');
}finally{await db.end();}
