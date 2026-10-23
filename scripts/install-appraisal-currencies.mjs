// Additive, idempotent schema preparation. Never changes stored amounts.
import { loadEnvFile } from 'node:process';
import mysql from 'mysql2/promise';
try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const apply = process.argv.includes('--apply');
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL para comprobar las monedas de tasación.');
const connection = await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? {ssl:{...(process.env.DATABASE_SSL_CA ? {ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}} : {})});
const columns = [
  ['inm_tasaciones', 'valor_referencia_moneda'],
  ['inm_tasaciones', 'precio_objetivo_moneda'],
  ['inm_tasaciones', 'precio_venta_moneda'],
  ['inm_anuncios', 'precio_publicado_moneda'],
];
let locked = false;
try {
  if (apply) {
    const [rows] = await connection.query("SELECT GET_LOCK('alfaro_appraisal_currencies', 60) acquired");
    if (rows[0].acquired !== 1) throw new Error('No se pudo reservar la preparación de monedas.');
    locked = true;
  }
  for (const [table, column] of columns) {
    const [existing] = await connection.execute('SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [table, column]);
    if (existing.length) {
      const found = existing[0];
      if (found.COLUMN_TYPE !== 'varchar(3)' || found.IS_NULLABLE !== 'NO' || String(found.COLUMN_DEFAULT).replace(/^'|'$/g,'') !== 'PEN') throw new Error(`La definición de ${table}.${column} no coincide; revisar antes de publicar.`);
      console.log(`${table}.${column}: correcto`);
    } else if (apply) {
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` VARCHAR(3) NOT NULL DEFAULT 'PEN'`);
      console.log(`${table}.${column}: añadido; registros previos en PEN`);
    } else {
      console.log(`${table}.${column}: pendiente (usar --apply)`);
    }
  }
} finally {
  if (locked) await connection.query("SELECT RELEASE_LOCK('alfaro_appraisal_currencies')");
  await connection.end();
}
