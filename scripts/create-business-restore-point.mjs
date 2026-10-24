// Private maintenance build only. Emits encrypted business data, never credentials.
import mysql from 'mysql2/promise';
import {randomBytes,createCipheriv,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const key=Buffer.from(process.env.RESTORE_POINT_KEY_BASE64||'','base64');
if(key.length!==32||!process.env.DATABASE_URL||process.env.DATABASE_URL==='[SENSITIVE]')throw new Error('Falta la configuración privada del respaldo.');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try{
 await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
 const [found]=await db.query('SHOW TABLES');
 const names=found.map(row=>Object.values(row)[0]).filter(name=>/^inm_[a-z_]+$/.test(name)&&!/^inm_(usuarios|sesiones|auth_|security_)/.test(name)).sort();
 const tables={};
 for(const name of names){const [schema]=await db.query(`SHOW CREATE TABLE \`${name}\``);const [rows]=await db.query(`SELECT * FROM \`${name}\``);tables[name]={schema:schema[0]['Create Table'],rows};}
 await db.commit();
 const snapshot=Buffer.from(JSON.stringify({createdAt:new Date().toISOString(),scope:'Business tables; authentication tables and file bytes unchanged',tables}));
 const compressed=gzipSync(snapshot);const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const ciphertext=Buffer.concat([cipher.update(compressed),cipher.final()]);
 const envelope=Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64');
 const chunks=envelope.match(/.{1,3000}/g)||[];
 console.log('RESTORE_MANIFEST '+JSON.stringify({sha256:createHash('sha256').update(snapshot).digest('hex'),bytes:snapshot.length,chunks:chunks.length,tables:Object.fromEntries(Object.entries(tables).map(([name,value])=>[name,value.rows.length]))}));
 chunks.forEach((chunk,index)=>console.log(`RESTORE_CHUNK ${index} ${chunk}`));
}finally{await db.end();}
