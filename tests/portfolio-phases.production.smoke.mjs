// Read-only business verification. Temporary account/session removed in finally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
process.loadEnvFile('.env.local');
const origin = process.env.PORTFOLIO_ORIGIN || 'https://intranet.inmobiliariaalbertoalfaro.com.pe';
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, dateStrings: true,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}) });
const token = randomBytes(32).toString('hex'), suffix = randomBytes(6).toString('hex');
let userId, browser;
try {
  const [created] = await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo,mfa_secret) VALUES(?,?,?,?,?,1,?)', ['Verificación fases cartera', `phases-${suffix}@example.invalid`, `phases_${suffix}`, await hashPassword(randomBytes(32).toString('hex')), 'administrador', randomBytes(48).toString('base64')]);
  userId = created.insertId;
  await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)', [hashSessionToken(token), userId, new Date(Date.now() + 1200000), new Date(), new Date()]);
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
  const response = await context.request.get(`${origin}/api/cartera`);
  assert.equal(response.status(), 200);
  const list = (await response.json()).inmuebles;
  let views = 0;
  for (const operation of ['venta', 'alquiler']) {
    const property = list.find(item => item.operacion === operation && item.estado === 'Activo' && item.zona);
    assert.ok(property);
    for (const width of [1440,375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/cartera?zona=${encodeURIComponent(property.zona)}`);
      await page.getByRole('button', { name: `Ver detalle de ${property.propietario || 'Sin contacto'}, posición ${property.posicion}`, exact: true }).first().click({ timeout: 60000 });
      await page.getByRole('heading', { name: 'FASE 1', exact: true }).waitFor();
      await page.getByRole('heading', { name: 'FASE 2', exact: true }).waitFor();
      const section = page.getByRole('region', { name: 'Documentación antes de publicar', exact: true });
      await section.getByText('Consultando estado…', { exact: true }).first().waitFor({ state: 'hidden', timeout: 60000 });
      assert.equal(await section.getByRole('alert').count(), 0);
      const links = await section.locator('li a').evaluateAll(nodes => nodes.map(node => ({ href: node.href, label: node.closest('li').querySelector('h5').textContent })));
      assert.equal(links.length, operation === 'venta' ? 7 : 5);
      for (const link of links) {
        const url = new URL(link.href);
        assert.equal(url.searchParams.get('codigo'), String(property.inmuebleId));
        assert.equal(url.searchParams.get('zona'), property.zona);
        await page.goto(link.href);
        await page.getByRole('heading', { name: link.label, exact: true }).waitFor({ timeout: 60000 });
        await page.getByRole('button', { name: '← Carpetas del inmueble', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        views++;
      }
    }
  }
  assert.deepEqual(writes, []); assert.deepEqual(errors, []);
  const result = { checkedAt: new Date().toISOString(), folderViews: views, saleCards: 7, rentalCards: 5, phasesVisible: true, propertyAndZonePreserved: true, desktopWidth: 1440, mobileWidth: 375, browserBusinessWrites: writes.length, browserErrors: errors.length };
  fs.mkdirSync('output/portfolio-phases', { recursive: true });
  fs.writeFileSync('output/portfolio-phases/summary.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  if (browser) await browser.close();
  if (userId) { await db.query('DELETE FROM inm_sesiones WHERE usuario_id=?', [userId]); await db.query('DELETE FROM inm_usuarios WHERE id=?', [userId]); }
  await db.end();
}
