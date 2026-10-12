// Preview by default. Apply requires a verified recovery point.
import { loadEnvFile } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { propertyCode } from '../lib/property-code.mjs';

loadEnvFile('.env.local');
const apply = process.argv.includes('--apply');
const checkpoint = process.argv[process.argv.indexOf('--checkpoint') + 1];
if (apply && !process.argv.includes('--checkpoint')) throw new Error('Indica el punto de recuperación con --checkpoint.');
if (apply) {
  const manifest = JSON.parse(await readFile(`${checkpoint}/manifest.json`, 'utf8'));
  for (const [filename, key] of [['database.json', 'database'], ['source.tar.gz', 'source']]) {
    const bytes = await readFile(`${checkpoint}/${filename}`);
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256[key]) throw new Error('El punto de recuperación no pasó la verificación.');
  }
}
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? {ssl: {
    ...(process.env.DATABASE_SSL_CA ? {ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n')} : {}), rejectUnauthorized: true,
  }} : {}),
});

function cleanText(text) {
  if (!text) return text;
  return text.replace(/Imagen ficticia de ejemplo/gi, 'Foto del inmueble')
    .replace(/SOLO PRUEBA\s*[:—-]?\s*/gi, '')
    .replace(/\s+de demostración/gi, '').replace(/\s+(fictici[oa]|simulad[oa])/gi, '')
    .replace(/\s*[.;]?\s*(Este anuncio no constituye una oferta real|sin validez comercial|no acredita una actividad realizada)\.?/gi, '')
    .replace(/\s*[—-]\s*$/g, '').trim();
}

try {
  const [columns] = await db.query('SHOW COLUMNS FROM inm_inmuebles');
  const hasOrder = columns.some(column => column.Field === 'numero_orden');
  const [before] = await db.query('SELECT * FROM inm_inmuebles ORDER BY fecha_registro,id');
  let next = Math.max(0, ...before.map(row => Number(row.numero_orden || 0)));
  const preview = before.map(row => ({id: row.id, old: row.codigo,
    order: Number(row.numero_orden || ++next), type: row.tipo, name: row.referencia}));
  console.log(JSON.stringify(preview.map(row => ({id: row.id, codigo: propertyCode(row.order, row.type, row.name)})), null, 2));
  if (!apply) { console.log('Vista previa: no se modificó la base de datos.'); process.exitCode = 0; }
  else {
    await db.query('ALTER TABLE inm_inmuebles MODIFY COLUMN codigo VARCHAR(350) NOT NULL');
    if (!hasOrder) await db.query('ALTER TABLE inm_inmuebles ADD COLUMN numero_orden BIGINT UNSIGNED NULL, ADD UNIQUE KEY uq_inm_inmuebles_numero_orden(numero_orden)');
    await db.query('CREATE TABLE IF NOT EXISTS inm_secuencias (nombre VARCHAR(50) PRIMARY KEY, valor BIGINT UNSIGNED NOT NULL DEFAULT 0)');
    await db.query('CREATE TABLE IF NOT EXISTS inm_codigos_anteriores (codigo VARCHAR(350) PRIMARY KEY, inmueble_id BIGINT UNSIGNED NOT NULL, FOREIGN KEY (inmueble_id) REFERENCES inm_inmuebles(id))');
    await db.beginTransaction();
    await db.execute("INSERT IGNORE INTO inm_secuencias(nombre,valor) VALUES('inmueble',0)");
    const [[sequence]] = await db.query("SELECT valor FROM inm_secuencias WHERE nombre='inmueble' FOR UPDATE");
    const [[actor]] = await db.query("SELECT id FROM inm_usuarios WHERE rol='administrador' AND activo=1 ORDER BY id LIMIT 1");
    if (!actor) throw new Error('No hay un administrador disponible para registrar el historial.');
    const [rows] = await db.query('SELECT * FROM inm_inmuebles ORDER BY fecha_registro,id FOR UPDATE');
    next = Math.max(Number(sequence.valor), ...rows.map(row => Number(row.numero_orden || 0)));
    const changes = [], timelineIds = [];
    for (const row of rows) {
      const order = Number(row.numero_orden || ++next);
      const code = propertyCode(order, row.tipo, row.referencia);
      if (row.codigo !== code) {
        await db.execute('INSERT INTO inm_codigos_anteriores(codigo,inmueble_id) VALUES(?,?) ON DUPLICATE KEY UPDATE inmueble_id=VALUES(inmueble_id)', [row.codigo, row.id]);
        const [event] = await db.execute("INSERT INTO inm_timeline(inmueble_id,evento,observacion,usuario_id) VALUES(?,'identificacion_actualizada',?,?)", [row.id, JSON.stringify({anterior: row.codigo, nuevo: code, numeroOrden: order, origen: 'uniformizacion_del_sistema'}), actor.id]);
        timelineIds.push(event.insertId);
      }
      await db.execute('UPDATE inm_inmuebles SET codigo=?,numero_orden=?,datos_prueba=0,datos_validados=0 WHERE id=?', [code, order, row.id]);
      const [drafts] = await db.execute('SELECT * FROM inm_borradores WHERE clave=? FOR UPDATE', [`ficha:${row.codigo}`]);
      for (const draft of drafts) {
        const destination = `ficha:${row.id}`;
        if (draft.clave === destination) continue;
        await db.execute('INSERT INTO inm_borradores(usuario_id,clave,contenido,actualizado) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE contenido=IF(VALUES(actualizado)>actualizado,VALUES(contenido),contenido),actualizado=GREATEST(actualizado,VALUES(actualizado))', [draft.usuario_id, destination, draft.contenido, draft.actualizado]);
        await db.execute('DELETE FROM inm_borradores WHERE usuario_id=? AND clave=?', [draft.usuario_id, draft.clave]);
      }
      changes.push({id: row.id, old: row.codigo, new: code, order});
    }
    await db.execute("UPDATE inm_secuencias SET valor=? WHERE nombre='inmueble'", [next]);
    await db.query('UPDATE inm_liberaciones SET datos_simulados=0 WHERE datos_simulados=1');
    const displayFields = {inm_archivos: ['nombre', 'observacion'], inm_publicaciones: ['texto'], inm_tasaciones: ['observacion'], inm_seguimiento: ['observacion']};
    for (const [table, fields] of Object.entries(displayFields)) {
      const [items] = await db.query('SELECT * FROM ??', [table]);
      for (const row of items) for (const field of fields) {
        let value = row[field];
        if (typeof value !== 'string' || !/SOLO PRUEBA|fictici|simulad|demostraci/i.test(value)) continue;
        if (table === 'inm_archivos' && field === 'observacion') value = 'Documento adjunto al expediente.';
        else if (table === 'inm_seguimiento') value = 'Plazo y responsable asignados.';
        else value = cleanText(value);
        if (value !== row[field]) await db.query('UPDATE ?? SET ??=? WHERE id=?', [table, field, value, row.id]);
      }
    }
    // Save rollback identifiers before commit; a failed file write rolls back the data updates.
    let previous = {changes: [], timelineIds: []};
    try { previous = JSON.parse(await readFile(`${checkpoint}/identity-changes.json`, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const merged = changes.map(change => ({...change, old: previous.changes.find(item => item.id === change.id)?.old ?? change.old}));
    await writeFile(`${checkpoint}/identity-changes.json`, JSON.stringify({changes: merged, timelineIds: [...new Set([...previous.timelineIds, ...timelineIds])]}, null, 2), {mode: 0o600});
    await db.commit();
    console.log(`Actualizados ${changes.length} inmuebles. Códigos únicos, números estables y clasificación operativa uniforme.`);
  }
} catch (error) { await db.rollback(); throw error; }
finally { await db.end(); }
