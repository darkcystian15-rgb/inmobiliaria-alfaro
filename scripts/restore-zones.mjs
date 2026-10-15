// Preview first. Refuse a rollback that would detach new work from its positions.
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const idx=process.argv.indexOf('--checkpoint');const dir=idx<0?null:process.argv[idx+1];
if(!dir)throw Error('Indica --checkpoint.');
const manifest=JSON.parse(readFileSync(dir+'/manifest.json'));
const bytes=readFileSync(dir+'/database.json');if(createHash('sha256').update(bytes).digest('hex')!==manifest.sha256['database.json'])throw Error('La copia no pasó la verificación.');
const journalBytes=readFileSync(dir+'/zones-journal.json');
if(createHash('sha256').update(journalBytes).digest('hex')!==manifest.sha256['zones-journal.json'])throw Error('El diario no pasó la verificación.');
const journal=JSON.parse(journalBytes);
if(journal.status!=='committed')throw Error('El diario exige inspección antes de restaurar.');
const saved=JSON.parse(bytes).tables;
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try{
 await db.beginTransaction();
 for(const name of ['inm_inmuebles','inm_visitas','inm_archivos','inm_tasaciones','inm_publicaciones','inm_liberaciones','inm_timeline','inm_asignaciones_posicion']){
  if(!saved[name])continue;
  const [rows]=await db.query('SELECT * FROM ?? ORDER BY id FOR UPDATE',[name]);const before=[...saved[name].rows].sort((a,b)=>Number(a.id)-Number(b.id));
  if(rows.length!==before.length||rows.some((r,i)=>Object.keys(before[i]).some(k=>String(r[k]??'')!==String(before[i][k]??''))))throw Error('Hay trabajo posterior en '+name+'. No se puede restaurar automáticamente sin perder contexto.');
 }
 const [active]=await db.query('SELECT a.inmueble_id,p.numero,z.nombre zona FROM inm_asignaciones_zona a JOIN inm_posiciones_zona p ON p.id=a.posicion_id JOIN inm_zonas z ON z.id=p.zona_id WHERE a.activa=1');
 if(active.length!==journal.plan.allocations.length||active.some(a=>!journal.plan.allocations.some(p=>p.inmuebleId===Number(a.inmueble_id)&&p.numero===Number(a.numero)&&p.zona===a.zona)))throw Error('Las posiciones nuevas cambiaron; requiere recuperación revisada.');
 if(process.argv.includes('--apply')){
  await db.query('UPDATE inm_zona_cutover SET activo=0 WHERE id=1');
  await db.query('UPDATE inm_inmuebles SET zona_id=NULL,fecha_actualizacion=fecha_actualizacion');
  await db.commit();console.log('Reversión de contexto confirmada. Promueve coordinadamente el código previo. Las tablas nuevas y el diario se conservan para auditoría.');
 }else{await db.rollback();console.log('Reversión verificada sin escribir: no hay trabajo posterior. Para aplicar, usa --apply y coordina el despliegue anterior.');}
}catch(e){await db.rollback();throw Error(e.code||e.message);}finally{await db.end();}
