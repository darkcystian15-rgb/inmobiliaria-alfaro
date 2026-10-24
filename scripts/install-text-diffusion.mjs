// Additive schema only. Legacy texts/completed publications retain their status.
import mysql from 'mysql2/promise';
import {loadEnvFile} from 'node:process';
try{loadEnvFile('.env.local');}catch(error){if(error.code!=='ENOENT')throw error;}
if(!process.env.DATABASE_URL||process.env.DATABASE_URL==='[SENSITIVE]')throw new Error('Falta conexión privada DATABASE_URL.');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}}:{})});
const apply=process.argv.includes('--apply');let locked=false;
try{
 if(apply){const [[row]]=await db.query("SELECT GET_LOCK('alfaro_text_diffusion',60) acquired");if(row.acquired!==1)throw new Error('Preparación de difusión ocupada.');locked=true;}
 const columns=[['texto_realizado','tinyint(1)','NOT NULL DEFAULT 1'],['medios_difusion','varchar(10)','NULL'],['cartel_colocado','tinyint(1)','NOT NULL DEFAULT 0'],['redes_publicadas','tinyint(1)','NOT NULL DEFAULT 0'],['referencias_difusion','text','NULL'],['fecha_texto_realizado','timestamp','NULL']];
 for(const [name,type,definition]of columns){
  const [found]=await db.execute('SELECT COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',['inm_publicaciones',name]);
  if(found.length){if(found[0].COLUMN_TYPE!==type)throw new Error(`Definición inesperada para ${name}.`);console.log(`${name}: correcto`);}
  else if(apply){await db.query(`ALTER TABLE inm_publicaciones ADD COLUMN \`${name}\` ${type} ${definition}`);console.log(`${name}: añadido`);}
  else console.log(`${name}: pendiente`);
 }
}finally{if(locked)await db.query("SELECT RELEASE_LOCK('alfaro_text_diffusion')");await db.end();}
