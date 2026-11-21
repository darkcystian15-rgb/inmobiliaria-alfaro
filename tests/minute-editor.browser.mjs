import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { build } from 'esbuild';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { emptyMinute } from '../lib/minute-document.ts';
import { minutePdf } from '../lib/minute-export.ts';
import { dossierDefaults } from '../lib/transaction-dossier.mjs';
async function selectRange(locator, start, end) { await locator.evaluate((root, offsets) => { root.focus(); const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode); const point = offset => { for (const node of nodes) { if (offset <= node.length) return [node, offset]; offset -= node.length; } return [root, 0]; }; const range = document.createRange(); range.setStart(...point(offsets[0])); range.setEnd(...point(offsets[1])); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); root.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); }, [start, end]); }
async function openStarting(dialog) { const summary = dialog.locator('summary').filter({ hasText: /^(Cambiar punto de partida|Empezar documento)$/ }); if (!(await summary.locator('..').evaluate(details => details.open))) await summary.click(); }
async function useBase(dialog) { await openStarting(dialog); await dialog.getByRole('button', { name: 'Usar estructura base', exact: true }).click(); }
async function documentOption(dialog, name) { const summary = dialog.getByLabel('Más opciones del documento'); if (!(await summary.locator('..').evaluate(details => details.open))) await summary.click(); await dialog.getByRole('button', { name, exact: true }).click(); }
async function presentation(dialog, open = true) { const summary = dialog.locator('summary').filter({ hasText: /^Encabezado y pie$/ }); if ((await summary.locator('..').evaluate(details => details.open)) !== open) await summary.click(); }
const { chromium } = await import('/home/codespace/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const out = 'output/minuta-texto'; await fs.mkdir(out, { recursive: true });
const compiled = await compile(await fs.readFile('app/globals.css', 'utf8'), { base: new URL('../app/', import.meta.url).pathname, onDependency() {} });
const scanner = new Scanner({ sources: [{ base: process.cwd(), pattern: 'app/**/*.{tsx,ts}', negated: false }] }); const css = compiled.build(scanner.scan());
await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import Dossier from './app/components/TransactionDossier';const noop=()=>{};const rental=location.search.includes('alquiler');const files=[{id:4,nombre:'Word existente de prueba',nombreOriginal:'minuta-prueba.docx',tipoDocumento:rental?'ESTRUCTURA_CONTRATO_ALQUILER':'ESTRUCTURA_MINUTA',almacenamiento:'hosting',enlace:'/api/inmuebles/1/archivos/4',tipoMime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}];createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-5xl p-4"><Dossier propertyId={1} operation={rental?'alquiler':'venta'} view="carpeta" section="contratos" files={files} uploadReady administrator onChanged={async()=>{}} onBusyChange={noop} onDirtyChange={noop}/></main>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, jsx: 'automatic', outfile: `${out}/workspace.js`, define: { 'process.env.NODE_ENV': '"production"' } });
const { default: sharp } = await import('sharp');
const imageBytes = await sharp({ create: { width: 200, height: 120, channels: 3, background: '#bfe0ed' } }).png().toBuffer();
const js = await fs.readFile(`${out}/workspace.js`);
const server = http.createServer(async (req, res) => {
  if (/^\/branding\/fonts\/Carlito-(Regular|Bold)\.ttf$/.test(req.url)) { res.setHeader('content-type','font/ttf');res.end(await fs.readFile(`public${req.url}`));return; }
  res.setHeader('content-type', req.url === '/workspace.js' ? 'text/javascript' : 'text/html');
  res.end(req.url === '/workspace.js' ? js : `<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/workspace.js"></script>`);
});
await new Promise(resolve => server.listen(3154, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const width of [375, 1440]) for (const operation of ['venta', 'alquiler']) {
    const rental = operation === 'alquiler';
    const property = { operation, type: 'Departamento', address: 'Dirección de prueba', code: 'INM-PRUEBA' };
    const openLabel = rental ? 'Abrir editor de alquiler' : 'Abrir editor de minuta';
    const dialogLabel = rental ? 'Editor de Estructura de Alquiler' : 'Editor de Estructura de Minuta';
    const context = await browser.newContext({ viewport: { width, height: 1000 } }), page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let saved = { data: emptyMinute(operation), version: 0 }, saves = 0, generations = 0, conflict = false;
    await page.route('**/api/**', async route => {
      const request = route.request(); const pathname = new URL(request.url()).pathname;
      const json = body => route.fulfill({ json: body });
      if (pathname.endsWith('/archivos') && request.method() === 'POST') return json({ id: 12 });
      if (pathname.endsWith('/archivos/12')) return route.fulfill({ contentType: 'image/png', body: imageBytes });
      if (pathname.endsWith('/expediente')) return json({ config: dossierDefaults(), version: 0 });
      if (pathname.endsWith('/minuta-texto')) {
        if (request.method() === 'GET') { if (new URL(request.url()).searchParams.get('format') === 'pdf') return route.fulfill({ contentType: 'application/pdf', body: Buffer.from(await minutePdf(saved.data, { images: { 12: new Uint8Array(imageBytes) } })) }); return json({ ...saved, property, propertyCode: property.code }); }
        const body = request.postDataJSON();
        if (request.method() === 'PUT') {
          if (conflict) return route.fulfill({ status: 409, json: { error: 'Otra persona guardó cambios. Conserva tu texto.' } });
          saves++; saved = { data: body.data, version: saved.version + 1 }; return json({ version: saved.version });
        }
        if (body.action === 'download-word') {
          assert.ok(body.data.text.trim());
          return route.fulfill({ contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: 'Word de prueba' });
        }
        if (body.action === 'extract') return json({ text: 'Contenido extraído del Word de prueba.', header: 'ENCABEZADO ORIGINAL', footer: 'PIE ORIGINAL', warnings: ['Revisa el original.'] });
        if (body.action === 'preview') return route.fulfill({ contentType: 'application/pdf', body: Buffer.from(await minutePdf(saved.data, { images: { 12: new Uint8Array(imageBytes) } })) });
        generations++; return route.fulfill({ status: 201, json: { id: 99 } });
      }
      if (pathname.endsWith('/archivos/99')) return route.fulfill({ contentType: 'application/pdf', body: Buffer.from(await minutePdf(saved.data, { images: { 12: new Uint8Array(imageBytes) } })) });
      return json({});
    });
    await page.goto(`http://127.0.0.1:3154?${operation}`);
    const section = page.locator(`[data-document-type="${rental ? 'ESTRUCTURA_CONTRATO_ALQUILER' : 'ESTRUCTURA_MINUTA'}"]`);
    await section.getByRole('button', { name: openLabel }).click();
    const dialog = page.getByRole('dialog', { name: dialogLabel, exact: true });
    const text = dialog.getByLabel(rental ? 'Contenido de la estructura de alquiler' : 'Contenido de la estructura de minuta');
    await dialog.getByRole('button', { name: 'Usar estructura base', exact: true }).waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Usar estructura base', exact: true }).count(), 1);
    await useBase(dialog);
    assert.match(await text.textContent(), rental ? /DATOS ARRENDADORES/ : /DATOS VENDEDORES/);
    assert.match(await text.textContent(), /OBSERVACIONES/);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/modelo-original-${operation}-${width}.png`, fullPage: true });
    assert.ok(await text.locator('[data-minute-format]').evaluateAll(nodes => nodes.some(node => node.style.textDecoration === 'underline' && node.style.fontWeight === '700')));
    await documentOption(dialog, 'Deshacer incorporación de estructura');
    assert.equal(await text.textContent(), '');
    await openStarting(dialog); await dialog.getByRole('button', { name: 'Usar un Word', exact: true }).click();
    await dialog.getByLabel('Extraer de un Word existente').selectOption('4');
    await dialog.getByRole('button', { name: 'Extraer texto', exact: true }).click();
    await dialog.getByRole('button', { name: 'Usar encabezado y pie del Word' }).click();
    await dialog.getByRole('button', { name: 'Incorporar texto al editor', exact: true }).click();
    assert.equal(await dialog.getByLabel('Encabezado de cada página').inputValue(), 'ENCABEZADO ORIGINAL');
    await dialog.getByLabel('Título del documento').fill('ESTRUCTURA MINUTA DE PRUEBA');
    const before = await text.textContent();
    await useBase(dialog);
    assert.equal(await text.textContent(), before);
    await dialog.getByRole('button', { name: 'Reemplazar contenido…', exact: true }).click();
    await dialog.getByRole('button', { name: 'Cancelar incorporación', exact: true }).click();
    assert.equal(await text.textContent(), before);
    await useBase(dialog);
    await dialog.getByRole('button', { name: 'Reemplazar contenido…', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmar reemplazo del contenido', exact: true }).click();
    assert.ok(!(await text.textContent()).startsWith('Contenido extraído'));
    assert.equal(await dialog.getByLabel('Encabezado de cada página').inputValue(), 'ENCABEZADO ORIGINAL');
    assert.equal(await dialog.getByLabel(/^Pie de cada página/).inputValue(), 'PIE ORIGINAL');
    assert.equal(await dialog.getByLabel('Título del documento').inputValue(), 'ESTRUCTURA MINUTA DE PRUEBA');
    await documentOption(dialog, 'Deshacer incorporación de estructura');
    assert.equal(await text.textContent(), before);
    await useBase(dialog);
    await dialog.getByRole('button', { name: 'Añadir al final', exact: true }).click();
    assert.match(await text.textContent(), /^Contenido extraído/);
    assert.match(await text.textContent(), rental ? /DATOS ARRENDATARIO/ : /DATOS COMPRADORES/);
    const beforeTyping = await text.textContent();
    await selectRange(text, 0, 0); await page.keyboard.type('Prueba ');
    assert.equal(await text.textContent(), 'Prueba ' + beforeTyping);
    await page.keyboard.press('Control+z'); assert.equal(await text.textContent(), 'Prueba' + beforeTyping);
    await page.keyboard.press('Control+Shift+z'); assert.equal(await text.textContent(), 'Prueba ' + beforeTyping);
    await selectRange(text, 0, 7); await page.keyboard.press('Backspace');
    assert.equal(await text.textContent(), beforeTyping);
    await selectRange(text, beforeTyping.length, beforeTyping.length); await page.keyboard.press('Enter');
    await page.keyboard.insertText('Línea adicional de prueba.');
    assert.ok((await text.textContent()).endsWith('\nLínea adicional de prueba.'), JSON.stringify((await text.textContent()).slice(-180)));
    await dialog.getByLabel('Referencia inferior izquierda').fill('Referencia libre de prueba');
    await dialog.getByLabel('Numeración o texto inferior derecho').fill('Hoja {pagina} / {total}');
    await presentation(dialog, false);
    await selectRange(text, 0, 9);
    await dialog.getByRole('button', { name: 'Resaltar selección', exact: true }).click();
    await dialog.getByRole('button', { name: 'Negrita', exact: true }).click();
    await dialog.getByRole('button', { name: 'Subrayado', exact: true }).click();
    await dialog.getByLabel('Tamaño de letra', { exact: true }).selectOption('18');
    assert.equal(await text.locator('[data-minute-format]').first().evaluate(span => getComputedStyle(span).fontWeight), '700');
    await selectRange(text, 10, 18);
    await dialog.getByRole('button', { name: 'Sombrear selección', exact: true }).click();
    if (!rental) {
      await presentation(dialog);
      const watermark = dialog.getByLabel('Incluir marca de agua con el logo de la inmobiliaria');
      assert.equal(await watermark.isChecked(), false); await watermark.check();
      await dialog.getByLabel('Tamaño de marca de agua').selectOption('160');
      await presentation(dialog, false);
      await dialog.getByLabel('Añadir imagen', { exact: true }).setInputFiles({ name: 'prueba.png', mimeType: 'image/png', buffer: imageBytes });
      await dialog.getByLabel('Descripción de imagen 1').fill('Imagen del piloto');
      await dialog.getByLabel('Ancho de imagen 1 (mm)').fill('80');
      await dialog.getByLabel('Alineación de imagen 1').selectOption('right');
      await dialog.getByLabel('Ubicación de imagen 1').selectOption('0');
      assert.equal(await dialog.getByRole('img', { name: 'Imagen del piloto' }).count(), 1);
      await page.screenshot({ path: `${out}/imagenes-${width}.png`, fullPage: true });
    }
    const previousSaves = saves;
    await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
    const preview = dialog.getByRole('article', { name: 'Vista previa del documento' });
    await preview.waitFor();
    if (!rental) assert.equal(await preview.getByRole('img', { name: 'Imagen del piloto' }).count(), 1);
    const [word] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Descargar Word', exact: true }).click()]);
    assert.equal(word.suggestedFilename(), rental ? 'estructura-alquiler.docx' : 'estructura-minuta.docx');
    assert.equal(saves, previousSaves);
    await dialog.getByRole('button', { name: 'Volver al editor', exact: true }).click();
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await dialog.getByText('Texto guardado.', { exact: true }).waitFor();
    assert.equal(await dialog.locator('object,iframe').count(), 0);
    const popupPromise = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: 'Ver archivo ↗', exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForURL(/format=pdf/);
    assert.equal(generations, 0); assert.equal(saves, 1);
    assert.equal(saved.data.highlights.length, 2); assert.equal(saved.data.formats[0].bold, true); assert.equal(saved.data.formats[0].underline, true); assert.equal(saved.data.formats[0].size, 18); assert.equal(saved.data.footerReference, 'Referencia libre de prueba');
    await popup.close();
    await dialog.locator('[data-minute-scroll]').evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: `${out}/editor-${operation}-${width}.png`, fullPage: true });
    assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth), false);
    const toolbar = dialog.getByRole('toolbar', { name: 'Formato del contenido' });
    const scroller = dialog.locator('[data-minute-scroll]');
    await scroller.evaluate(element => { element.scrollTop = 700; });
    const toolbarBox = await toolbar.boundingBox(), footerBox = await dialog.locator('footer').boundingBox();
    assert.ok(toolbarBox.y < footerBox.y && toolbarBox.y >= (await scroller.boundingBox()).y - 1, 'Barra de formato accesible al desplazar');
    assert.ok((await dialog.getByRole('button', { name: 'Generar PDF', exact: true }).boundingBox()).height <= 60, 'Acciones compactas sin salto de línea');
    await dialog.getByRole('button', { name: 'Generar PDF', exact: true }).click();
    const link = dialog.getByRole('link', { name: 'Ver archivo generado ↗', exact: true });
    await link.waitFor(); assert.equal(await link.getAttribute('target'), '_blank');
    assert.ok((await dialog.getByRole('link', { name: 'Descargar PDF guardado', exact: true }).getAttribute('href')).includes('download=1'));
    assert.equal(await dialog.locator('object,iframe').count(), 0);
    assert.equal(generations, 1);
    await dialog.getByRole('button', { name: 'Cerrar editor', exact: true }).click();
    await section.getByRole('button', { name: openLabel }).click();
    assert.equal(await dialog.getByLabel('Título del documento').isVisible(), false);
    assert.equal(await dialog.locator('summary').filter({ hasText: /^Cambiar punto de partida$/ }).locator('..').evaluate(details => details.open), false);
    await presentation(dialog);
    await dialog.getByLabel('Título del documento').waitFor();
    assert.equal(await dialog.getByLabel('Título del documento').inputValue(), saved.data.title);
    assert.equal(await dialog.getByLabel('Referencia inferior izquierda').inputValue(), 'Referencia libre de prueba');
    if (!rental) {
      assert.equal(await dialog.getByLabel('Incluir marca de agua con el logo de la inmobiliaria').isChecked(), true);
      assert.equal(saved.data.images[0].caption, 'Imagen del piloto');
      assert.equal(saved.data.images[0].width, 80); assert.equal(saved.data.images[0].after, 0);
      assert.equal(await dialog.getByLabel('Descripción de imagen 1').inputValue(), 'Imagen del piloto');
      await dialog.getByRole('button', { name: 'Quitar imagen 1 del contenido', exact: true }).click();
      assert.equal(await dialog.getByLabel('Descripción de imagen 1').count(), 0);
      await dialog.getByLabel('Incluir marca de agua con el logo de la inmobiliaria').uncheck();
    }
    assert.equal(await text.locator('.bg-yellow-200').count(), 1);
    assert.equal(await text.locator('[data-minute-format]').first().evaluate(span => getComputedStyle(span).fontWeight), '700');
    await presentation(dialog, false);
    await selectRange(text, 0, 9);
    await dialog.getByRole('button', { name: 'Quitar formato de selección', exact: true }).click();
    assert.equal(await text.locator('.bg-yellow-200').count(), 0);
    assert.equal(await text.locator('[data-minute-format]').first().evaluate(span => getComputedStyle(span).fontWeight), '400');
    conflict = true; await text.fill('Cambio pendiente que debe conservarse.');
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await dialog.getByRole('alert').waitFor(); assert.equal(await text.textContent(), 'Cambio pendiente que debe conservarse.');
    assert.equal(await dialog.getByRole('button', { name: 'Cerrar editor', exact: true }).isDisabled(), true);
    await documentOption(dialog, 'Descartar cambios sin guardar');
    await dialog.getByRole('button', { name: 'Cerrar editor', exact: true }).click();
    assert.equal(await section.getByText('Word existente de prueba', { exact: true }).count(), 1);
    assert.deepEqual(errors, []); await context.close(); console.log(`Editor de estructura ${operation} ${width}px: correcto`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
