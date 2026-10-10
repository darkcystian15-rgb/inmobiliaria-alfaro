import mysql from 'mysql2/promise';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const apply = process.argv.includes('--apply');
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
const db = await mysql.createConnection({uri:process.env.DATABASE_URL,dateStrings:true,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{rejectUnauthorized:true,...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}: {})}}:{})});
const sentence=value=>value?value.charAt(0).toLocaleUpperCase('es-PE')+value.slice(1):null;
const fields=['referencia','direccion','numero_direccion','caracteristicas','observaciones'];
const ownerFields=['dni','email','referencia_contacto','nombres','apellidos'];
const cleanName=value=>value.replace(/\s*\((?:fictici[oa]|simulad[oa]|datos de prueba)\)\s*/gi,' ').trim();
const cleanNotes=value=>value?.split(/\r?\n/).filter(line=>!/^\s*(SOLO PRUEBA\s*:|Dirección ficticia agregada para demostración)/i.test(line)).join('\n').trim()||null;
const backupRoot=resolve(process.env.PROPERTY_BACKUP_DIR||'restore-points');
try{
 await db.beginTransaction();
 const [all]=await db.query('SELECT * FROM inm_inmuebles ORDER BY id FOR UPDATE');
 const [owners]=await db.query('SELECT * FROM inm_propietarios ORDER BY id FOR UPDATE');
 const [positions]=await db.query('SELECT a.inmueble_id,p.numero FROM inm_asignaciones_posicion a JOIN inm_posiciones p ON p.id=a.posicion_id WHERE a.activa=1 ORDER BY p.numero FOR UPDATE');
 const target=all.filter(x=>positions.some(p=>Number(p.inmueble_id)===Number(x.id)&&Number(p.numero)>=1&&Number(p.numero)<=12));
 const reference=all.find(x=>positions.some(p=>Number(p.inmueble_id)===Number(x.id)&&Number(p.numero)===13));
 if(!reference||target.length!==12)throw Error('No se encontró la ficha 13 y exactamente 12 fichas anteriores');
 const plans=target.map(x=>{
  const o=owners.find(p=>Number(p.id)===Number(x.propietario_id));if(!o)throw Error('Falta propietario en ficha '+x.id);
  const values={referencia:[cleanName(o.nombres),cleanName(o.apellidos)].filter(Boolean).join(' ').trim(),direccion:x.direccion,numero_direccion:x.numero_direccion,caracteristicas:sentence(x.caracteristicas?.replace(/^\s*SOLO PRUEBA\s*:\s*/i,'').trim()||null),observaciones:cleanNotes(x.observaciones)};
  if(!values.referencia)throw Error('Propietario sin nombre');
  if(!x.numero_direccion&&x.direccion){const match=x.direccion.trim().match(/^(.*?)\s+(\d+[A-Za-z]?)$/);if(match){values.direccion=match[1];values.numero_direccion=match[2];}}
  const ownerValues={nombres:cleanName(o.nombres),apellidos:cleanName(o.apellidos),dni:Number(x.datos_prueba)===1||/^(?:BETA|DEMO|PRUEBA)/i.test(o.dni||'')||o.dni==='00000000'?null:o.dni,email:/@(?:example\.invalid|example\.(?:com|org|net))$/i.test(o.email||'')?null:o.email,referencia_contacto:/fictici|SOLO PRUEBA/i.test(o.referencia_contacto||'')?null:o.referencia_contacto};
  const changed=fields.some(k=>values[k]!==x[k])||ownerFields.some(k=>ownerValues[k]!==o[k]);
  return {x,o,values,ownerValues,changed,posicion:positions.find(p=>Number(p.inmueble_id)===Number(x.id)).numero};
 });
 const pending=plans.filter(p=>p.changed);
 console.log(JSON.stringify({modo:apply?'aplicar':'previsualizar',fichas:plans.length,pendientes:pending.length,ejemplos:plans.filter(p=>[3,10].includes(Number(p.posicion))).map(p=>({posicion:p.posicion,...p.values,dni:p.ownerValues.dni,email:p.ownerValues.email}))}));
 if(!apply||!pending.length){await db.rollback();}
 else{
  const [admins]=await db.query("SELECT id FROM inm_usuarios WHERE activo=1 AND rol='administrador' ORDER BY id LIMIT 1");if(!admins.length)throw Error('Falta administrador para registrar historial');
  mkdirSync(backupRoot,{recursive:true,mode:0o700});
  const backup=resolve(backupRoot,'fichas-antes-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  writeFileSync(backup,JSON.stringify({inmuebles:all,propietarios:owners,positions},null,2),{mode:0o600});
  const now=new Date().toISOString().slice(0,19).replace('T',' ');
  for(const p of pending){
   await db.query('UPDATE inm_inmuebles SET '+fields.map(k=>'`'+k+'`=?').join(',')+',fecha_actualizacion=? WHERE id=?',[...fields.map(k=>p.values[k]),now,p.x.id]);
   if(ownerFields.some(k=>p.ownerValues[k]!==p.o[k])){
    const external=all.some(x=>Number(x.propietario_id)===Number(p.o.id)&&!target.some(t=>Number(t.id)===Number(x.id)));if(external)throw Error('Propietario compartido con otra ficha fuera del alcance');
    await db.query('UPDATE inm_propietarios SET '+ownerFields.map(k=>'`'+k+'`=?').join(',')+',fecha_actualizacion=? WHERE id=?',[...ownerFields.map(k=>p.ownerValues[k]),now,p.o.id]);
   }
   await db.query('INSERT INTO inm_timeline(inmueble_id,evento,observacion,usuario_id) VALUES (?,?,?,?)',[p.x.id,'ficha_organizada',JSON.stringify({motivo:'Organización solicitada siguiendo el formato de la ficha 13',anterior:Object.fromEntries(fields.map(k=>[k,p.x[k]])),nuevo:p.values,camposPropietario:ownerFields.filter(k=>p.ownerValues[k]!==p.o[k])}),admins[0].id]);
  }
  const [after]=await db.query('SELECT * FROM inm_inmuebles ORDER BY id');
  for(const old of all){const actual=after.find(x=>Number(x.id)===Number(old.id));const p=pending.find(p=>Number(p.x.id)===Number(old.id));for(const k of Object.keys(old)){const expected=p&&(fields.includes(k)||k==='fecha_actualizacion')?(k==='fecha_actualizacion'?now:p.values[k]):old[k];if(JSON.stringify(actual[k])!==JSON.stringify(expected))throw Error('Verificación falló: ficha '+old.id+' campo '+k);}}
  await db.commit();console.log(JSON.stringify({resultado:'confirmado',fichasActualizadas:pending.length,ficha13:'idéntica',respaldo:backup,clasificacion:'conservada, sin declarar datos validados'}));
 }
}catch(e){await db.rollback();console.error('Operación revertida:',e.code||e.message);process.exitCode=1;}finally{await db.end();}
