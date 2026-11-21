import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { build } from 'esbuild';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import sharp from 'sharp';
import { emptyMinute } from '../lib/minute-document.ts';
import { documentEditorConfig } from '../lib/document-editor.ts';
import { minutePdf } from '../lib/minute-export.ts';
import { dossierDefaults } from '../lib/transaction-dossier.mjs';
const { chromium } = await import('/home/codespace/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const out = 'output/promesa-editor'; await fs.mkdir(out, { recursive: true });
const compiled = await compile(await fs.readFile('app/globals.css', 'utf8'), { base: new URL('../app/', import.meta.url).pathname, onDependency() {} });
const scanner = new Scanner({ sources: [{ base: process.cwd(), pattern: 'app/**/*.{tsx,ts}', negated: false }] });
const css = compiled.build(scanner.scan());
await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import Dossier from './app/components/TransactionDossier';const noop=()=>{};const files=['ESTRUCTURA_PROMESA_VENTA','PROMESA_ARRAS'].map((tipoDocumento,i)=>({id:i+4,nombre:'Word '+tipoDocumento,nombreOriginal:'modelo.docx',tipoDocumento,almacenamiento:'hosting',enlace:'/api/inmuebles/1/archivos/'+(i+4),tipoMime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));createRoot(document.getElementById('root')).render(<Dossier propertyId={1} operation="venta" view="carpeta" section="contratos" files={files} uploadReady administrator readOnly={location.search.includes('readonly')} onChanged={async()=>{}} onBusyChange={noop} onDirtyChange={noop}/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, jsx: 'automatic', outfile: `${out}/workspace.js`, define: { 'process.env.NODE_ENV': '"production"' } });
const js = await fs.readFile(`${out}/workspace.js`);
const png = await sharp({ create: { width: 220, height: 150, channels: 3, background: '#bfe0ed' } }).png().toBuffer();
const server = http.createServer((req, res) => { res.setHeader('content-type', req.url === '/workspace.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/workspace.js' ? js : `<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/workspace.js"></script>`); });
await new Promise(resolve => server.listen(3155, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
async function presentation(dialog) { const details = dialog.getByText('Encabezado y pie', { exact: true }).locator('..'); if (!(await details.evaluate(node => node.open))) await details.locator(':scope > summary').click(); }
try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } }), page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const property = { operation: 'venta', code: 'INM-PRUEBA', type: 'Casa', address: 'Dirección de prueba' };
    const snapshots = new Map(); let nextImage = 12, conflict = false; const generated = [], uploaded = [];
    const imageMap = {};
    for (const kind of ['minute', 'promise-structure', 'promise-contract']) snapshots.set(kind, { version: 0, data: { ...emptyMinute(), title: documentEditorConfig(kind).title } });
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), kind = url.searchParams.get('document') || 'minute';
      const json = body => route.fulfill({ json: body });
      if (url.pathname.endsWith('/expediente')) return json({ config: dossierDefaults(), version: 0 });
      if (url.pathname.endsWith('/archivos') && request.method() === 'POST') {
        const body = request.postDataBuffer(); assert.ok(body.includes(Buffer.from('PROMESA_ARRAS')));
        uploaded.push('PROMESA_ARRAS'); const id = nextImage++; imageMap[id] = new Uint8Array(png); return json({ id });
      }
      if (/\/archivos\/\d+$/.test(url.pathname)) return route.fulfill({ contentType: 'image/png', body: png });
      if (!url.pathname.endsWith('/minuta-texto')) return json({});
      const saved = snapshots.get(kind);
      if (request.method() === 'GET') {
        if (url.searchParams.get('format') === 'pdf') return route.fulfill({ contentType: 'application/pdf', body: Buffer.from(await minutePdf(saved.data, { kind, images: imageMap })) });
        return json({ ...saved, property, propertyCode: property.code });
      }
      const body = request.postDataJSON();
      if (body.action === 'download-word') {
        assert.ok(body.data.text.trim());
        return route.fulfill({ contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: Buffer.from('Word de prueba') });
      }
      if (request.method() === 'PUT') {
        if (conflict) return route.fulfill({ status: 409, json: { error: 'Otra persona guardó cambios.' } });
        snapshots.set(kind, { data: body.data, version: saved.version + 1 }); return json({ version: saved.version + 1 });
      }
      if (body.action === 'extract') { assert.equal(body.fileId, kind === 'promise-structure' ? 4 : 5); return json({ text: 'Texto de Word de apoyo.', header: '', footer: '', warnings: ['Solo texto.'] }); }
      generated.push(documentEditorConfig(kind).category); return json({ id: 99 });
    });
    await page.goto('http://127.0.0.1:3155');
    for (const kind of ['promise-structure', 'promise-contract']) {
      const config = documentEditorConfig(kind), section = page.locator(`[data-document-type="${config.category}"]`);
      await section.getByRole('button', { name: config.open, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: `Editor de ${config.label}`, exact: true });
      await dialog.getByRole('button', { name: 'Usar estructura base', exact: true }).waitFor();
      const text = dialog.getByRole('textbox', { name: `Contenido de ${config.label}`, exact: true });
      assert.equal(await text.textContent(), '');
      await dialog.getByRole('button', { name: 'Usar un Word', exact: true }).click();
      await dialog.getByLabel('Extraer de un Word existente').selectOption(kind === 'promise-structure' ? '4' : '5');
      assert.equal(await dialog.getByLabel('Extraer de un Word existente').locator('option').count(), 2);
      await dialog.getByRole('button', { name: 'Extraer texto', exact: true }).click();
      await dialog.getByRole('button', { name: 'Incorporar texto al editor', exact: true }).waitFor();
      await dialog.getByRole('button', { name: 'Usar estructura base', exact: true }).click();
      assert.match(await text.textContent(), kind === 'promise-structure' ? /9. OBSERVACIONES PARA NOTARÍA/ : /NOVENO. DOMICILIOS Y SOLUCIÓN DE CONTROVERSIAS/);
      if (kind === 'promise-contract') {
        for (let i = 1; i <= 2; i++) {
          await dialog.getByLabel('Añadir imagen', { exact: true }).setInputFiles({ name: `comprobante-${i}.png`, mimeType: 'image/png', buffer: png });
          const caption = dialog.getByLabel(`Descripción de imagen ${i}`);
          await caption.waitFor(); await caption.fill(`Comprobante sintético ${i}`);
          if (i === 1) {
            const ratioLock = dialog.getByLabel('Mantener proporción de imagen 1', { exact: true });
            await page.waitForFunction(() => { const input = document.querySelector('[aria-label="Mantener proporción de imagen 1"]'); return input && !input.disabled; });
            assert.equal(await ratioLock.isChecked(), true);
            await dialog.getByLabel('Alto de imagen 1 (mm)').fill('30');
            assert.equal(Number(await dialog.getByLabel('Ancho de imagen 1 (mm)').inputValue()), 44);
            await ratioLock.uncheck();
            await dialog.getByLabel('Ancho de imagen 1 (mm)').fill('70');
            assert.equal(Number(await dialog.getByLabel('Alto de imagen 1 (mm)').inputValue()), 30);
            await dialog.getByLabel('Alto de imagen 1 (mm)').fill('40');
          }

          const content = await text.textContent(), marker = 'COMPROBANTES DEL PAGO A LA PROMESA: [Incorporar aquí las imágenes correspondientes a esta operación].';
          await dialog.getByLabel(`Ubicación de imagen ${i}`).selectOption(String(content.indexOf(marker) + marker.length));
        }
        await dialog.getByLabel('Distribución de imágenes', { exact: true }).selectOption(width === 375 ? '2' : '3');
      }
      await presentation(dialog);
      const previewText = (await text.textContent()).trim().slice(0, 24);
      await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
      const preview = dialog.getByRole('article', { name: 'Vista previa del documento' });
      await preview.waitFor();
      assert.ok((await preview.innerText()).includes(previewText));
      const [word] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Descargar Word', exact: true }).click()]);
      assert.equal(word.suggestedFilename(), config.filename + '.docx');
      assert.equal(snapshots.get(kind).version, 0);
      await dialog.getByRole('button', { name: 'Volver al editor', exact: true }).click();
      await preview.waitFor({ state: 'detached' });
      const watermark = dialog.getByLabel('Incluir marca de agua con el logo de la inmobiliaria');
      assert.equal(await watermark.isChecked(), false);
      if (kind === 'promise-contract') await watermark.check();
      await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
      await dialog.getByText('Texto guardado.', { exact: true }).waitFor();
      const original = snapshots.get(kind).data.text;
      const popupPromise = page.waitForEvent('popup'); await dialog.getByRole('button', { name: 'Ver archivo ↗', exact: true }).click();
      const popup = await popupPromise; await popup.waitForURL(new RegExp(`document=${kind}.*format=pdf`)); await popup.close();
      await dialog.getByRole('button', { name: 'Generar PDF', exact: true }).click();
      await dialog.getByRole('link', { name: 'Ver archivo generado ↗', exact: true }).waitFor();
      assert.equal(generated.at(-1), config.category);
      await dialog.getByRole('button', { name: 'Cerrar editor', exact: true }).click();
      await section.getByRole('button', { name: config.open, exact: true }).click(); await text.waitFor();
      assert.equal(await text.textContent(), original);
      if (kind === 'promise-contract') {
        assert.equal(await dialog.getByLabel('Descripción de imagen 2').inputValue(), 'Comprobante sintético 2');
        assert.equal(snapshots.get(kind).data.images.length, 2);
        assert.equal(snapshots.get(kind).data.images[0].height, 40);
        assert.equal(snapshots.get(kind).data.images[0].keepRatio, false);
        assert.equal(Number(await dialog.getByLabel('Alto de imagen 1 (mm)').inputValue()), 40);
        await presentation(dialog); assert.equal(await watermark.isChecked(), true);
        await dialog.getByText('Encabezado y pie', { exact: true }).click();
        await dialog.getByLabel('Distribución de imágenes', { exact: true }).scrollIntoViewIfNeeded();
      }
      assert.equal(await dialog.evaluate(node => node.scrollWidth > node.clientWidth), false);
      await page.screenshot({ path: `${out}/${kind}-${width}.png`, fullPage: true });
      conflict = true; await text.fill('Contenido pendiente que debe conservarse.');
      await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
      await dialog.getByRole('alert').waitFor(); assert.equal(await text.textContent(), 'Contenido pendiente que debe conservarse.');
      await dialog.getByLabel('Más opciones del documento').click();
      await dialog.getByRole('button', { name: 'Descartar cambios sin guardar', exact: true }).click();
      await dialog.getByRole('button', { name: 'Cerrar editor', exact: true }).click(); conflict = false;
    }
    assert.equal(snapshots.get('minute').version, 0); assert.equal(uploaded.length, 2);
    assert.notEqual(snapshots.get('promise-contract').data.text, snapshots.get('promise-structure').data.text);
    await page.goto('http://127.0.0.1:3155?readonly');
    await page.locator('[data-document-type="PROMESA_ARRAS"]').getByRole('button', { name: 'Consultar texto del contrato', exact: true }).click();
    const readDialog = page.getByRole('dialog');
    await readDialog.getByRole('textbox', { name: 'Contenido de Contrato de Promesa de Venta', exact: true }).waitFor();
    assert.equal(await readDialog.getByRole('textbox', { name: 'Contenido de Contrato de Promesa de Venta', exact: true }).getAttribute('contenteditable'), 'false');
    assert.equal(await readDialog.getByLabel('Añadir imagen', { exact: true }).isDisabled(), true);
    assert.equal(await readDialog.getByRole('button', { name: 'Generar PDF', exact: true }).count(), 0);
    assert.deepEqual(errors, []); await context.close(); console.log(`Promesa: estructura, contrato, imágenes, aislamiento y solo consulta ${width}px: correcto`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
