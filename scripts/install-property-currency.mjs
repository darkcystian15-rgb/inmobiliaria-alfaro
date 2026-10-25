// Additive only: old closures retain PEN semantics; mixed appraisals are untouched.
import mysql from 'mysql2/promise';
if (!process.env.DATABASE_URL) process.loadEnvFile('.env.local');
const apply=process.argv.includes('--apply');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}}:{})});
let locked=false;
try {
 if(apply){const [[row]]=await db.query("SELECT GET_LOCK('alfaro_property_currency',60) acquired");if(row.acquired!==1)throw Error('No se pudo reservar la preparación de moneda.');locked=true;}
 for(const table of ['inm_inmuebles','inm_liberaciones']) {
  const [found]=await db.execute("SELECT COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME='moneda'",[table]);
  if(found.length){if(found[0].COLUMN_TYPE!=='varchar(3)'||found[0].IS_NULLABLE!=='YES')throw Error('La columna de moneda tiene otra definición.');console.log(`${table}.moneda: correcto`);}
  else if(apply){await db.query(`ALTER TABLE \`${table}\` ADD COLUMN moneda VARCHAR(3) NULL`);console.log(`${table}.moneda: añadida, sin modificar importes ni monedas previas`);}
  else console.log(`${table}.moneda: pendiente`);
 }
} finally {if(locked)await db.query("SELECT RELEASE_LOCK('alfaro_property_currency')");await db.end();}
