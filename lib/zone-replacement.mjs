import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { registrationInput } from './property-input.mjs';
import { propertyCode } from './property-code.mjs';
import { propertyTables } from './property-deletion.mjs';
import { propertyDraftMatches, pruneDraft } from './property-deletion-input.mjs';

// Private operational snapshots exclude authentication and security tables.
export const businessTable = name => /^inm_[a-z0-9_]+$/.test(name) && !/^inm_(usuarios|sesiones|auth_|security_audit)/.test(name);
export function snapshotHash(tables) {
  const normalize = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]))
    : Array.isArray(value) ? value.map(normalize) : value;
  const ordered = Object.fromEntries(Object.keys(tables).sort().map(name => [name, tables[name].map(row => JSON.stringify(normalize(row))).sort()]));
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}
export function replacementManifest(manifest) {
  assert.equal(manifest.zona, 'Chimbote', 'Esta entrega solo reemplaza Chimbote.');
  assert.equal(manifest.inmuebles?.length, 43, 'Se requieren los 43 inmuebles acordados.');
  const records = manifest.inmuebles.map(row => registrationInput(row));
  const expected = Array.from({length:46}, (_,i) => i+1).filter(n => ![35,40,44].includes(n));
  assert.deepEqual(records.map(row => row.posicion).sort((a,b)=>a-b), expected, 'Posiciones incompletas o duplicadas.');
  assert.equal(records.filter(row=>row.operacion==='venta').length, 10);
  assert.equal(records.filter(row=>row.operacion==='alquiler').length, 33);
  const pending = [1,4,5,7,8,9,10,11,12,15,19,23,25,27,28,29,31,32,33,36,37,38,39,41,42];
  for (const row of records) {
    if (pending.includes(row.posicion)) {
      assert.equal(row.operacion, 'alquiler');
      assert.ok(row.nombreContacto.endsWith('-FTO'));
    } else assert.ok(!row.nombreContacto.endsWith('-FTO'));
    if ([7,32].includes(row.posicion)) assert.equal(row.nombreContacto, `CONTACTO${row.posicion}-FTO`);
  }
  return records.sort((a,b)=>a.posicion-b.posicion);
}
export async function businessSnapshot(connection, lock = false) {
  const [names] = await connection.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  const tables = {};
  for (const {name} of names.filter(row=>businessTable(row.name))) {
    const [rows] = await connection.query(`SELECT * FROM \`${name}\`${lock?' FOR UPDATE':''}`);
    tables[name] = rows;
  }
  return tables;
}

// One transaction: records, positions and durable private-file cleanup job.
// Any unknown FK or changed backup aborts without a partially replaced zone.
export async function replaceChimbote(connection, manifest, backup, apply = false) {
  const records = replacementManifest(manifest);
  await connection.beginTransaction();
  try {
    const before = await businessSnapshot(connection, true);
    assert.equal(snapshotHash(before), snapshotHash(backup.tables), 'La base cambió desde el respaldo; crear otro antes de aplicar.');
    const zone = before.inm_zonas.find(row=>row.nombre==='Chimbote' && Number(row.activo));
    assert.ok(zone && Number(zone.capacidad)>=46, 'Zona o capacidad incorrecta.');
    const previous = before.inm_inmuebles.filter(row=>Number(row.zona_id)===Number(zone.id));
    const ids = previous.map(row=>Number(row.id)), deleted = new Set(ids);
    assert.ok(ids.length, 'La zona ya está vacía; no repetir el reemplazo.');
    const outside = before.inm_inmuebles.filter(row=>!deleted.has(Number(row.id)));
    assert.ok(!outside.some(row=>deleted.has(Number(row.inmueble_origen_id))), 'Otra zona referencia un inmueble a eliminar.');
    const [[actor]] = await connection.query("SELECT id FROM inm_usuarios WHERE activo=1 AND rol='administrador' ORDER BY id LIMIT 1");
    assert.ok(actor, 'Falta administrador para el historial normal de registro.');
    for (const row of records) {
      assert.ok(before.inm_tipos_inmueble.some(type=>type.nombre===row.tipo && Number(type.activo)), 'Tipo inactivo: '+row.tipo);
      const position = before.inm_posiciones_zona.find(p=>Number(p.zona_id)===Number(zone.id) && Number(p.numero)===row.posicion && Number(p.activo));
      assert.ok(position, 'Falta posición activa '+row.posicion);
      assert.ok(!before.inm_asignaciones_zona.some(a=>Number(a.posicion_id)===Number(position.id) && Number(a.activa) && !deleted.has(Number(a.inmueble_id))), 'Posición ocupada por otra zona.');
    }
    const sequence = before.inm_secuencias.find(row=>row.nombre==='inmueble');
    let order = Number(sequence?.valor);
    assert.ok(Number.isSafeInteger(order) && order>=Math.max(0,...before.inm_inmuebles.map(row=>Number(row.numero_orden)||0)));
    const paths = [...new Set(before.inm_archivos.filter(row=>deleted.has(Number(row.inmueble_id)) && row.almacenamiento==='hosting' && row.ruta_almacenamiento).map(row=>row.ruta_almacenamiento))]
      .filter(path=>!before.inm_archivos.some(row=>!deleted.has(Number(row.inmueble_id)) && row.ruta_almacenamiento===path));
    const summary = {zona:zone.nombre,eliminar:ids.length,registrar:records.length,ventas:10,alquileres:33,contactosFTO:25,archivosPrivados:paths.length,otrasZonas:outside.length};
    if (!apply) { await connection.rollback(); return {...summary,apply:false}; }

    for (const draft of before.inm_borradores || []) {
      let content;
      try { content=JSON.parse(draft.contenido); } catch { content=null; }
      if (previous.some(property=>propertyDraftMatches(draft.clave,content,Number(property.id),[property.codigo,...(before.inm_codigos_anteriores||[]).filter(c=>Number(c.inmueble_id)===Number(property.id)).map(c=>c.codigo)]))) {
        await connection.query('DELETE FROM inm_borradores WHERE usuario_id=? AND clave=?',[draft.usuario_id,draft.clave]);
      } else if (['visitas:actual','tasaciones:actual','textos:actual'].includes(draft.clave)) {
        assert.ok(content, 'Borrador dañado; revisar antes de eliminar.');
        const allowed=new Set(['fechas','observaciones','valores','precios','ventas','textos','textosListos'].flatMap(field=>Object.keys(content[field]||{})).map(Number).filter(id=>!deleted.has(id)));
        const next=JSON.stringify(pruneDraft(draft.clave,content,allowed));
        if(next!==JSON.stringify(content)) await connection.query('UPDATE inm_borradores SET contenido=?,actualizado=actualizado WHERE usuario_id=? AND clave=?',[next,draft.usuario_id,draft.clave]);
      }
    }
    const resources=[...ids.map(id=>`property:${id}`),...before.inm_archivos.filter(row=>deleted.has(Number(row.inmueble_id))).map(row=>`file:${row.id}`)];
    await connection.query('DELETE FROM inm_security_audit WHERE resource IN (?)',[resources]);
    for (const table of propertyTables.filter(name=>before[name])) await connection.query(`DELETE FROM \`${table}\` WHERE inmueble_id IN (?)`,[ids]);
    await connection.query("DELETE FROM inm_eliminaciones_pendientes WHERE inmueble_id IN (?) AND estado='confirmacion'",[ids]);
    await connection.query('DELETE FROM inm_inmuebles WHERE id IN (?)',[ids]);
    const ownerIds=[...new Set(previous.map(row=>row.propietario_id).filter(Boolean))];
    for(const id of ownerIds) await connection.query('DELETE FROM inm_propietarios WHERE id=? AND NOT EXISTS(SELECT 1 FROM inm_inmuebles WHERE propietario_id=?)',[id,id]);
    const created=[];
    for(const row of records) {
      const numeroOrden=++order, codigo=propertyCode(numeroOrden,row.tipo,row.referencia);
      const [insert]=await connection.query("INSERT INTO inm_inmuebles(codigo,numero_orden,zona_id,tipo,operacion,referencia,direccion,nombre_contacto,departamento,provincia,distrito,estado,etapa) VALUES(?,?,?,?,?,?,?,?,?,?,?,'activo','visita_pendiente')",[codigo,numeroOrden,zone.id,row.tipo,row.operacion,row.referencia,row.direccion,row.nombreContacto,zone.departamento,zone.provincia,zone.distrito]);
      const position=before.inm_posiciones_zona.find(p=>Number(p.zona_id)===Number(zone.id) && Number(p.numero)===row.posicion);
      await connection.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id,activa) VALUES(?,?,1)',[insert.insertId,position.id]);
      await connection.query("INSERT INTO inm_timeline(inmueble_id,evento,observacion,usuario_id) VALUES(?,'inmueble_registrado',?,?)",[insert.insertId,`Inmueble registrado en la posición ${String(row.posicion).padStart(2,'0')}.`,actor.id]);
      created.push({id:insert.insertId,posicion:row.posicion,codigo});
    }
    await connection.query("UPDATE inm_secuencias SET valor=? WHERE nombre='inmueble'",[order]);
    let cleanupId=null;
    if(paths.length) {
      cleanupId=randomUUID();
      await connection.query("INSERT INTO inm_eliminaciones_pendientes(id,inmueble_id,zona_id,usuario_id,estado,huella,rutas,expira) VALUES(?,?,?,?,'archivos','',?,NOW())",[cleanupId,ids[0],zone.id,actor.id,JSON.stringify(paths)]);
    }
    const after=await businessSnapshot(connection);
    assert.equal(snapshotHash({properties:after.inm_inmuebles.filter(row=>!created.some(c=>Number(c.id)===Number(row.id)))}), snapshotHash({properties:outside}), 'Cambió un inmueble de otra zona.');
    for(const table of propertyTables.filter(name=>before[name])) {
      const remaining=before[table].filter(row=>!deleted.has(Number(row.inmueble_id)));
      const actual=after[table].filter(row=>!created.some(c=>Number(c.id)===Number(row.inmueble_id)));
      assert.equal(snapshotHash({[table]:actual}),snapshotHash({[table]:remaining}), 'Cambió otra zona en '+table);
    }
    await connection.commit();
    return {...summary,apply:true,cleanupId,created};
  } catch(error) { await connection.rollback(); throw error; }
}
