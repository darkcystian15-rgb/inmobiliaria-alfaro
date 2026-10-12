import assert from 'node:assert/strict';
import { loadEnvFile } from 'node:process';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import mysql from 'mysql2/promise';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
import { propertyCode } from '../lib/property-code.mjs';

loadEnvFile('.env.local');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3144';
const db = await mysql.createConnection(process.env.DATABASE_URL);
const suffix = randomBytes(6).toString('hex'), token = randomBytes(32).toString('hex');
const properties = [];
let userId, server, initialOrder, lastTestOrder;
async function request(path, method = 'GET', body) {
  const response = await fetch(origin + path, {method, headers: {Cookie: `aa_session=${token}`, Origin: origin,
    ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000)});
  return {status: response.status, data: await response.json()};
}
try {
  const [[sequence]] = await db.query("SELECT valor FROM inm_secuencias WHERE nombre='inmueble'");
  initialOrder = Number(sequence.valor);
  const [user] = await db.execute('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo) VALUES(?,?,?,?,?,1)',
    ['Verificación identidad', `${suffix}@example.invalid`, `identity_${suffix}`, await hashPassword(randomBytes(24).toString('hex')), 'administrador']);
  userId = user.insertId;
  await db.execute('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)',
    [hashSessionToken(token), userId, new Date(Date.now()+3600000), new Date(), new Date()]);
  if (!process.env.TEST_ORIGIN) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', '3144', '-H', '127.0.0.1'], {stdio: ['ignore', 'ignore', 'ignore']});
    let ready = false;
    for (let i=0; i<60; i++) {
      try { if ((await fetch(origin+'/login', {signal: AbortSignal.timeout(10000)})).status === 200) {ready=true; break;} } catch {}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    assert.ok(ready, 'Servidor disponible');
  }
  const [positions] = await db.query('SELECT numero FROM inm_posiciones p WHERE activo=1 AND NOT EXISTS(SELECT 1 FROM inm_asignaciones_posicion a WHERE a.posicion_id=p.id AND a.activa=1) ORDER BY numero LIMIT 2');
  assert.equal(positions.length, 2);
  const name = `Residencial verificación ${suffix}`;
  const attempts = await Promise.allSettled(positions.map(async position => {
    const result = await request('/api/inmuebles', 'POST', {posicion: position.numero, tipo: 'Casa', referencia: name, ubicacion: 'Calle Verificación 1', operacion: 'alquiler'});
    if (result.data.inmuebleId) properties.push(result.data.inmuebleId);
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return result.data;
  }));
  for (const attempt of attempts) if (attempt.status === "rejected") throw attempt.reason;
  const created = attempts.map(attempt => attempt.value);
  const [rows] = await db.query('SELECT id,codigo,numero_orden FROM inm_inmuebles WHERE id IN (?)', [properties]);
  assert.equal(new Set(rows.map(row=>row.numero_orden)).size, 2);
  assert.equal(new Set(rows.map(row=>row.codigo)).size, 2);
  for (const row of rows) assert.equal(row.codigo, propertyCode(Number(row.numero_orden), 'Casa', name));
  lastTestOrder = Math.max(...rows.map(row=>Number(row.numero_orden)));
  console.log('PASS altas simultáneas: números y códigos únicos con nombres iguales');

  const first = created[0], row = rows.find(item=>item.id===first.inmuebleId);
  const old = encodeURIComponent(first.codigo), draftKey = `ficha:${first.inmuebleId}`;
  assert.equal((await request('/api/borradores?clave='+draftKey, 'PUT', {contenido:{referencia:'Borrador conservado'}})).status, 200);
  const renamed = `Residencial San José junto al parque principal ${suffix}`;
  assert.equal((await request('/api/inmuebles/'+old, 'PUT', {referencia: renamed})).status, 200);
  const detail = await request('/api/inmuebles/'+old);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.inmueble.numeroOrden, Number(row.numero_orden));
  assert.equal(detail.data.inmueble.codigo, propertyCode(Number(row.numero_orden), 'Casa', renamed));
  assert.ok(detail.data.inmueble.codigo.length > 30);
  assert.ok(!('datosPrueba' in detail.data.inmueble));
  assert.equal((await request('/api/borradores?clave='+draftKey)).data.borrador.contenido.referencia, 'Borrador conservado');
  for (const path of ['/archivos', '/visitas', '/anuncios', '/seguimiento']) assert.equal((await request('/api/inmuebles/'+old+path)).status, 200, path);
  const newPath = '/api/inmuebles/'+encodeURIComponent(detail.data.inmueble.codigo);
  assert.equal((await request(newPath, 'PUT', {tipo: 'Terreno'})).status, 200);
  assert.equal((await request('/api/inmuebles/'+old)).data.inmueble.codigo, propertyCode(Number(row.numero_orden), 'Terreno', renamed));
  console.log('PASS cambio de nombre y tipo: orden estable, enlaces anteriores y borradores conservados');

  await db.execute("UPDATE inm_inmuebles SET estado='inactivo' WHERE id=?", [first.inmuebleId]);
  await db.execute('UPDATE inm_asignaciones_posicion SET activa=0,fecha_fin=NOW() WHERE inmueble_id=?', [first.inmuebleId]);
  const [closure] = await db.execute("INSERT INTO inm_liberaciones(inmueble_id,motivo,confirmado,anulada,fecha_alquiler,fecha_inicio_alquiler,fecha_fin_alquiler,renta_mensual,usuario_registro_id,usuario_confirmacion_id,fecha_confirmacion) VALUES(?,'alquilado',1,0,'2000-01-01','2000-01-01','2000-02-01',1000,?,?,NOW())", [first.inmuebleId,userId,userId]);
  const reentry = await request('/api/alquileres', 'POST', {id: closure.insertId, posicion: first.posicion});
  if (reentry.data.id) properties.push(reentry.data.id);
  assert.equal(reentry.status, 201, JSON.stringify(reentry.data));
  const latest = await request('/api/inmuebles/'+reentry.data.id);
  assert.equal(latest.data.inmueble.inmuebleOrigenId, first.inmuebleId);
  assert.equal(latest.data.inmueble.codigo, propertyCode(latest.data.inmueble.numeroOrden, 'Terreno', renamed));
  lastTestOrder = Math.max(lastTestOrder, latest.data.inmueble.numeroOrden);
  console.log('PASS reingreso de alquiler: nuevo número y código uniforme');
} finally {
  if (server) {server.kill('SIGTERM'); await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));}
  if (properties.length) {
    for (const table of ['inm_codigos_anteriores','inm_anuncios','inm_seguimiento','inm_archivos','inm_liberaciones','inm_negociaciones','inm_publicaciones','inm_tasaciones','inm_visitas','inm_timeline','inm_asignaciones_posicion']) await db.query('DELETE FROM ?? WHERE inmueble_id IN (?)', [table,properties]);
    await db.query('UPDATE inm_inmuebles SET inmueble_origen_id=NULL WHERE id IN (?)', [properties]);
    await db.query('DELETE FROM inm_inmuebles WHERE id IN (?)', [properties]);
    // Restore only this test's sequence reservations, and only if no other registration used them.
    if (lastTestOrder !== undefined) await db.execute("UPDATE inm_secuencias SET valor=? WHERE nombre='inmueble' AND valor=? AND NOT EXISTS(SELECT 1 FROM inm_inmuebles WHERE numero_orden>?)", [initialOrder,lastTestOrder,initialOrder]);
  }
  if (userId) {
    for (const table of ['inm_borradores','inm_sesiones']) await db.query('DELETE FROM ?? WHERE usuario_id=?', [table,userId]);
    await db.execute('DELETE FROM inm_security_audit WHERE actor_id=?', [userId]);
    await db.execute('DELETE FROM inm_usuarios WHERE id=?', [userId]);
  }
  await db.end();
}
