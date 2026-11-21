import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs/promises';import {emptyLiquidations,newLiquidation} from '../lib/liquidation.ts';
await fs.mkdir('output/liquidaciones',{recursive:true});
await build({entryPoints:['app/api/inmuebles/[id]/liquidaciones/route.ts'],outfile:'output/liquidaciones/api.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'boundaries',setup(b){const modules={
'server-only':'','next/server':'export {NextResponse} from "next/server.js"',
'@/lib/auth':'export async function authorizeApi(request){return globalThis.lt.denied?{response:Response.json({error:"Sin permiso"},{status:403})}:{user:{id:7},response:null}}',
'@/lib/db':'export const db=new Proxy({},{get(_,key){return globalThis.lt.db[key]}});export const pool={async getConnection(){return {async query(sql){if(sql.includes("GET_LOCK"))return [[{acquired:globalThis.lt.locked?0:1}]];globalThis.lt.released++;return [[]]},release(){globalThis.lt.connectionsReleased++}}}}',
'@/lib/dossier-record':'export async function readDossier(){return {config:{renta:"pendiente",rentaObservacion:"",vendedorTipo:"natural",compradorTipo:"juridica"}}}',
'@/lib/data-integrity-service':'export async function assertWritable(){if(globalThis.lt.closed)throw Error("El expediente está cerrado")}',
'@/lib/liquidation-export':'export async function liquidationFile(){globalThis.lt.generated++;return Buffer.from("generated");}',
'@/lib/document-files.mjs':'export const storageConfigured=()=>true;',
'../archivos/route':'export async function POST(request){globalThis.lt.uploads++;const f=await request.formData();globalThis.lt.lastUpload={name:f.get("archivo").name,category:f.get("tipoDocumento")};if(globalThis.lt.uploadFail)return Response.json({error:"Falló hosting"},{status:503});globalThis.lt.files.push({id:99});return Response.json({id:99},{status:201});}',
};b.onResolve({filter:/^(?:@\/lib\/|next\/server$|server-only$|\.\.\/archivos\/route$)/},a=>a.path in modules?{path:a.path,namespace:'boundary'}:null);b.onLoad({filter:/.*/,namespace:'boundary'},a=>({contents:modules[a.path],loader:'js',resolveDir:process.cwd()}));}}]});
const api=await import('../output/liquidaciones/api.mjs');const ctx={params:Promise.resolve({id:'1'})};const req=(method,body)=>new Request('https://example.test/api/inmuebles/1/liquidaciones',{method,headers:{'content-type':'application/json',origin:'https://example.test'},...(body?{body:JSON.stringify(body)}:{})});
function fixture(){const data=emptyLiquidations();Object.assign(data.common,{address:'Dirección',owner:'Persona confirmada',taxStatus:'exonerado',taxNote:'Sustento'});const d=newLiquidation('documento','venta','owner',data.common,'natural');data.documents.push(d);for(const r of d.sections[0].rows){r.amount='0';if(r.kind==='percent'){r.base='100';r.rate='3';}}return data;}
function setup(options={}){const s={denied:false,closed:false,missing:false,snapshots:[],files:[],writes:[],generated:0,uploads:0,released:0,connectionsReleased:0,...options};s.db={select(){let table;return {from(t){table=t;return this},where(){return this},limit(){return this},orderBy(){return this},for(){return this},then(resolve,reject){const name=table?.[Symbol.for('drizzle:Name')];const rows=name==='inm_inmuebles'?(s.missing?[]:[{id:1,codigo:'INM-1',operacion:'venta',estado:'activo'}]):name==='inm_timeline'?s.snapshots.slice(-1).reverse():name==='inm_archivos'?s.files:[];return Promise.resolve(rows).then(resolve,reject);}}},insert(table){return{async values(v){s.writes.push(v);if(table[Symbol.for('drizzle:Name')]==='inm_timeline'){const id=s.snapshots.length+1;s.snapshots.push({id,...v});return [{insertId:id}];}return [{}];}}},async transaction(fn){return fn(s.db)}};globalThis.lt=s;return s;}
test('guardado autenticado, expediente cerrado, validación y conflicto no modifican datos',async()=>{for(const [options,status]of [[{denied:true},403],[{closed:true},409],[{missing:true},404]]){const s=setup(options);assert.equal((await api.PUT(req('PUT',{data:fixture(),version:0}),ctx)).status,status);assert.equal(s.writes.length,0);}let s=setup();assert.equal((await api.PUT(req('PUT',{data:fixture(),version:5}),ctx)).status,409);assert.equal(s.writes.length,0);const data=fixture();data.documents[0].sections[0].rows[0].amount='-2';assert.equal((await api.PUT(req('PUT',{data,version:0}),ctx)).status,400);});
test('borradores inmutables, generación en categoría correcta y reintento idempotente',async()=>{const s=setup();let response=await api.PUT(req('PUT',{data:fixture(),version:0}),ctx);assert.equal(response.status,200);const saved=await response.json();assert.equal(s.snapshots.length,1);const original=s.snapshots[0].observacion;response=await api.POST(req('POST',{documentId:'documento',format:'xlsx',version:saved.version}),ctx);assert.equal(response.status,201);assert.equal(s.lastUpload.category,'VENDEDOR_LIQUIDACION');assert.match(s.lastUpload.name,/\.xlsx$/);assert.equal(s.generated,1);response=await api.POST(req('POST',{documentId:'documento',format:'xlsx',version:saved.version}),ctx);assert.equal((await response.json()).existing,true);assert.equal(s.uploads,1);assert.equal(s.snapshots[0].observacion,original);assert.equal(s.released,2);assert.equal(s.connectionsReleased,2);});
test('fallos de hosting y bloqueos preservan el borrador para reintento',async()=>{const s=setup({uploadFail:true});await api.PUT(req('PUT',{data:fixture(),version:0}),ctx);assert.equal((await api.POST(req('POST',{documentId:'documento',format:'pdf',version:1}),ctx)).status,503);assert.equal(s.snapshots.length,1);s.uploadFail=false;assert.equal((await api.POST(req('POST',{documentId:'documento',format:'pdf',version:1}),ctx)).status,201);assert.equal(s.uploads,2);s.locked=true;assert.equal((await api.POST(req('POST',{documentId:'documento',format:'pdf',version:1}),ctx)).status,409);assert.equal(s.connectionsReleased,3);});
test('generación rechaza versión antigua, documento ajeno y datos incompletos',async()=>{const s=setup();await api.PUT(req('PUT',{data:fixture(),version:0}),ctx);for(const [body,status]of [[{version:0,documentId:'documento',format:'pdf'},409],[{version:1,documentId:'otro',format:'pdf'},404],[{version:1,documentId:'documento',format:'exe'},400]])assert.equal((await api.POST(req('POST',body),ctx)).status,status);const data=fixture();data.documents[0].person='';await api.PUT(req('PUT',{data,version:1}),ctx);assert.equal((await api.POST(req('POST',{version:2,documentId:'documento',format:'pdf'}),ctx)).status,400);assert.equal(s.generated,0);assert.equal(s.uploads,0);});

test('descarga de borrador incompleto devuelve el archivo sin guardar ni adjuntar', async () => {
  const state = setup();
  const data = fixture();
  const document = data.documents[0];
  document.person = '';
  document.personType = '';
  document.date = '';
  data.common.address = '';
  document.sections[0].rows[0].amount = '';
  const response = await api.POST(req('POST', { action: 'download', documentId: document.id, format: 'pdf', data }), ctx);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(await response.text(), 'generated');
  assert.equal(state.writes.length, 0);
  assert.equal(state.uploads, 0);
  assert.equal(state.connectionsReleased, 0);
});


test('modelos libres se guardan y reabren sin corregir celdas; permiten descargar Word', async () => {
  const {sourceLiquidationGrid}=await import('../lib/liquidation-grid.ts');const state=setup();const data=fixture();data.documents[0].grid=sourceLiquidationGrid('owner');data.documents[0].sections=[];
  assert.equal((await api.PUT(req('PUT',{data,version:0}),ctx)).status,200);
  const result=await(await api.GET(req('GET'),ctx)).json();assert.equal(result.data.documents[0].grid.cells.E40.f,'D40*E9');assert.equal(result.data.documents[0].grid.cells.F34.v,'EXONERADO');
  const response=await api.POST(req('POST',{action:'download',documentId:'documento',format:'docx',data}),ctx);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').includes('wordprocessingml'));assert.equal(state.uploads,0);
  data.documents[0].grid.rows=100000;assert.equal((await api.PUT(req('PUT',{data,version:1}),ctx)).status,400);assert.equal(state.snapshots.length,1);
});
