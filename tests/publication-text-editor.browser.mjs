// Browser checks of the real editor with mocked APIs; no production records.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { build } from 'esbuild';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || '/home/codespace/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const out = 'output/textos-modelos';
await fs.mkdir(out, { recursive: true });
await build({ stdin: { contents: `import React, {useState} from 'react'; import {createRoot} from 'react-dom/client'; import Editor from './app/components/PropertyPublicationEditor'; import PortfolioRow from './app/components/PortfolioLabelRow'; import PortfolioCard from './app/components/PortfolioPropertyCard'; import {textNeedsReview} from './lib/publication-review.mjs'; import {publicationTextModel} from './lib/publication-text-model.mjs'; function App(){const saved=new URLSearchParams(location.search).has('saved');const[text,setText]=useState(saved?new URLSearchParams(location.search).has('pendiente')?'TEXTO REALIZADO · DATO POR CONFIRMAR':'🏡 TEXTO PERSONALIZADO\\nMi anuncio ya publicado\\n📲 999999999':''); const[done,setDone]=useState(saved); const[diffusion,setDiffusion]=useState({publicado:saved&&!new URLSearchParams(location.search).has('diffusion'),referencias:new URLSearchParams(location.search).has('legacy')?[{canal:'Portal Local',url:'https://example.com/anuncio-original'}]:[]}); const[version,setVersion]=useState(1); const model=publicationTextModel({tipo:'casa',operacion:'venta',direccion:'Dirección '+version,precioVenta:'200000',precioVentaMoneda:'USD'}); if(new URLSearchParams(location.search).has('colores')) return <main style={{maxWidth:800,margin:'auto'}}>{[{key:'visita',visitaPendiente:true},{key:'tasacion',tasacionPendiente:true},{key:'texto',materialPendiente:true},{key:'publicacion',difusionPendiente:true}].map(stage=>{const property={id:stage.key,nombre:'Inmueble',propietario:'Caso '+stage.key,estado:'Activo',tipo:'Casa',operacion:'venta',direccion:'Dirección de prueba',actividades:{publicacion:{publicado:false},tasacion:{situacion:null}},...stage};return <section key={stage.key} data-color-stage={stage.key}><PortfolioRow property={property} onOpen={()=>{}}/><PortfolioCard property={property} onOpen={()=>{}}/></section>})}</main>;return <main style={{maxWidth:800,margin:'auto'}}>{new URLSearchParams(location.search).has('pendiente')&&<PortfolioRow property={{id:'test',nombre:'Inmueble de prueba',propietario:'Caso revisión',estado:'Activo',tipo:'Casa',operacion:'venta',direccion:'Dirección',textoPorRevisar:textNeedsReview({texto:text,textoRealizado:done,...diffusion}),actividades:{publicacion:{publicado:diffusion.publicado},tasacion:{situacion:null}}}} onOpen={()=>{}}/>}<button onClick={()=>setVersion(v=>v+1)}>Simular archivo actualizado</button><Editor propertyId={1} text={text} textModel={model} exists={Boolean(text)} publication={{textoRealizado:done,...diffusion}} mode={new URLSearchParams(location.search).has("diffusion")?"both":"text"} initialEditing={!saved} onSaved={async()=>{if(window.savedBody.texto!==undefined){setText(window.savedBody.texto);setDone(window.savedBody.textoRealizado)}else{const b=window.savedBody;setDiffusion({...b,publicado:b.mediosDifusion==="cartel"?b.cartelColocado:b.mediosDifusion==="redes"?b.redesPublicadas:b.cartelColocado&&b.redesPublicadas})}}}/></main>}createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, outfile: `${out}/editor.js`, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'navigation-stub', setup(builder) { builder.onResolve({filter: /NavigationReturn$/}, () => ({path:'navigation',namespace:'stub'})); builder.onLoad({filter:/.*/,namespace:'stub'}, () => ({contents:'export const ContextLink = "a";',loader:'js'})); } }] });
const js = await fs.readFile(`${out}/editor.js`);
let css = '';
async function styles(dir) { for (const item of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])) { const path = `${dir}/${item.name}`; if(item.isDirectory()) await styles(path); else if(item.name.endsWith('.css')) css += await fs.readFile(path,'utf8'); } }
await styles(process.env.DOCUMENT_STYLE_DIRECTORY || '.next/static');
const server = http.createServer((req,res) => { if(req.url==='/editor.js'){res.setHeader('Content-Type','text/javascript');res.end(js);}else{res.setHeader('Content-Type','text/html');res.end(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script src="/editor.js"></script>`);} });
await new Promise(resolve=>server.listen(3138,'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for (const width of [375,1440]) {
  const context=await browser.newContext({viewport:{width,height:1000}}); const page=await context.newPage(); const errors=[]; const analyzedFileIds=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedText=text;}}});});
  await page.route('**/api/**',async route=>{
   const req=route.request();
   if(req.url().includes('texto-documentos')) {
    if(req.method()==='GET') return route.fulfill({json:{files:[{id:2,name:'Copia literal de prueba',mime:'application/pdf',size:100},{id:3,name:'Tasación Excel',mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size:100},{id:4,name:'Documento protegido',mime:'application/pdf',size:100}],areas:{areaTerreno:null,areaConstruida:null}}});
    const body=req.postDataJSON();
    if(req.method()==='PATCH') { await page.evaluate(body=>{window.reviewedAreas=body;},body); return route.fulfill({json:{ok:true,areas:{areaTerreno:'246.90',areaConstruida:null}}}); }
    await new Promise(resolve=>setTimeout(resolve,250));
    analyzedFileIds.push(body.fileId);
    if(body.fileId===4) return route.fulfill({status:422,json:{error:'PDF protegido'}});
    if(page.url().includes('sin-propuestas')) return route.fulfill({json:{source:{id:body.fileId,name:'Documento sin datos extraíbles',fingerprint:'fixture'},proposals:[],nextPage:null,warnings:['Sin datos legibles.']}});
    return route.fulfill({json:{source:{id:body.fileId,name:body.fileId===2?'Copia literal de prueba':'Tasación Excel',fingerprint:'fixture'},nextPage:body.fileId===2&&body.startPage===1?5:null,proposals:body.fileId===3?[{field:'areaConstruida',label:'Área construida',value:'180.00 m²',page:0,sheet:'Hoja1',cell:'E16',method:'excel',evidence:'Área construida: 180 m2'}]:[{field:'areaTerreno',label:'Área de terreno',value:body.startPage===5?'248 m²':'246.90 m²',page:body.startPage===5?5:2,method:'ocr',evidence:'Área de terreno: 246.90 m2'}],message:'Revisa las propuestas.'}});
   }
   await new Promise(resolve=>setTimeout(resolve,250));
   await page.evaluate(body=>{window.savedBody=body;},req.postDataJSON()); return route.fulfill({json:{ok:true}});
  });
  await page.goto('http://127.0.0.1:3138');
  const editor=page.getByRole('textbox',{name:'Texto de publicación',exact:true});
  assert.match(await editor.inputValue(),/SE VENDE CASA/);
  assert.match(await editor.inputValue(),/1ER NIVEL:/);
  assert.doesNotMatch(await editor.inputValue(),/PISCINA|BIBLIOTECA|WALK-IN/);
  await page.getByRole('button',{name:'Elegir documentos',exact:true}).click();
  await page.getByRole('button',{name:'Analizar documentos seleccionados (3)',exact:true}).click();
  await page.getByText('Buscando datos en los documentos…',{exact:true}).waitFor();
  assert.equal(await page.getByText('Buscando datos en los documentos…',{exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Guardando…',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Guardar texto y marcar como realizado',exact:true}).isDisabled(),true);
  { const searchAboveText=await page.evaluate(()=>{const status=[...document.querySelectorAll('[role="status"]')].find(node=>node.textContent.includes('Buscando datos en los documentos'));const editor=document.querySelector('textarea');return Boolean(status&&editor&&(status.compareDocumentPosition(editor)&Node.DOCUMENT_POSITION_FOLLOWING));});
  assert.equal(searchAboveText,true); }

  await page.getByText('Análisis terminado.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Ver documentos (3)',exact:true}).click();
  await page.getByRole('button',{name:'Analizar este documento: Copia literal de prueba',exact:true}).click();
  await page.getByText('Análisis terminado.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('checkbox',{name:'Seleccionar Área construida: 180.00 m²',exact:true}).count(),1,'Individual analysis preserves other documents');
  await page.getByRole('checkbox',{name:'Seleccionar Área de terreno: 246.90 m²',exact:true}).check();
  await page.screenshot({path:`${out}/asistente-revision-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Incorporar seleccionados al borrador'}).click();
  assert.match(await editor.inputValue(),/ÁREA DE TERRENO: 246.90 m²/);
  assert.equal(await page.getByText('Hay valores diferentes.',{exact:false}).count(),1);
  const saveAreas=page.getByRole('button',{name:'Guardar áreas revisadas y completar borrador'});
  assert.equal(await saveAreas.isDisabled(),true);
  await page.getByRole('checkbox',{name:'He cotejado las cifras',exact:false}).check();
  await saveAreas.click();
  await page.getByText('Áreas revisadas guardadas en la ficha',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>window.reviewedAreas.selected.length),1);
  assert.equal(await page.evaluate(()=>window.reviewedAreas.selected[0].sourceId),2);

  await editor.fill((await editor.inputValue())+'\nMI AJUSTE MANUAL');
  await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();
  await page.getByRole('button',{name:'Guardando…',exact:true}).waitFor();
  assert.equal(await page.getByText('Buscando datos en los documentos…',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Copiar texto',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.copiedText),await page.getByRole('textbox',{name:'Texto guardado para redes sociales'}).inputValue());
  assert.equal(await page.evaluate(()=>window.savedBody.textoRealizado),false);
  await page.getByRole('button',{name:'Editar texto',exact:true}).click();
  assert.match(await editor.inputValue(),/MI AJUSTE MANUAL/);
  assert.equal(await page.getByRole('button',{name:'Guardar texto y marcar como realizado',exact:true}).isDisabled(),true);
  await editor.fill('TEXTO FINAL REVISADO SIN DATOS PENDIENTES');
  await page.getByRole('button',{name:'Guardar texto y marcar como realizado',exact:true}).click();
  await page.waitForFunction(()=>window.savedBody?.textoRealizado===true);
  assert.equal(await page.evaluate(()=>window.savedBody.textoRealizado),true);
  await page.goto('http://127.0.0.1:3138?saved=1');
  await page.getByRole('button',{name:'Editar texto',exact:true}).click(); const before=await editor.inputValue();
  assert.equal(await page.getByText(/dato\(s\) por confirmar/).count(),0,'Completed text without markers has no pending-data warning');
  await page.getByRole('button',{name:'Simular archivo actualizado'}).click(); assert.equal(await editor.inputValue(),before);
  await page.getByRole('button',{name:'Cancelar',exact:true}).click(); await page.getByRole('button',{name:'Copiar texto',exact:true}).click(); assert.equal(await page.evaluate(()=>window.copiedText),before);
  await page.goto('http://127.0.0.1:3138?saved=1&pendiente=1');
  assert.ok(await page.getByText('Texto por revisar',{exact:true}).count()>=2);
  await page.screenshot({path:`${out}/texto-por-revisar-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Revisar texto',exact:true}).click();
  assert.equal(await page.getByText('El texto marcado como realizado conserva 1 marcador(es) por revisar.',{exact:false}).isVisible(),true);
  assert.equal(await page.getByText('Puedes guardar el borrador y completarlos después.',{exact:false}).count(),0);
  await editor.fill('TEXTO REALIZADO Y REVISADO');
  assert.equal(await page.getByText('marcador(es) por revisar',{exact:false}).count(),0);
  await page.getByRole('button',{name:'Guardar cambios del texto',exact:true}).click();
  await page.getByText('Texto corregido.',{exact:false}).waitFor();
  assert.equal(await page.getByText('Texto por revisar',{exact:true}).count(),0,'Review flag clears in the editor and portfolio row after saving');
  assert.equal(await page.getByText('Publicación registrada',{exact:true}).count(),1,'Existing publication stays registered');
  await page.goto('http://127.0.0.1:3138?sin-propuestas=1');
  const unchangedDraft=await editor.inputValue();
  await page.getByRole('button',{name:'Elegir documentos',exact:true}).click();
  await page.getByRole('button',{name:'Analizar documentos seleccionados (3)',exact:true}).click();
  await page.getByText('Buscando datos en los documentos…',{exact:true}).waitFor();
  assert.equal(await page.getByText('Buscando datos en los documentos…',{exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Guardando…',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Guardar texto y marcar como realizado',exact:true}).isDisabled(),true);
  { const searchAboveText=await page.evaluate(()=>{const status=[...document.querySelectorAll('[role="status"]')].find(node=>node.textContent.includes('Buscando datos en los documentos'));const editor=document.querySelector('textarea');return Boolean(status&&editor&&(status.compareDocumentPosition(editor)&Node.DOCUMENT_POSITION_FOLLOWING));});
  assert.equal(searchAboveText,true); }

  await page.getByText('Análisis terminado sin propuestas',{exact:false}).waitFor();
  const documents=page.getByRole('region',{name:'Documentos del inmueble',exact:true});
  await page.getByRole('button',{name:'Ver documentos (3)',exact:true}).click();
  const sourceLink=documents.getByRole('link',{name:'Abrir PDF: Copia literal de prueba',exact:true});
  assert.equal(await sourceLink.getAttribute('href'),'/api/inmuebles/1/archivos/2');
  assert.equal(await sourceLink.getAttribute('target'),'_blank');
  assert.equal(await documents.getByRole('link',{name:'Abrir PDF: Documento protegido',exact:true}).count(),1);
  assert.equal(await page.getByRole('checkbox',{name:/^Seleccionar /}).count(),0,'No proposals must not hide original files');
  await page.getByRole('button',{name:'Ocultar asistente',exact:true}).click();
  await page.getByRole('button',{name:'Ver documentos y resultados',exact:true}).click();
  assert.equal(await sourceLink.isVisible(),true);
  analyzedFileIds.length=0;
  await documents.getByRole('button',{name:'Analizar este documento: Copia literal de prueba',exact:true}).click();
  await page.getByText('Análisis terminado sin propuestas',{exact:false}).waitFor();
  assert.deepEqual(analyzedFileIds,[2],'Single-file action must not reanalyze every document');
  assert.equal(await editor.inputValue(),unchangedDraft);
  await page.goto('http://127.0.0.1:3138?saved=1&diffusion=1&legacy=1');
  await page.getByRole('button',{name:'Actualizar publicación',exact:true}).click();
  await page.getByRole('combobox',{name:'Medios de publicación'}).selectOption('ambos');
  const networks=page.getByRole('region',{name:'Enlaces de redes sociales'});
  assert.equal(await networks.getByRole('textbox',{name:'Nombre de la red'}).inputValue(),'Portal Local');
  for(const name of ['Facebook','Instagram']) { assert.equal(await networks.getByRole('button',{name,exact:true}).locator('svg').count(),1); await networks.getByRole('button',{name,exact:true}).click(); }
  await networks.getByRole('textbox',{name:'Enlace del anuncio'}).nth(1).fill('https://www.facebook.com/example/posts/1');
  await networks.getByRole('textbox',{name:'Enlace del anuncio'}).nth(2).fill('https://www.instagram.com/p/example/');
  await page.screenshot({path:`${out}/redes-sociales-${width}.png`,fullPage:true});
  await page.getByRole('checkbox',{name:'Cartel colocado',exact:true}).check();
  await page.getByRole('button',{name:'Guardar avance',exact:true}).click();
  await page.getByText('Avance guardado. La publicación sigue pendiente:',{exact:false}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.savedBody.referencias.map(row=>row.canal)),['Portal Local','Facebook','Instagram']);
  assert.equal(await page.evaluate(()=>window.savedBody.referencias[0].url),'https://example.com/anuncio-original');
  await page.getByRole('button',{name:'Actualizar publicación',exact:true}).click();
  await page.getByRole('checkbox',{name:'Publicado en redes sociales',exact:true}).check();
  await page.getByRole('button',{name:'Completar publicación',exact:true}).click();
  await page.getByText('Publicación completada en los medios elegidos.',{exact:false}).waitFor();
  await page.screenshot({path:`${out}/publicacion-completa-${width}.png`,fullPage:true});
  await page.goto('http://127.0.0.1:3138?colores=1');
  const backgrounds=[];
  for(const [stage,label,color] of [['visita','Visita pendiente','amber'],['tasacion','Tasación pendiente','violet'],['texto','Texto pendiente','blue'],['publicacion','Publicación pendiente','red']]) {
   const tags=page.locator(`[data-color-stage="${stage}"]`).getByText(label,{exact:true});
   assert.equal(await tags.count(),2);
   const styles=await tags.evaluateAll(nodes=>nodes.map(node=>{while(node&&getComputedStyle(node).backgroundColor==='rgba(0, 0, 0, 0)')node=node.parentElement;return {background:getComputedStyle(node).backgroundColor,classes:node.className};}));
   assert.equal(styles[0].background,styles[1].background,'Rows and cards use the same stage color');
   assert.ok(styles.every(style=>style.classes.includes(`bg-${color}-50`)));
   backgrounds.push(styles[0].background);
  }
  assert.equal(new Set(backgrounds).size,4,'Visit, valuation, text and publication have distinct colors');
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
  await page.screenshot({path:`${out}/editor-${width}.png`,fullPage:true});
  await context.close();
 }
 console.log('PASS: editor real a 375/1440 px; revisión desaparece tras corregir y guardar; publicación conservada; Facebook/Instagram con iconos; enlaces históricos conservados; regresiones documentales aprobadas. APIs simuladas.');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
