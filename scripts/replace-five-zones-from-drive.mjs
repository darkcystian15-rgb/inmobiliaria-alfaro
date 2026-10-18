import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';
import { replaceFiveZones } from '../lib/zone-replacement.mjs';

const args=process.argv.slice(2), option=key=>args[args.indexOf(key)+1];
if(!args.includes('--checkpoint')) throw Error('Indica --checkpoint dentro de restore-points/.');
const checkpoint=path.resolve(option('--checkpoint'));
if(!checkpoint.startsWith(path.resolve('restore-points')+path.sep)) throw Error('El respaldo debe ser privado en restore-points/.');
const backupBytes=fs.readFileSync(path.join(checkpoint,'business.json'));
const backup=JSON.parse(backupBytes);
const evidence=JSON.parse(fs.readFileSync(path.join(checkpoint,'business-manifest.json'),'utf8'));
if(createHash('sha256').update(backupBytes).digest('hex')!==evidence.sha256) throw Error('Hash del respaldo incorrecto.');
for(const file of backup.files) if(createHash('sha256').update(fs.readFileSync(path.join(checkpoint,file.copy))).digest('hex')!==file.sha256) throw Error('Archivo de respaldo alterado.');
const manifest=JSON.parse(fs.readFileSync(path.join(checkpoint,'import.json'),'utf8'));
if(!process.env.DATABASE_URL) process.loadEnvFile('.env.local');
const connection=await mysql.createConnection({uri:process.env.DATABASE_URL,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try {
  const [[identity]]=await connection.query('SELECT DATABASE() name, @@hostname server');
  if(identity.name!==backup.database.name || identity.server!==backup.database.server) throw Error('La conexión no corresponde al respaldo.');
  const result=await replaceFiveZones(connection,manifest,backup,args.includes('--apply'));
  if(result.apply) fs.writeFileSync(path.join(checkpoint,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({...result,created:result.created?.length}));
} finally { await connection.end(); }
