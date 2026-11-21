// Exercise the actual route with isolated auth and DB boundaries; never touch real records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { dossierDefaults } from '../lib/transaction-dossier.mjs';
await mkdir('output/saneamiento-tests', { recursive: true });
await build({ entryPoints: ['app/api/inmuebles/[id]/saneamiento/route.ts'], outfile: 'output/saneamiento-tests/route.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'boundaries', setup(builder) {
  const modules = {
    'server-only': '',
    'next/server': 'export {NextResponse} from "next/server.js"',
    '@/lib/auth': 'export async function authorizeApi(){return globalThis.saneamientoTest.denied?{response:Response.json({error:"Sin permiso"},{status:403})}:{user:{id:7},response:null}}',
    '@/lib/db': 'export const db=new Proxy({}, {get(_,key){return globalThis.saneamientoTest.db[key]}})',
    '@/lib/data-integrity-service': 'export async function assertWritable(){if(globalThis.saneamientoTest.closed)throw new Error("El expediente está cerrado")}',
    '@/lib/security-audit': 'export function auditValues(){return {action:"saneamiento"}}',
  };
  builder.onResolve({ filter: /^(?:@\/lib\/|next\/server$|server-only$)/ }, args => args.path in modules ? { path: args.path, namespace: 'boundary' } : null);
  builder.onLoad({ filter: /.*/, namespace: 'boundary' }, args => ({ contents: modules[args.path], loader: 'js', resolveDir: process.cwd() }));
} }] });
const { POST } = await import('../output/saneamiento-tests/route.mjs');
const context = { params: Promise.resolve({ id: '562' }) };
function state({ denied = false, closed = false, rental = false, missing = false, version = 4 } = {}) {
  const config = { ...dossierDefaults(), saneamiento: { folders: [{ id: 'folder-1', nombre: 'Trámite' }], files: {} } };
  const rows = [missing ? [] : [{ id: 562, operacion: rental ? 'alquiler' : 'venta' }], [{ configuracion: JSON.stringify(config), version }], [{ id: 10, tipoDocumento: 'LEVANTAMIENTO_CARGAS', nombre: 'Documento' }, { id: 11, tipoDocumento: 'MINUTA_COMPRAVENTA', nombre: 'Minuta' }]];
  const writes = [], history = [];
  const db = {
    select() { const row = rows.shift(); return { from(){return this}, where(){return this}, limit(){return this}, for(){return Promise.resolve(row)}, then(resolve,reject){return Promise.resolve(row).then(resolve,reject)} }; },
    update(){return { set(value){return { where(){writes.push(value);return Promise.resolve()} }} }},
    insert(){return { values(value){history.push(value);return Promise.resolve()} }},
    async transaction(fn){const before=writes.length;try{return await fn(db)}catch(error){writes.splice(before);throw error}},
  };
  globalThis.saneamientoTest = { denied, closed, db, writes, history, config };
  return globalThis.saneamientoTest;
}
const request = body => new Request('https://example.test/api/inmuebles/562/saneamiento', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const move = { action: 'move', fileId: 10, folderId: 'folder-1', version: 4 };
test('permissions, closed dossiers and stale versions reject changes', async () => {
  for (const [options, status] of [[{denied:true},403],[{closed:true},409],[{missing:true},404],[{version:5},409]]) {
    const s = state(options);
    assert.equal((await POST(request(move),context)).status,status);
    assert.equal(s.writes.length,0); assert.equal(s.history.length,0);
  }
});
test('only saneamiento files from the selected property can move to its folders', async () => {
  for (const change of [{fileId:999},{fileId:11},{folderId:'another-property'}]) {
    const s=state(); assert.equal((await POST(request({...move,...change}),context)).status,400); assert.equal(s.writes.length,0);
  }
  const s=state(); const response=await POST(request(move),context); assert.equal(response.status,200);
  const data=await response.json(); assert.equal(data.version,5); assert.deepEqual(data.config.saneamiento.files,{'10':'folder-1'});
  const saved=JSON.parse(s.writes[0].configuracion);
  assert.equal(saved.renta,s.config.renta); assert.equal(saved.cargas,s.config.cargas);
  assert.equal(s.history.length,2);
});
test('creation and rename are persistent and duplicate names cannot overwrite folders', async () => {
  let s=state(); let response=await POST(request({action:'create',nombre:'Independización',version:4}),context);
  assert.equal(response.status,200); assert.equal((await response.json()).config.saneamiento.folders.length,2);
  s=state(); response=await POST(request({action:'rename',folderId:'folder-1',nombre:'Rectificación',version:4}),context);
  assert.equal(response.status,200); assert.equal((await response.json()).config.saneamiento.folders[0].nombre,'Rectificación');
  s=state(); assert.equal((await POST(request({action:'create',nombre:'TRÁMITE',version:4}),context)).status,400); assert.equal(s.writes.length,0);
});

 test('rental supports subfolders with the same property and version controls', async () => {
  const s = state({rental:true});
  const response = await POST(request(move),context);
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).config.saneamiento.files,{'10':'folder-1'});
  assert.equal(JSON.parse(s.writes[0].configuracion).cargas,s.config.cargas);
});
