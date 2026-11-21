import assert from 'node:assert/strict';
import { build } from 'esbuild';
import JSZip from 'jszip';
const { chromium } = await import('/home/codespace/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import FileViewer from './app/components/FileViewer';createRoot(document.getElementById('root')).render(<FileViewer file={{nombre:'Documento de prueba',nombreOriginal:'prueba.docx',tipoMime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',almacenamiento:'hosting',enlace:'/documento'}} onClose={()=>{document.getElementById('root').textContent='Cerrado'}}/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle:true, jsx:'automatic',write:false,define:{'process.env.NODE_ENV':'"production"'} });
const zip = new JSZip();
zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Promesa de prueba</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Precio acordado</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');
const valid = await zip.generateAsync({type:'nodebuffer'});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const width of [375,1440]) for(const damaged of [false,true]) {
  const context=await browser.newContext({viewport:{width,height:900}}); const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://viewer.test/**',route=>{const path=new URL(route.request().url()).pathname;return route.fulfill(path==='/documento'?{body:damaged?Buffer.from('dañado'):valid}:{contentType:path==='/app.js'?'text/javascript':'text/html',body:path==='/app.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/app.js"></script>'});});
  await page.goto('http://viewer.test/');
  if(damaged) await page.getByRole('alert').waitFor();
  else {const frame=page.frameLocator('iframe');await frame.getByText('Promesa de prueba').waitFor();assert.equal(await frame.locator('table').count(),1);assert.equal(await page.locator('iframe').getAttribute('sandbox'),'');}
  assert.equal(await page.getByRole('link',{name:'Descargar archivo'}).getAttribute('href'),'/documento?download=1');
  await page.getByRole('button',{name:'Cerrar vista previa'}).click();await page.getByText('Cerrado',{exact:true}).waitFor();assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Word: contenido, tablas, archivo dañado, descarga y cierre en 375/1440 px correctos.');
} finally {await browser.close();}
