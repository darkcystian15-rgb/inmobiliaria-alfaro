import test from 'node:test';
import assert from 'node:assert/strict';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { build } from 'esbuild';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import { minuteBase } from '../lib/minute-template.ts';
import { emptyMinute, updateMinuteText } from '../lib/minute-document.ts';

await fs.mkdir('output/minuta-texto', { recursive: true });
await build({ entryPoints: ['app/api/inmuebles/[id]/minuta-texto/route.ts'], outfile: 'output/minuta-texto/api.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'boundaries', setup(b) {
  const modules = {
    'server-only': '', 'next/server': 'export {NextResponse} from "next/server.js"',
    '@/lib/auth': 'export async function authorizeApi(){return globalThis.mt.denied?{response:Response.json({error:"Sin permiso"},{status:403})}:{user:{id:7},response:null}}',
    '@/lib/db': 'export const db=new Proxy({},{get(_,key){return globalThis.mt.db[key]}});export const pool={async getConnection(){return {async query(sql){return [[{acquired:globalThis.mt.locked?0:1}]]},release(){globalThis.mt.released++}}}}',
    '@/lib/data-integrity-service': 'export async function assertWritable(){if(globalThis.mt.closed)throw Error("El expediente está cerrado");}',
    '@/lib/document-hosting': 'export async function hostingRequest(){globalThis.mt.reads++;return new Response("word-content");}',
    '@/lib/minute-word': 'export async function extractMinuteWord(){return {text:"Extraído",header:"Encabezado",footer:"Pie",warnings:[]};}',
    '../archivos/route': 'export async function POST(request){const f=await request.formData();globalThis.mt.uploads++;globalThis.mt.lastUpload={category:f.get("tipoDocumento"),name:f.get("archivo").name,observacion:f.get("observacion")};if(globalThis.mt.uploadFail)return Response.json({error:"Falló hosting"},{status:503});globalThis.mt.pdfFiles.push({id:99,category:f.get("tipoDocumento"),name:f.get("archivo").name});return Response.json({id:99},{status:201});}',
  };
  b.onResolve({ filter: /^(?:@\/lib\/|next\/server$|server-only$|\.\.\/archivos\/route$)/ }, a => a.path in modules ? { path: a.path, namespace: 'boundary' } : null);
  b.onLoad({ filter: /.*/, namespace: 'boundary' }, a => ({ contents: modules[a.path], loader: 'js', resolveDir: process.cwd() }));
} }] });
const api = await import('../output/minuta-texto/api.mjs');
const ctx = { params: Promise.resolve({ id: '1' }) };
const req = (method, body, kind = '') => new Request(`https://example.test/api/inmuebles/1/minuta-texto${kind ? `?document=${kind}` : ''}`, { method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
const fixture = () => ({ ...emptyMinute(), text: 'Contenido de la minuta de prueba.' });
function setup(options = {}) {
  const s = { denied: false, closed: false, missing: false, rental: false, snapshots: [], pdfFiles: [], writes: [], queries: [], uploads: 0, reads: 0, released: 0, source: { id: 4, rutaAlmacenamiento: '/private/test.docx', tamanoBytes: 100 }, ...options };
  s.db = {
    select(selection) { let table, condition; return { from(t) { table = t; return this; }, where(value) { condition = value; return this; }, limit() { return this; }, orderBy() { return this; }, for() { return this; }, then(resolve, reject) {
      const name = table?.[Symbol.for('drizzle:Name')];
      const params = condition ? new MySqlDialect().sqlToQuery(condition).params : [];
      s.queries.push({ table: name, params });
      const rows = name === 'inm_inmuebles' ? (s.missing ? [] : [{ id: 1, operacion: s.invalidOperation ? 'otro' : s.rental ? 'alquiler' : 'venta', tipo: 'Departamento', codigo: 'INM-PRUEBA', direccion: 'Dirección de la ficha' }]) : name === 'inm_timeline' ? s.snapshots.filter(row => params.includes(row.evento)).slice(-1) : name === 'inm_archivos' ? (selection ? s.pdfFiles.filter(file => params.includes(file.category) && params.includes(file.name)) : s.source && (!s.source.tipoDocumento || params.includes(s.source.tipoDocumento)) && (!s.source.inmuebleId || params.includes(s.source.inmuebleId)) ? [s.source] : []) : [];
      return Promise.resolve(rows).then(resolve, reject);
    } }; },
    insert(table) { return { async values(v) { s.writes.push(v); if (table[Symbol.for('drizzle:Name')] === 'inm_timeline') { const id = s.snapshots.length + 1; s.snapshots.push({ id, ...v }); return [{ insertId: id }]; } return [{}]; } }; },
    async transaction(fn) { return fn(s.db); },
  }; globalThis.mt = s; return s;
}
test('acceso, cierre, operación y validación impiden guardar sin autorización', async () => {
  for (const [options, status] of [[{ denied: true }, 403], [{ closed: true }, 409], [{ missing: true }, 404], [{ invalidOperation: true }, 400]]) {
    const s = setup(options); assert.equal((await api.PUT(req('PUT', { data: fixture(), version: 0 }), ctx)).status, status); assert.equal(s.writes.length, 0);
  }
  setup(); assert.equal((await api.PUT(req('PUT', { data: { ...fixture(), text: 'a'.repeat(20001) }, version: 0 }), ctx)).status, 400);
});
test('versiones de texto inmutables y conflicto sin sobrescritura', async () => {
  const s = setup(); assert.equal((await api.PUT(req('PUT', { data: fixture(), version: 0 }), ctx)).status, 200);
  const original = s.snapshots[0].observacion;
  assert.equal((await api.PUT(req('PUT', { data: fixture(), version: 0 }), ctx)).status, 409); assert.equal(s.snapshots.length, 1);
  assert.equal((await api.PUT(req('PUT', { data: { ...fixture(), text: 'Nueva versión' }, version: 1 }), ctx)).status, 200);
  assert.equal(s.snapshots[0].observacion, original);
  assert.equal((await (await api.GET(req('GET'), ctx)).json()).data.text, 'Nueva versión');
});

test('negrita y tamaño se validan y conservan al guardar y reabrir', async () => {
  const s = setup();
  const data = { ...fixture(), formats: [{ start: 0, end: 9, bold: true, size: 18 }] };
  assert.equal((await api.PUT(req('PUT', { data, version: 0 }), ctx)).status, 200);
  const reopened = await (await api.GET(req('GET'), ctx)).json();
  assert.deepEqual(reopened.data.formats, data.formats);
  const invalid = { ...data, formats: [{ start: 0, end: 9, size: 99 }] };
  assert.equal((await api.PUT(req('PUT', { data: invalid, version: 1 }), ctx)).status, 400);
  assert.equal(s.snapshots.length, 1);
});
test('extraer conserva fuentes y borradores; documento ausente o muy grande falla', async () => {
  const s = setup(); const original = JSON.stringify(s.source);
  const response = await api.POST(req('POST', { action: 'extract', fileId: 4 }), ctx);
  assert.equal(response.status, 200); assert.equal((await response.json()).text, 'Extraído'); assert.equal(s.writes.length, 0); assert.equal(s.uploads, 0); assert.equal(JSON.stringify(s.source), original);
  s.source = null; assert.equal((await api.POST(req('POST', { action: 'extract', fileId: 4 }), ctx)).status, 404);
  s.source = { rutaAlmacenamiento: '/private/test.docx', tamanoBytes: 13 * 1024 * 1024 }; assert.equal((await api.POST(req('POST', { action: 'extract', fileId: 4 }), ctx)).status, 400);
});
test('vista previa no adjunta, PDF usa categoría correcta y reintento no duplica', async () => {
  const s = setup(); await api.PUT(req('PUT', { data: fixture(), version: 0 }), ctx);
  const direct = await api.GET(new Request('https://example.test/api/inmuebles/1/minuta-texto?format=pdf&version=1'), ctx);
  assert.equal(direct.headers.get('content-type'), 'application/pdf'); assert.match(direct.headers.get('content-disposition'), /^inline/); assert.equal(s.uploads, 0);
  assert.equal((await api.GET(new Request('https://example.test/api/inmuebles/1/minuta-texto?format=pdf&version=99'), ctx)).status, 409);
  const preview = await api.POST(req('POST', { action: 'preview', version: 1 }), ctx); assert.equal(preview.headers.get('content-type'), 'application/pdf'); assert.equal(s.uploads, 0);
  assert.equal((await api.POST(req('POST', { action: 'generate', version: 1 }), ctx)).status, 201); assert.equal(s.lastUpload.category, 'ESTRUCTURA_MINUTA'); assert.match(s.lastUpload.name, /\.pdf$/);
  assert.equal((await (await api.POST(req('POST', { action: 'generate', version: 1 }), ctx)).json()).existing, true); assert.equal(s.uploads, 1);
  assert.equal((await api.POST(req('POST', { action: 'generate', version: 2 }), ctx)).status, 409);
});
test('fallo de hosting permite reintentar; cierre impide incluso reutilizar adjunto', async () => {
  const s = setup({ uploadFail: true }); await api.PUT(req('PUT', { data: fixture(), version: 0 }), ctx);
  assert.equal((await api.POST(req('POST', { action: 'generate', version: 1 }), ctx)).status, 503); assert.equal(s.snapshots.length, 1);
  s.uploadFail = false; assert.equal((await api.POST(req('POST', { action: 'generate', version: 1 }), ctx)).status, 201);
  s.closed = true; assert.equal((await api.POST(req('POST', { action: 'generate', version: 1 }), ctx)).status, 409);
  assert.equal((await api.POST(req('POST', { action: 'preview', version: 1 }), ctx)).status, 200);
});

 test('alquiler toma la operación registrada, guarda estructura y genera en su categoría', async () => {
  const s = setup({ rental: true });
  const initial = await (await api.GET(req('GET'), ctx)).json();
  assert.equal(initial.property.operation, 'alquiler'); assert.equal(initial.property.type, 'Departamento');
  assert.match(initial.data.title, /Alquiler/);
  const base = minuteBase(initial.property);
  assert.match(base.text, /DATOS ARRENDADORES/); assert.ok(!base.text.includes('firma de la escritura pública'));
  const response = await api.PUT(req('PUT', { data: { ...initial.data, ...base }, version: 0 }), ctx);
  assert.equal(response.status, 200);
  assert.equal((await api.POST(req('POST', { action: 'generate', version: 1 }), ctx)).status, 201);
  assert.equal(s.lastUpload.category, 'ESTRUCTURA_CONTRATO_ALQUILER'); assert.match(s.lastUpload.name, /^estructura-alquiler-/);
  const pdf = await api.GET(new Request('https://example.test/api/inmuebles/1/minuta-texto?format=pdf&version=1'), ctx);
  assert.match(pdf.headers.get('content-disposition'), /estructura-alquiler.pdf/);
  assert.equal((await api.POST(req('POST', { action: 'extract', fileId: 4 }), ctx)).status, 200);
});

test('estructura de intermediación abre el modelo solo en alquiler, guarda aparte y descarga Word', async () => {
  const kind = 'intermediation-structure';
  setup();
  assert.equal((await api.GET(req('GET', null, kind), ctx)).status, 400);

  const s = setup({ rental: true });
  const initial = await (await api.GET(req('GET', null, kind), ctx)).json();
  assert.equal(initial.version, 0);
  assert.equal(initial.data.title, 'Estructura de Contarto de Intermediación Inmobiliaria');
  assert.match(initial.data.text, /^ESTRUCTURA DE CONTRATO DE INTERMEDIACIÓN INMOBILIARIA  :\n\n\nDATOS DEL PROPIETARIO/);
  assert.match(initial.data.text, /NOTAS PARA LA I\.A\.  :\n● CUALQUIER DATO/);
  assert.equal(initial.data.formats[0].size, 16);
  assert.equal(initial.data.formats[0].bold, true);
  const original = await api.POST(req('POST', { action: 'download-word', data: initial.data }, kind), ctx);
  assert.equal(original.status, 200);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()),
    await fs.readFile('tests/info4/ESTRUCTURA DE CONTRATO INTERMEDIACIÓN - ALQUILER (1).docx'));
  const data = updateMinuteText(initial.data, initial.data.text.replace('XXXXX    MESES', '6    MESES'));
  assert.equal((await api.PUT(req('PUT', { data, version: 0 }, kind), ctx)).status, 200);
  assert.equal(s.snapshots[0].evento, 'estructura_intermediacion_texto');
  assert.equal((await (await api.GET(req('GET', null, kind), ctx)).json()).data.text, data.text);
  assert.equal((await (await api.GET(req('GET'), ctx)).json()).version, 0);

  const word = await api.POST(req('POST', { action: 'download-word', data }, kind), ctx);
  assert.equal(word.status, 200);
  assert.match(word.headers.get('content-disposition'), /estructura-contrato-intermediacion-inmobiliaria\.docx/);
  const zip = await JSZip.loadAsync(await word.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  const body = Array.from(xml.matchAll(/<w:p>(.*?)<\/w:p>/gs), ([, paragraph]) =>
    Array.from(paragraph.matchAll(/<w:t xml:space="preserve">(.*?)<\/w:t>/gs), ([, text]) => text).join('')
  ).join('\n');
  assert.equal(body, data.text);
  assert.equal(zip.file('word/header1.xml'), null);
  assert.equal(zip.file('word/footer1.xml'), null);
});

test('imágenes del editor: guarda referencias, rechaza archivos no válidos y no genera PDF incompleto', async () => {
  const data = { ...fixture(), images: [{ fileId: 4, after: 0, width: 100, align: 'center', caption: 'Imagen de prueba' }], watermark: { enabled: true, width: 120, opacity: 0.08 } };
  const s = setup({ source: { id: 4, rutaAlmacenamiento: '/private/image.webp', tipoMime: 'image/webp', tamanoBytes: 100 } });
  assert.equal((await api.PUT(req('PUT', { data, version: 0 }), ctx)).status, 200);
  const saved = await (await api.GET(req('GET'), ctx)).json();
  assert.deepEqual(saved.data.images, data.images); assert.equal(saved.data.watermark.enabled, true);
  // The hosting boundary returns invalid bytes: rendering must fail explicitly.
  assert.equal((await api.POST(req('POST', { action: 'generate', version: 1 }), ctx)).status, 422);
  assert.equal(s.uploads, 0);
  for (const source of [null, { id: 4, rutaAlmacenamiento: '/private/document.docx', tipoMime: 'application/msword' }]) {
    setup({ source });
    assert.equal((await api.PUT(req('PUT', { data, version: 0 }), ctx)).status, 422);
  }
});

test('minuta y estructura de promesa tienen versiones, historial, categorías y adjuntos independientes', async () => {
  const s = setup();
  for (const [index, kind] of ['', 'promise-structure'].entries()) {
    const data = { ...fixture(), text: `Documento independiente ${kind || 'minuta'}` };
    const initial = await (await api.GET(req('GET', null, kind), ctx)).json();
    assert.equal(initial.version, 0);
    assert.equal((await api.PUT(req('PUT', { data, version: 0 }, kind), ctx)).status, 200);
    const reopened = await (await api.GET(req('GET', null, kind), ctx)).json();
    assert.equal(reopened.data.text, data.text); assert.equal(reopened.version, index + 1);
    const pdf = await api.POST(req('POST', { action: 'generate', version: reopened.version }, kind), ctx);
    assert.equal(pdf.status, 201);
    const category = ['', 'ESTRUCTURA_PROMESA_VENTA', 'PROMESA_ARRAS'][index] || 'ESTRUCTURA_MINUTA';
    assert.equal(s.lastUpload.category, category);
    assert.equal((await api.POST(req('POST', { action: 'generate', version: reopened.version }, kind), ctx)).status, 200);
  }
  assert.equal(s.uploads, 2);
  assert.equal(new Set(s.snapshots.map(row => row.evento)).size, 2);
  assert.match((await (await api.GET(req('GET'), ctx)).json()).data.text, /minuta/);
  assert.equal((await api.POST(req('POST', { action: 'generate', version: 1 }, 'promise-contract'), ctx)).status, 400);
  assert.equal((await api.PUT(req('PUT', { data: fixture(), version: 1 }, 'promise-contract'), ctx)).status, 400);
});
test('promesa rechaza alquiler y apartados desconocidos, y limita extracción e imágenes a su categoría e inmueble', async () => {
  setup({ rental: true });
  assert.equal((await api.GET(req('GET', null, 'promise-structure'), ctx)).status, 400);
  setup(); assert.equal((await api.GET(req('GET', null, 'inventado'), ctx)).status, 400);
  const s = setup({ source: { id: 4, inmuebleId: 1, tipoDocumento: 'ESTRUCTURA_MINUTA', rutaAlmacenamiento: '/private/image.webp', tipoMime: 'image/webp', tamanoBytes: 100 } });
  assert.equal((await api.POST(req('POST', { action: 'extract', fileId: 4 }, 'promise-structure'), ctx)).status, 404);
  const data = { ...fixture(), images: [{ fileId: 4, after: 0, width: 80, align: 'center', caption: '' }] };
  assert.equal((await api.PUT(req('PUT', { data, version: 0 }, 'promise-structure'), ctx)).status, 422);
  s.source.tipoDocumento = 'ESTRUCTURA_PROMESA_VENTA'; s.source.inmuebleId = 999;
  assert.equal((await api.PUT(req('PUT', { data, version: 0 }, 'promise-structure'), ctx)).status, 422);
  s.source.inmuebleId = 1;
  assert.equal((await api.PUT(req('PUT', { data, version: 0 }, 'promise-structure'), ctx)).status, 200);
  s.closed = true;
  assert.equal((await api.PUT(req('PUT', { data, version: 1 }, 'promise-structure'), ctx)).status, 409);
});

test('descarga Word del texto actual en los editores habilitados sin guardar ni adjuntar', async () => {
  const JSZip = (await import('jszip')).default;
  const data = {
    ...fixture(),
    text: 'Señor & área <prueba>\nSegunda línea',
    header: 'Encabezado personalizado',
    footer: 'Pie personalizado',
    formats: [{ start: 0, end: 5, bold: true, size: 18 }],
    highlights: [{ start: 0, end: 5, style: 'highlight' }],
  };
  for (const [kind, filename] of [['', 'estructura-minuta'], ['promise-structure', 'estructura-promesa-venta']]) {
    const state = setup();
    const response = await api.POST(req('POST', { action: 'download-word', data }, kind), ctx);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), new RegExp(filename + '\\.docx'));
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const content = await zip.file('word/document.xml').async('string');
    assert.match(content, /Señor/);
    assert.match(content, /&amp; área &lt;prueba&gt;/);
    assert.match(content, /w:b\/.*w:sz w:val="36".*w:highlight w:val="yellow"/);
    assert.match(await zip.file('word/header1.xml').async('string'), /Encabezado personalizado/);
    const footer = await zip.file('word/footer1.xml').async('string');
    assert.match(footer, /Pie personalizado/);
    assert.match(footer, /w:instr="NUMPAGES"/);
    assert.equal(state.writes.length, 0);
    assert.equal(state.uploads, 0);
  }
});
