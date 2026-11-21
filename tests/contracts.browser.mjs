// Real components and exports, isolated API responses; no business writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { build } from 'esbuild';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
const { chromium } = await import('/home/codespace/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const out='output/contratos-ia';await fs.mkdir(out,{recursive:true});
const compiled=await compile(await fs.readFile('app/globals.css','utf8'),{base:new URL('../app/',import.meta.url).pathname,onDependency(){}});
const scanner=new Scanner({sources:[{base:process.cwd(),pattern:'app/**/*.{tsx,ts}',negated:false}]});const css=compiled.build(scanner.scan());
await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Workspace from './app/components/ContractWorkspace';createRoot(document.getElementById('root')).render(<Workspace/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,jsx:'automatic',outfile:`${out}/workspace.js`,splitting:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'boundaries',setup(b){const stubs={
  'next/navigation':'export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:url=>{location.href=url}});',
  'next/link':'export default function Link(p){return <a {...p}/>}',
  './ZoneWorkspace':'export const useZoneWorkspace=()=>({zone:{nombre:"Zona de prueba"}});',
  './WorkflowNavigationGuard':'export default function Guard(){return null}',
};b.onResolve({filter:/^(next\/|\.\/ZoneWorkspace$|\.\/WorkflowNavigationGuard$)/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:null);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path],loader:'tsx',resolveDir:process.cwd()}))}}]});
const script=await fs.readFile(`${out}/workspace.js`);const server=http.createServer((req,res)=>{if(req.url==='/workspace.js'){res.setHeader('content-type','text/javascript');res.end(script)}else{res.setHeader('content-type','text/html');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/workspace.js"></script>`)}});
await new Promise(resolve=>server.listen(3142,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const width of [375,1440]){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const property={id:1,codigo:'001-alquiler-casa-prueba',tipo:'casa',operacion:'alquiler',direccion:'Dirección ficticia 123',estado:'activo'};
 let record={values:{},sources:[],text:'',status:'preparacion',inputHash:'',model:'',generatedAt:null},version=0,failGeneration=false,history=[],generationCalls=0;
 await page.route('**/api/**',async route=>{
  const request=route.request();if(request.url().includes('/api/contratos?'))return route.fulfill({json:{properties:[property]}});
  if(request.method()==='GET')return route.fulfill({json:{property,record,version,outdated:false,files:[{id:9,name:'Copia literal de prueba',mime:'application/pdf',storage:'hosting'}],history,documentsMissing:[],suggestions:{direccion:property.direccion,descripcion:'Casa de prueba'}}});
  const body=request.postDataJSON();
  if(request.method()==='PUT'){record={...record,values:body.values,sources:body.sources,text:body.text,status:body.reviewed?'revisado':body.text?'borrador':'preparacion'};version++;history.unshift({id:version,date:new Date().toISOString()});return route.fulfill({json:{record,version,outdated:false}})}
  if(body.action==='read')return route.fulfill({json:{text:'Partida registral de prueba 12345678. Dirección ficticia 123.',nextPage:null,warnings:[],source:{id:9,name:'Copia literal de prueba',fingerprint:'a'.repeat(64),page:1}}});
  if(body.action==='suggest')return route.fulfill({json:{version,proposals:[{key:'partida',label:'Partida registral y oficina registral',value:'12345678 · Oficina de prueba',evidence:'Partida registral de prueba 12345678.'}]}});
  if(body.action==='generate'){generationCalls++;if(failGeneration)return route.fulfill({status:503,json:{error:'IA temporalmente no disponible. Tus datos se conservan.'}});record={...record,text:'CONTRATO DE INTERVENCIÓN INMOBILIARIA\nBORRADOR DE PRUEBA\nDatos confirmados para revisión.',status:'borrador',inputHash:'generated',model:'provider/test',generatedAt:new Date().toISOString()};version++;return route.fulfill({json:{record,version,outdated:false}})}
  return route.fulfill({status:400,json:{error:'Solicitud inesperada'}});
 });
 await page.goto('http://127.0.0.1:3142/?zona=Zona+de+prueba&inmueble=1');try{await page.getByRole('heading',{name:'Datos del expediente y fuentes'}).waitFor({timeout:10000})}catch(e){console.log({errors,body:await page.locator('body').innerText()});throw e}
 await page.getByRole('button',{name:'Incorporar propuesta',exact:true}).first().click();await page.getByRole('button',{name:'Incorporar propuesta',exact:true}).click();
 await page.getByLabel('Documento para leer').selectOption('9');await page.getByRole('button',{name:'Leer documento',exact:true}).click();await page.getByRole('button',{name:'Confirmar e incorporar extracto'}).click();await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Cambios guardados.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Proponer datos con IA'}).click();await page.getByRole('checkbox',{name:/Partida registral y oficina registral/}).check();await page.getByRole('button',{name:'Incorporar propuestas seleccionadas'}).click();
 await page.getByRole('button',{name:/PASO 2/}).click();assert.equal(await page.getByLabel('Partida registral y oficina registral').inputValue(),'12345678 · Oficina de prueba');
 const values=[['Arrendador: identidad y domicilio','Propietario de prueba · DNI 00000000 · Domicilio ficticio'],['Propietarios y representantes que firmarán','Firma directamente el propietario de prueba'],['Inmobiliaria y representante','Inmobiliaria de prueba · RUC ficticio · Representante de prueba'],['Alcance del servicio encargado','Intermediación para alquiler'],['Inicio y duración del encargo','2026-12-01 · Tres meses'],['Comisión y moneda','Una renta mensual en PEN según acuerdo'],['Quién paga la comisión y cuándo','Propietario al firmar el contrato de alquiler'],['Precio o renta del encargo y moneda','1500 PEN mensuales'],['Lugar y fecha prevista de firma','Ciudad de prueba, 2026-12-01']];
 for(const[label,value]of values)await page.getByLabel(label,{exact:false}).fill(value);await page.getByLabel('Exclusividad').selectOption('No');
 await page.screenshot({path:`${out}/cuestionario-${width}.png`,fullPage:true});await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Cambios guardados.',{exact:true}).waitFor();
 await page.getByRole('button',{name:/PASO 3/}).click();const confirm=page.getByRole('checkbox',{name:/He confirmado las partes/});await confirm.check();failGeneration=true;await page.getByRole('button',{name:'Generar borrador con IA',exact:true}).click();await page.getByRole('alert').filter({hasText:'IA temporalmente no disponible'}).waitFor();assert.equal(record.values.comision,'Una renta mensual en PEN según acuerdo');
 failGeneration=false;await page.getByRole('button',{name:'Generar borrador con IA',exact:true}).click();await page.getByRole('heading',{name:'Revisión del borrador',exact:true}).waitFor();assert.equal(generationCalls,2);
 await page.getByLabel('Contenido del documento').fill(record.text+'\nAJUSTE MANUAL');await page.getByRole('button',{name:'Guardar y marcar como revisado'}).click();await page.getByText('Revisado internamente',{exact:false}).waitFor();assert.equal(record.status,'revisado');assert.match(record.text,/AJUSTE MANUAL/);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar Word (.doc)'}).click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.doc$/);
 const pdfPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();assert.match((await pdfPromise).suggestedFilename(),/\.pdf$/);
 await page.screenshot({path:`${out}/borrador-${width}.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Sin desbordes a ${width}`);assert.deepEqual(errors,[]);
 await page.reload();await page.getByRole('heading',{name:'Datos del expediente y fuentes'}).waitFor();await page.getByRole('button',{name:/PASO 4/}).click();assert.match(await page.getByLabel('Contenido del documento').inputValue(),/AJUSTE MANUAL/);
 await context.close();console.log(`Flujo de preparación, fuentes, propuestas, fallo IA, generación, revisión, descargas y recarga: ${width}px correcto`);
}
}finally{await browser.close();server.close()}
