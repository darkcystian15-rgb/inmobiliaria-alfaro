// Real publication handlers; DB and auth are isolated. No business records are changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
await mkdir('output/publication-process-tests', { recursive: true });
await build({entryPoints:['app/api/publicaciones/route.ts'],outfile:'output/publication-process-tests/route.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'boundaries',setup(builder){
 const modules={
  'next/server':'export {NextResponse} from "next/server.js"',
  '@/lib/auth':'export async function authorizeApi(){return {user:{id:7},response:null}}',
  '@/lib/db':'export const db=new Proxy({}, {get(_,key){return globalThis.publicationApiState.db[key]}})',
 };
 builder.onResolve({filter:/^(?:@\/lib\/|next\/server$)/},args=>args.path in modules?{path:args.path,namespace:'boundary'}:null);
 builder.onLoad({filter:/.*/,namespace:'boundary'},args=>({contents:modules[args.path],loader:'js',resolveDir:process.cwd()}));
}}]});
const {POST,PUT,PATCH}=await import('../output/publication-process-tests/route.mjs');
function state(previous=null){
 const rows=[[{id:1,estado:'activo'}],[{id:1}],[previous].filter(Boolean)],writes=[],history=[];
 const db={select(){const row=rows.shift();return {from(){return this},where(){return this},limit(){return {then(resolve,reject){return Promise.resolve(row).then(resolve,reject)},for(){return Promise.resolve(row)}}}}},update(){return {set(values){return {where(){writes.push(values);return Promise.resolve()}}}}},insert(){return {values(value){history.push(value);return Promise.resolve()}}},async transaction(fn){return fn(db)}};
 globalThis.publicationApiState={db,writes,history};return globalThis.publicationApiState;
}
const request=(method,body)=>new Request('https://example.test/api/publicaciones',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({inmuebleId:1,...body})});
test('permite borradores pendientes pero impide realizarlos y difundirlos con marcadores',async()=>{
 let s=state();assert.equal((await POST(request('POST',{texto:'Área: DATO POR CONFIRMAR',textoRealizado:false}))).status,201);
 for(const marker of ['DATO POR CONFIRMAR','[COMPLETAR ÁREA]','[AGREGAR DATOS]']){
  s=state();assert.equal((await POST(request('POST',{texto:marker,textoRealizado:true}))).status,400);assert.equal(s.writes.length,0);assert.equal(s.history.length,0);
 }
 s=state({id:1,texto:'DATO POR CONFIRMAR',textoRealizado:true,publicado:false});
 assert.equal((await PATCH(request('PATCH',{mediosDifusion:'cartel',cartelColocado:true,redesPublicadas:false}))).status,400);assert.equal(s.writes.length,0);
});
test('reabrir limpia la confirmación actual, el historial conserva la anterior y completar genera fecha nueva',async()=>{
 const old=new Date('2026-01-01');
 let s=state({id:1,texto:'Texto final',textoRealizado:true,publicado:true,fechaPublicacion:old});
 assert.equal((await PATCH(request('PATCH',{mediosDifusion:'ambos',cartelColocado:true,redesPublicadas:false}))).status,200);
 assert.equal(s.writes[0].publicado,false);assert.equal(s.writes[0].fechaPublicacion,null);assert.equal(s.writes[0].usuarioPublicacionId,null);
 assert.equal(JSON.parse(s.history[0].observacion).anterior.fechaPublicacion,old.toISOString());
 s=state({id:1,texto:'Texto final',textoRealizado:true,publicado:false,fechaPublicacion:old});
 await PATCH(request('PATCH',{mediosDifusion:'cartel',cartelColocado:true,redesPublicadas:false}));
 assert.ok(s.writes[0].fechaPublicacion>old);assert.equal(s.writes[0].publicado,true);
});
test('editar texto realizado conserva las confirmaciones existentes',async()=>{
 const s=state({id:1,texto:'Texto anterior',textoRealizado:true,publicado:true,mediosDifusion:'cartel'});
 assert.equal((await PUT(request('PUT',{texto:'Texto actualizado',textoRealizado:true}))).status,200);
 assert.equal(Object.hasOwn(s.writes[0],'publicado'),false);assert.equal(s.writes[0].textoRealizado,true);
});
