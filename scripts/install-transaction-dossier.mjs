// Read-only preview by default. No files are deleted from storage.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { dossierDefaults, dossierDocuments, legacyDossierTypes } from '../lib/transaction-dossier.mjs';

const args = process.argv.slice(2);
const option = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
process.loadEnvFile(option('--env') || '.env.local');
const apply = args.includes('--apply');
const schemaOnly = args.includes('--schema-only');
const checkpoint = option('--checkpoint');
if (apply && (!checkpoint || !path.resolve(checkpoint).startsWith(path.resolve('restore-points') + path.sep))) throw Error('Indica --checkpoint dentro de restore-points/.');
const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}) });
const types = new Set(dossierDocuments.map(item => item.key));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (name, content) => fs.writeFileSync(path.join(checkpoint, name), content, { flag: 'wx', mode: 0o600 });
try {
  const [[lock]] = await connection.query("SELECT GET_LOCK('alfaro_transaction_dossier', 15) acquired");
  if (Number(lock.acquired) !== 1) throw Error('Otra migración está en ejecución.');
  const [tables] = await connection.query("SHOW TABLES LIKE 'inm_expedientes'");
  await connection.beginTransaction();
  const [files] = await connection.query('SELECT * FROM inm_archivos ORDER BY id FOR UPDATE');
  const before = tables.length ? (await connection.query('SELECT * FROM inm_expedientes ORDER BY inmueble_id FOR UPDATE'))[0] : [];
  const mapped = files.filter(file => file.tipo_documento !== 'FOTO_INMUEBLE' && !types.has(file.tipo_documento) && file.tipo_documento !== 'POR_CLASIFICAR').map(file => ({ id: file.id, before: file.tipo_documento, after: legacyDossierTypes[file.tipo_documento] || 'POR_CLASIFICAR' }));
  const summary = { applied: apply, createTable: !tables.length, files: files.length, reclassify: mapped.length, review: mapped.filter(row => row.after === 'POR_CLASIFICAR').length };
  if (!apply) { await connection.rollback(); console.log(JSON.stringify(summary)); }
  else {
    fs.mkdirSync(checkpoint, { recursive: true, mode: 0o700 });
    const [[database]] = await connection.query('SELECT DATABASE() name, @@hostname server');
    const [schema] = await connection.query('SHOW CREATE TABLE inm_archivos');
    const bytes = JSON.stringify({ createdAt: new Date().toISOString(), database, schema, files, expedientes: before, mapped }, null, 2) + '\n';
    write('dossier-database.json', bytes);
    write('dossier-manifest.json', JSON.stringify({ sha256: hash(bytes), summary }, null, 2) + '\n');
    // MySQL DDL commits implicitly. This is additive and cannot affect the old app.
    await connection.commit();
    await connection.query(fs.readFileSync('db/migrations/0016_transaction_dossier.sql', 'utf8'));
    await connection.beginTransaction();
    await connection.query('SELECT id FROM inm_archivos FOR UPDATE');
    const byProperty = new Map();
    for (const file of files) {
      if (file.tipo_documento === 'DNI_PROPIETARIO') byProperty.set(file.inmueble_id, { ...dossierDefaults(), vendedorTipo: 'natural' });
    }
    for (const entry of schemaOnly ? [] : mapped) {
      const [result] = await connection.query('UPDATE inm_archivos SET tipo_documento=? WHERE id=? AND tipo_documento=?', [entry.after, entry.id, entry.before]);
      if (result.affectedRows !== 1) throw Error('Un documento cambió desde el respaldo. Se revirtió la reorganización.');
    }
    if (!schemaOnly) for (const [id, config] of byProperty) await connection.query('INSERT IGNORE INTO inm_expedientes (inmueble_id,configuracion) VALUES (?,?)', [id, JSON.stringify(config)]);
    await connection.commit();
    write('dossier-applied.json', JSON.stringify({ ...summary, schemaOnly, committedAt: new Date().toISOString() }, null, 2) + '\n');
    console.log(JSON.stringify({ ...summary, schemaOnly }));
  }
} catch (error) { await connection.rollback(); console.error('Migración no completada:', error.code || error.message); process.exitCode = 1; }
finally { await connection.query("SELECT RELEASE_LOCK('alfaro_transaction_dossier')"); await connection.end(); }
