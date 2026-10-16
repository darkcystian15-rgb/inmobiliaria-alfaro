// Read-only business checks. Only a temporary verification account/session is created.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
process.loadEnvFile('.env.local');
const origin = 'https://intranet.inmobiliariaalbertoalfaro.com.pe';
const suffix = randomBytes(6).toString('hex'), token = randomBytes(32).toString('hex');
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}) });
let userId, browser;
async function request(path, authenticated = true) {
  const response = await fetch(origin + path, { headers: authenticated ? { Cookie: `aa_session=${token}` } : {}, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  return response;
}
try {
  const [user] = await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo,mfa_secret) VALUES(?,?,?,?,?,1,?)', ['Verificación expediente', `dossier-${suffix}@example.invalid`, `dossier_${suffix}`, await hashPassword(randomBytes(32).toString('hex')), 'administrador', randomBytes(48).toString('base64')]);
  userId = user.insertId;
  await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)', [hashSessionToken(token), userId, new Date(Date.now() + 600000), new Date(), new Date()]);
  const [properties] = await db.query("SELECT id FROM inm_inmuebles ORDER BY EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=inm_inmuebles.id AND a.almacenamiento='hosting' AND a.tipo_documento<>'FOTO_INMUEBLE') DESC,id LIMIT 1");
  assert.ok(properties.length);
  const id = properties[0].id;
  let response = await request(`/api/inmuebles/${id}/expediente`);
  assert.equal(response.status, 200); const record = await response.json();
  assert.equal(record.status.sections.length, 7);
  assert.equal(typeof record.status.complete, 'boolean');
  assert.equal((await request(`/api/inmuebles/${id}/expediente`, false)).status, 401);
  response = await request(`/api/inmuebles/${id}`); assert.equal(response.status, 200);
  assert.equal(typeof (await response.json()).documentacion.total, 'number');
  response = await request(`/api/inmuebles/${id}/archivos`); assert.equal(response.status, 200);
  const { archivos } = await response.json();
  assert.ok(archivos.every(file => !['DNI_PROPIETARIO', 'COPIA_LITERAL', 'TASACION'].includes(file.tipoDocumento)));
  const file = archivos.find(file => file.almacenamiento === 'hosting');
  if (file) {
    response = await request(`/api/inmuebles/${id}/archivos/${file.id}`);
    assert.equal(response.status, 200); assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal((await request(`/api/inmuebles/${id}/archivos/${file.id}`, false)).status, 401);
    await response.arrayBuffer();
  }
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'aa_session', value: token, url: origin }]);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/datos-inmuebles?codigo=${id}&pestana=estado`);
  await page.getByRole('heading', { name: 'Estado del expediente', exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole('heading', { name: 'Documentos obligatorios pendientes', exact: true }).waitFor();
  fs.mkdirSync('output/dossier-production', { recursive: true, mode: 0o700 });
  await page.screenshot({ path: 'output/dossier-production/estado-desktop.png', fullPage: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['Vendedor', 'Comprador', 'Documentación', 'Estado del expediente']) {
      await page.getByRole('navigation', { name: 'Apartados de la ficha' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} overflow at ${width}`);
    }
  }
  await page.screenshot({ path: 'output/dossier-production/estado-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS producción: expediente autenticado, siete secciones, archivos privados y reclasificados, pestañas escritorio/móvil sin errores ni desbordes. Sin escrituras de negocio.');
} finally {
  if (browser) await browser.close();
  if (userId) { await db.query('DELETE FROM inm_sesiones WHERE usuario_id=?', [userId]); await db.query('DELETE FROM inm_usuarios WHERE id=?', [userId]); }
  await db.end();
}
