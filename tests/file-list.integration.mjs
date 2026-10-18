// Disposable MySQL only. Never load .env.local or connect to a production database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { hashSessionToken } from '../lib/password.mjs';

const uri = process.env.TEST_DATABASE_URL, location = new URL(uri || 'http://invalid');
assert.ok(['localhost', '127.0.0.1'].includes(location.hostname) && /^\/alfaro_files_test(?:_[a-z0-9]+)?$/.test(location.pathname), 'Requires disposable local alfaro_files_test');
const db = await mysql.createConnection(uri);
const origin = 'http://127.0.0.1:3168', work = fs.mkdtempSync(path.join(os.tmpdir(), 'alfaro-files-'));
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const stored = new Map();
let app, storage, browser, page, logs = '';
async function request(resource, token, method = 'GET', body) {
  const response = await fetch(origin + resource, {method, headers: { Origin: origin, ...(token ? {Cookie:`aa_session=${token}`} : {}), ...(body && !(body instanceof FormData) ? {'Content-Type':'application/json'} : {})}, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(30000), redirect:'manual'});
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.arrayBuffer();
  return {response, data};
}
try {
  assert.equal((await db.query('SHOW TABLES'))[0].length, 0, 'Existing databases must never be cleared');
  const schema = execFileSync(process.execPath, ['node_modules/drizzle-kit/bin.cjs','export','--dialect=mysql','--schema=./db/schema.ts'], {encoding:'utf8'});
  for (const statement of schema.slice(schema.indexOf('CREATE TABLE')).split(';').map(value => value.trim()).filter(Boolean)) await db.query(statement);
  const tokens = [];
  for (const role of ['administrador','usuario']) {
    const [user] = await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,rol) VALUES(?,?,?,?)',[role,`${role}@example.invalid`,role,role]);
    const token = randomBytes(32).toString('hex'); tokens.push(token);
    await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,NOW(),NOW())',[hashSessionToken(token),user.insertId,new Date(Date.now()+3600000)]);
  }
  const [admin, operator] = tokens;
  await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad,activo) VALUES(1,'chimbote','Chimbote',10,1),(2,'lima','Lima',10,1),(3,'inactiva','Inactiva',10,0)");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,direccion,nombre_contacto,zona_id) VALUES(1,'012-LOCAL-LIDIA',12,'Local','venta','Referencia','Av Meigss C3','Lidia Chavarria',1),(2,'013-CASA-LIMA',13,'Casa','alquiler','Referencia Lima','Calle Lima','Contacto Lima',2),(3,'014-CASA-INACTIVA',14,'Casa','venta','Referencia oculta','Calle inactiva','Contacto oculto',3)");
  await db.query("INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(1,1,1),(2,2,1)");
  await db.query("INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(1,1),(2,2)");
  for (const [property, category, hosted] of [[1,'TASACION_EXPRESS',true],[1,'TASACION_PROPIETARIO',true],[1,'TASACION',true],[1,'MINUTA_COMPRAVENTA',true],[1,'ESCRITURA_PUBLICA',true],[2,'CONTRATO',true],[2,'CONTRATO_ALQUILER',true],[1,'CONTRATO',true],[1,'TASACION_EXPRESS',false],[3,'TASACION_EXPRESS',true],[1,'FOTO_INMUEBLE',true]]) {
    const filename = `seed/${randomBytes(5).toString('hex')}.pdf`; stored.set(filename,pdf);
    await db.query('INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,tipo_mime,nombre_original,usuario_id) VALUES(?,?,?,?,?,?,?,?,1)',[property,category,category,filename,hosted?'hosting':'enlace',hosted?filename:null,'application/pdf','archivo.pdf']);
  }
  // Enough real rows to test stable numbering across pages and filters.
  for (let i=0;i<50;i++) await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,tipo_mime,usuario_id) VALUES(1,'TASACION_EXPRESS',?,'seed/shared.pdf','hosting','seed/shared.pdf','application/pdf',1)",[`Tasación adicional ${i}`]);
  stored.set('seed/shared.pdf',pdf);
  const key=path.join(work,'key.pem'), cert=path.join(work,'cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
  storage=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},async(req,res)=>{
    if(req.headers.authorization!=='Bearer local-files-test'){res.writeHead(401).end();return;}
    const file=new URL(req.url,'https://localhost').searchParams.get('path');
    if(req.method==='PUT'){const chunks=[];for await(const chunk of req)chunks.push(chunk);stored.set(file,Buffer.concat(chunks));res.end();}
    else if(stored.has(file))res.end(stored.get(file));else res.writeHead(404).end();
  });
  await new Promise(resolve=>storage.listen(3169,'127.0.0.1',resolve));
  app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3168','-H','127.0.0.1'],{env:{...process.env,DATABASE_URL:uri,DATABASE_TLS_REQUIRED:'',DATABASE_SSL_CA:'',AUTH_LOGIN_MFA_REQUIRED:'0',DOCUMENT_HOSTING_URL:'https://127.0.0.1:3169',DOCUMENT_HOSTING_TOKEN:'local-files-test',NODE_EXTRA_CA_CERTS:cert},stdio:['ignore','pipe','pipe']});
  app.stdout.on('data',bytes=>{logs+=bytes;});app.stderr.on('data',bytes=>{logs+=bytes;});
  for(let i=0;i<80;i++){try{if((await fetch(origin+'/login')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
  assert.equal((await request('/api/listado-archivos')).response.status,401);
  assert.equal((await request('/api/listado-archivos',operator)).response.status,403);
  for(const query of ['tipo=desconocido','pagina=0','pagina=1.5'])assert.equal((await request('/api/listado-archivos?'+query,admin)).response.status,400);
  let result=await request('/api/listado-archivos',admin);assert.equal(result.response.status,200,JSON.stringify(result.data));assert.equal(result.data.paginacion.total,57);assert.equal(result.data.archivos.length,50);
  assert.ok(result.data.archivos.every(file=>file.zona!=='Inactiva'));
  result=await request('/api/listado-archivos?zona=Chimbote&tipo=tasaciones',admin);assert.equal(result.data.paginacion.total,53);assert.equal(result.data.archivos[0].tipo,'Tasación 1');assert.equal(result.data.archivos[49].tipo,'Tasación 50');assert.equal(result.data.archivos[0].inmueble,'012-venta-local-av meigss c3');
  const first=result.data.archivos[0];
  result=await request('/api/listado-archivos?zona=Chimbote&tipo=tasaciones&pagina=2',admin);assert.deepEqual(result.data.archivos.map(file=>file.tipo),['Tasación 51','Tasación 52','Tasación 53']);
  result=await request('/api/listado-archivos?zona=Lima&tipo=contratos-alquiler',admin);assert.deepEqual(result.data.archivos.map(file=>file.tipo),['Contrato de alquiler 1','Contrato de alquiler 2']);
  for(const type of ['minutas','escrituras'])assert.equal((await request('/api/listado-archivos?tipo='+type,admin)).data.paginacion.total,1);
  assert.equal((await request('/api/listado-archivos?zona=Inactiva',admin)).data.paginacion.total,0);
  assert.equal((await request('/api/listado-archivos?zona=Lima&tipo=tasaciones',admin)).data.paginacion.total,0);
  assert.equal((await request(first.enlace,admin)).response.status,200);assert.equal((await request(first.enlace)).response.status,401);
  assert.equal((await request('/api/liberaciones',admin)).response.status,400);
  assert.equal((await request('/api/liberaciones?zona=*',admin)).response.status,400);
  assert.equal((await request('/api/liberaciones',admin,'POST',{})).response.status,400);
  result=await request('/api/liberaciones?zona=Chimbote',admin);assert.deepEqual(result.data.items.map(item=>item.inmuebleId),[1]);
  assert.ok((await request('/api/liberaciones?zona=Chimbote',admin,'POST',{inmuebleId:2,motivo:'otro',detalleOtro:'Prueba aislada'})).response.status >= 400);
  assert.equal((await db.query('SELECT estado FROM inm_inmuebles WHERE id=2'))[0][0].estado,'activo');
  assert.equal((await request('/api/liberaciones?zona=Lima',admin,'POST',{inmuebleId:2,motivo:'otro',detalleOtro:'Prueba aislada'})).response.status,201);
  assert.equal((await request('/api/listado-archivos?zona=Lima',admin)).data.paginacion.total,2,'Historical property files remain accessible');
  const upload=new FormData();upload.set('archivo',new File([pdf],'alquiler.pdf'));upload.set('tipoDocumento','CONTRATO_ALQUILER');upload.set('nombre','Contrato nuevo desde ficha');
  result=await request('/api/inmuebles/2/archivos',operator,'POST',upload);assert.equal(result.response.status,201,JSON.stringify(result.data));
  result=await request('/api/listado-archivos?zona=Lima&tipo=contratos-alquiler',admin);assert.equal(result.data.archivos.at(-1).tipo,'Contrato de alquiler 3');
  console.log('PASS API MySQL: permisos, cuatro tipos, categorías antiguas, zonas activas, paginación y numeración estables, archivos privados, cierre por zona y carga desde ficha.');
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'aa_session',value:admin,url:origin}]);page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/listado-archivos');await page.getByRole('heading',{name:'Listado de archivos',exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Zona',exact:true}).selectOption('Chimbote');await page.getByRole('combobox',{name:'Tipo de archivo',exact:true}).selectOption('tasaciones');
  await page.getByText('53 archivo(s)',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Buscar',exact:true}).count(),0);
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.getByText('Tasación 51',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Zona',exact:true}).selectOption('Lima');await page.getByText('No hay archivos cargados que coincidan con estos filtros.',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Tipo de archivo',exact:true}).selectOption('contratos-alquiler');await page.getByText('Contrato de alquiler 3',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.has('pagina'),false,'Filter change resets pagination');
  await page.getByRole('button',{name:/Ver Contrato de alquiler 1/}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('dialog').locator('iframe').count(),1);await page.getByRole('button',{name:'Cerrar vista previa'}).click();
  assert.equal(await page.locator('nav').getByRole('link',{name:'Contratos de alquiler',exact:true}).count(),0);
  const release=page.locator('nav').getByRole('link',{name:'Liberar inmueble',exact:true});assert.equal(await release.count(),1,'Release action available in a selected zone');assert.ok((await release.getAttribute('href')).includes('zona=Lima'));
  await page.goto(origin+'/liberar-inmuebles');await page.getByRole('heading',{name:'Selecciona una zona para trabajar'}).waitFor();
  await page.goto(origin+'/liberar-inmuebles?zona=Chimbote');await page.getByRole('heading',{name:'Liberar inmueble',exact:true}).waitFor();await page.getByText('Lidia Chavarria',{exact:true}).first().waitFor();
  await page.goto(origin+'/datos-inmuebles?codigo=2&pestana=documentacion&zona=Lima');await page.getByRole('heading',{name:'Contrato de alquiler',exact:true}).waitFor();
  await page.goto(origin+'/listado-archivos?zona=Lima&tipo=contratos-alquiler');await page.getByText('Contrato de alquiler 3',{exact:true}).waitFor();
  fs.mkdirSync('output/file-list-local',{recursive:true,mode:0o700});await page.screenshot({path:'output/file-list-local/desktop.png',fullPage:true});
  await page.setViewportSize({width:375,height:850});await page.waitForFunction(()=>document.getElementById('navigation-panel').getBoundingClientRect().right<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No mobile overflow');await page.screenshot({path:'output/file-list-local/mobile.png',fullPage:true});
  await page.evaluate(()=>{
    const zone=document.querySelector('select[aria-label="Zona"]'),type=document.querySelector('select[aria-label="Tipo de archivo"]');
    type.value='minutas';type.dispatchEvent(new Event('change',{bubbles:true}));
    zone.value='Chimbote';zone.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.getByText('Minuta de compraventa 1',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('zona'),'Chimbote');assert.equal(new URL(page.url()).searchParams.get('tipo'),'minutas');
  assert.deepEqual(errors,[]);console.log('PASS navegador autenticado: filtros automáticos, navegación, vista PDF, categoría de carga, escritorio y móvil sin errores/desbordes.');
}catch(error){if(page){fs.mkdirSync('output/file-list-local',{recursive:true});await page.screenshot({path:'output/file-list-local/failure.png',fullPage:true}).catch(()=>{});}console.error(logs.slice(-2500));throw error;}
finally{if(browser)await browser.close();if(app)app.kill('SIGTERM');if(storage)await new Promise(resolve=>storage.close(resolve));await db.end();}
