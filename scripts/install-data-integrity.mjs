import mysql from 'mysql2/promise';
import {readFileSync} from 'node:fs';
if(!process.env.DATABASE_URL)process.loadEnvFile('.env.local');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try{for(const q of readFileSync('db/migrations/0031_data_integrity.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.query(q);console.log('Integridad: tablas aditivas preparadas; registros anteriores conservados.');}finally{await db.end();}
