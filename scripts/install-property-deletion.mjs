// Additive schema only. Preview by default; never deletes business records.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
const args=process.argv.slice(2),option=key=>args.includes(key)?args[args.indexOf(key)+1]:undefined;
const env=option('--env')||'.env.local';if(fs.existsSync(env))process.loadEnvFile(env);
const apply=args.includes('--apply'),checkpoint=option('--checkpoint');
if(apply&&(!checkpoint||!path.resolve(checkpoint).startsWith(path.resolve('restore-points')+path.sep)))throw Error('Indica un punto dentro de restore-points/.');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try{
 const [existing]=await db.query("SHOW TABLES LIKE 'inm_eliminaciones_pendientes'");
 const sql=fs.readFileSync('db/migrations/0017_property_deletion.sql','utf8');
 if(apply){fs.mkdirSync(checkpoint,{recursive:true,mode:0o700});const [schema]=existing.length?await db.query('SHOW CREATE TABLE inm_eliminaciones_pendientes'):[[]];const bytes=JSON.stringify({createdAt:new Date().toISOString(),existed:!!existing.length,schema},null,2)+'\n';fs.writeFileSync(path.join(checkpoint,'deletion-schema-before.json'),bytes,{mode:0o600,flag:'wx'});await db.query(sql);const [[engine]]=await db.query("SELECT ENGINE engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inm_eliminaciones_pendientes'");if(engine.engine!=='InnoDB')throw Error('La tabla técnica debe usar InnoDB.');fs.writeFileSync(path.join(checkpoint,'deletion-schema-applied.json'),JSON.stringify({sha256:createHash('sha256').update(bytes).digest('hex'),appliedAt:new Date().toISOString(),newTable:!existing.length},null,2)+'\n',{mode:0o600,flag:'wx'});}
 console.log(JSON.stringify({apply,newTable:!existing.length,businessWrites:0}));
}finally{await db.end();}
