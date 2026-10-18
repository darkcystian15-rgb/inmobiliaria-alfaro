import { createHash, randomUUID } from 'node:crypto';
import { pruneDraft, propertyDraftMatches } from './property-deletion-input.mjs';
export { deletionInput } from './property-deletion-input.mjs';
export const propertyTables = ['inm_archivos','inm_timeline','inm_seguimiento','inm_anuncios','inm_codigos_anteriores','inm_expedientes','inm_liberaciones','inm_publicaciones','inm_negociaciones','inm_tasaciones','inm_visitas','inm_asignaciones_zona','inm_asignaciones_posicion'];
const draftMaps = ['fechas','observaciones','valores','precios','ventas','textos','textosListos'];
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function snapshot(connection, id, zone) {
  const [rows] = await connection.query("SELECT i.* FROM inm_inmuebles i JOIN inm_zonas z ON z.id=i.zona_id AND z.activo=1 WHERE i.id=? AND z.nombre=? FOR UPDATE", [id, zone]);
  if (!rows[0] || rows[0].estado !== 'activo') throw Error('El inmueble ya no está activo en esta zona.');
  const [tables] = await connection.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
  const present = new Set(tables.map(row => row.name));
  const children = {};
  for (const table of propertyTables.filter(name => present.has(name))) {
    const [keys] = await connection.query("SELECT COLUMN_NAME name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME='PRIMARY' ORDER BY ORDINAL_POSITION",[table]);
    const order = keys.map(row => '`'+row.name.replaceAll('`','')+'`').join(',');
    const [items] = await connection.query(`SELECT * FROM \`${table}\` WHERE inmueble_id=?${order?' ORDER BY '+order:''} FOR UPDATE`,[id]);
    children[table] = items;
  }
  return { property: rows[0], children };
}
export async function prepareDeletion(connection, userId, zone, input) {
  await connection.beginTransaction();
  try {
    const data = await snapshot(connection, input.inmuebleId, zone);
    const id = randomUUID();
    await connection.query("DELETE FROM inm_eliminaciones_pendientes WHERE estado='confirmacion' AND expira<NOW()");
    await connection.query("INSERT INTO inm_eliminaciones_pendientes(id,inmueble_id,zona_id,usuario_id,estado,motivo,detalle,huella,rutas,expira) VALUES(?,?,?,?,'confirmacion',?,?,?,'[]',DATE_ADD(NOW(),INTERVAL 5 MINUTE))",[id,input.inmuebleId,data.property.zona_id,userId,input.motivo,input.detalle,fingerprint(data)]);
    const [[position]] = await connection.query('SELECT p.numero FROM inm_asignaciones_zona a JOIN inm_posiciones_zona p ON p.id=a.posicion_id WHERE a.inmueble_id=? AND a.activa=1 ORDER BY a.id DESC LIMIT 1',[input.inmuebleId]);
    await connection.commit();
    return { eliminacionId:id, archivos:data.children.inm_archivos?.length || 0, property:data.property, posicion:position?.numero ?? null };
  } catch(error) { await connection.rollback(); throw error; }
}
export async function commitDeletion(connection, userId, zone, id) {
  await connection.beginTransaction();
  try {
    const [[job]] = await connection.query("SELECT e.*, e.expira>NOW() vigente FROM inm_eliminaciones_pendientes e JOIN inm_zonas z ON z.id=e.zona_id AND z.activo=1 WHERE e.id=? AND z.nombre=? FOR UPDATE",[id,zone]);
    if (job?.estado === 'archivos') { await connection.commit(); return; }
    if (!job || job.estado !== 'confirmacion' || Number(job.usuario_id)!==userId || !Number(job.vigente)) throw Error('La confirmación caducó o no pertenece a tu sesión. Vuelve a confirmar.');
    const data = await snapshot(connection, Number(job.inmueble_id), zone);
    if (fingerprint(data)!==job.huella) throw Error('El inmueble cambió. Revisa sus datos y vuelve a confirmar.');
    const paths=[];
    for (const file of data.children.inm_archivos || []) if(file.almacenamiento==='hosting' && file.ruta_almacenamiento) {
      const [[used]]=await connection.query('SELECT COUNT(*) total FROM inm_archivos WHERE ruta_almacenamiento=? AND inmueble_id<>?',[file.ruta_almacenamiento,job.inmueble_id]);
      if(!Number(used.total)) paths.push(file.ruta_almacenamiento);
    }
    // Lock and scrub saved drafts; keep every other property's data intact.
    const [drafts]=await connection.query('SELECT * FROM inm_borradores ORDER BY usuario_id,clave FOR UPDATE');
    const codes=[data.property.codigo,...(data.children.inm_codigos_anteriores||[]).map(row=>row.codigo)];
    for(const draft of drafts) {
      let legacyForm=null;
      if(draft.clave.startsWith('ficha:')) { try { legacyForm=JSON.parse(draft.contenido); } catch { /* Identity in the key still covers damaged legacy drafts. */ } }
      if(propertyDraftMatches(draft.clave,legacyForm,Number(job.inmueble_id),codes)) {
        await connection.query('DELETE FROM inm_borradores WHERE usuario_id=? AND clave=?',[draft.usuario_id,draft.clave]);continue;
      }
      if(['visitas:actual','tasaciones:actual','textos:actual'].includes(draft.clave)) {
        const content=JSON.parse(draft.contenido);
        const remaining=new Set();
        for(const field of draftMaps) for(const key of Object.keys(content[field]||{})) if(Number(key)!==Number(job.inmueble_id)) remaining.add(Number(key));
        const next=JSON.stringify(pruneDraft(draft.clave,content,remaining));
        if(next!==JSON.stringify(content)) await connection.query('UPDATE inm_borradores SET contenido=?,actualizado=actualizado WHERE usuario_id=? AND clave=?',[next,draft.usuario_id,draft.clave]);
      }
    }
    // Files before visits; both old and current position assignments are removed.
    for(const table of Object.keys(data.children)) await connection.query(`DELETE FROM \`${table}\` WHERE inmueble_id=?`,[job.inmueble_id]);
    await connection.query('UPDATE inm_inmuebles SET inmueble_origen_id=NULL,fecha_actualizacion=fecha_actualizacion WHERE inmueble_origen_id=?',[job.inmueble_id]);
    const resources=[`property:${job.inmueble_id}`,...(data.children.inm_archivos||[]).map(file=>`file:${file.id}`)];
    await connection.query('DELETE FROM inm_security_audit WHERE resource IN (?)',[resources]);
    await connection.query('DELETE FROM inm_inmuebles WHERE id=?',[job.inmueble_id]);
    if(data.property.propietario_id) await connection.query('DELETE FROM inm_propietarios WHERE id=? AND NOT EXISTS(SELECT 1 FROM inm_inmuebles WHERE propietario_id=?)',[data.property.propietario_id,data.property.propietario_id]);
    await connection.query("DELETE FROM inm_eliminaciones_pendientes WHERE inmueble_id=? AND estado='confirmacion' AND id<>?",[job.inmueble_id,id]);
    await connection.query("UPDATE inm_eliminaciones_pendientes SET estado='archivos',rutas=?,huella='',motivo='',detalle='' WHERE id=?",[JSON.stringify([...new Set(paths)]),id]);
    await connection.query("INSERT INTO inm_security_audit(actor_id,action,resource,outcome) VALUES(?,'property.delete',?,'success')",[userId,`deletion:${id}`]);
    await connection.commit();
  } catch(error) { await connection.rollback();throw error; }
}
export async function finishDeletion(connection, zone, id, remove) {
  const [[lock]]=await connection.query('SELECT GET_LOCK(?,0) acquired',[`alfaro-delete-${id}`]);
  if(!Number(lock.acquired)) return false;
  try {
    const [[job]]=await connection.query("SELECT e.* FROM inm_eliminaciones_pendientes e JOIN inm_zonas z ON z.id=e.zona_id AND z.activo=1 WHERE e.id=? AND z.nombre=? AND e.estado='archivos'",[id,zone]);
    if(!job) throw Error('No existe una eliminación pendiente en esta zona.');
    const paths=JSON.parse(job.rutas);
    while(paths.length) {
      const [[shared]]=await connection.query('SELECT COUNT(*) total FROM inm_archivos WHERE ruta_almacenamiento=?',[paths[0]]);
      try { if(!Number(shared.total)) await remove(paths[0]); } catch { return false; }
      paths.shift();
      await connection.query('UPDATE inm_eliminaciones_pendientes SET rutas=? WHERE id=?',[JSON.stringify(paths),id]);
    }
    await connection.query('DELETE FROM inm_eliminaciones_pendientes WHERE id=?',[id]);
    return true;
  } finally { await connection.query('SELECT RELEASE_LOCK(?)',[`alfaro-delete-${id}`]); }
}
