import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { build } from 'esbuild';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { emptyMinute, minuteInput } from '../lib/minute-document.ts';
const { chromium }=await import('/home/codespace/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const compiled=await compile(await fs.readFile('app/globals.css','utf8'),{base:new URL('../app/',import.meta.url).pathname,onDependency(){}});const scanner=new Scanner({sources:[{base:process.cwd(),pattern:'app/**/*.{tsx,ts}',negated:false}]});const css=compiled.build(scanner.scan());
const buildResult=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Editor from './app/components/MinuteTextEditor';const noop=()=>{};createRoot(document.getElementById('root')).render(<Editor propertyId={1} kind="promise-structure" files={[]} readOnly={false} uploadReady onClose={noop} onChanged={async()=>{}} onPending={noop} onBusy={noop}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,jsx:'automatic',write:false,define:{'process.env.NODE_ENV':'"production"'}});
const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?buildResult.outputFiles[0].text:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/app.js"></script>`);});await new Promise(resolve=>server.listen(3168,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {for(const width of [375,1440]) {
 const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let saved={data:{...emptyMinute(),title:'ESTRUCTURA DE PROMESA DE COMPRAVENTA PARA NOTARÍA'},version:0,property:{operation:'venta'},propertyCode:'PRUEBA'};
 await page.route('**/api/inmuebles/1/minuta-texto?document=promise-structure',async route=>{if(route.request().method()==='PUT'){const body=route.request().postDataJSON();assert.equal(body.version,saved.version);saved={...saved,data:minuteInput(body.data),version:saved.version+1};return route.fulfill({json:{version:saved.version}});}return route.fulfill({json:saved});});
 await page.goto('http://127.0.0.1:3168');const editor=page.getByRole('textbox',{name:'Contenido de Estructura de Contrato Promesa-Venta',exact:true});await page.getByRole('button',{name:'Usar estructura base',exact:true}).click();await page.getByText('Estructura base incorporada.',{exact:true}).waitFor();assert.match(await editor.innerText(),/A LA FIRMA DE LA PROMESA/);assert.doesNotMatch(await editor.innerText(),/Lali|Pinedo|Scotiabank|90,000/i);
 assert.ok(await editor.locator('[style*="font-weight: 700"], strong, b').count()>0);
 await page.getByRole('button',{name:'Guardar',exact:true}).click();await page.getByText('Texto guardado.',{exact:true}).waitFor();assert.equal(saved.data.layout,'word-model');assert.ok(saved.data.formats.some(mark=>mark.underline));
 await page.reload();await editor.waitFor();assert.match(await editor.innerText(),/A LA FIRMA DE LA PROMESA/);await page.getByRole('button',{name:'Vista previa',exact:true}).click();await page.getByRole('article',{name:'Vista previa del documento'}).waitFor();assert.deepEqual(errors,[]);await context.close();
}console.log('Promesa: usar base de info1, formato, guardado, reapertura y vista previa correctos en 375/1440 px.');}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
