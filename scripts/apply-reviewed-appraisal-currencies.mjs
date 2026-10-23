// One-off, explicitly reviewed correction. The private plan is supplied only at build time.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '[SENSITIVE]') throw new Error('La conexión privada DATABASE_URL no está disponible.');
const plan=JSON.parse(Buffer.from(process.env.APPRAISAL_CURRENCY_PLAN_BASE64||'','base64').toString('utf8'));
assert.ok(plan&&typeof plan.runId==='string'&&Number.isSafeInteger(plan.actorId)&&Array.isArray(plan.changes)&&plan.changes.length>0,'Plan de monedas no válido.');
const fields={valorReferencia:'valor_referencia',precioObjetivo:'precio_objetivo',precioVenta:'precio_venta'};
assert.equal(new Set(plan.changes.map(change=>change.id)).size,plan.changes.length,'Tasaciones duplicadas.');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try{
 const [actors]=await db.execute("SELECT id FROM inm_usuarios WHERE id=? AND activo=1 AND rol='administrador'",[plan.actorId]);assert.equal(actors.length,1,'Administrador responsable no válido.');
 await db.beginTransaction();
 const results=[];
 try{
  for(const change of [...plan.changes].sort((a,b)=>a.inmuebleId-b.inmuebleId)){
   assert.ok(Number.isSafeInteger(change.id)&&Number.isSafeInteger(change.inmuebleId)&&Array.isArray(change.fields)&&change.fields.length&&change.fields.every(field=>Object.hasOwn(fields,field)),'Cambio no válido.');
   const [properties]=await db.execute('SELECT observaciones FROM inm_inmuebles WHERE id=? FOR UPDATE',[change.inmuebleId]);
   assert.equal(properties.length,1,'El inmueble ya no existe.');assert.equal(properties[0].observaciones,change.expected.observacionInmueble,'Las notas del inmueble cambiaron.');
   const [rows]=await db.execute('SELECT * FROM inm_tasaciones WHERE id=? AND inmueble_id=? FOR UPDATE',[change.id,change.inmuebleId]);assert.equal(rows.length,1,'Tasación no encontrada.');
   const before=rows[0];assert.equal(before.observacion,change.expected.observacion,'La observación cambió.');
   for(const [field,column] of Object.entries(fields)){
    assert.equal(before[column],change.expected[field],`El importe ${field} cambió; revisar de nuevo.`);
    assert.equal(before[`${column}_moneda`],change.expected[`${field}Moneda`],`La moneda ${field} cambió; revisar de nuevo.`);
   }
   const changed=change.fields.filter(field=>before[`${fields[field]}_moneda`]!=='USD');
   if(!changed.length){results.push({inmuebleId:change.inmuebleId,campos:[],sinCambios:true});continue;}
   await db.execute(`UPDATE inm_tasaciones SET ${changed.map(field=>`${fields[field]}_moneda='USD'`).join(',')} WHERE id=?`,[change.id]);
   const [updated]=await db.execute('SELECT * FROM inm_tasaciones WHERE id=?',[change.id]);const after=updated[0];
   for(const [column,value] of Object.entries(before)){
    if(column==='fecha_actualizacion'||changed.some(field=>`${fields[field]}_moneda`===column))continue;
    assert.deepEqual(after[column],value,`Se alteró un campo ajeno: ${column}`);
   }
   for(const field of changed)assert.equal(after[`${fields[field]}_moneda`],'USD');
   const audit={origen:'Corrección técnica de monedas autorizada por el usuario',runId:plan.runId,tasacionId:change.id,campos:changed,anterior:before,nuevo:after};
   await db.execute("INSERT INTO inm_timeline (inmueble_id,evento,observacion,usuario_id) VALUES (?,'moneda_tasacion_revisada',?,?)",[change.inmuebleId,JSON.stringify(audit),plan.actorId]);
   results.push({inmuebleId:change.inmuebleId,tasacionId:change.id,campos:changed,importesConservados:true,observacionConservada:true});
  }
  await db.commit();
  console.log('APPRAISAL_CORRECTION_COMMITTED '+JSON.stringify({runId:plan.runId,fichas:results.filter(row=>!row.sinCambios).length,montos:results.reduce((sum,row)=>sum+row.campos.length,0),results}));
 }catch(error){await db.rollback();throw error;}
}finally{await db.end();}
