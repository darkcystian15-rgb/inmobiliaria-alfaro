// Preview unless --backup or --apply. Never prints personal information or connection strings.
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { simplifiedRegistration, simplifiedFields } from '../lib/simplified-registration.mjs';

if (existsSync('.env.local')) loadEnvFile('.env.local');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const argument = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const checkpoint = argument('--checkpoint');
const backup = process.argv.includes('--backup'), apply = process.argv.includes('--apply');
if (backup && apply) throw new Error('Ejecuta copia y aplicación por separado.');
if ((backup || apply) && !checkpoint) throw new Error('Indica --checkpoint con el punto de restauración del código.');
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL. No se modificó la base de datos.');
const dir = checkpoint ? resolve(checkpoint) : null;
let manifest;
if (dir) {
  manifest = JSON.parse(await readFile(`${dir}/manifest.json`, 'utf8'));
  const source = await readFile(`${dir}/source.tar.gz`);
  if (hash(source) !== manifest.sha256['source.tar.gz']) throw new Error('La copia de código no pasó la verificación.');
}
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: {
    ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true,
  }} : {}),
});
let locked = false;
try {
  if (backup) {
    if (existsSync(`${dir}/database.json`)) throw new Error('El punto ya tiene copia de base; no se sobrescribe.');
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    const [tables] = await db.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const snapshot = {};
    for (const entry of tables) {
      const name = Object.values(entry)[0];
      const [definition] = await db.query('SHOW CREATE TABLE ??', [name]);
      const [rows] = await db.query('SELECT * FROM ??', [name]);
      snapshot[name] = { definition: definition[0]['Create Table'], rows };
    }
    const bytes = JSON.stringify({ createdAt: new Date().toISOString(), tables: snapshot }, null, 2);
    await writeFile(`${dir}/database.json`, bytes, { mode: 0o600, flag: 'wx' });
    manifest.databaseBackup = 'complete'; manifest.sha256['database.json'] = hash(bytes);
    await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    await chmod(`${dir}/manifest.json`, 0o600);
    await db.commit();
    console.log(`Copia privada verificada: ${tables.length} tablas. No se alteraron datos.`);
  } else {
    let saved;
    if (apply) {
      if (existsSync(`${dir}/registration-changes.json`)) throw new Error('Este punto ya fue aplicado o tiene una aplicación pendiente; revisa su diario antes de continuar.');
      const bytes = await readFile(`${dir}/database.json`);
      if (hash(bytes) !== manifest.sha256['database.json']) throw new Error('La copia de base no pasó la verificación.');
      saved = JSON.parse(bytes).tables;
      if (!saved.inm_inmuebles || !saved.inm_propietarios) throw new Error('La copia no contiene las tablas requeridas.');
      const [[lock]] = await db.query("SELECT GET_LOCK('simplify-registration-v1', 10) acquired");
      if (Number(lock.acquired) !== 1) throw new Error('Hay otra migración en ejecución.');
      locked = true;
      // Additive DDL is separate because MySQL commits schema changes implicitly.
      const [columns] = await db.query('SHOW COLUMNS FROM inm_inmuebles');
      if (!columns.some(column => column.Field === 'nombre_contacto')) await db.query('ALTER TABLE inm_inmuebles ADD COLUMN nombre_contacto VARCHAR(281) NULL');
      if (columns.find(column => column.Field === 'direccion')?.Type !== 'varchar(350)') await db.query('ALTER TABLE inm_inmuebles MODIFY COLUMN direccion VARCHAR(350) NULL');
      await db.beginTransaction();
    }
    const [rows] = await db.query(`SELECT * FROM inm_inmuebles ORDER BY id${apply ? ' FOR UPDATE' : ''}`);
    const [owners] = await db.query(`SELECT * FROM inm_propietarios ORDER BY id${apply ? ' FOR UPDATE' : ''}`);
    if (apply) {
      const original = new Map(saved.inm_inmuebles.rows.map(row => [String(row.id), row]));
      const originalOwners = new Map(saved.inm_propietarios.rows.map(row => [String(row.id), row]));
      const fields = [...simplifiedFields, 'codigo', 'fecha_actualizacion'];
      if (rows.length !== original.size || rows.some(row => !original.has(String(row.id)) || fields.some(field => String(row[field] ?? '') !== String(original.get(String(row.id))[field] ?? '')))) throw new Error('Hay inmuebles nuevos o modificados desde la copia. Crea otro punto de restauración.');
      if (owners.length !== originalOwners.size || owners.some(row => !originalOwners.has(String(row.id)) || ['nombres', 'apellidos', 'fecha_actualizacion'].some(field => String(row[field] ?? '') !== String(originalOwners.get(String(row.id))[field] ?? '')))) throw new Error('Los propietarios cambiaron desde la copia; crea otro punto.');
    }
    const ownerMap = new Map(owners.map(owner => [String(owner.id), owner]));
    const changes = rows.map(row => ({ id: row.id, before: Object.fromEntries([...simplifiedFields, 'fecha_actualizacion'].map(field => [field, row[field] ?? null])), after: simplifiedRegistration(row, ownerMap.get(String(row.propietario_id))) }));
    console.log(`Conversión preparada: ${changes.length} inmuebles. Códigos, posiciones, archivos, visitas y precios se conservan.`);
    if (!apply) console.log('Vista previa: no se escribió en la base. Usa --backup y después --apply con --checkpoint.');
    else {
      for (const change of changes) await db.query('UPDATE inm_inmuebles SET ? WHERE id=?', [change.after, change.id]);
      const [afterRows] = await db.query('SELECT id,fecha_actualizacion FROM inm_inmuebles ORDER BY id');
      const times = new Map(afterRows.map(row => [String(row.id), row.fecha_actualizacion]));
      for (const change of changes) change.after.fecha_actualizacion = times.get(String(change.id));
      const bytes = JSON.stringify({ status: 'prepared', changes }, null, 2);
      // Journal before commit: interruption requires inspection, never a blind second apply.
      await writeFile(`${dir}/registration-changes.json`, bytes, { mode: 0o600, flag: 'wx' });
      manifest.sha256['registration-changes.json'] = hash(bytes);
      await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
      await db.commit();
      console.log('Conversión aplicada. Datos retirados conservados únicamente en columnas/tablas heredadas y copia privada para recuperación.');
    }
  }
} catch (error) {
  await db.rollback();
  // MySQL errors can include SQL or connection details; print only deliberate validation errors.
  if (error.code) { console.error(`No se completó la operación (${error.code}). Revisa el acceso y la estructura de la base.`); process.exitCode = 1; }
  else { console.error(error.message); process.exitCode = 1; }
} finally {
  if (locked) await db.query("SELECT RELEASE_LOCK('simplify-registration-v1')");
  await db.end();
}
