// Preview by default. Back up locked rows before applying; never log personal data.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { scrubCoordinateJson } from '../lib/retired-coordinates.mjs';

const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const envFile = option('--env') ?? '.env.local';
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const apply = args.includes('--apply');
const restore = args.includes('--restore');
const checkpoint = option('--checkpoint');
if ((apply || restore) && !checkpoint) throw Error('Indica --checkpoint dentro de restore-points/.');
if (checkpoint && !path.resolve(checkpoint).startsWith(path.resolve('restore-points') + path.sep)) throw Error('El punto debe estar en restore-points/.');
const hash = data => createHash('sha256').update(data).digest('hex');
const writePrivate = (file, data) => fs.writeFileSync(file, data, { mode: 0o600, flag: 'wx' });
const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}) });
try {
  await connection.beginTransaction();
  if (restore) {
    const bytes = fs.readFileSync(path.join(checkpoint, 'coordinates-database.json'));
    const manifest = JSON.parse(fs.readFileSync(path.join(checkpoint, 'coordinates-manifest.json')));
    if (hash(bytes) !== manifest.sha256) throw Error('La copia no pasó la verificación SHA-256.');
    const backup = JSON.parse(bytes);
    const [[identity]] = await connection.query('SELECT DATABASE() name, @@hostname server');
    if (identity.name !== backup.database.name || identity.server !== backup.database.server) throw Error('La base no coincide con la copia.');
    for (const row of backup.properties) {
      const [[current]] = await connection.query('SELECT latitud, longitud FROM inm_inmuebles WHERE id=? FOR UPDATE', [row.id]);
      if (!current || current.latitud !== null || current.longitud !== null) throw Error('Hay coordenadas posteriores o un inmueble eliminado; revisar recuperación.');
      if (apply) await connection.query('UPDATE inm_inmuebles SET latitud=?,longitud=?,fecha_actualizacion=fecha_actualizacion WHERE id=?', [row.latitud, row.longitud, row.id]);
    }
    for (const entry of backup.json) {
      const [[current]] = await connection.query(`SELECT ?? value FROM ?? WHERE ${entry.where} FOR UPDATE`, [entry.column, entry.table, ...entry.key]);
      if (!current || current.value !== entry.after) throw Error('Hay cambios posteriores en historial o borradores; revisar recuperación.');
      if (apply) await connection.query(`UPDATE ?? SET ??=?${entry.table === 'inm_borradores' ? ',actualizado=actualizado' : ''} WHERE ${entry.where}`, [entry.table, entry.column, entry.before, ...entry.key]);
    }
    if (apply) await connection.commit(); else await connection.rollback();
    console.log(JSON.stringify({ operation: 'restore', applied: apply, properties: backup.properties.length, json: backup.json.length }));
  } else {
    const [[database]] = await connection.query('SELECT DATABASE() name, @@hostname server');
    const [properties] = await connection.query('SELECT id,latitud,longitud FROM inm_inmuebles WHERE latitud IS NOT NULL OR longitud IS NOT NULL ORDER BY id FOR UPDATE');
    const json = [];
    for (const spec of [
      { table: 'inm_timeline', column: 'observacion', keys: ['id'] },
      { table: 'inm_borradores', column: 'contenido', keys: ['usuario_id', 'clave'] },
    ]) {
      const [rows] = await connection.query('SELECT * FROM ?? FOR UPDATE', [spec.table]);
      for (const row of rows) {
        const before = row[spec.column];
        let after;
        try { after = scrubCoordinateJson(before); } catch {
          if (/"(?:latitud|longitud|latitude|longitude)"\s*:/.test(before ?? '')) throw Error('Coordenadas en texto sin JSON válido; requiere revisión.');
          continue;
        }
        if (after !== before) json.push({ ...spec, where: spec.keys.map(key => `\`${key}\`=?`).join(' AND '), key: spec.keys.map(key => row[key]), before, after });
      }
    }
    const summary = { operation: 'remove', applied: apply, properties: properties.length, history: json.filter(row => row.table === 'inm_timeline').length, drafts: json.filter(row => row.table === 'inm_borradores').length };
    if (apply) {
      fs.mkdirSync(checkpoint, { recursive: true, mode: 0o700 });
      const bytes = JSON.stringify({ createdAt: new Date().toISOString(), database, properties, json }, null, 2) + '\n';
      writePrivate(path.join(checkpoint, 'coordinates-database.json'), bytes);
      writePrivate(path.join(checkpoint, 'coordinates-manifest.json'), JSON.stringify({ sha256: hash(bytes), summary }, null, 2) + '\n');
      for (const row of properties) await connection.query('UPDATE inm_inmuebles SET latitud=NULL,longitud=NULL,fecha_actualizacion=fecha_actualizacion WHERE id=?', [row.id]);
      for (const entry of json) await connection.query(`UPDATE ?? SET ??=?${entry.table === 'inm_borradores' ? ',actualizado=actualizado' : ''} WHERE ${entry.where}`, [entry.table, entry.column, entry.after, ...entry.key]);
      const [[remaining]] = await connection.query('SELECT COUNT(*) total FROM inm_inmuebles WHERE latitud IS NOT NULL OR longitud IS NOT NULL');
      if (Number(remaining.total)) throw Error('Quedan coordenadas sin limpiar.');
      await connection.commit();
      writePrivate(path.join(checkpoint, 'coordinates-applied.json'), JSON.stringify({ ...summary, committedAt: new Date().toISOString(), remaining: 0 }, null, 2) + '\n');
    } else await connection.rollback();
    console.log(JSON.stringify(summary));
  }
} catch (error) {
  await connection.rollback();
  console.error('No se completó la operación:', error.code ?? error.message);
  process.exitCode = 1;
} finally { await connection.end(); }
