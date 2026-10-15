// Isolated temporary account only. Never edits business properties.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { hashSessionToken, hashPassword } from '../lib/password.mjs';
process.loadEnvFile('.env.local');
const origin = 'https://intranet.inmobiliariaalbertoalfaro.com.pe';
const before = process.argv.includes('--before');
const suffix = randomBytes(8).toString('hex');
const token = randomBytes(32).toString('hex');
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}) });
let userId, browser;
const request = (path, options = {}) => fetch(origin + path, { ...options, headers: { Cookie: `aa_session=${token}`, Origin: origin, ...options.headers }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
try {
  const [user] = await db.execute('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo,mfa_secret) VALUES(?,?,?,?,?,1,?)', ['Verificación retirada mapas', `${suffix}@example.invalid`, `maps_${suffix}`, await hashPassword(randomBytes(32).toString('hex')), 'administrador', randomBytes(48).toString('base64')]);
  userId = user.insertId;
  await db.execute('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)', [hashSessionToken(token), userId, new Date(Date.now() + 600000), new Date(), new Date()]);
  const response = await request('/api/cartera');
  assert.equal(response.status, 200, 'Production recognizes a session from the configured database');
  const portfolio = await response.json();
  const [rows] = await db.query('SELECT id FROM inm_inmuebles ORDER BY id');
  assert.ok(portfolio.inmuebles.length > 0);
  assert.ok(portfolio.inmuebles.every(item => rows.some(row => Number(row.id) === item.inmuebleId)), 'Production property IDs match the database');
  if (before) console.log('PASS: dominio de producción reconoce la sesión aislada y los inmuebles de la base configurada.');
  else {
    assert.ok(portfolio.inmuebles.every(item => !('latitud' in item) && !('longitud' in item)));
    const property = portfolio.inmuebles[0];
    const detail = await request(`/api/inmuebles/${property.inmuebleId}`);
    assert.equal(detail.status, 200);
    const record = await detail.json();
    assert.equal('latitud' in record.inmueble, false);
    assert.equal('longitud' in record.inmueble, false);
    assert.equal((await request('/api/ubicaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 404);
    const draftPath = `/api/borradores?clave=ficha:maps-${suffix}`;
    assert.equal((await request(draftPath, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contenido: { form: { direccion: 'Verificación aislada', latitud: '-9.1', longitud: '-78.5' } } }) })).status, 200);
    const draft = await (await request(draftPath)).json();
    assert.deepEqual(draft.borrador.contenido, { form: { direccion: 'Verificación aislada' } });
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: 'aa_session', value: token, url: origin }]);
    const page = await context.newPage();
    const errors = [], mapRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => { if (/tile\.openstreetmap\.org|google\.com\/maps|maps\.google|maps\.app\.goo/.test(req.url())) mapRequests.push(req.url()); });
    const assertNoMaps = async () => {
      assert.equal(await page.locator('.leaflet-container, iframe[src*="google.com/maps"]').count(), 0);
      assert.equal(await page.getByText(/Ubicación en el mapa|Usar mi ubicación actual|Importar ubicación del enlace|Consultar zona aproximada|Consultar ubicación referencial/).count(), 0);
    };
    const folder = 'output/remove-maps-production';
    fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
    await page.goto(`${origin}/datos-inmuebles?codigo=${encodeURIComponent(record.inmueble.codigo)}`);
    await page.getByRole('navigation', { name: 'Apartados de la ficha' }).waitFor({ timeout: 60000 });
    await assertNoMaps();
    await page.getByRole('button', { name: 'Inmueble', exact: true }).click();
    await page.getByLabel('Ubicación referencial', { exact: true }).waitFor();
    await assertNoMaps();
    await page.screenshot({ path: `${folder}/ficha-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 375, height: 850 });
    await assertNoMaps();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${folder}/ficha-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/cartera?zona=${encodeURIComponent(property.zona)}`);
    await page.getByText('Cargando cartera').waitFor({ state: 'hidden', timeout: 60000 });
    await page.getByRole('button', { name: 'Tarjetas', exact: true }).click();
    await page.locator('[data-folder-card="true"]').first().waitFor({ timeout: 60000 });
    await assertNoMaps();
    await page.screenshot({ path: `${folder}/cartera-desktop.png`, fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(mapRequests, []);
    const [[remaining]] = await db.query('SELECT COUNT(*) total FROM inm_inmuebles WHERE latitud IS NOT NULL OR longitud IS NOT NULL');
    assert.equal(Number(remaining.total), 0);
    console.log('PASS producción: ficha en escritorio/móvil y Cartera sin mapas, sin peticiones a proveedores de mapas, sin coordenadas en APIs/BD, importación 404 y borrador aislado limpio; sin errores de navegador.');
  }
} finally {
  await browser?.close();
  if (userId) {
    await db.execute('DELETE FROM inm_borradores WHERE usuario_id=?', [userId]);
    await db.execute('DELETE FROM inm_security_audit WHERE actor_id=?', [userId]);
    await db.execute('DELETE FROM inm_sesiones WHERE usuario_id=?', [userId]);
    await db.execute('DELETE FROM inm_usuarios WHERE id=?', [userId]);
  }
  await db.end();
}
