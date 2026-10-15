// Destructive setup is restricted to an explicitly named, local disposable database.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { readFile, writeFile, mkdtemp, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import https from 'node:https';
import sharp from 'sharp';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';

const url = new URL(process.env.TEST_DATABASE_URL || 'http://invalid');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/alfaro_registration_test', 'Requires TEST_DATABASE_URL for the isolated local test database');
assert.ok(process.env.TEST_SOURCE_CHECKPOINT, 'Requires TEST_SOURCE_CHECKPOINT containing the original source and manifest');
const db = await mysql.createConnection(process.env.TEST_DATABASE_URL);
const work = await mkdtemp(join(tmpdir(), 'alfaro-registration-'));
const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, AUTH_LOGIN_MFA_REQUIRED: '0' };
const origin = 'http://127.0.0.1:3151';
let app, storage;
const stored = new Map();
function command(file, args = []) {
  try { return execFileSync(process.execPath, [file, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { throw new Error(`${file} failed: ${error.stderr?.toString() || error.stdout?.toString() || error.message}`); }
}
async function checkpoint(name) {
  const target = join(work, name);
  await cp(process.env.TEST_SOURCE_CHECKPOINT, target, { recursive: true });
  return target;
}
async function request(path, cookie, method = 'GET', body) {
  const response = await fetch(origin + path, { method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, data };
}
try {
  const [existing] = await db.query('SHOW TABLES');
  assert.equal(existing.length, 0, 'Test database must be empty; existing tables are never dropped');
  const journal = JSON.parse(await readFile('db/migrations/meta/_journal.json', 'utf8'));
  for (const entry of journal.entries.filter(entry => entry.idx < 15)) {
    const sql = await readFile(`db/migrations/${entry.tag}.sql`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint').filter(value => value.trim())) await db.query(statement);
  }
  await db.query("INSERT INTO inm_posiciones(id,numero,activo) VALUES(1,1,1),(2,2,1),(3,3,1),(4,4,1)");
  await db.query("INSERT INTO inm_ubicaciones(id,nivel,nombre,padre_id,activo) VALUES(1,'departamento','Áncash',NULL,1),(2,'provincia','Santa',1,1),(3,'distrito','Chimbote',2,1)");
  await db.query("INSERT INTO inm_propietarios(id,dni,nombres,apellidos,telefono) VALUES(1,'12345678','Ana','Pérez','999999999')");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,referencia,direccion,numero_direccion,propietario_id) VALUES(1,'001-CASA-ANTERIOR',1,'Casa','Nombre anterior','Av. Perú','325',1),(2,'002-CASA-OTRO',2,'Casa','Otro nombre','Frente al mercado',NULL,1)");
  await db.query("INSERT INTO inm_asignaciones_posicion(inmueble_id,posicion_id,activa) VALUES(1,1,1),(2,2,1)");
  await db.query("UPDATE inm_secuencias SET valor=2 WHERE nombre='inmueble'");
  const before = await checkpoint('before');
  command('scripts/simplify-registration.mjs');
  const [columnsBefore] = await db.query('SHOW COLUMNS FROM inm_inmuebles');
  assert.equal(columnsBefore.some(column => column.Field === 'nombre_contacto'), false, 'Preview cannot change schema');
  command('scripts/simplify-registration.mjs', ['--backup', '--checkpoint', before]);
  command('scripts/simplify-registration.mjs', ['--apply', '--checkpoint', before]);
  let [[first]] = await db.query('SELECT * FROM inm_inmuebles WHERE id=1');
  assert.equal(first.nombre_contacto, 'Ana Pérez'); assert.equal(first.direccion, 'Av. Perú 325');
  assert.equal(first.numero_direccion, null); assert.equal(first.propietario_id, null); assert.equal(first.codigo, '001-CASA-ANTERIOR');
  const snapshot = JSON.parse(await readFile(join(before, 'database.json'), 'utf8'));
  assert.equal(snapshot.tables.inm_propietarios.rows[0].dni, '12345678');
  command('scripts/restore-simplified-registration.mjs', ['--checkpoint', before]);
  command('scripts/restore-simplified-registration.mjs', ['--checkpoint', before, '--apply']);
  [[first]] = await db.query('SELECT * FROM inm_inmuebles WHERE id=1');
  assert.equal(first.propietario_id, 1); assert.equal(first.direccion, 'Av. Perú'); assert.equal(first.numero_direccion, '325');
  const second = await checkpoint('second');
  command('scripts/simplify-registration.mjs', ['--backup', '--checkpoint', second]);
  command('scripts/simplify-registration.mjs', ['--apply', '--checkpoint', second]);
  console.log('PASS real MySQL migration, backup hashes and selective restoration');

  const cookies = [];
  for (const role of ['administrador', 'operador']) {
    const [user] = await db.execute('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo) VALUES(?,?,?,?,?,1)', [role, `${role}@example.invalid`, role, await hashPassword('Clave temporal de integración'), role]);
    const token = randomBytes(32).toString('hex');
    await db.execute('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)', [hashSessionToken(token), user.insertId, new Date(Date.now()+3600000), new Date(), new Date()]);
    cookies.push(`aa_session=${token}`);
  }
  const [admin, operator] = cookies;
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(work, 'key.pem'), '-out', join(work, 'cert.pem'), '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
  const token = randomBytes(32).toString('hex');
  storage = https.createServer({ key: await readFile(join(work, 'key.pem')), cert: await readFile(join(work, 'cert.pem')) }, async (req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) return res.writeHead(401).end();
    const path = new URL(req.url, 'https://localhost').searchParams.get('path');
    if (req.method === 'PUT') { const chunks=[]; for await (const chunk of req) chunks.push(chunk); stored.set(path, Buffer.concat(chunks)); res.writeHead(201).end('{}'); }
    else if (req.method === 'DELETE') { stored.delete(path); res.writeHead(204).end(); }
    else if (stored.has(path)) res.writeHead(200).end(stored.get(path)); else res.writeHead(404).end();
  });
  await new Promise(resolve => storage.listen(0, '127.0.0.1', resolve));
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3151', '-H', '127.0.0.1'], { env: { ...env, DOCUMENT_HOSTING_URL: `https://127.0.0.1:${storage.address().port}/documentos.php`, DOCUMENT_HOSTING_TOKEN: token, NODE_EXTRA_CA_CERTS: join(work, 'cert.pem') }, stdio: ['ignore','pipe','pipe'] });
  app.stdout.resume(); app.stderr.resume();
  let ready = false;
  for (let i=0; i<60; i++) { try { if ((await fetch(origin+'/login')).status===200) { ready=true; break; } } catch {} await new Promise(resolve=>setTimeout(resolve,250)); }
  assert.ok(ready, 'Production test server ready');
  const capture = { posicion: 3, operacion: 'venta', tipo: 'Casa', direccion: 'Frente al colegio', nombreContacto: 'Luis Contacto', departamento: 'Áncash', provincia: 'Santa', distrito: 'Chimbote' };
  assert.equal((await request('/api/inmuebles', '', 'POST', capture)).status, 401);
  assert.equal((await request('/api/inmuebles', operator, 'POST', capture)).status, 403);
  for (const key of Object.keys(capture)) assert.equal((await request('/api/inmuebles', admin, 'POST', { ...capture, [key]: '' })).status, 400, key);
  assert.equal((await request('/api/inmuebles', admin, 'POST', { ...capture, provincia: 'No existe' })).status, 400);
  const races = await Promise.all([request('/api/inmuebles', admin, 'POST', capture), request('/api/inmuebles', admin, 'POST', capture)]);
  assert.deepEqual(races.map(result=>result.status).sort(), [201,409]);
  const created = races.find(result=>result.status===201).data;
  const id = created.inmuebleId, detailPath = `/api/inmuebles/${id}`;
  const detail = await request(detailPath, operator);
  assert.equal(detail.data.inmueble.nombreContacto, capture.nombreContacto);
  assert.equal(detail.data.inmueble.referencia, capture.direccion);
  for (const key of ['propietarioDni','propietarioTelefono','propietarioEmail','numeroDireccion','propietarioNombres']) assert.equal(key in detail.data.inmueble, false);
  assert.equal((await request('/api/propietarios?dni=12345678', admin)).status, 410);
  assert.equal((await request('/api/inmuebles/1', operator, 'PUT', { nombreContacto: 'Contacto independiente' })).status, 200);
  assert.equal((await request('/api/inmuebles/2', operator)).data.inmueble.nombreContacto, 'Ana Pérez');
  const migrated = (await request('/api/inmuebles/1', operator)).data.inmueble;
  assert.equal((await request('/api/inmuebles/1', operator, 'PUT', { ...migrated, nombreContacto: 'Contacto final' })).status, 200);
  assert.equal((await request('/api/inmuebles/1', operator)).data.inmueble.codigo, '001-CASA-ANTERIOR', 'Contact-only form save preserves the migrated code');
  const newLocation = 'Junto al parque central';
  assert.equal((await request(detailPath, operator, 'PUT', { direccion: newLocation })).status, 200);
  assert.equal((await request('/api/inmuebles/'+encodeURIComponent(created.codigo), operator)).data.inmueble.direccion, newLocation, 'Old code remains an alias');
  console.log('PASS required fields, geography, roles, concurrent capture, independent contacts and code aliases');

  assert.equal((await request('/api/visitas', admin, 'POST', { inmuebleId: id, fechaVisita: '2026-01-01', fotoIds: [], pendienteEvidencia: true })).status, 201);
  assert.equal((await request('/api/tasaciones', admin, 'POST', { inmuebleId: id, fechaTasacion: '2026-01-01', valorReferencia: '100', precioObjetivo: '120', precioVenta: '150' })).status, 201);
  const pdf = Buffer.from('%PDF-1.4\nDocumento de prueba\n%%EOF');
  async function upload(type, image = false, visitId) {
    const bytes = image ? await sharp({create:{width:16,height:16,channels:3,background:'#c80000'}}).png().toBuffer() : pdf;
    const form = new FormData(); form.set('tipoDocumento',type); form.set('nombre','Evidencia temporal'); form.set('archivo',new Blob([bytes], {type:image?'image/png':'application/pdf'}),image?'foto.png':'dni.pdf');
    if (visitId) form.set('visitaId',String(visitId));
    const result = await request(detailPath+'/archivos', operator, 'POST', form);
    assert.equal(result.status, 201, JSON.stringify(result.data)); return result.data.id;
  }
  const publication = { inmuebleId: id, texto: 'Texto de la captación simplificada' };
  assert.equal((await request('/api/publicaciones', admin, 'POST', publication)).status, 409);
  await upload('DNI_PROPIETARIO'); await upload('TASACION'); await upload('FOTO_INMUEBLE',true);
  assert.equal((await request('/api/publicaciones', admin, 'POST', publication)).status, 409, 'General gallery photos do not replace visit evidence');
  const visits = await request(detailPath+'/visitas', operator);
  const photo = await upload('FOTO_INMUEBLE',true,visits.data.visitas[0].id);
  assert.equal((await request('/api/publicaciones', admin, 'POST', publication)).status, 201, 'File-only DNI permits publication without owner or typed DNI');
  const readyReport = await request('/api/reportes?reporte=Listos%20para%20publicar',admin);
  assert.ok(readyReport.data.rows.some(row=>row.inmuebleId===id));
  assert.equal((await request('/api/publicaciones', admin, 'PUT', { inmuebleId: id })).status, 200);
  assert.equal((await request(detailPath+'/archivos?archivoId='+photo, operator, 'DELETE')).status, 403);
  assert.equal((await request(detailPath+'/archivos?archivoId='+photo, admin, 'DELETE')).status, 200);
  const incomplete = await request(detailPath,operator);
  assert.equal(incomplete.data.publicacion.publicado,true); assert.equal(incomplete.data.expediente.complete,false);
  for (const endpoint of ['/api/cartera','/api/dashboard','/api/seguimiento','/api/publicaciones','/api/reportes?reporte=Publicados','/api/posiciones']) {
    const result = await request(endpoint,admin); assert.equal(result.status,200,endpoint);
  }
  const markup = await request('/registrar-inmueble',admin);
  for (const text of ['Ubicación referencial','Nombre de contacto','Departamento','Provincia','Distrito']) assert.ok(markup.data.includes(text),text);
  for (const text of ['Número / lote','Nombre del inmueble','Teléfono / contacto','Nombres del propietario']) assert.equal(markup.data.includes(text),false,text);
  console.log('PASS file-only DNI, visit evidence, publication, reports, permissions and rendered registration');
  const rentalCapture = await request('/api/inmuebles', admin, 'POST', { ...capture, posicion: 4, operacion: 'alquiler', nombreContacto: 'Contacto de alquiler' });
  assert.equal(rentalCapture.status, 201);
  const rentalId = rentalCapture.data.inmuebleId;
  assert.equal((await request('/api/liberaciones', admin, 'POST', { inmuebleId: rentalId, motivo: 'alquilado', fechaAlquiler: '2026-01-01', rentaMensual: '1500', fechaFinAlquiler: '2026-02-01' })).status, 201);
  const contracts = await request('/api/alquileres', admin);
  const contract = contracts.data.items.find(item=>item.inmuebleId===rentalId);
  assert.ok(contract);
  const reentry = await request('/api/alquileres', admin, 'POST', { id: contract.id, posicion: 4 });
  assert.equal(reentry.status, 201, JSON.stringify(reentry.data));
  const newRental = await request('/api/inmuebles/'+reentry.data.id,operator);
  assert.equal(newRental.data.inmueble.nombreContacto,'Contacto de alquiler');
  assert.equal(newRental.data.inmueble.inmuebleOrigenId,rentalId);
  assert.equal(newRental.data.tasacion,null);
  assert.equal(newRental.data.publicacion,null);
  console.log('PASS rental closure and reentry retain the independent contact and restart the activities');
  // Restoration must refuse new captures or subsequent edits.
  assert.throws(()=>command('scripts/restore-simplified-registration.mjs',['--checkpoint',second,'--apply']));
  console.log('PASS restoration refuses later data instead of overwriting it');
  console.log('Integration complete using only the local disposable database and isolated HTTPS storage.');
} finally {
  app?.kill('SIGTERM');
  if (storage) await new Promise(resolve=>storage.close(resolve));
  await db.end();
  await writeFile(join(work,'result.txt'),'Test finished; contains temporary fixtures only.\n');
}
