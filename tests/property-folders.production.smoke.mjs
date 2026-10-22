// Production verification: read-only business records and documents. Creates a
// short-lived verification account/session and always removes both in finally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
import { informationFolders, filesByInformationFolder } from '../lib/property-folders.mjs';
process.loadEnvFile('.env.local');
const origin = 'https://intranet.inmobiliariaalbertoalfaro.com.pe';
const checkpoint = process.env.FOLDER_CHECKPOINT;
assert.ok(checkpoint?.startsWith('restore-points/informacion-carpetas-'), 'Requires the private pre-change checkpoint');
const backup = JSON.parse(fs.readFileSync(`${checkpoint}/business.json`, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(`${checkpoint}/business-manifest.json`, 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(sha(fs.readFileSync(`${checkpoint}/business.json`)), manifest.sha256);
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}) });
const token = randomBytes(32).toString('hex'), suffix = randomBytes(6).toString('hex');
let userId, browser;
const canonical = rows => JSON.stringify(rows.map(row => Object.fromEntries(Object.entries(row).sort(([a],[b]) => a.localeCompare(b)))).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
let baseline;
async function readRecords() {
  await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  try {
    const tables = {};
    for (const name of Object.keys(backup.tables)) {
      assert.match(name, /^inm_[a-z0-9_]+$/);
      const [current] = await db.query(`SELECT * FROM \`${name}\``);
      tables[name] = current;
    }
    return tables;
  } finally { await db.rollback(); }
}
async function json(path) {
  const response = await fetch(origin + path, { headers: { Cookie: `aa_session=${token}` }, signal: AbortSignal.timeout(45000), redirect: 'error' });
  assert.equal(response.status, 200, path);
  return response.json();
}
try {
  baseline = await readRecords();
  assert.equal(sha(canonical(baseline.inm_archivos)), sha(canonical(backup.tables.inm_archivos)), 'Existing document records must match the original backup');
  const businessChangesSinceBackup = Object.keys(baseline).filter(name => sha(canonical(baseline[name])) !== sha(canonical(backup.tables[name]))).map(name => ({ table: name, beforeRows: backup.tables[name].length, currentRows: baseline[name].length }));
  fs.mkdirSync('output/property-folders-production', { recursive: true, mode: 0o700 });
  fs.writeFileSync('output/property-folders-production/before-verification.json', JSON.stringify({ checkedAt: new Date().toISOString(), tables: baseline }), { mode: 0o600 });
  const [created] = await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo,mfa_secret) VALUES(?,?,?,?,?,1,?)', ['Verificación carpetas', `folders-${suffix}@example.invalid`, `folders_${suffix}`, await hashPassword(randomBytes(32).toString('hex')), 'administrador', randomBytes(48).toString('base64')]);
  userId = created.insertId;
  await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)', [hashSessionToken(token), userId, new Date(Date.now() + 1200000), new Date(), new Date()]);
  const list = await json('/api/inmuebles?zona=*');
  assert.equal(list.inmuebles.length, baseline.inm_inmuebles.length);
  let documentaryRecords = 0;
  const parents = new Set(backup.tables.inm_archivos.map(file => file.inmueble_id));
  const representatives = ['venta', 'alquiler'].map(operation => baseline.inm_inmuebles.find(item => item.operacion === operation)?.id);
  for (const property of baseline.inm_inmuebles.filter(item => parents.has(item.id) || representatives.includes(item.id))) {
    const files = (await json(`/api/inmuebles/${property.id}/archivos`)).archivos;
    const original = backup.tables.inm_archivos.filter(file => file.inmueble_id === property.id);
    assert.deepEqual(files.map(file => String(file.id)).sort(), original.map(file => String(file.id)).sort());
    const record = await json(`/api/inmuebles/${property.id}/expediente`);
    const groups = filesByInformationFolder(files, record.status, property.operacion);
    const grouped = Object.values(groups).flat();
    assert.deepEqual(grouped.map(file => String(file.id)).sort(), original.filter(file => file.tipo_documento !== 'FOTO_INMUEBLE').map(file => String(file.id)).sort());
    documentaryRecords += grouped.length;
  }
  for (const file of backup.files) {
    const record = backup.tables.inm_archivos.find(row => row.id === file.id);
    const response = await fetch(`${origin}/api/inmuebles/${record.inmueble_id}/archivos/${file.id}`, { headers: { Cookie: `aa_session=${token}` }, signal: AbortSignal.timeout(45000), redirect: 'error' });
    assert.equal(response.status, 200);
    assert.equal(sha(Buffer.from(await response.arrayBuffer())), file.sha256, 'Document bytes must match the backup');
  }
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'aa_session', value: token, url: origin }]);
  const writes = [], errors = [], failures = [];
  await context.route('**/api/**', async route => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) { writes.push(route.request().method()); await route.abort(); }
    else await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/api/') && response.status() >= 400) failures.push(response.status()); });
  fs.mkdirSync('output/property-folders-production', { recursive: true, mode: 0o700 });
  await page.goto(`${origin}/datos-inmuebles`);
  await page.getByRole('region', { name: 'Carpetas de zonas', exact: true }).waitFor({ timeout: 60000 });
  for (const name of list.zonas) {
    await page.getByRole('region', { name: 'Carpetas de zonas', exact: true }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await page.getByRole('region', { name: 'Inmuebles de la zona', exact: true }).waitFor();
    await page.getByRole('navigation', { name: 'Ruta de carpetas', exact: true }).getByRole('button', { name: 'Zonas', exact: true }).click();
  }
  let views = 0;
  for (const operation of ['venta', 'alquiler']) {
    const property = baseline.inm_inmuebles.find(item => item.operacion === operation && backup.tables.inm_archivos.some(file => file.inmueble_id === item.id)) || baseline.inm_inmuebles.find(item => item.operacion === operation);
    assert.ok(property);
    await page.goto(`${origin}/datos-inmuebles?codigo=${property.id}`);
    const root = page.getByRole('region', { name: 'Carpetas del inmueble', exact: true });
    await root.waitFor({ timeout: 60000 });
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const folder of informationFolders(operation, true)) {
        await root.getByRole('button', { name: new RegExp(folder.label) }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${folder.key}: horizontal overflow`);
        views++;
        await page.getByRole('button', { name: '← Carpetas del inmueble', exact: true }).click();
        await root.waitFor();
      }
      await page.screenshot({ path: `output/property-folders-production/${operation}-${width}.png`, fullPage: true });
    }
  }
  assert.deepEqual(writes, []); assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const after = await readRecords();
  assert.equal(sha(canonical(after.inm_archivos)), sha(canonical(backup.tables.inm_archivos)), 'All original document records remain unchanged');
  const businessChangesDuringVerification = Object.keys(baseline).filter(name => sha(canonical(after[name])) !== sha(canonical(baseline[name]))).map(name => ({ table: name, beforeRows: baseline[name].length, afterRows: after[name].length }));
  const [[verificationActivity]] = await db.query('SELECT COUNT(*) total FROM inm_timeline WHERE usuario_id=?', [userId]);
  assert.equal(Number(verificationActivity.total), 0, 'The verifier performs no business operations');
  fs.writeFileSync('output/property-folders-production/after-verification.json', JSON.stringify({ checkedAt: new Date().toISOString(), tables: after }), { mode: 0o600 });
  const evidence = { checkedAt: new Date().toISOString(), properties: list.inmuebles.length, zones: list.zonas.length, documentaryRecords, verifiedFileCopies: backup.files.length, tablesUnchangedDuringVerification: Object.keys(baseline).length - businessChangesDuringVerification.length, businessChangesSinceBackup, businessChangesDuringVerification, verifierBusinessEvents: Number(verificationActivity.total), documentRecordsMatchBackup: true, folderViews: views, browserBusinessWrites: writes.length, browserErrors: errors.length, failedApiResponses: failures.length, desktopWidth: 1440, mobileWidth: 375 };
  fs.writeFileSync('output/property-folders-production/summary.json', JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(evidence));
} finally {
  if (browser) await browser.close();
  if (userId) { await db.query('DELETE FROM inm_sesiones WHERE usuario_id=?', [userId]); await db.query('DELETE FROM inm_usuarios WHERE id=?', [userId]); }
  await db.end();
}
