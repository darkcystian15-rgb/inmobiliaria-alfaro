import { randomUUID } from 'node:crypto';

// The caller holds the property lock before checking and mutating its files.
export async function assertPropertyWritable(db, id) {
  const [[closed]] = await db.query("SELECT id FROM inm_liberaciones WHERE inmueble_id=? AND confirmado=1 AND anulada=0 AND motivo IN ('vendido','alquilado') LIMIT 1", [id]);
  if (closed) throw Error('El expediente está cerrado y protegido. No se pueden modificar sus documentos ni condiciones.');
  const [[pending]] = await db.query("SELECT id FROM inm_eliminaciones_pendientes WHERE inmueble_id=? AND estado IN ('portal','archivos') LIMIT 1", [id]);
  if (pending) throw Error('El inmueble tiene una eliminación en curso.');
}
export async function prepareUpload(db, propertyId, path, expires = new Date(Date.now() + 3600000)) {
  const id = randomUUID();
  await db.query("INSERT INTO inm_tareas_archivos(id,inmueble_id,ruta,tipo,expira) VALUES(?,?,?,'subida',?)", [id,propertyId,path,expires]);
  return id;
}
export async function deleteFileJob(db, file, userId) {
  const id=randomUUID();
  await db.query("INSERT INTO inm_tareas_archivos(id,inmueble_id,archivo_id,ruta,tipo,usuario_id,expira) VALUES(?,?,?,?,'borrado',?,NOW())",[id,file.inmueble_id,file.id,file.ruta_almacenamiento,userId]);
  // Pending deletion is no longer documentary evidence. Keep metadata in the job.
  await db.query('DELETE FROM inm_archivos WHERE id=?',[file.id]);
  return id;
}
// Holding a job row lock serializes confirm/cancel/cleanup. A crash leaves the job.
export async function cleanFileJob(connection, id, remove) {
  await connection.beginTransaction();
  try {
    const [[job]]=await connection.query('SELECT *,expira<=NOW() vencida FROM inm_tareas_archivos WHERE id=? FOR UPDATE',[id]);
    if(!job || !Number(job.vencida)){await connection.commit();return false;}
    const [[used]]=await connection.query('SELECT id FROM inm_archivos WHERE ruta_almacenamiento=? LIMIT 1',[job.ruta]);
    const [[portal]]=await connection.query("SELECT clave FROM inm_portal_web WHERE clave LIKE 'asset:%' AND JSON_UNQUOTE(JSON_EXTRACT(contenido,'$.path'))=? LIMIT 1",[job.ruta]);
    if(!used && !portal) await remove(job.ruta);
    await connection.query('DELETE FROM inm_tareas_archivos WHERE id=?',[id]);
    await connection.commit();return true;
  } catch(error){await connection.rollback();throw error;}
}
