// Real route and snapshot persistence, isolated DB/auth/provider boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { contractFields } from '../lib/contract-workflow.mjs';
await mkdir('output/contracts-tests', { recursive: true });
await build({ entryPoints: ['app/api/inmuebles/[id]/contratos/route.ts'], outfile: 'output/contracts-tests/route.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'boundaries', setup(builder) {
  const modules = {
    'server-only': '', 'next/server': 'export {NextResponse} from "next/server.js"',
    '@/lib/auth': 'export async function authorizeApi(){return globalThis.ct.denied?{response:Response.json({error:"Sin permiso"},{status:403})}:{user:{id:7},response:null}}',
    '@/lib/db': 'export const db=new Proxy({}, {get(_,key){return globalThis.ct.db[key]}})',
    '@/lib/auth-limits': 'export async function limited(){return globalThis.ct.limited}',
    '@/lib/data-integrity-service': 'export async function assertWritable(){if(globalThis.ct.closed)throw Error("El expediente está cerrado")}',
    '@/lib/contract-ai': 'export const contractModel=()=>"provider/test";export async function generateContractText(){globalThis.ct.calls++;if(globalThis.ct.fail)throw Error("Proveedor no disponible");if(globalThis.ct.race)globalThis.ct.snapshots.push({id:900,observacion:JSON.stringify(globalThis.ct.current)});return "BORRADOR DE PRUEBA"}',
    '@/lib/document-hosting': 'export async function hostingRequest(){throw Error("No se usa hosting en estas pruebas")}',
    '@/lib/document-analysis.mjs': 'export const MAX_DOCUMENT_BYTES=12582912;export async function analyzeDocument(){throw Error("No se usa OCR en estas pruebas")}',
    '@/lib/dossier-record': 'export async function readDossier(){return {version:1,config:{}}}',
  };
  builder.onResolve({filter:/^(?:@\/lib\/|next\/server$|server-only$)/}, args => args.path in modules ? { path:args.path, namespace:'boundary' } : null);
  builder.onLoad({filter:/.*/,namespace:'boundary'}, args => ({contents:modules[args.path],loader:'js',resolveDir:process.cwd()}));
} }] });
const api = await import('../output/contracts-tests/route.mjs');
const ctx = { params: Promise.resolve({id:'1'}) };
const req = (method, body, zone=true) => new Request(`https://example.test/api/inmuebles/1/contratos${zone?'?zona=Centro':''}`, {method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
function setup(options={}) {
  const current={values:{},sources:[],text:'',status:'preparacion',inputHash:'',model:'',generatedAt:null};
  const s={denied:false,closed:false,limited:false,fail:false,race:false,calls:0,snapshots:[],writes:[],current,...options};
  s.db={
    select(){let table,selection;return {from(t){table=t;return this},where(){return this},limit(){return this},orderBy(){return this},for(){return this},then(resolve,reject){const name=table?.[Symbol.for('drizzle:Name')];selection=name==='inm_inmuebles'?(s.missing?[]:[{id:1,operacion:'alquiler',estado:s.inactive?'historico':'activo'}]):name==='inm_timeline'?s.snapshots.slice(-1).reverse():name==='inm_archivos'?s.files||[{type:'COPIA_LITERAL_CRI',storage:'hosting'},{type:'ARRENDADOR_DNI',storage:'hosting'},{type:'ARRENDATARIO_DNI',storage:'hosting'}]:[];return Promise.resolve(selection).then(resolve,reject)}}},
    insert(table){return {async values(value){s.writes.push(value);if(table[Symbol.for('drizzle:Name')]==='inm_timeline'){const id=s.snapshots.length+10;s.snapshots.push({id,...value});return [{insertId:id}]}return [{}]}}},
    async transaction(fn){return fn(s.db)},
  };globalThis.ct=s;return s;
}
function completeRental() {
  const base={negociacion:'Condiciones acordadas',uso:'Vivienda',inicio:'2026-12-01',fin:'2027-12-01',entrega:'2026-12-01',gracia:'No',renta:'1500',moneda:'PEN',variacion:'Sin variación',medioPago:'Otro',mascotas:'No permitidas',subarriendo:'No permitido',amoblado:'No',fiador:'No'};
  return Object.fromEntries(contractFields('contrato_alquiler','alquiler',base).map(f=>[f.key,base[f.key]||(f.required?'Dato de prueba':'')]));
}
test('authorization, zone scope, inactive/closed properties and concurrency reject writes', async()=>{
  const body={kind:'intervencion',version:0,values:{},sources:[],text:'',reviewed:false};
  for(const [options,status] of [[{denied:true},403],[{closed:true},409],[{inactive:true},409],[{missing:true},404]]){const s=setup(options);assert.equal((await api.PUT(req('PUT',body),ctx)).status,status);assert.equal(s.writes.length,0)}
  let s=setup();assert.equal((await api.PUT(req('PUT',body,false),ctx)).status,400);assert.equal(s.writes.length,0);
  s=setup();assert.equal((await api.PUT(req('PUT',{...body,version:50}),ctx)).status,409);assert.equal(s.writes.length,0);
});
test('incomplete preparation persists immutably without modifying phase two or closing',async()=>{
  const s=setup();const response=await api.PUT(req('PUT',{kind:'intervencion',version:0,values:{direccion:'Dirección confirmada'},sources:[],text:'',reviewed:false}),ctx);
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.record.values.direccion,'Dirección confirmada');assert.equal(s.snapshots.length,1);assert.equal(s.writes.length,2);assert.equal(s.writes[0].evento,'contrato_ia_intervencion');
  assert.equal((await api.POST(req('POST',{action:'generate',kind:'intervencion',version:data.version,confirmed:true}),ctx)).status,422);assert.equal(s.calls,0);
});
test('generation saves a real provider result, versions and allows explicit review',async()=>{
  const s=setup();let response=await api.PUT(req('PUT',{kind:'contrato_alquiler',version:0,values:completeRental(),sources:[],text:'',reviewed:false}),ctx);let data=await response.json();
  response=await api.POST(req('POST',{action:'generate',kind:'contrato_alquiler',version:data.version,confirmed:true}),ctx);assert.equal(response.status,200);data=await response.json();assert.equal(data.record.text,'BORRADOR DE PRUEBA');assert.equal(data.record.status,'borrador');assert.equal(s.snapshots.length,2);assert.equal(s.calls,1);
  response=await api.PUT(req('PUT',{kind:'contrato_alquiler',version:data.version,...data.record,text:'BORRADOR REVISADO',reviewed:true}),ctx);assert.equal(response.status,200);data=await response.json();assert.equal(data.record.status,'revisado');
  response=await api.PUT(req('PUT',{kind:'contrato_alquiler',version:data.version,...data.record,values:{...data.record.values,renta:'1800'},reviewed:true}),ctx);assert.equal(response.status,400);
});
test('provider errors, missing supporting documents and generation races preserve saved work',async()=>{
  for(const options of [{fail:true},{files:[]},{race:true},{limited:true}]){
    const s=setup(options);const saved=await (await api.PUT(req('PUT',{kind:'contrato_alquiler',version:0,values:completeRental(),sources:[],text:'',reviewed:false}),ctx)).json();
    const response=await api.POST(req('POST',{action:'generate',kind:'contrato_alquiler',version:saved.version,confirmed:true}),ctx);
    assert.equal(response.status,options.fail?503:options.files?422:options.race?409:429);assert.equal(s.writes.filter(w=>w.evento).length,1);
  }
});
