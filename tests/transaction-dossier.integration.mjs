// Only an empty disposable local database; never reads production environment files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import https from 'node:https';
import mysql from 'mysql2/promise';
import sharp from 'sharp';
import { hashSessionToken } from '../lib/password.mjs';
import { dossierDefaults } from '../lib/transaction-dossier.mjs';

const databaseUrl = process.env.TEST_DATABASE_URL;
const database = new URL(databaseUrl || 'http://invalid');
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname) && /^\/alfaro_dossier_test(?:_[a-z0-9]+)?$/.test(database.pathname), 'Requires disposable local alfaro_dossier_test');
const db = await mysql.createConnection(databaseUrl);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'alfaro-dossier-'));
const checkpoint = `restore-points/dossier-local-${randomBytes(5).toString('hex')}`;
const envFile = path.join(work, '.env.test');
fs.writeFileSync(envFile, `DATABASE_URL=${databaseUrl}\n`, { mode: 0o600 });
const origin = 'http://127.0.0.1:3158';
const stored = new Map();
let app, storage, browser, page;
let logs = '';
function installer(extra = []) {
  return JSON.parse(execFileSync(process.execPath, ['scripts/install-transaction-dossier.mjs', '--env', envFile, ...extra], { env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8' }));
}
async function request(resource, token, method = 'GET', body) {
  const response = await fetch(origin + resource, { method, headers: { Origin: origin, ...(token ? { Cookie: `aa_session=${token}` } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(30000), redirect: 'manual' });
  return { response, data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.arrayBuffer() };
}
async function upload(type, name, bytes, token, extension = 'pdf', propertyId = 1) {
  const body = new FormData(); body.set('tipoDocumento', type); body.set('nombre', name); body.set('archivo', new File([bytes], `${name}.${extension}`));
  return request(`/api/inmuebles/${propertyId}/archivos`, token, 'POST', body);
}
try {
  assert.equal((await db.query('SHOW TABLES'))[0].length, 0, 'Existing databases are never cleared');
  const exported = execFileSync(process.execPath, ['node_modules/drizzle-kit/bin.cjs', 'export', '--dialect=mysql', '--schema=./db/schema.ts'], { encoding: 'utf8' });
  for (const statement of exported.slice(exported.indexOf('CREATE TABLE')).split(';').map(item => item.trim()).filter(Boolean)) {
    if (statement.includes('`inm_expedientes`')) continue;
    await db.query(statement);
  }
  const tokens = [];
  for (const role of ['administrador', 'usuario']) {
    const [user] = await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,rol) VALUES(?,?,?,?)', [role, `${role}@example.invalid`, role, role]);
    const token = randomBytes(32).toString('hex'); tokens.push(token);
    await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,NOW(),NOW())', [hashSessionToken(token), user.insertId, new Date(Date.now() + 3600000)]);
  }
  const [admin, operator] = tokens;
  await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'chimbote','Chimbote',10),(2,'lima','Lima',10),(3,'casma','Casma',10)");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,referencia,direccion,nombre_contacto,zona_id) VALUES(1,'001-CASA-ENSAYO',1,'Casa','Ensayo','Dirección de ensayo','Contacto',1),(2,'002-CASA-LIMA',2,'Casa','Otra zona','Dirección Lima','Contacto Lima',2)");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,direccion,nombre_contacto,zona_id) VALUES(3,'003-CASA-ALQUILER',3,'Casa','alquiler','Alquiler de ensayo','Dirección alquiler','Contacto alquiler',1)");
  await db.query("INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(1,1,1),(2,2,1),(3,1,2)");
  await db.query("INSERT INTO inm_asignaciones_zona(posicion_id,inmueble_id,activa) VALUES(1,1,1),(2,2,1),(3,3,1)");
  await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,usuario_id) VALUES(1,'DNI_PROPIETARIO','DNI anterior','https://example.invalid/dni',1),(1,'CONTRATO','Contrato ambiguo','https://example.invalid/contrato',1)");
  assert.equal(installer().createTable, true);
  assert.equal((await db.query("SHOW TABLES LIKE 'inm_expedientes'"))[0].length, 0);
  assert.equal(installer(['--apply', '--checkpoint', checkpoint]).reclassify, 2);
  assert.deepEqual((await db.query('SELECT tipo_documento FROM inm_archivos ORDER BY id'))[0].map(row => row.tipo_documento), ['VENDEDOR_DNI', 'POR_CLASIFICAR']);
  assert.equal(installer().reclassify, 0);
  console.log('PASS: migración MySQL real, respaldo privado, categorías ambiguas conservadas e idempotencia.');

  const key = path.join(work, 'key.pem'), cert = path.join(work, 'cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' });
  storage = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, async (req, res) => {
    if (req.headers.authorization !== 'Bearer local-test') { res.writeHead(401).end(); return; }
    const pathname = new URL(req.url, 'https://localhost').searchParams.get('path');
    if (req.method === 'PUT') { const chunks = []; for await (const chunk of req) chunks.push(chunk); stored.set(pathname, Buffer.concat(chunks)); res.writeHead(201).end(); }
    else if (req.method === 'DELETE') { stored.delete(pathname); res.writeHead(200).end(); }
    else if (stored.has(pathname)) res.writeHead(200).end(stored.get(pathname));
    else res.writeHead(404).end();
  });
  await new Promise(resolve => storage.listen(3159, '127.0.0.1', resolve));
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3158', '-H', '127.0.0.1'], { env: { ...process.env, DATABASE_URL: databaseUrl, DATABASE_TLS_REQUIRED: '', DATABASE_SSL_CA: '', AUTH_LOGIN_MFA_REQUIRED: '0', DOCUMENT_HOSTING_URL: 'https://127.0.0.1:3159', DOCUMENT_HOSTING_TOKEN: 'local-test', NODE_EXTRA_CA_CERTS: cert }, stdio: ['ignore', 'pipe', 'pipe'] });
  app.stdout.on('data', bytes => { logs += bytes; }); app.stderr.on('data', bytes => { logs += bytes; });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(origin + '/login')).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
  const url = '/api/inmuebles/1/expediente';
  assert.equal((await request(url)).response.status, 401);
  let result = await request(url, operator); assert.equal(result.response.status, 200);
  let version = result.data.version;
  const config = { ...dossierDefaults(), vendedorTipo: 'natural', compradorAsignado: true, compradorTipo: 'juridica', vendedorBusquedaNota: 'No cuenta con búsqueda nacional', renta: 'exonerado' };
  result = await request(url, operator, 'PUT', { config, version }); assert.equal(result.response.status, 200, JSON.stringify(result.data)); version = result.data.version;
  assert.equal((await request(url, admin, 'PUT', { config, version: version - 1 })).response.status, 409);
  assert.equal((await request(url, admin, 'PUT', { config: { ...config, compradorTipo: '' }, version })).response.status, 400);
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  assert.equal((await upload('COMPRADOR_DNI', 'No corresponde', pdf, operator)).response.status, 409);
  assert.equal((await upload('VENDEDOR_VOUCHER_RENTA', 'Exonerado', pdf, operator)).response.status, 409);
  result = await upload('COPIA_LITERAL_CRI', 'Copia literal', pdf, operator); assert.equal(result.response.status, 201, JSON.stringify(result.data)); const pdfId = result.data.id;
  let events=(await db.query("SELECT evento,usuario_id,observacion FROM inm_timeline WHERE inmueble_id=1 AND evento='archivo_subido'"))[0];
  assert.equal(events.length,1);assert.equal(events[0].usuario_id,2);
  let metadata=JSON.parse(events[0].observacion).archivo;
  assert.equal(metadata.nombre,'Copia literal');assert.equal(metadata.nombreOriginal,'Copia literal.pdf');assert.equal(metadata.categoria,'Copia literal o CRI-PU');
  assert.ok(!events[0].observacion.includes('rutaAlmacenamiento'));
  const recent=(await request('/api/dashboard',admin)).data.recientes.find(item=>item.etapa==='Archivo subido');
  assert.ok(recent.detalle.includes('Copia literal.pdf'));assert.equal(recent.usuario,'usuario');

  const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#c80000' } }).png().toBuffer();
  assert.equal((await upload('VENDEDOR_DNI', 'DNI vendedor', image, operator, 'png')).response.status, 201);
  assert.equal((await upload('HR_VENTA', 'HR Word', Buffer.from('d0cf11e0a1b11ae100000000', 'hex'), operator, 'doc')).response.status, 201);
  assert.equal((await upload('COMPRADOR_LIQUIDACION', 'Liquidación Excel', Buffer.from('d0cf11e0a1b11ae100000000', 'hex'), operator, 'xls')).response.status, 201);
  assert.equal((await upload('TASACION_PROPIETARIO', 'Tasación uno', pdf, operator)).response.status, 201);
  assert.equal((await upload('TASACION_PROPIETARIO', 'Tasación dos', pdf, operator)).response.status, 201);
  result = await request(`/api/inmuebles/1/archivos/${pdfId}`, operator); assert.equal(result.response.status, 200); assert.equal(result.response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal((await request(`/api/inmuebles/2/archivos/${pdfId}`, operator)).response.status, 404);
  assert.equal((await request(`/api/inmuebles/1/archivos?archivoId=${pdfId}`, operator, 'DELETE')).response.status, 403);
  result = await request('/api/inmuebles/1/archivos', operator, 'PATCH', { archivoId: pdfId, nombre: 'CRI-PU revisado', tipoDocumento: 'COPIA_LITERAL_CRI', observacion: '' }); assert.equal(result.response.status, 200);
  const changes=(await db.query("SELECT observacion FROM inm_timeline WHERE inmueble_id=1 AND evento='archivo_actualizado'"))[0];
  assert.equal(changes.length,1);const change=JSON.parse(changes[0].observacion);
  assert.equal(change.anterior.nombre,'Copia literal');assert.equal(change.nuevo.nombre,'CRI-PU revisado');
  assert.equal((await request('/api/inmuebles/1/archivos',operator,'PATCH',{archivoId:pdfId,nombre:'CRI-PU revisado',tipoDocumento:'COPIA_LITERAL_CRI',observacion:''})).response.status,200);
  assert.equal((await db.query("SELECT COUNT(*) total FROM inm_timeline WHERE inmueble_id=1 AND evento='archivo_actualizado'"))[0][0].total,1,'Saving unchanged metadata does not duplicate activity');

  result = await request(url, operator); assert.equal(result.data.status.items.find(item => item.key === 'COPIA_LITERAL_CRI').state, 'completo');
  assert.equal(result.data.status.items.find(item => item.key === 'TASACION_PROPIETARIO').documents.length, 2);
  assert.equal(result.data.status.items.find(item => item.key === 'VENDEDOR_FORMULARIO_RENTA').state, 'no_aplica');
  // Rental files, independent requirements and contract names on disposable local fixtures.
  const rentalUrl = '/api/inmuebles/3/expediente';
  result = await request(rentalUrl, operator);
  assert.equal(result.data.status.sections.length, 5);
  assert.deepEqual(result.data.status.alerts, []);
  assert.equal((await upload('VENDEDOR_FORMULARIO_RENTA', 'No pertenece al alquiler', pdf, operator, 'pdf', 3)).response.status, 409);
  assert.equal((await upload('ARRENDADOR_DNI', 'No pertenece a venta', pdf, operator)).response.status, 409);
  for (const item of result.data.status.items.filter(item => item.required)) {
    const uploaded = await upload(item.key, `Alquiler ${item.label}`, pdf, operator, 'pdf', 3);
    assert.equal(uploaded.response.status, 201, JSON.stringify(uploaded.data));
  }
  result = await upload('CONTRATO_ALQUILER', 'Adenda de renovación', pdf, operator, 'pdf', 3);
  assert.equal(result.response.status, 201);
  assert.equal((await request('/api/inmuebles/3/archivos', operator, 'PATCH', {archivoId:result.data.id,nombre:'Adenda personalizada',tipoDocumento:'CONTRATO_ALQUILER'})).response.status, 200);
  result = await request(rentalUrl, operator);
  assert.equal(result.data.status.complete, true);
  assert.equal(result.data.status.items.find(item => item.key === 'CONTRATO_ALQUILER').documents.length, 2);
  assert.equal((await request('/api/inmuebles/3', operator)).data.documentacion.complete, true);
  assert.equal((await request('/api/inmuebles/3', operator)).data.expediente.items.find(item => item.key === 'documentoDni').complete, true);
  assert.equal((await request('/api/inmuebles/3/seguimiento', admin, 'PUT', {actividad:'documentacion',responsableId:1,fechaLimite:'2027-01-01',observacion:'Expediente de alquiler'})).response.status, 200);
  await db.query("INSERT INTO inm_visitas(id,inmueble_id,fecha_visita,completada,observaciones,usuario_id) VALUES(1,3,'2026-10-18',1,'Visita de ensayo',1)");
  const photoBody = new FormData();photoBody.set('tipoDocumento','FOTO_INMUEBLE');photoBody.set('nombre','Evidencia de visita');photoBody.set('visitaId','1');photoBody.set('archivo',new File([image],'visita.png'));
  const photoResult=await request('/api/inmuebles/3/archivos',operator,'POST',photoBody);assert.equal(photoResult.response.status,201);
  assert.equal((await request('/api/inmuebles/3/archivos',operator,'PATCH',{archivoId:photoResult.data.id,nombre:'Evidencia de visita',observacion:'',esPortada:true})).response.status,200);
  const photoChange=JSON.parse((await db.query("SELECT observacion FROM inm_timeline WHERE inmueble_id=3 AND evento='archivo_actualizado' ORDER BY id DESC LIMIT 1"))[0][0].observacion);
  assert.equal(photoChange.nuevo.portada,true);assert.equal(photoChange.nuevo.visitaId,1);assert.equal(photoChange.nuevo.seccion,'Visitas');
  assert.equal((await upload('FOTO_INMUEBLE','Foto antigua sin visita',image,operator,'png',3)).response.status,201);
  console.log('PASS: permisos, conflictos de edición, condiciones, carga PDF/imagen/Word/Excel, varios archivos, acceso privado y reclasificación.');

  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'aa_session', value: admin, url: origin }]);
  page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  async function dropFiles(zone, files) {
    const transfer = await page.evaluateHandle(entries => {
      const data = new DataTransfer();
      for (const entry of entries) data.items.add(new File([Uint8Array.from(atob(entry.bytes), character => character.charCodeAt(0))], entry.name, { type: entry.type }));
      return data;
    }, files.map(file => ({ ...file, bytes: file.bytes.toString('base64') })));
    try {
      await zone.dispatchEvent('dragenter', { dataTransfer: transfer });
      if (await zone.getAttribute('aria-disabled') !== 'true') assert.equal(await zone.getAttribute('data-dragging'), 'true');
      await zone.dispatchEvent('drop', { dataTransfer: transfer });
      assert.equal(await zone.getAttribute('data-dragging'), 'false');
    } finally { await transfer.dispose(); }
  }

  const folders = () => page.getByRole('region', { name: 'Carpetas del inmueble', exact: true });
  async function rootFolders() {
    const back = page.getByRole('button', { name: '← Carpetas del inmueble', exact: true });
    if (await back.isVisible()) await back.click();
    await folders().waitFor();
  }
  async function openFolder(name) {
    await rootFolders();
    await folders().getByRole('button', { name: new RegExp(name) }).click();
  }
  const currentRecords = async () => (await db.query('SELECT id,inmueble_id,tipo_documento,nombre,enlace,ruta_almacenamiento,visita_id FROM inm_archivos ORDER BY id'))[0];
  const beforeNavigation = await currentRecords();
  let businessWrites = 0;
  page.on('request', request => { if (request.url().includes('/api/inmuebles') && !['GET','HEAD'].includes(request.method())) businessWrites++; });
  await page.goto(`${origin}/datos-inmuebles`);
  await page.getByRole('region', { name: 'Carpetas de zonas', exact: true }).waitFor();
  await page.getByRole('button', { name: /^Casma/ }).waitFor();
  await page.getByRole('button', { name: /^Chimbote/ }).click();
  await page.getByRole('region', { name: 'Inmuebles de la zona', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Contacto Lima/ }).count(), 0);
  await page.getByRole('combobox', { name: /^Operación/ }).selectOption('alquiler');
  await page.getByRole('button', { name: /^Contacto Venta/ }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: /Contacto alquiler/ }).waitFor();
  await page.getByRole('combobox', { name: /^Operación/ }).selectOption('todos');
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar inmueble', exact: true }).fill('Dirección de ensayo');
  await page.getByRole('region', { name: 'Inmuebles de la zona', exact: true }).getByRole('button', { name: /^Contacto Venta/ }).click();
  await folders().waitFor();
  const overview = page.getByRole('region', { name: 'Resumen del inmueble', exact: true });
  await overview.waitFor();
  assert.equal(await overview.locator('a,button,input,select,textarea').count(), 0, 'Summary contains information only');
  assert.equal(await folders().getByRole('button', { name: /Resumen del inmueble/ }).count(), 0);
  assert.equal(await overview.evaluate(node => node.compareDocumentPosition(document.querySelector('[aria-label="Carpetas del inmueble"]')) & Node.DOCUMENT_POSITION_FOLLOWING), 4, 'Summary precedes folders');
  const saleFolderNames = ['1. DNI y poderes','2. Documentos del inmueble','3. Contratos','4. Impuestos y constancias','5. Recibos y pagos de servicios','6. Levantamiento de cargas','7. Tasaciones','Estado del expediente','Visitas y fotos','Valores de tasación','Publicación','Seguimiento e historial','Otros archivos conservados'];
  fs.mkdirSync('output/dossier-local', { recursive: true, mode: 0o700 });
  for (const width of [1440,375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of saleFolderNames) {
      await openFolder(name);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} overflow at ${width}`);
    }
    await rootFolders();
    await page.screenshot({ path: `output/dossier-local/sale-folders-${width}.png`, fullPage: true });
  }
  await openFolder('Otros archivos conservados');
  await page.getByText('Contrato ambiguo', { exact: true }).waitFor();
  await openFolder('1. DNI y poderes');
  await page.getByText('DNI vendedor', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ver archivo', exact: true }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Cerrar vista previa', exact: true }).click();
  await openFolder('2. Documentos del inmueble');
  await page.getByText('CRI-PU revisado', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ver archivo', exact: true }).first().click();
  await page.getByRole('dialog').locator('iframe').waitFor();
  await page.getByRole('button', { name: 'Cerrar vista previa', exact: true }).click();
  assert.equal(businessWrites, 0, 'Folder traversal never writes or moves business records');
  assert.deepEqual(await currentRecords(), beforeNavigation, 'All existing file metadata and storage paths are preserved');
  const literalItem = page.locator('[data-document-type=COPIA_LITERAL_CRI]');
  await literalItem.getByLabel('Archivos: Copia literal o CRI-PU', { exact: true }).setInputFiles({ name: 'literal-inline.pdf', mimeType: 'application/pdf', buffer: pdf });
  const literalForm = literalItem.getByRole('form', { name: 'Subir archivos: Copia literal o CRI-PU', exact: true });
  await literalForm.getByRole('textbox', { name: /^Nombre del archivo 1/ }).fill('Copia literal dentro del ítem');
  await literalForm.getByRole('textbox', { name: 'Observación opcional', exact: true }).fill('Observación del ítem');
  await literalForm.getByRole('button', { name: 'Subir archivos', exact: true }).click();
  await page.getByText('1 archivo guardado.', { exact: true }).waitFor();
  assert.equal((await db.query("SELECT COUNT(*) n FROM inm_archivos WHERE tipo_documento='COPIA_LITERAL_CRI' AND nombre='Copia literal dentro del ítem' AND observacion='Observación del ítem'"))[0][0].n, 1);
  // DNI folder keeps seller and buyer conditions and text alternative.
  await openFolder('1. DNI y poderes');
  const buyerConditions = page.getByRole('group', { name: 'Condiciones del comprador', exact: true });
  await buyerConditions.getByRole('combobox', { name: /^Tipo de persona/ }).selectOption('natural');
  await buyerConditions.getByLabel('Nota si no adjuntas la búsqueda nacional').fill('Nota de búsqueda registrada desde la carpeta');
  assert.equal(await page.getByRole('button', { name: '← Carpetas del inmueble', exact: true }).isDisabled(), true);
  await buyerConditions.getByRole('button', { name: 'Guardar condiciones', exact: true }).click();
  await page.getByText('Condiciones del expediente guardadas.', { exact: true }).waitFor();
  const directBuyerDrop = page.getByRole('group', { name: 'Carga: Archivos: comprador · DNI', exact: true });
  await dropFiles(directBuyerDrop, [{ name: 'dni-arrastrado.pdf', type: 'application/pdf', bytes: pdf }, { name: 'imagen-arrastrada.png', type: 'image/png', bytes: image }]);
  await page.locator('[data-document-type=COMPRADOR_DNI]').getByRole('form', { name: 'Subir archivos: comprador · DNI', exact: true }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: /^Categoría del archivo/ }).count(), 0, 'No common category selector at the bottom');
  assert.equal(await page.getByRole('textbox', { name: /^Nombre del archivo/ }).count(), 2);
  await page.getByRole('textbox', { name: /^Nombre del archivo 1/ }).fill('DNI comprador desde carpeta');
  const sharedDrop = directBuyerDrop;
  await dropFiles(sharedDrop, [{ name: 'no-permitido.exe', type: 'application/octet-stream', bytes: pdf }]);
  await page.getByRole('alert').filter({ hasText: 'formato no permitido' }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: /^Nombre del archivo 1/ }).inputValue(), 'DNI comprador desde carpeta');
  await page.getByRole('button', { name: 'Subir archivos', exact: true }).click();
  await page.getByText('2 archivos guardados.', { exact: true }).waitFor();
  assert.equal((await db.query("SELECT COUNT(*) n FROM inm_archivos WHERE tipo_documento='COMPRADOR_DNI' AND nombre IN ('DNI comprador desde carpeta','imagen-arrastrada')"))[0][0].n, 2);
  assert.equal((await request(url, admin)).data.config.compradorBusquedaNota, 'Nota de búsqueda registrada desde la carpeta');
  await dropFiles(directBuyerDrop, [{ name: 'grande.pdf', type: 'application/pdf', bytes: Buffer.alloc(4 * 1024 * 1024 + 1) }]);
  await page.getByRole('button', { name: 'Subir archivos', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'supera 4 MB' }).waitFor();
  await page.getByRole('button', { name: 'Quitar selección', exact: true }).click();
  // A condition can deactivate a previous document without hiding or deleting it.
  await buyerConditions.getByRole('combobox', { name: /^Tipo de persona/ }).selectOption('juridica');
  await dropFiles(page.getByRole('group', { name: 'Carga: Archivos: comprador · Ficha RUC', exact: true }), [{ name: 'bloqueado.pdf', type: 'application/pdf', bytes: pdf }]);
  assert.equal(await page.getByRole('textbox', { name: /^Nombre del archivo/ }).count(), 0);
  await buyerConditions.getByRole('button', { name: 'Guardar condiciones', exact: true }).click();
  await page.getByText('Condiciones del expediente guardadas.', { exact: true }).waitFor();
  await page.getByText('DNI comprador desde carpeta', { exact: true }).waitFor();
  await page.getByText('No aplica', { exact: true }).first().waitFor();
  await rootFolders();
  await page.reload();
  await folders().waitFor();
  await openFolder('3. Contratos');
  await page.reload();
  await page.getByRole('heading', { name: '3. Contratos', exact: true }).first().waitFor();
  await page.getByRole('button', { name: '← Volver a los inmuebles de la zona', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar inmueble', exact: true }).fill('');
  await page.getByRole('button', { name: /Contacto alquiler/ }).click();
  await folders().waitFor();
  assert.equal(await folders().getByRole('button', { name: /Impuestos y constancias|Levantamiento de cargas|Otros archivos conservados|Resumen del inmueble/ }).count(), 0);
  await page.getByRole('region', { name: 'Resumen del inmueble', exact: true }).waitFor();
  const rentalFolders = ['1. DNI y poderes','2. Documentos del inmueble','3. Contratos','4. Recibos y pagos de servicios','5. Tasaciones','Estado del expediente','Visitas y fotos','Valores de tasación','Publicación','Seguimiento e historial'];
  for (const width of [1440,375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of rentalFolders) {
      await openFolder(name);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} rental overflow at ${width}`);
    }
    await rootFolders();
    await page.screenshot({ path: `output/dossier-local/rental-folders-${width}.png`, fullPage: true });
  }
  await openFolder('1. DNI y poderes');
  assert.equal(await page.getByRole('combobox', { name: /^Tipo de persona/ }).count(), 0);
  for (const [party, category] of [['arrendador','ARRENDADOR_DNI'], ['arrendatario','ARRENDATARIO_DNI']]) {
    const partyDrop = page.getByRole('group', { name: `Carga: Archivos: ${party} · DNI`, exact: true });
    await partyDrop.locator('input[type=file]:enabled').waitFor();
    await dropFiles(partyDrop, [{ name: `${party}-carpeta.pdf`, type: 'application/pdf', bytes: pdf }]);
    await page.locator(`[data-document-type=${category}]`).getByRole('form', { name: `Subir archivos: ${party} · DNI`, exact: true }).waitFor();
    assert.equal(await page.getByRole('combobox', { name: /^Categoría del archivo/ }).count(), 0);
    await page.getByRole('button', { name: 'Subir archivos', exact: true }).click();
    await page.getByText('1 archivo guardado.', { exact: true }).waitFor();
    assert.equal((await db.query('SELECT COUNT(*) n FROM inm_archivos WHERE inmueble_id=3 AND tipo_documento=? AND nombre=?', [category, `${party}-carpeta`]))[0][0].n, 1);
  }
  await openFolder('3. Contratos');
  await page.getByText('Adenda personalizada', { exact: true }).waitFor();
  await openFolder('Visitas y fotos');
  await page.getByRole('region', { name: 'Fotos de la visita', exact: true }).getByRole('button', { name: 'Ampliar Evidencia de visita', exact: true }).waitFor();
  await page.getByRole('region', { name: 'Fotos anteriores sin visita', exact: true }).getByRole('button', { name: 'Ampliar Foto antigua sin visita', exact: true }).waitFor();
  await dropFiles(page.getByRole('group', { name: 'Carga: Agregar fotografías', exact: true }).first(), [{ name: 'foto-carpeta.png', type: 'image/png', bytes: image }]);
  await page.getByText('Fotos guardadas correctamente.', { exact: true }).waitFor();
  assert.equal((await db.query("SELECT visita_id FROM inm_archivos WHERE nombre='foto-carpeta'"))[0][0].visita_id, 1);
  await page.goto(`${origin}/datos-inmuebles?codigo=3&carpeta=resumen`);
  await page.getByRole('region', { name: 'Resumen del inmueble', exact: true }).waitFor();
  await folders().waitFor();
  // Old links continue opening their existing functions.
  for (const [legacy, heading] of [['vendedor','Documentación del arrendador'], ['comprador','Documentación del arrendatario'], ['estado','Estado del expediente']]) {
    await page.goto(`${origin}/datos-inmuebles?codigo=3&pestana=${legacy}`);
    await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
  }
  const operatorContext = await browser.newContext({ viewport: { width: 375, height: 850 } });
  await operatorContext.addCookies([{ name: 'aa_session', value: operator, url: origin }]);
  const operatorPage = await operatorContext.newPage();
  await operatorPage.goto(`${origin}/datos-inmuebles?codigo=1`);
  await operatorPage.getByRole('region', { name: 'Carpetas del inmueble', exact: true }).waitFor();
  assert.equal(await operatorPage.getByRole('button', { name: /Seguimiento e historial/ }).count(), 0);
  await operatorContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS: explorador zonas/inmuebles/carpetas, filtros, venta/alquiler, documentos conservados, arrastre con categoría directa, textos, límites, vistas previas, enlaces anteriores, permisos y escritorio/móvil.');
  assert.equal((await request(`/api/inmuebles/1/archivos?archivoId=${pdfId}`, admin, 'DELETE')).response.status, 200);
  assert.equal((await request(url, admin)).data.status.items.find(item => item.key === 'COPIA_LITERAL_CRI').state, 'completo');
  const deleted=(await db.query("SELECT observacion FROM inm_timeline WHERE inmueble_id=1 AND evento='archivo_eliminado'"))[0];
  assert.equal(deleted.length,1);assert.equal(JSON.parse(deleted[0].observacion).archivo.nombre,'CRI-PU revisado');
  assert.equal((await db.query("SELECT COUNT(*) total FROM inm_timeline WHERE evento='archivo_subido' AND JSON_UNQUOTE(JSON_EXTRACT(observacion,'$.archivo.nombre'))='No corresponde'"))[0][0].total,0);
  const linked=await request('/api/inmuebles/1/archivos',operator,'POST',{tipoDocumento:'OTRO',nombre:'Referencia externa',enlace:'https://example.invalid/document'});assert.equal(linked.response.status,201);
  const linkEvent=JSON.parse((await db.query("SELECT observacion FROM inm_timeline WHERE inmueble_id=1 AND evento='archivo_enlazado'"))[0][0].observacion);
  assert.equal(linkEvent.archivo.nombre,'Referencia externa');assert.equal(linkEvent.archivo.nombreOriginal,null);assert.equal(linkEvent.archivo.tamano,null);
  console.log('PASS: historial transaccional de subida/cambio/eliminación con nombre original, categoría, usuario y detalle en panel; cargas rechazadas sin movimientos ficticios.');

} catch (error) { if(page) { fs.mkdirSync('output/dossier-local',{recursive:true}); await page.screenshot({path:'output/dossier-local/failure.png',fullPage:true}).catch(()=>{}); } console.error(logs.slice(-3000)); throw error; }
finally { if (browser) await browser.close(); if (app) app.kill('SIGTERM'); if (storage) await new Promise(resolve => storage.close(resolve)); await db.end(); }
