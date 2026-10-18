// Consistent read-only business snapshot and private document copies. Never changes records or storage.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
import mysql from 'mysql2/promise';
const args=process.argv.slice(2),option=key=>args.includes(key)?args[args.indexOf(key)+1]:undefined;
const checkpoint=option('--checkpoint');
if(!checkpoint||!path.resolve(checkpoint).startsWith(path.resolve('restore-points')+path.sep))throw Error('Indica --checkpoint dentro de restore-points/.');
process.loadEnvFile(option('--env')||'.env.local');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})});
const hash=value=>createHash('sha256').update(value).digest('hex');
let verificationUser, sessionToken;
const origin=option('--origin');
try{
 fs.mkdirSync(path.join(checkpoint,'files'),{recursive:true,mode:0o700});
 if(origin){
   if(origin!=='https://intranet.inmobiliariaalbertoalfaro.com.pe')throw Error('Origen de respaldo no permitido.');
   const suffix=randomBytes(6).toString('hex');sessionToken=randomBytes(32).toString('hex');
   const [user]=await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo,mfa_secret) VALUES(?,?,?,?,?,1,?)',['Respaldo privado',`backup-${suffix}@example.invalid`,`backup_${suffix}`,await hashPassword(randomBytes(32).toString('hex')),'administrador',randomBytes(48).toString('base64')]);verificationUser=user.insertId;
   await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)',[hashSessionToken(sessionToken),verificationUser,new Date(Date.now()+600000),new Date(),new Date()]);
 }

 await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
 const [[identity]]=await db.query('SELECT DATABASE() name, @@hostname server');
 const [names]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
 const tables={},schemas={};
 for(const {name}of names){if(!/^inm_[a-z0-9_]+$/.test(name)||/^inm_(usuarios|sesiones|auth_|security_audit)/.test(name))continue;const [rows]=await db.query(`SELECT * FROM \`${name}\``);tables[name]=rows;const [[ddl]]=await db.query(`SHOW CREATE TABLE \`${name}\``);schemas[name]=ddl['Create Table'];}
 const files=[];
 for(const file of tables.inm_archivos||[]){if(file.almacenamiento!=='hosting'||!file.ruta_almacenamiento)continue;const url=origin?new URL(`/api/inmuebles/${file.inmueble_id}/archivos/${file.id}`,origin):new URL(process.env.DOCUMENT_HOSTING_URL);if(!origin)url.searchParams.set('path',file.ruta_almacenamiento);const response=await fetch(url,{headers:origin?{Cookie:`aa_session=${sessionToken}`}:{Authorization:`Bearer ${process.env.DOCUMENT_HOSTING_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`No se pudo respaldar el archivo ${file.id} (${response.status}).`);const bytes=Buffer.from(await response.arrayBuffer());const name=`files/${file.id}.bin`;fs.writeFileSync(path.join(checkpoint,name),bytes,{flag:'wx',mode:0o600});files.push({id:file.id,path:file.ruta_almacenamiento,copy:name,sha256:hash(bytes),bytes:bytes.length});}
 const data=JSON.stringify({createdAt:new Date().toISOString(),database:identity,schemas,tables,files},null,2)+'\n';fs.writeFileSync(path.join(checkpoint,'business.json'),data,{flag:'wx',mode:0o600});fs.writeFileSync(path.join(checkpoint,'business-manifest.json'),JSON.stringify({sha256:hash(data),tables:Object.keys(tables).length,files:files.length,businessWrites:0},null,2)+'\n',{flag:'wx',mode:0o600});await db.commit();console.log(JSON.stringify({tables:Object.keys(tables).length,files:files.length,sha256:hash(data),businessWrites:0}));
}catch(error){await db.rollback();throw error;}finally{if(verificationUser){await db.query('DELETE FROM inm_sesiones WHERE usuario_id=?',[verificationUser]);await db.query('DELETE FROM inm_usuarios WHERE id=?',[verificationUser]);}await db.end();}
