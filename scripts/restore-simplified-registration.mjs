// Preview by default; restores only converted fields, refuses later edits or new captures.
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { simplifiedFields } from '../lib/simplified-registration.mjs';
const index = process.argv.indexOf('--checkpoint');
if (index < 0 || !process.argv[index + 1]) throw new Error('Indica --checkpoint CARPETA.');
const dir = process.argv[index + 1], hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(`${dir}/manifest.json`, 'utf8'));
for (const filename of ['source.tar.gz', 'database.json', 'registration-changes.json']) {
  const bytes = await readFile(`${dir}/${filename}`);
  if (hash(bytes) !== manifest.sha256[filename]) throw new Error(`Integridad inválida: ${filename}.`);
}
const { changes } = JSON.parse(await readFile(`${dir}/registration-changes.json`, 'utf8'));
console.log(`Punto íntegro: ${changes.length} registros, código anterior ${manifest.commit}.`);
if (!process.argv.includes('--apply')) console.log('Vista previa. No se conectó ni modificó la base.');
else {
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.');
  const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
    ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}),
  });
  try {
    const [[lock]] = await db.query("SELECT GET_LOCK('simplify-registration-v1', 10) acquired");
    if (Number(lock.acquired) !== 1) throw new Error('Otra migración está en ejecución.');
    await db.beginTransaction();
    const [rows] = await db.query('SELECT * FROM inm_inmuebles ORDER BY id FOR UPDATE');
    const expected = new Map(changes.map(change => [String(change.id), change]));
    if (rows.length !== expected.size || rows.some(row => !expected.has(String(row.id)) || [...simplifiedFields, 'fecha_actualizacion'].some(field => String(row[field] ?? '') !== String(expected.get(String(row.id)).after[field] ?? '')))) throw new Error('Hay captaciones o cambios posteriores. Recuperación detenida para conservarlos.');
    for (const change of changes) await db.query('UPDATE inm_inmuebles SET ? WHERE id=?', [change.before, change.id]);
    await db.commit();
    console.log('Campos recuperados. Despliega el código anterior indicado en el manifiesto. Las columnas añadidas se conservan para permitir recuperación.');
  } catch (error) {
    await db.rollback(); console.error(error.code ? `Restauración detenida (${error.code}).` : error.message); process.exitCode = 1;
  } finally { await db.query("SELECT RELEASE_LOCK('simplify-registration-v1')"); await db.end(); }
}
