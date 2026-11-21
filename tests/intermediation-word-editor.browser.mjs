import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import JSZip from 'jszip';

const { chromium } = await import('/home/codespace/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const out = 'output/intermediation-word-editor';
await mkdir(out, { recursive: true });
await build({
  stdin: {
    contents: `
      import { createRoot } from 'react-dom/client';
      import LetterEditor from './app/components/LetterEditor';
      const store = async file => { window.result = Array.from(new Uint8Array(await file.arrayBuffer())); };
      createRoot(document.getElementById('root')).render(<LetterEditor contract source="/contract.docx"
        name="Contrato" uploadReady onClose={() => {}} onPending={() => {}}
        onAttach={store} onSave={location.search ? store : undefined} />);
    `,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, jsx: 'automatic', outfile: out + '/editor.js',
  define: { 'process.env.NODE_ENV': '"production"' },
});

const fixture = await JSZip.loadAsync(await readFile('assets/intermediacion/alquiler.docx'));
const namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
fixture.file('word/document.xml', `<w:document xmlns:w="${namespace}"><w:body>
  <w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="24"/></w:rPr><w:t>Inicio del contrato</w:t></w:r></w:p>
  <w:p><w:r><w:t>Cláusula segunda</w:t></w:r></w:p>
  <w:p><w:r><w:drawing/></w:r></w:p>
</w:body></w:document>`);
const word = await fixture.generateAsync({ type: 'nodebuffer' });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const draft of [true, false]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://editor.test/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/contract.docx') return route.fulfill({ body: word, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      if (path === '/editor.js') return route.fulfill({ path: out + '/editor.js', contentType: 'text/javascript' });
      return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script src="/editor.js"></script>' });
    });
    await page.goto('https://editor.test/' + (draft ? '?draft' : ''));
    const editor = page.getByRole('textbox', { name: 'Texto completo del contrato' });
    await editor.waitFor();
    assert.equal(await page.locator('textarea').count(), 0);
    async function select(start, end) {
      await editor.evaluate((root, offsets) => {
        root.focus();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        const point = offset => {
          for (const node of nodes) {
            if (offset <= node.length) return [node, offset];
            offset -= node.length;
          }
          throw Error('Offset fuera del documento');
        };
        const range = document.createRange();
        range.setStart(...point(offsets[0]));
        range.setEnd(...point(offsets[1]));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        root.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }, [start, end]);
    }
    await select(0, 6);
    await page.getByRole('button', { name: 'Negrita', exact: true }).click();
    await page.getByRole('button', { name: 'Cursiva', exact: true }).click();
    await page.getByRole('button', { name: 'Subrayado', exact: true }).click();
    await page.getByLabel('Tipo de letra').selectOption('Arial');
    await page.getByLabel('Tamaño de letra').selectOption('16');
    await page.getByLabel('Color de letra').fill('#123456');
    await page.getByRole('button', { name: 'Sombrear selección' }).click();
    await select(0, 0);
    await editor.press('Home');
    await editor.press('Enter');
    await editor.press('ArrowUp');
    await editor.press('Home');
    await page.keyboard.insertText('Texto nuevo');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: draft ? 'Descargar borrador' : 'Descargar Word', exact: true }).click();
    const download = await downloading;
    const downloadedWord = await JSZip.loadAsync(await readFile(await download.path()));
    await page.getByRole('button', { name: draft ? 'Guardar borrador' : 'Preparar para adjuntar' }).click();
    await page.waitForFunction(() => Boolean(window.result));
    const bytes = await page.evaluate(() => window.result);
    const output = await JSZip.loadAsync(Uint8Array.from(bytes));
    const xml = await output.file('word/document.xml').async('string');
    assert.equal(await downloadedWord.file('word/document.xml').async('string'), xml);
    assert.match(xml, /<w:rFonts[^>]*w:ascii="Arial"/);
    assert.match(xml, /<w:sz w:val="32"/);
    assert.match(xml, /<w:b w:val="1"/);
    assert.match(xml, /<w:i w:val="1"/);
    assert.match(xml, /<w:u w:val="single"/);
    assert.match(xml, /<w:color w:val="123456"/);
    assert.match(xml, /<w:shd[^>]*w:fill="E2E8F0"/);
    assert.match(xml, /<w:drawing\/>/);
    assert.match(xml, /Texto nuevo/);
    assert.match(xml, /Cláusula segunda/);
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
