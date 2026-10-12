// Restores only the fields changed by uniform-property-identities, not unrelated business data.
import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';

const checkpoint = process.argv[process.argv.indexOf('--checkpoint') + 1];
if (!process.argv.includes('--checkpoint')) throw new Error('Indica --checkpoint y la carpeta del punto de recuperación.');
const bytes = await readFile(`${checkpoint}/database.json`);
const manifest = JSON.parse(await readFile(`${checkpoint}/manifest.json`, 'utf8'));
if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256.database) throw new Error('La copia no pasó la verificación de integridad.');
const source = await readFile(`${checkpoint}/source.tar.gz`);
if (createHash('sha256').update(source).digest('hex') !== manifest.sha256.source) throw new Error('El código no pasó la verificación de integridad.');
const { tables } = JSON.parse(bytes);
const changes = JSON.parse(await readFile(`${checkpoint}/identity-changes.json`, 'utf8'));
console.log(`Punto verificado: ${manifest.checkpoint}. ${tables.inm_inmuebles.rows.length} inmuebles; código ${manifest.commit}.`);
if (!process.argv.includes('--apply')) console.log('Vista previa: no se modificó la base. Añade --apply para restaurar los campos afectados.');
else {
  loadEnvFile('.env.local');
  const db = await mysql.createConnection({uri: process.env.DATABASE_URL, dateStrings: true,
    ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? {ssl: {
      ...(process.env.DATABASE_SSL_CA ? {ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n')} : {}), rejectUnauthorized: true,
    }} : {}),
  });
  try {
    await db.beginTransaction();
    const [current] = await db.query('SELECT id,codigo FROM inm_inmuebles FOR UPDATE');
    if (current.length !== tables.inm_inmuebles.rows.length || current.some(row => !changes.changes.some(change => change.id === row.id && [change.old, change.new].includes(row.codigo)))) throw new Error('Hay registros o códigos posteriores. Se conservan; la recuperación necesita revisión.');
    for (const row of tables.inm_inmuebles.rows) {
      await db.execute('UPDATE inm_inmuebles SET codigo=?,numero_orden=?,datos_prueba=?,datos_validados=?,fecha_actualizacion=? WHERE id=?', [row.codigo,row.numero_orden ?? null,row.datos_prueba,row.datos_validados,row.fecha_actualizacion,row.id]);
    }
    for (const [table, fields] of Object.entries({inm_archivos:['nombre','observacion'], inm_publicaciones:['texto'], inm_tasaciones:['observacion'], inm_seguimiento:['observacion'], inm_liberaciones:['datos_simulados']})) {
      for (const row of tables[table].rows) for (const field of fields) await db.query('UPDATE ?? SET ??=? WHERE id=?', [table,field,row[field],row.id]);
    }
    for (const change of changes.changes) await db.execute('DELETE FROM inm_codigos_anteriores WHERE codigo=? AND inmueble_id=?', [change.old,change.id]);
    if (changes.timelineIds.length) await db.query('DELETE FROM inm_timeline WHERE id IN (?)', [changes.timelineIds]);
    // Existing numeric draft keys remain valid; restore the former keys from the snapshot as well.
    for (const row of tables.inm_borradores.rows) await db.execute('INSERT INTO inm_borradores(usuario_id,clave,contenido,actualizado) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE contenido=VALUES(contenido),actualizado=VALUES(actualizado)', [row.usuario_id,row.clave,row.contenido,row.actualizado]);
    const sequence = tables.inm_secuencias?.rows.find(row => row.nombre === 'inmueble')?.valor ?? 0;
    await db.execute("UPDATE inm_secuencias SET valor=? WHERE nombre='inmueble'", [sequence]);
    await db.commit();
    console.log('Campos recuperados. Para recuperar la interfaz anterior, despliega el commit indicado en el manifiesto.');
  } catch (error) {await db.rollback(); throw error;}
  finally {await db.end();}
}
