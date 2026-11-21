// Run after next build: catches build-machine paths in serverless OCR assets.
import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const base = process.env.DOCUMENT_BUILD_DIRECTORY || '.next';
let completeBuild = false;
try { await access(`${base}/BUILD_ID`); completeBuild = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
test('production OCR runtime assets are packaged', { skip: !completeBuild && !process.env.DOCUMENT_BUILD_DIRECTORY ? 'Requires a completed next build; local build is missing or incomplete' : false }, async () => {
const path = `${base}/server/app/api/inmuebles/[id]/texto-documentos/route.js`;
const { files } = JSON.parse(await readFile(`${path}.nft.json`, 'utf8'));
// Webpack can extract the OCR module into a shared server chunk.
const modules = await Promise.all([path, ...files.filter(file => /(?:^|\/)chunks\/.*\.js$/.test(file)).map(file => resolve(dirname(path), file))].map(file => readFile(file, 'utf8')));
const ocrModules = modules.filter(code => code.includes('tesseract.js/src/worker-script/node/index.js'));
assert.ok(ocrModules.length, 'The function must include the OCR module');
for (const code of ocrModules) {
  assert.doesNotMatch(code, /createRequire[^;]{0,300}file:\/\//, 'OCR must not resolve node_modules from the build machine');
  assert.match(code, /createRequire[^;]{0,300}process\.cwd\(\)/, 'OCR must use the runtime application directory');
}
for (const [label, match] of [
  ['worker', p => p.includes('worker-script/node/index.js')],
  ['WASM', p => p.endsWith('.wasm')],
  ['Spanish model', p => p.includes('spa.traineddata.gz')],
  ['canvas binary', p => p.includes('canvas') && p.endsWith('.node')],
  ['PDF runtime', p => p.endsWith('/pdf.mjs')],
]) assert.ok(files.some(match), `${label} must be included in the function`);
console.log('PASS: runtime OCR paths, worker, WASM, Spanish model, canvas and PDF runtime are packaged.');
});
