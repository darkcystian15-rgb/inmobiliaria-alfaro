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
export const fiveZonePositions = {
  Tortugas: [1,2,3,4,5,6,7,9,10,11,12],
  Huarmey: [1], Casma: [3,4], Lima: [1], Trujillo: [1,2,3],
};
export function fiveZonesManifest(manifest) {
  assert.ok(Array.isArray(manifest.zonas), 'Falta el manifiesto de zonas.');
  assert.deepEqual(manifest.zonas.map(zone=>zone.zona).sort(), Object.keys(fiveZonePositions).sort(), 'Solo se admiten las cinco zonas acordadas, sin duplicados.');
  return Object.entries(fiveZonePositions).map(([zona,positions])=>{
    const plan=manifest.zonas.find(zone=>zone.zona===zona);
    assert.ok(Array.isArray(plan.inmuebles));
    const records=plan.inmuebles.map(row=>registrationInput(row)).sort((a,b)=>a.posicion-b.posicion);
    assert.deepEqual(records.map(row=>row.posicion), positions, 'Posiciones excluidas, faltantes o duplicadas en '+zona);
    for(const row of records) {
      assert.equal(row.operacion, 'alquiler');
      assert.ok(row.nombreContacto.endsWith('-FTO'), 'Falta FTO en '+zona);
      if(['Huarmey','Trujillo'].includes(zona) && row.posicion===1) assert.equal(row.nombreContacto, 'CONTACTO1-FTO');
    }
    return {zona,records};
  });
}
export async function replaceFiveZones(connection, manifest, backup, apply=false) {
  return replacePortfolioZones(connection, fiveZonesManifest(manifest), backup, apply);
}
export const nuevoCompletePositions=[2,4,8,12,15,20,30,31,39,46,56,62,67,73,76,79,81];
export const nuevoExcludedPositions=[3,10,11,13,16,19,23,28,37,38,49,53,54,57,58,59,65,77,82,86];
export function nuevoChimboteManifest(manifest) {
  assert.equal(manifest.zona,'Nuevo Chimbote');
  assert.ok(Array.isArray(manifest.inmuebles));
  const records=manifest.inmuebles.map(row=>registrationInput(row)).sort((a,b)=>a.posicion-b.posicion);
  const expected=Array.from({length:88},(_,i)=>i+1).filter(n=>!nuevoExcludedPositions.includes(n));
  assert.deepEqual(records.map(row=>row.posicion),expected,'Se requieren las 68 posiciones aceptadas de Nuevo Chimbote, sin exclusiones ni duplicados.');
  for(const row of records) {
    const complete=nuevoCompletePositions.includes(row.posicion);
    assert.equal(row.operacion,[30,31,39].includes(row.posicion)?'venta':'alquiler');
    assert.equal(row.nombreContacto.endsWith('-FTO'),!complete,'La marca FTO debe corresponder a la operación faltante.');
    assert.ok(!/^CONTACTO\d+(?:-FTO)?$/i.test(row.nombreContacto),'Esta selección requiere el contacto de origen.');
  }
  return records;
}
export async function replaceNuevoChimbote(connection,manifest,backup,apply=false) {
  return replacePortfolioZones(connection,[{zona:'Nuevo Chimbote',records:nuevoChimboteManifest(manifest)}],backup,apply);
}
function zoneSnapshot(tables, names) {
  const zones=tables.inm_zonas.filter(zone=>names.includes(zone.nombre));
  const zoneIds=new Set(zones.map(zone=>Number(zone.id)));
  const properties=tables.inm_inmuebles.filter(row=>zoneIds.has(Number(row.zona_id)));
  const propertyIds=new Set(properties.map(row=>Number(row.id)));
  const ownerIds=new Set(properties.map(row=>Number(row.propietario_id)).filter(Boolean));
  const snapshot={inm_zonas:zones,inm_inmuebles:properties,
    inm_posiciones_zona:tables.inm_posiciones_zona.filter(row=>zoneIds.has(Number(row.zona_id))),
    inm_propietarios:tables.inm_propietarios.filter(row=>ownerIds.has(Number(row.id))),
    inm_borradores:tables.inm_borradores,
    inm_eliminaciones_pendientes:tables.inm_eliminaciones_pendientes.filter(row=>zoneIds.has(Number(row.zona_id)))};
  for(const table of propertyTables.filter(name=>tables[name])) snapshot[table]=tables[table].filter(row=>propertyIds.has(Number(row.inmueble_id)));
  return snapshot;
}
function otherZoneSnapshot(tables, ids) {
  const snapshot={inm_inmuebles:tables.inm_inmuebles.filter(row=>ids.has(Number(row.id)))};
  for(const table of propertyTables.filter(name=>tables[name])) snapshot[table]=tables[table].filter(row=>ids.has(Number(row.inmueble_id)));
  return snapshot;
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
  return replacePortfolioZones(connection, [{zona:'Chimbote',records:replacementManifest(manifest)}], backup, apply);
}
async function replacePortfolioZones(connection, plans, backup, apply) {
  const records=plans.flatMap(plan=>plan.records.map(row=>({...row,zona:plan.zona})));
  await connection.beginTransaction();
  try {
    const before = await businessSnapshot(connection, true);
    // Unrelated zones may be edited while preparing this delivery. Compare the
    // target zones to backup, then prove untouched zones retain their live state.
    const scope=tables=>plans.length===1&&plans[0].zona==='Chimbote'?tables:zoneSnapshot(tables,plans.map(plan=>plan.zona));
    assert.equal(snapshotHash(scope(before)), snapshotHash(scope(backup.tables)), 'La base cambió desde el respaldo; crear otro antes de aplicar.');
    const zones=plans.map(plan=>{
      const zone=before.inm_zonas.find(row=>row.nombre===plan.zona && Number(row.activo));
      assert.ok(zone && Number(zone.capacidad)>=Math.max(...plan.records.map(row=>row.posicion)), 'Zona o capacidad incorrecta: '+plan.zona);
      return zone;
    });
    const zoneIds=new Set(zones.map(zone=>Number(zone.id)));
    const previous=before.inm_inmuebles.filter(row=>zoneIds.has(Number(row.zona_id)));
    for(const zone of zones) assert.ok(previous.some(row=>Number(row.zona_id)===Number(zone.id)), 'La zona ya está vacía: '+zone.nombre);
    const ids = previous.map(row=>Number(row.id)), deleted = new Set(ids);
    assert.ok(ids.length, 'La zona ya está vacía; no repetir el reemplazo.');
    const outside = before.inm_inmuebles.filter(row=>!deleted.has(Number(row.id)));
    const outsideIds=new Set(outside.map(row=>Number(row.id)));
    const preservedHash=snapshotHash(otherZoneSnapshot(before,outsideIds));
    assert.ok(!outside.some(row=>deleted.has(Number(row.inmueble_origen_id))), 'Otra zona referencia un inmueble a eliminar.');
    const [[actor]] = await connection.query("SELECT id FROM inm_usuarios WHERE activo=1 AND rol='administrador' ORDER BY id LIMIT 1");
    assert.ok(actor, 'Falta administrador para el historial normal de registro.');
    for (const row of records) {
      const zone=zones.find(zone=>zone.nombre===row.zona);
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
    const summary = {zona:zones.length===1?zones[0].nombre:undefined,zonas:zones.map(zone=>({nombre:zone.nombre,eliminar:previous.filter(row=>Number(row.zona_id)===Number(zone.id)).length,registrar:records.filter(row=>row.zona===zone.nombre).length})),eliminar:ids.length,registrar:records.length,ventas:records.filter(row=>row.operacion==='venta').length,alquileres:records.filter(row=>row.operacion==='alquiler').length,contactosFTO:records.filter(row=>row.nombreContacto.endsWith('-FTO')).length,archivosPrivados:paths.length,otrasZonas:outside.length};
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
      const zone=zones.find(zone=>zone.nombre===row.zona);
      const numeroOrden=++order, codigo=propertyCode(numeroOrden,row.tipo,row.referencia);
      const [insert]=await connection.query("INSERT INTO inm_inmuebles(codigo,numero_orden,zona_id,tipo,operacion,referencia,direccion,nombre_contacto,departamento,provincia,distrito,estado,etapa) VALUES(?,?,?,?,?,?,?,?,?,?,?,'activo','visita_pendiente')",[codigo,numeroOrden,zone.id,row.tipo,row.operacion,row.referencia,row.direccion,row.nombreContacto,zone.departamento,zone.provincia,zone.distrito]);
      const position=before.inm_posiciones_zona.find(p=>Number(p.zona_id)===Number(zone.id) && Number(p.numero)===row.posicion);
      await connection.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id,activa) VALUES(?,?,1)',[insert.insertId,position.id]);
      await connection.query("INSERT INTO inm_timeline(inmueble_id,evento,observacion,usuario_id) VALUES(?,'inmueble_registrado',?,?)",[insert.insertId,`Inmueble registrado en la posición ${String(row.posicion).padStart(2,'0')}.`,actor.id]);
      created.push({id:insert.insertId,zona:zone.nombre,posicion:row.posicion,codigo});
    }
    await connection.query("UPDATE inm_secuencias SET valor=? WHERE nombre='inmueble'",[order]);
    const cleanupJobs=[];
    for(const zone of zones) {
      const ownedPaths=paths.filter(path=>{
        const file=before.inm_archivos.find(file=>deleted.has(Number(file.inmueble_id)) && file.ruta_almacenamiento===path);
        return Number(previous.find(property=>Number(property.id)===Number(file.inmueble_id)).zona_id)===Number(zone.id);
      });
      if(!ownedPaths.length) continue;
      const id=randomUUID(), property=previous.find(row=>Number(row.zona_id)===Number(zone.id));
      await connection.query("INSERT INTO inm_eliminaciones_pendientes(id,inmueble_id,zona_id,usuario_id,estado,huella,rutas,expira) VALUES(?,?,?,?,'archivos','',?,NOW())",[id,property.id,zone.id,actor.id,JSON.stringify(ownedPaths)]);
      cleanupJobs.push({id,zona:zone.nombre,archivos:ownedPaths.length});
    }
    const after=await businessSnapshot(connection);
    assert.equal(snapshotHash(otherZoneSnapshot(after,outsideIds)),preservedHash,'Cambió una zona fuera del reemplazo.');
    assert.equal(snapshotHash({properties:after.inm_inmuebles.filter(row=>!created.some(c=>Number(c.id)===Number(row.id)))}), snapshotHash({properties:outside}), 'Cambió un inmueble de otra zona.');
    for(const table of propertyTables.filter(name=>before[name])) {
      const remaining=before[table].filter(row=>!deleted.has(Number(row.inmueble_id)));
      const actual=after[table].filter(row=>!created.some(c=>Number(c.id)===Number(row.inmueble_id)));
      assert.equal(snapshotHash({[table]:actual}),snapshotHash({[table]:remaining}), 'Cambió otra zona en '+table);
    }
    await connection.commit();
    return {...summary,apply:true,preservedHash,preservedPropertyIds:[...outsideIds],cleanupId:zones.length===1?cleanupJobs[0]?.id||null:undefined,cleanupJobs,created};
  } catch(error) { await connection.rollback(); throw error; }
}
