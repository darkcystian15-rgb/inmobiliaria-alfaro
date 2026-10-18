// Reads business records and removes its isolated verification account on exit.
import assert from 'node:assert/strict';
import { loadEnvFile } from 'node:process';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import mysql from 'mysql2/promise';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
import { propertyCode } from '../lib/property-code.mjs';

loadEnvFile('.env.local');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3142';
const db = await mysql.createConnection(process.env.DATABASE_URL);
const token = randomBytes(32).toString('hex');
let userId, server, browser;
const request = (params = {}) => fetch(`${origin}/api/reportes?${new URLSearchParams(params)}`, {
  headers: { Cookie: `aa_session=${token}` }, signal: AbortSignal.timeout(30000),
});
const addressSql = `COALESCE(NULLIF(TRIM(CONCAT_WS(' ',NULLIF(TRIM(i.direccion),''),NULLIF(TRIM(i.numero_direccion),''))),''),'Ubicación por completar')`;
async function check(label, params, predicate = "i.estado='activo'", values = []) {
  const [expected] = await db.execute(`SELECT i.id,i.estado,i.codigo,i.numero_orden,i.tipo,i.referencia,${addressSql} ubicacion FROM inm_inmuebles i WHERE ${predicate} ORDER BY i.fecha_registro,i.id`, values);
  for (const row of expected) assert.equal(row.codigo, propertyCode(Number(row.numero_orden), row.tipo, row.referencia), `${label}: código uniforme`);
  const response = await request(params);
  assert.equal(response.status, 200, label);
  const result = await response.json();
  assert.equal(result.paginacion.total, expected.length, `${label}: total`);
  assert.equal(result.resumen.total, expected.length, `${label}: resumen`);
  assert.equal(result.resumen.activos, expected.filter(row => row.estado === 'activo').length, `${label}: activos`);
  assert.equal(result.resumen.historicos, expected.filter(row => row.estado !== 'activo').length, `${label}: históricos`);
  assert.ok(result.rows.every(row => !('datosPrueba' in row) && !('datosSimulados' in row)), `${label}: sin clasificación de prueba`);
  const page = Number(params.pagina || 1);
  const selected = params.todos === '1' ? expected : expected.slice((page - 1) * 50, page * 50);
  assert.deepEqual(result.rows.map(row => row.inmuebleId), selected.map(row => row.id), `${label}: inmuebles`);
  for (const row of result.rows) assert.equal(row.ubicacion, expected.find(item => item.id === row.inmuebleId)?.ubicacion, `${label}: ubicación referencial`);
  console.log(`PASS ${label}: ${result.rows.length} filas / ${expected.length} resultados`);
  return result;
}
try {
  const suffix = randomBytes(6).toString('hex');
  const [user] = await db.execute('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo) VALUES(?,?,?,?,?,1)',
    ['Verificación reportes', `reports_${suffix}@example.invalid`, `reports_${suffix}`, await hashPassword(randomBytes(24).toString('hex')), 'administrador']);
  userId = user.insertId;
  await db.execute('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)',
    [hashSessionToken(token), userId, new Date(Date.now() + 3600000), new Date(), new Date()]);
  if (!process.env.TEST_ORIGIN) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', '3142', '-H', '127.0.0.1'], { stdio: ['ignore', 'ignore', 'ignore'] });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${origin}/login`)).status === 200) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'Servidor disponible');
  }
  await check('Consulta inicial incluye todos los registros', {});
  await check('Parámetro antiguo no excluye inmuebles', { pruebas: '0' });
  await check('Parámetro antiguo no cambia el total', { pruebas: '1' });
  for (const operacion of ['venta', 'alquiler']) await check(operacion, { operacion }, "i.estado='activo' AND i.operacion=?", [operacion]);
  const [types] = await db.query('SELECT DISTINCT tipo FROM inm_inmuebles');
  for (const { tipo } of types) await check(`Tipo ${tipo}`, { tipo }, "i.estado='activo' AND i.tipo=?", [tipo]);
  await check('Históricos', { reporte: 'Histórico de inmuebles' }, "i.estado<>'activo'");
  await check('Todos los estados', { reporte: 'Inmuebles por estado' }, '1=1');
  await check('Filtro estado histórico', { reporte: 'Inmuebles por estado', estado: 'Histórico' }, "i.estado<>'activo'");
  await check('Período sin resultados', { desde: '2000-01-01', hasta: '2000-01-01' }, "i.estado='activo' AND DATE(DATE_SUB(i.fecha_registro,INTERVAL (TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),NOW())+18000) SECOND))='2000-01-01'");
  await check('Segunda página', { pagina: '2' });
  await check('Descarga completa', { todos: '1' });
  const completedVisit = 'EXISTS(SELECT 1 FROM inm_visitas v WHERE v.inmueble_id=i.id AND v.completada=1)';
  const positioned = 'EXISTS(SELECT 1 FROM inm_asignaciones_posicion p WHERE p.inmueble_id=i.id AND p.activa=1)';
  const valued = 'EXISTS(SELECT 1 FROM inm_tasaciones t WHERE t.inmueble_id=i.id)';
  for (const [reporte, predicate] of [
    ['Visitas realizadas', completedVisit],
    ['Visitas pendientes', `i.estado='activo' AND ${positioned} AND NOT ${completedVisit}`],
    ['Tasaciones realizadas', valued],
    ['Tasaciones pendientes', `i.estado='activo' AND ${positioned} AND ${completedVisit} AND NOT ${valued}`],
    ['Publicados', "i.estado='activo' AND EXISTS(SELECT 1 FROM inm_publicaciones p WHERE p.inmueble_id=i.id AND p.publicado=1)"],
    ['Alquilados', "EXISTS(SELECT 1 FROM inm_liberaciones l WHERE l.inmueble_id=i.id AND l.confirmado=1 AND l.anulada=0 AND l.motivo='alquilado')"],
    ['Vendidos', "EXISTS(SELECT 1 FROM inm_liberaciones l WHERE l.inmueble_id=i.id AND l.confirmado=1 AND l.anulada=0 AND l.motivo='vendido')"],
    ['Motivos de liberación', 'EXISTS(SELECT 1 FROM inm_liberaciones l WHERE l.inmueble_id=i.id AND l.confirmado=1 AND l.anulada=0)'],
  ]) await check(reporte, { reporte }, predicate);
  const [positions] = await db.query('SELECT numero FROM inm_posiciones p WHERE p.activo=1 AND NOT EXISTS(SELECT 1 FROM inm_asignaciones_posicion a WHERE a.posicion_id=p.id AND a.activa=1) ORDER BY numero');
  for (const pagina of ['1', '2']) {
    const response = await request({ reporte: 'Posiciones disponibles', pagina });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.paginacion.total, positions.length);
    assert.deepEqual(result.rows.map(row => row.posicion), positions.slice((Number(pagina)-1)*50, Number(pagina)*50).map(row => row.numero));
    console.log(`PASS posiciones disponibles página ${pagina}: ${result.rows.length} filas / ${positions.length} resultados`);
  }
  for (const params of [{ desde: '2026-02-30' }, { desde: '2026-10-12', hasta: '2026-10-01' }, { pagina: '0' }]) assert.equal((await request(params)).status, 400);
  console.log('PASS validación de fechas y páginas inválidas');
  const [addresses] = await db.query(`SELECT i.codigo,${addressSql} ubicacion FROM inm_inmuebles i`);
  const byCode = new Map(addresses.map(row => [row.codigo, row.ubicacion]));
  function locationRows(value) {
    if (Array.isArray(value)) return value.flatMap(locationRows);
    if (!value || typeof value !== 'object') return [];
    return typeof value.ubicacion === 'string' ? [value] : Object.values(value).flatMap(locationRows);
  }
  for (const path of ['/api/inmuebles','/api/cartera','/api/visitas','/api/tasaciones','/api/publicaciones','/api/liberaciones','/api/reportes?reporte=Posici%C3%B3n%20ocupada&todos=1']) {
    const response = await fetch(origin+path, {headers:{Cookie:`aa_session=${token}`},signal:AbortSignal.timeout(30000)});
    assert.equal(response.status, 200, path);
    const locations = locationRows(await response.json());
    for (const row of locations) assert.equal(row.ubicacion, byCode.get(row.codigo ?? row.id), `${path}: ubicación del mismo inmueble`);
    assert.ok(locations.length > 0, `${path}: casos comprobados`);
    console.log(`PASS ubicación uniforme ${path}: ${locations.length} filas`);
  }
  if (process.env.PLAYWRIGHT_MODULE_PATH) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH);
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    await context.addCookies([{ name: 'aa_session', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = page.waitForResponse(r => r.url().includes('/api/reportes?') && r.status() === 200);
    await page.goto(`${origin}/reportes`);
    const initial = await (await response).json();
    await page.getByRole('searchbox', { name: 'Buscar en esta página' }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0);
    assert.equal(await page.locator('tbody tr').count(), initial.rows.length);
    assert.equal(await page.getByRole('checkbox', { name: /datos de prueba/i }).count(), 0);
    assert.equal(await page.getByRole('columnheader', { name: /datos de prueba|datos ficticios/i }).count(), 0);
    const search = page.getByRole('searchbox', { name: 'Buscar en esta página' });
    await search.fill(initial.rows[0].codigo);
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
    await search.fill('NO-EXISTE-ESTE-INMUEBLE');
    await page.getByText('No hay coincidencias en esta página', { exact: true }).waitFor();
    await search.fill('');
    await page.waitForFunction(count => document.querySelectorAll('tbody tr').length === count, initial.rows.length);
    await page.getByRole('columnheader', { name: /Código/ }).getByRole('button').click();
    assert.equal(await page.getByRole('columnheader', { name: /Código/ }).getAttribute('aria-sort'), 'ascending');
    await page.getByRole('columnheader', { name: /Código/ }).getByRole('button').click();
    assert.equal(await page.getByRole('columnheader', { name: /Código/ }).getAttribute('aria-sort'), 'descending');
    const resetResponse = page.waitForResponse(r => r.url().includes('/api/reportes?') && r.status() === 200);
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    await resetResponse;
    await page.waitForFunction(count => document.querySelectorAll('tbody tr').length === count, initial.rows.length);
    await page.locator('summary').filter({hasText:'Columnas del reporte'}).click();
    await page.getByRole('checkbox', {name:'Ubicación',exact:true}).check();
    await page.getByRole('cell', {name:byCode.get(initial.rows[0].codigo),exact:true}).waitFor();
    for (const extension of ['PDF', 'Excel']) {
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: `Descargar ${extension}`, exact: true }).last().click();
      const file = await download;
      assert.ok(file.suggestedFilename().endsWith(extension === 'PDF' ? '.pdf' : '.xlsx'));
      assert.ok((await stat(await file.path())).size > 1000);
      if (extension === 'Excel') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(await file.path());
        const sheet = workbook.getWorksheet('Detalle');
        const headers = sheet.getRow(1).values;
        const locationColumn = headers.indexOf('Ubicación'), codeColumn = headers.indexOf('Código');
        assert.ok(locationColumn > 0 && codeColumn > 0);
        for (let row = 2; row <= sheet.rowCount; row++) assert.equal(sheet.getCell(row,locationColumn).value, byCode.get(sheet.getCell(row,codeColumn).value));
      }
    }
    console.log('PASS descargas PDF y Excel');
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.reload();
      await page.waitForFunction(count => document.querySelectorAll('tbody tr').length === count, initial.rows.length);
      const bounds = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(bounds.scroll <= bounds.width + 1, `Sin desborde a ${width}px`);
      await page.screenshot({ path: `/tmp/alfaro-reportes-${width}.png`, fullPage: true });
    }
    assert.deepEqual(errors, [], 'Sin errores JavaScript');
    console.log('PASS navegador: resultados, búsqueda, orden, códigos uniformes, limpiar y diseño a 390/768/1440px');
  }
} finally {
  if (browser) await browser.close();
  if (server) { server.kill('SIGTERM'); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve)); }
  if (userId) {
    await db.execute('DELETE FROM inm_sesiones WHERE usuario_id=?', [userId]);
    await db.execute('DELETE FROM inm_security_audit WHERE actor_id=?', [userId]);
    await db.execute('DELETE FROM inm_usuarios WHERE id=?', [userId]);
  }
  await db.end();
}
