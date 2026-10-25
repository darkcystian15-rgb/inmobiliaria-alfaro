// Fixture writes are restricted to disposable local MySQL; never use production.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { spawn } from 'node:child_process';
import { createSessionToken, hashSessionToken } from '../lib/password.mjs';
import { todayInPeru } from '../lib/calendar.mjs';
import { propertyPanelId } from '../lib/property-panel-id.mjs';

const uri = new URL(process.env.DATABASE_URL || '');
assert.ok(['localhost', '127.0.0.1'].includes(uri.hostname) && uri.pathname === '/alfaro_test');
const db = await mysql.createConnection(process.env.DATABASE_URL);
const base = 'http://127.0.0.1:3126', tag = Date.now().toString(36);
const tokens = { admin: createSessionToken(), operator: createSessionToken() };
const ids = { properties: [], zones: [], positions: [], users: [] }, fixtures = [];
let server, browser, logs = '';
async function api(path, role = 'admin') {
  const response = await fetch(base + path, { headers: { Cookie: `aa_session=${tokens[role]}` } });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}
try {
  for (const [role, token] of Object.entries(tokens)) {
    const [user] = await db.execute('INSERT INTO inm_usuarios(nombre,email,rol) VALUES (?,?,?)', [`Prueba listado ${role}`, `listado-${role}-${tag}@example.invalid`, role === 'admin' ? 'administrador' : 'operador']);
    ids.users.push(user.insertId);
    await db.execute('INSERT INTO inm_sesiones(token_hash,usuario_id,expira) VALUES (?,?,?)', [hashSessionToken(token), user.insertId, new Date(Date.now() + 3600000)]);
  }
  for (const name of [`Listado ${tag}`, `Otra ${tag}`]) {
    const [zone] = await db.execute('INSERT INTO inm_zonas(clave,nombre,capacidad) VALUES (?,?,10)', [name.toLowerCase().replaceAll(' ', '-'), name]);
    ids.zones.push(zone.insertId);
  }
  for (let index = 0; index < 5; index++) {
    const historical = index === 2, rental = index === 1 || index === 3;
    const zoneId = ids.zones[index === 4 ? 1 : 0];
    const name = `Contacto ${index} ${tag}`, code = `BROWSER-${tag}-${index}`;
    const [property] = await db.execute('INSERT INTO inm_inmuebles(codigo,tipo,referencia,nombre_contacto,zona_id,operacion,direccion,estado) VALUES (?,?,?,?,?,?,?,?)', [code, rental ? 'departamento' : 'casa', `Referencia ${index}`, name, zoneId, rental ? 'alquiler' : 'venta', `Dirección ${['Olivos','Cedros','Pinos','Robles','Sauces'][index]} ${tag}`, historical ? 'historico' : 'activo']);
    ids.properties.push(property.insertId);
    fixtures.push({ id: property.insertId, code, name, rental });
    if (!historical) {
      const [position] = await db.execute('INSERT INTO inm_posiciones_zona(zona_id,numero) VALUES (?,?)', [zoneId, index + 1]);
      ids.positions.push(position.insertId);
      await db.execute('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES (?,?)', [property.insertId, position.insertId]);
    }
    await db.execute('INSERT INTO inm_visitas(inmueble_id,fecha_visita,completada,usuario_id) VALUES (?,?,1,?)', [property.insertId, todayInPeru(), ids.users[0]]);
    if (index !== 3) await db.execute("INSERT INTO inm_tasaciones(inmueble_id,fecha_tasacion,valor_referencia,precio_objetivo,precio_venta,valor_referencia_moneda,precio_objetivo_moneda,precio_venta_moneda,situacion,usuario_id) VALUES (?,?,1500,1400,1600,'USD','PEN','USD','aprobado',?)", [property.insertId, todayInPeru(), ids.users[0]]);
  }
  const [initialAppraisals] = await db.execute('SELECT * FROM inm_tasaciones WHERE inmueble_id IN (?,?) ORDER BY inmueble_id', ids.properties.slice(0, 2));
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3126', '-H', '127.0.0.1'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', b => logs += b); server.stderr.on('data', b => logs += b);
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(base + '/login')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, logs);
  const zone = `?zona=${encodeURIComponent(`Listado ${tag}`)}`;
  for (const role of Object.keys(tokens)) {
    const data = await api('/api/inmuebles' + zone, role);
    assert.equal(data.inmuebles.length, 4);
    assert.ok(!data.inmuebles.some(item => item.id === fixtures[4].code));
    const rental = data.inmuebles.find(item => item.id === fixtures[1].code);
    assert.equal(rental.precioVenta, '1600.00'); assert.equal(rental.precioVentaMoneda, 'USD');
  }
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const role of Object.keys(tokens)) for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addCookies([{ name: 'aa_session', value: tokens[role], url: base }]);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/datos-inmuebles' + zone);
    if (width < 1280) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    const navigation = page.locator('#navigation-panel');
    {
      await navigation.getByText(`Zona: Listado ${tag}`, { exact: true }).waitFor();
      const thirdPhase = navigation.getByRole('region', { name: 'FASE 3', exact: true });
      await thirdPhase.waitFor();
      assert.deepEqual(await navigation.locator('h2').allTextContents(), role === 'admin' ? ['FASE 1', 'FASE 2', 'FASE 3'] : ['FASE 2', 'FASE 3']);
      assert.equal(await navigation.getByRole('region', { name: 'FASE 1', exact: true }).getByRole('link', { name: 'Inmuebles por publicar', exact: true }).count(), 0);
      for (const [name, route] of [['Inmuebles por publicar','/portal-web/por-publicar'],['Publicaciones activas','/portal-web/activas'],['Portada del sitio','/portal-web/portada']]) {
        const link = thirdPhase.getByRole('link', { name, exact: true });
        const url = new URL(await link.getAttribute('href'), base);
        assert.equal(url.pathname, route);
        if (route !== '/portal-web/portada') assert.equal(url.searchParams.get('zona'), `Listado ${tag}`);
        assert.equal(await navigation.getByRole('link', { name, exact: true }).count(), 1);
      }
      await thirdPhase.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/menu-fase3-${width}.png`, fullPage: false });
    }
    if (width < 1280) await page.getByRole('button', { name: 'Cerrar menú', exact: true }).first().click();

    const region = page.getByRole('region', { name: 'Inmuebles de la zona', exact: true });
    const search = region.getByRole('searchbox', { name: 'Buscar inmueble', exact: true });
    await search.waitFor();
    assert.equal(await region.getByRole('button', { name: 'Lista compacta', exact: true }).getAttribute('aria-pressed'), 'true');
    const rows = region.getByRole('button', { name: /^Abrir fases de/ });
    assert.equal(await rows.count(), 3);
    assert.ok((await rows.nth(0).getAttribute('aria-label')).includes(fixtures[0].name));
    assert.equal(await region.locator('button').getByText('Activo', { exact: true }).count(), 3);
    assert.equal(await region.getByText(fixtures[2].name, { exact: true }).count(), 0);
    assert.equal(await region.getByText(fixtures[4].name, { exact: true }).count(), 0);
    assert.ok((await rows.nth(1).innerText()).includes('/ mes'));
    await page.screenshot({ path: `/tmp/datos-lista-${role}-${width}.png`, fullPage: true });
    await search.fill('sin coincidencias');
    await region.getByText('No hay inmuebles con estos filtros.', { exact: true }).waitFor();
    await search.fill(`Direccion Cedros ${tag}`);
    assert.equal(await rows.count(), 1);
    await rows.first().click();
    await page.getByRole('main').getByRole('heading', { name: 'FASE 1', exact: true }).waitFor();
    await page.getByRole('main').getByRole('heading', { name: 'FASE 2', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('codigo'), fixtures[1].code);
    assert.equal(new URL(page.url()).searchParams.get('zona'), `Listado ${tag}`);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: /^Valores de tasación/, exact: false }).click();
    await page.getByText('Precio de cierre aceptado por propietario', { exact: true }).waitFor();
    await page.getByText('Tasación de Inmobiliaria', { exact: true }).waitFor();
    assert.equal(await page.getByText('Renta mensual objetivo', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Actualizar valores', exact: true }).count(), role === 'admin' ? 1 : 0);
    await page.reload();
    await page.getByText('Tasación de Inmobiliaria', { exact: true }).waitFor();
    await page.goBack();
    await page.getByRole('main').getByRole('heading', { name: 'FASE 1', exact: true }).waitFor();
    await page.getByRole('button', { name: '← Volver a los inmuebles de la zona', exact: true }).click();
    await search.waitFor();
    await search.fill('');
    await region.getByRole('combobox', { name: /^Estado/ }).selectOption('historico');
    assert.equal(await rows.count(), 1);
    assert.ok((await rows.first().innerText()).includes('Histórico'));
    await region.getByRole('combobox', { name: /^Estado/ }).selectOption('activo');
    await region.getByRole('combobox', { name: /^Tipo de operación/ }).selectOption('alquiler');
    assert.equal(await rows.count(), 2);
    await region.getByRole('button', { name: 'Tarjetas', exact: true }).click();
    assert.equal(await region.locator('article[data-folder-card]').count(), 2);
    assert.equal(await region.locator('button').getByText('Activo', { exact: true }).count(), 2);
    const rental = (await api('/api/inmuebles' + zone, role)).inmuebles.find(item => item.id === fixtures[1].code);
    await search.fill(propertyPanelId(rental));
    assert.equal(await rows.count(), 1);
    await page.screenshot({ path: `/tmp/datos-tarjetas-${role}-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await rows.first().click();
    await page.getByRole('main').getByRole('heading', { name: 'FASE 1', exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('button', { name: '← Volver a los inmuebles de la zona', exact: true }).click();
    await search.waitFor();
    assert.equal(await search.inputValue(), propertyPanelId(rental));
    await page.getByRole('button', { name: 'Zonas', exact: true }).click();
    await page.getByRole('region', { name: 'Carpetas de zonas', exact: true }).getByRole('button', { name: new RegExp(`Otra ${tag}`) }).click();
    await search.waitFor();
    assert.equal(await search.inputValue(), '');
    assert.equal(await rows.count(), 1);
    assert.ok((await rows.first().getAttribute('aria-label')).includes(fixtures[4].name));
    if (role === 'admin') {
      await page.goto(base + '/cartera' + zone);
      await page.getByRole('button', { name: 'Tarjetas', exact: true }).click();
      const detail = page.getByRole('button', { name: new RegExp(`^Ver detalle de ${fixtures[1].name},`) });
      await detail.waitFor();
      await detail.click();
      const dialog = page.getByRole('dialog', { name: fixtures[1].name, exact: true });
      await dialog.waitFor();
      await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Register a rental using the shared labels and prove currency/amounts persist.
  const context = await browser.newContext();
  await context.addCookies([{ name: 'aa_session', value: tokens.admin, url: base }]);
  const page = await context.newPage();
  await page.goto(base + '/registrar-tasaciones' + zone + `&inmueble=${ids.properties[3]}`);
  await page.getByRole('combobox', { name: 'Moneda de la tasación', exact: true }).selectOption('USD');
  await page.locator('input[type=date]').fill(todayInPeru());
  await page.getByLabel(/^Tasación de Inmobiliaria/).fill('1700');
  await page.getByLabel(/^Precio de cierre aceptado por propietario/).fill('1600');
  await page.getByLabel(/^Precio de salida/).fill('1800');
  await page.getByRole('button', { name: 'Registrar tasación', exact: true }).click();
  await page.getByText(/registrada correctamente/).waitFor();
  const saved = (await api(`/api/inmuebles/${ids.properties[3]}`)).tasacion;
  assert.equal(saved.valorReferencia, '1700.00'); assert.equal(saved.precioObjetivo, '1600.00'); assert.equal(saved.precioVenta, '1800.00');
  for (const key of ['valorReferenciaMoneda', 'precioObjetivoMoneda', 'precioVentaMoneda']) assert.equal(saved[key], 'USD');
  const [afterAppraisals] = await db.execute('SELECT * FROM inm_tasaciones WHERE inmueble_id IN (?,?) ORDER BY inmueble_id', ids.properties.slice(0, 2));
  assert.deepEqual(afterAppraisals, initialAppraisals);
  await context.close();
  console.log('PASS: shared portfolio list/cards, active/historical badges, zone isolation, contact/address/full-ID search, filters/counters, direct phases without detail dialog, history/reload/return, administrator/operator, monthly rental labels/currency/save, existing values preserved, desktop/mobile.');
} finally {
  if (browser) await browser.close();
  server?.kill('SIGTERM');
  for (const id of ids.properties) {
    for (const table of ['inm_archivos','inm_expedientes','inm_seguimiento','inm_timeline','inm_publicaciones','inm_tasaciones','inm_visitas','inm_asignaciones_zona']) await db.execute(`DELETE FROM ${table} WHERE inmueble_id=?`, [id]);
    await db.execute('DELETE FROM inm_inmuebles WHERE id=?', [id]);
  }
  for (const id of ids.positions) await db.execute('DELETE FROM inm_posiciones_zona WHERE id=?', [id]);
  for (const id of ids.zones) await db.execute('DELETE FROM inm_zonas WHERE id=?', [id]);
  for (const id of ids.users) {
    for (const [table, column] of [['inm_borradores','usuario_id'],['inm_security_audit','actor_id'],['inm_sesiones','usuario_id']]) await db.execute(`DELETE FROM ${table} WHERE ${column}=?`, [id]);
    await db.execute('DELETE FROM inm_usuarios WHERE id=?', [id]);
  }
  await db.end();
}
