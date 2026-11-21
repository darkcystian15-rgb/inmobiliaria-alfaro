// Real handlers with isolated authentication/DB/hosting boundaries; no production writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
await mkdir('output/document-review-tests', { recursive: true });
await build({ entryPoints: ['app/api/inmuebles/[id]/texto-documentos/route.ts'], outfile: 'output/document-review-tests/route.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'boundaries', setup(builder) {
  const modules = {
    'next/server': 'export {NextResponse} from "next/server.js"',
    '@/lib/auth': 'export async function authorizeApi(request){return globalThis.documentApiState.denied?{response:Response.json({error:"Sin permiso"},{status:403})}:{user:{id:1},response:null}}',
    '@/lib/db': 'export const db=new Proxy({}, {get(_,key){return globalThis.documentApiState.db[key]}})',
    '@/lib/data-integrity-service': 'export async function assertWritable(){if(globalThis.documentApiState.closed)throw new Error("El expediente está cerrado")}',
    '@/lib/security-audit': 'export function auditValues(){return {action:"property.document_areas"}}',
    '@/lib/document-hosting': 'export async function hostingRequest(){return new Response(globalThis.documentApiState.changedSource?"changed-pdf":"fixture-pdf")}',
    '@/lib/document-analysis.mjs': 'export const MAX_DOCUMENT_BYTES=12582912;export const SUPPORTED_DOCUMENT_MIMES=["application/pdf"];export async function analyzeDocument(){throw new Error("No OCR in API boundary tests")}',
  };
  builder.onResolve({filter: /^(?:@\/lib\/|next\/server$)/}, args => args.path in modules ? {path:args.path,namespace:'boundary'} : null);
  builder.onLoad({filter:/.*/,namespace:'boundary'},args=>({contents:modules[args.path],loader:'js',resolveDir:process.cwd()}));
} }] });
const { PATCH } = await import('../output/document-review-tests/route.mjs');
const context = { params: Promise.resolve({ id: '562' }) };
function state({ current = null, denied = false, closed = false, missingSource = false, changedSource = false } = {}) {
  const original = {id:562,areaTerreno:null,areaConstruida:null};
  const file = {id:179,rutaAlmacenamiento:'/fixture'};
  const rows = [[original], missingSource ? [] : [file], [current || original], [file]];
  const changes = [];
  const db = {
    select(){ const result=rows.shift(); return {from(){return this},where(){return this},limit(){return {then(resolve,reject){return Promise.resolve(result).then(resolve,reject)},for(){return Promise.resolve(result)}}}} },
    update(){return {set(values){return {where(){changes.push(values);return Promise.resolve()}}}}},
    insert(){return {values(){return Promise.resolve()}}},
    async transaction(fn){const before=changes.length;try{return await fn(db)}catch(error){changes.splice(before);throw error}},
  };
  globalThis.documentApiState = { db, denied, closed, changes, changedSource };
  return globalThis.documentApiState;
}
const valid = {reviewed:true,expected:{areaTerreno:null,areaConstruida:null},selected:[{field:'areaTerreno',value:'144 m²',sourceId:179,page:1}]};
const request = body => new Request('https://example.test/api/inmuebles/562/texto-documentos',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

test('rechaza guardar sin revisión explícita, sin permisos o con campos fuera de alcance', async () => {
  for (const body of [{...valid,reviewed:false},{...valid,selected:[{...valid.selected[0],field:'precioVenta'}]},{...valid,selected:[{...valid.selected[0],value:'144,000'}]}]) {
    const s=state();const response=await PATCH(request(body),context);assert.equal(response.status,400);assert.equal(s.changes.length,0);
  }
  const s=state({denied:true});assert.equal((await PATCH(request(valid),context)).status,403);assert.equal(s.changes.length,0);
});

test('no pisa áreas cambiadas durante el análisis ni expedientes cerrados ni fuentes eliminadas', async () => {
  for (const options of [{current:{id:562,areaTerreno:'150.00',areaConstruida:null}},{closed:true},{missingSource:true}]) {
    const s=state(options);const response=await PATCH(request(valid),context);assert.equal(response.status,409);assert.equal(s.changes.length,0);
  }
});

test('guarda únicamente el área revisada, con fuente del mismo inmueble y sin modificar el texto', async () => {
  const s=state();const response=await PATCH(request(valid),context);assert.equal(response.status,200);
  assert.deepEqual(s.changes,[{areaTerreno:'144.00'}]);assert.equal((await response.json()).areas.areaTerreno,'144.00');
});


test('la huella documental impide guardar una propuesta si el archivo cambió', async () => {
 const fingerprint=createHash('sha256').update('fixture-pdf').digest('hex');
 const body={...valid,selected:[{...valid.selected[0],fingerprint}]};
 let s=state({changedSource:true});assert.equal((await PATCH(request(body),context)).status,409);assert.equal(s.changes.length,0);
 s=state();assert.equal((await PATCH(request(body),context)).status,200);assert.equal(s.changes[0].areaTerreno,'144.00');
 s=state();assert.equal((await PATCH(request({...valid,selected:[{...valid.selected[0],fingerprint:'invalid'}]}),context)).status,400);assert.equal(s.changes.length,0);
});
