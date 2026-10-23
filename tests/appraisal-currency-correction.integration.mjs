// Isolated fixtures only; requires a local disposable MySQL database.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {spawnSync} from 'node:child_process';
const uri=process.env.DATABASE_URL;const url=new URL(uri||'');
assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/alfaro_currency_correction_test');
const db=await mysql.createConnection(uri);
try{
 await db.query("CREATE TABLE inm_usuarios (id INT PRIMARY KEY, activo BOOLEAN, rol VARCHAR(30))");
 await db.query("CREATE TABLE inm_inmuebles (id INT PRIMARY KEY, observaciones TEXT)");
 await db.query("CREATE TABLE inm_tasaciones (id INT PRIMARY KEY,inmueble_id INT,valor_referencia DECIMAL(15,2),precio_objetivo DECIMAL(15,2),precio_venta DECIMAL(15,2),valor_referencia_moneda VARCHAR(3),precio_objetivo_moneda VARCHAR(3),precio_venta_moneda VARCHAR(3),observacion TEXT,fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
 await db.query('CREATE TABLE inm_timeline (id INT AUTO_INCREMENT PRIMARY KEY,inmueble_id INT,evento VARCHAR(80),observacion TEXT,usuario_id INT)');
 await db.query("INSERT INTO inm_usuarios VALUES (1,1,'administrador')");
 await db.query('INSERT INTO inm_inmuebles VALUES (1,NULL),(2,NULL)');
 await db.query("INSERT INTO inm_tasaciones (id,inmueble_id,valor_referencia,precio_objetivo,precio_venta,valor_referencia_moneda,precio_objetivo_moneda,precio_venta_moneda,observacion) VALUES (1,1,100,200,300,'PEN','PEN','PEN','precio de cierre USD 200'),(2,2,400,500,600,'PEN','PEN','PEN','precio de cierre USD 500')");
 const change=(id,base)=>({id,inmuebleId:id,fields:['precioObjetivo'],expected:{valorReferencia:`${base}.00`,precioObjetivo:`${base+100}.00`,precioVenta:`${base+200}.00`,valorReferenciaMoneda:'PEN',precioObjetivoMoneda:'PEN',precioVentaMoneda:'PEN',observacion:`precio de cierre USD ${base+100}`,observacionInmueble:null}});
 const invoke=plan=>spawnSync(process.execPath,['scripts/apply-reviewed-appraisal-currencies.mjs'],{env:{...process.env,APPRAISAL_CURRENCY_PLAN_BASE64:Buffer.from(JSON.stringify(plan)).toString('base64')},encoding:'utf8'});
 const badPlan={runId:'test-rollback',actorId:1,changes:[change(1,100),change(2,999)]};
 assert.notEqual(invoke(badPlan).status,0);
 const [[rolledBack]]=await db.query('SELECT precio_objetivo_moneda FROM inm_tasaciones WHERE id=1');assert.equal(rolledBack.precio_objetivo_moneda,'PEN');
 const [[emptyAudit]]=await db.query('SELECT COUNT(*) n FROM inm_timeline');assert.equal(emptyAudit.n,0);
 const result=invoke({runId:'test-reviewed',actorId:1,changes:[change(1,100),change(2,400)]});assert.equal(result.status,0,result.stderr);
 const [rows]=await db.query('SELECT * FROM inm_tasaciones ORDER BY id');assert.equal(rows[0].precio_objetivo_moneda,'USD');assert.equal(rows[1].precio_objetivo_moneda,'USD');assert.equal(rows[0].valor_referencia_moneda,'PEN');assert.equal(rows[0].precio_venta_moneda,'PEN');assert.equal(rows[0].precio_objetivo,'200.00');assert.equal(rows[0].observacion,'precio de cierre USD 200');
 const [audit]=await db.query('SELECT * FROM inm_timeline');assert.equal(audit.length,2);assert.equal(JSON.parse(audit[0].observacion).anterior.precio_objetivo_moneda,'PEN');assert.equal(JSON.parse(audit[0].observacion).nuevo.precio_objetivo_moneda,'USD');
 console.log('PASS: corrección de moneda con importes y notas intactos, auditoría anterior/después y rollback completo ante datos cambiados.');
}finally{await db.end();}
