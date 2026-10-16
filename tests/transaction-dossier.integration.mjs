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
async function upload(type, name, bytes, token, extension = 'pdf') {
  const body = new FormData(); body.set('tipoDocumento', type); body.set('nombre', name); body.set('archivo', new File([bytes], `${name}.${extension}`));
  return request('/api/inmuebles/1/archivos', token, 'POST', body);
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
  await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'chimbote','Chimbote',10),(2,'lima','Lima',10)");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,referencia,direccion,nombre_contacto,zona_id) VALUES(1,'001-CASA-ENSAYO',1,'Casa','Ensayo','Dirección de ensayo','Contacto',1),(2,'002-CASA-LIMA',2,'Casa','Otra zona','Dirección Lima','Contacto Lima',2)");
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
  result = await request(url, operator); assert.equal(result.data.status.items.find(item => item.key === 'COPIA_LITERAL_CRI').state, 'completo');
  assert.equal(result.data.status.items.find(item => item.key === 'TASACION_PROPIETARIO').documents.length, 2);
  assert.equal(result.data.status.items.find(item => item.key === 'VENDEDOR_FORMULARIO_RENTA').state, 'no_aplica');
  console.log('PASS: permisos, conflictos de edición, condiciones, carga PDF/imagen/Word/Excel, varios archivos, acceso privado y reclasificación.');

  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'aa_session', value: admin, url: origin }]);
  page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/datos-inmuebles?codigo=1&zona=Chimbote&pestana=estado`);
  await page.getByRole('heading', { name: 'Estado del expediente', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Contacto Lima/ }).count(), 0, 'Zone list must not contain Lima');
  await page.getByRole('button', { name: 'Vendedor', exact: true }).click();
  await page.getByRole('heading', { name: 'Documentación del vendedor', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ver archivo', exact: true }).last().click();
  await page.getByRole('dialog').waitFor(); await page.getByRole('button', { name: 'Cerrar vista previa' }).click();
  await page.getByRole('button', { name: 'Documentación', exact: false }).filter({ hasText: /^Documentación/ }).first().click();
  await page.getByRole('heading', { name: 'Documentación del inmueble', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ver archivo', exact: true }).first().click();
  await page.getByRole('dialog').locator('iframe').waitFor(); await page.getByRole('button', { name: 'Cerrar vista previa' }).click();
  await page.getByRole('navigation', { name: 'Apartados de la ficha' }).getByRole('button', { name: 'Comprador', exact: true }).click();
  await page.getByRole('combobox', { name: /^Tipo de persona/ }).selectOption('natural');
  await page.getByLabel('Nota si no adjuntas la búsqueda nacional').fill('Nota de búsqueda registrada desde la interfaz');
  await page.getByRole('button', { name: 'Guardar condiciones', exact: true }).first().click();
  await page.getByText('Condiciones del expediente guardadas.', { exact: true }).waitFor();
  await page.getByRole('combobox', { name: /^Categoría del archivo/ }).selectOption('COMPRADOR_DNI');
  await page.getByLabel('Archivos', { exact: true }).setInputFiles({ name: 'dni-comprador.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('textbox', { name: /^Nombre del archivo 1/ }).fill('DNI del comprador desde interfaz');
  await page.getByRole('button', { name: 'Subir archivos', exact: true }).click();
  await page.getByText('1 archivo guardado.', { exact: true }).waitFor();
  const afterUi = (await request(url, admin)).data;
  assert.equal(afterUi.config.compradorTipo, 'natural');
  assert.equal(afterUi.status.items.find(item => item.key === 'COMPRADOR_DNI').state, 'completo');
  assert.equal(afterUi.status.items.find(item => item.key === 'COMPRADOR_BUSQUEDA_NACIONAL').state, 'completo');
  fs.mkdirSync('output/dossier-local', { recursive: true });
  await page.screenshot({ path: 'output/dossier-local/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 850 });
  for (const name of ['Estado del expediente', 'Vendedor', 'Comprador', 'Documentación']) {
    await page.getByRole('navigation', { name: 'Apartados de la ficha' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name + ' horizontal overflow');
  }
  await page.screenshot({ path: 'output/dossier-local/mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: navegador autenticado escritorio/móvil, guardado de condiciones, carga real desde formulario, filtro de zona y vistas previas sin errores/desbordes.');
  assert.equal((await request(`/api/inmuebles/1/archivos?archivoId=${pdfId}`, admin, 'DELETE')).response.status, 200);
  assert.equal((await request(url, admin)).data.status.items.find(item => item.key === 'COPIA_LITERAL_CRI').state, 'pendiente');
} catch (error) { if(page) { fs.mkdirSync('output/dossier-local',{recursive:true}); await page.screenshot({path:'output/dossier-local/failure.png',fullPage:true}).catch(()=>{}); } console.error(logs.slice(-3000)); throw error; }
finally { if (browser) await browser.close(); if (app) app.kill('SIGTERM'); if (storage) await new Promise(resolve => storage.close(resolve)); await db.end(); }
