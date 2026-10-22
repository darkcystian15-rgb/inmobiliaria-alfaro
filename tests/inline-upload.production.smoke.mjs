// Read-only business verification. Temporary account/session removed in finally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { dossierStatus } from '../lib/transaction-dossier.mjs';
import { filesByInformationFolder } from '../lib/property-folders.mjs';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
process.loadEnvFile('.env.local');
const origin = 'https://intranet.inmobiliariaalbertoalfaro.com.pe';
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}) });
const token = randomBytes(32).toString('hex'), suffix = randomBytes(6).toString('hex');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let userId, browser;
async function documents() { return (await db.query('SELECT * FROM inm_archivos ORDER BY id'))[0]; }
async function bytesOf(file) {
  const response = await fetch(`${origin}/api/inmuebles/${file.inmueble_id}/archivos/${file.id}`, { headers: { Cookie: `aa_session=${token}` }, signal: AbortSignal.timeout(45000), redirect: 'error' });
  assert.equal(response.status, 200); return sha(Buffer.from(await response.arrayBuffer()));
}
try {
  const before = await documents();
  const [created] = await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo,mfa_secret) VALUES(?,?,?,?,?,1,?)', ['Verificación carga por ítem', `inline-${suffix}@example.invalid`, `inline_${suffix}`, await hashPassword(randomBytes(32).toString('hex')), 'administrador', randomBytes(48).toString('base64')]);
  userId = created.insertId;
  await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)', [hashSessionToken(token), userId, new Date(Date.now() + 1200000), new Date(), new Date()]);
  const digests = new Map();
  for (const file of before.filter(file => file.almacenamiento === 'hosting')) digests.set(file.id, await bytesOf(file));
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  await context.addCookies([{ name: 'aa_session', value: token, url: origin }]);
  const writes = [], errors = [];
  await context.route('**/api/**', async route => {
    if (!['GET','HEAD','OPTIONS'].includes(route.request().method())) { writes.push(route.request().method()); await route.abort(); }
    else await route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('output/inline-upload-production', { recursive: true, mode: 0o700 });
  let views = 0;
  for (const operation of ['venta', 'alquiler']) {
    const [[property]] = await db.query("SELECT id FROM inm_inmuebles WHERE operacion=? AND estado='activo' ORDER BY id LIMIT 1", [operation]);
    assert.ok(property);
    for (const width of [1440,375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/datos-inmuebles?codigo=${property.id}${width === 375 ? '&carpeta=resumen' : ''}`);
      const overview = page.getByRole('region', { name: 'Resumen del inmueble', exact: true });
      const folders = page.getByRole('region', { name: 'Carpetas del inmueble', exact: true });
      await overview.waitFor({ timeout: 60000 }); await folders.waitFor();
      assert.equal(await overview.locator('a,button,input,select,textarea').count(), 0, 'Information-only overview');
      assert.equal(await folders.getByRole('button', { name: /Resumen del inmueble/ }).count(), 0);
      assert.equal(await overview.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('[aria-label="Carpetas del inmueble"]')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, 'Overview above folders');
      const propertyFiles = before.filter(file => file.inmueble_id === property.id).map(file => ({ tipoDocumento: file.tipo_documento }));
      const otherCount = filesByInformationFolder(propertyFiles, dossierStatus({}, [], operation), operation).otros.length;
      assert.equal(await folders.getByRole('button', { name: /^Otros archivos conservados/ }).count(), otherCount > 0 ? 1 : 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `output/inline-upload-production/overview-${operation}-${width}.png`, fullPage: true });
      await page.goto(`${origin}/datos-inmuebles?codigo=${property.id}&carpeta=inmueble`);
      const item = page.locator('[data-document-type=COPIA_LITERAL_CRI]');
      await item.waitFor({ timeout: 60000 });
      const input = item.locator('input[type=file]');
      await input.setInputFiles({ name: 'seleccion-sin-enviar.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
      const form = item.getByRole('form', { name: /^Subir archivos:/ });
      await form.waitFor();
      await form.getByRole('textbox', { name: /^Nombre del archivo 1/ }).fill('Verificación sin enviar');
      await form.getByRole('textbox', { name: 'Observación opcional', exact: true }).fill('Selección temporal; no se envía.');
      assert.equal(await form.getByRole('button', { name: 'Subir archivos', exact: true }).isEnabled(), true);
      assert.equal(await page.getByRole('combobox', { name: /^Categoría del archivo/ }).count(), 0);
      assert.equal(await page.getByRole('heading', { name: 'Subir archivos al expediente', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: '← Carpetas del inmueble', exact: true }).isDisabled(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `output/inline-upload-production/${operation}-${width}.png`, fullPage: true });
      await form.getByRole('button', { name: 'Quitar selección', exact: true }).click();
      await page.getByRole('button', { name: '← Carpetas del inmueble', exact: true }).click();
      views++;
    }
  }
  const after = await documents();
  for (const file of before) assert.deepEqual(after.find(row => row.id === file.id), file, 'Existing document metadata preserved');
  for (const file of before.filter(file => digests.has(file.id))) assert.equal(await bytesOf(file), digests.get(file.id), 'Document bytes preserved');
  assert.deepEqual(writes, []); assert.deepEqual(errors, []);
  const summary = { checkedAt: new Date().toISOString(), views, operations: ['venta','alquiler'], summaryInformationOnly: true, summaryAboveFolders: true, legacySummaryLink: true, conditionalOtherFiles: true, desktopWidth: 1440, mobileWidth: 375, documentsPreserved: before.length, byteDigestsPreserved: digests.size, concurrentNewDocuments: after.length - before.length, browserBusinessWrites: writes.length, browserErrors: errors.length };
  fs.writeFileSync('output/inline-upload-production/summary.json', JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify(summary));
} finally {
  if (browser) await browser.close();
  if (userId) { await db.query('DELETE FROM inm_sesiones WHERE usuario_id=?', [userId]); await db.query('DELETE FROM inm_usuarios WHERE id=?', [userId]); }
  await db.end();
}
