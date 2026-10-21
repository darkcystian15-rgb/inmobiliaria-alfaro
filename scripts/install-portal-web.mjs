import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
const apply=process.argv.includes('--apply');
if(!process.env.DATABASE_URL)process.loadEnvFile('.env.local');
const url=new URL(process.env.DATABASE_URL);
const local=['localhost','127.0.0.1'].includes(url.hostname);
if(apply&&!local&&!process.argv.includes('--allow-additive-production-schema'))throw new Error('Para un entorno remoto se requiere autorización explícita del esquema aditivo.');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try{
 const sql=await fs.readFile(new URL('../db/migrations/0030_portal_web.sql',import.meta.url),'utf8');
 const [tables]=await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('inm_portal_web','inm_portal_web_eventos')");
 if(apply)for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.query(statement);
 console.log(JSON.stringify({applied:apply,existingTables:tables.length,additiveOnly:true,businessRowsChanged:0,publicPortalDataChanged:false}));
}catch(error){console.error('Instalación detenida:',error.code||'ERROR');process.exitCode=1;}finally{await db.end();}
