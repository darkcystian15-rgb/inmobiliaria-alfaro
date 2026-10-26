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
const failDeletes = new Set();
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
    else if(req.method==='DELETE'){if(failDeletes.has(file))res.writeHead(503).end();else{stored.delete(file);res.writeHead(204).end();}}
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
  result=await request('/api/listado-archivos?zona=Chimbote&tipo=tasaciones',admin);assert.equal(result.data.paginacion.total,53);assert.equal(result.data.archivos[0].tipo,'Tasación 1');assert.equal(result.data.archivos[49].tipo,'Tasación 50');assert.equal(result.data.archivos[0].inmueble,'001-venta-local-av meigss c3-lidia chavarria');
  const first=result.data.archivos[0];
  result=await request('/api/listado-archivos?'+new URLSearchParams({q:'Lidia Meigss',tipo:'tasaciones'}),admin);assert.equal(result.data.paginacion.total,53);
  result=await request('/api/listado-archivos?'+new URLSearchParams({q:'adicional 49',tipo:'tasaciones'}),admin);assert.equal(result.data.paginacion.total,1);assert.equal(result.data.archivos[0].tipo,'Tasación 53');
  result=await request('/api/listado-archivos?'+new URLSearchParams({q:'100%_sin_coincidencia'}),admin);assert.equal(result.data.paginacion.total,0);
  result=await request('/api/listado-archivos?zona=Lima&pagina=999',admin);assert.equal(result.data.paginacion.pagina,1);assert.equal(result.data.archivos.length,2);

  result=await request('/api/listado-archivos?zona=Chimbote&tipo=tasaciones&pagina=2',admin);assert.deepEqual(result.data.archivos.map(file=>file.tipo),['Tasación 51','Tasación 52','Tasación 53']);
  result=await request('/api/listado-archivos?zona=Lima&tipo=contratos-alquiler',admin);assert.deepEqual(result.data.archivos.map(file=>file.tipo),['Contrato de alquiler 1','Contrato de alquiler 2']);
  for(const type of ['minutas','escrituras'])assert.equal((await request('/api/listado-archivos?tipo='+type,admin)).data.paginacion.total,1);
  assert.equal((await request('/api/listado-archivos?zona=Inactiva',admin)).data.paginacion.total,0);
  assert.equal((await request('/api/listado-archivos?zona=Lima&tipo=tasaciones',admin)).data.paginacion.total,0);
  assert.equal((await request(first.enlace,admin)).response.status,200);assert.equal((await request(first.enlace)).response.status,401);
  if (process.argv.includes('--file-list-only')) {
    const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addCookies([{name:'aa_session',value:admin,url:origin}]);page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/listado-archivos?zona=Chimbote&tipo=tasaciones');
    await page.getByText('53 archivo(s)',{exact:true}).waitFor();
    await page.getByRole('searchbox',{name:'Buscar archivos',exact:true}).fill('adicional 49');
    await page.getByText('1 archivo(s)',{exact:true}).waitFor();await page.getByText('Tasación 53',{exact:true}).waitFor();
    await page.getByRole('button',{name:/Ver Tasación 53/}).click();
    await page.getByRole('dialog').locator('object[type="application/pdf"]').waitFor();
    assert.match(await page.getByRole('dialog').locator('object').getAttribute('data'),/^blob:/);
    await page.getByRole('button',{name:'Cerrar vista previa'}).click();
    await page.getByRole('searchbox',{name:'Buscar archivos',exact:true}).fill('');
    await page.getByText('53 archivo(s)',{exact:true}).waitFor();
    fs.mkdirSync('output/file-list-search',{recursive:true,mode:0o700});
    await page.screenshot({path:'output/file-list-search/desktop.png',fullPage:true});
    await page.setViewportSize({width:375,height:850});
    await page.waitForFunction(()=>document.getElementById('navigation-panel').getBoundingClientRect().right<=1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'output/file-list-search/mobile.png',fullPage:true});
    // Show the Word/Excel notice without opening or downloading the mocked file.
    await page.route('**/api/listado-archivos?**',route=>route.fulfill({json:{archivos:[{id:999,inmuebleId:1,inmueble:'Inmueble de prueba',zona:'Chimbote',tipo:'Tasación 1',nombre:'documento.docx',tipoMime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',enlace:'/never-download',almacenamiento:'hosting'}],paginacion:{pagina:1,paginas:1,total:1}}}));
    await page.getByRole('searchbox',{name:'Buscar archivos',exact:true}).fill('word');
    await page.getByRole('button',{name:'Ver Tasación 1 de Inmueble de prueba',exact:true}).click();
    await page.getByText('Vista previa no disponible para archivos Word o Excel. Debes descargar el archivo para consultarlo.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('dialog').getByRole('link',{name:'Descargar archivo'}).count(),1);
    assert.equal(await page.getByRole('dialog').getByRole('link',{name:'Abrir en otra pestaña'}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS listado: permisos, filtros, búsqueda global, numeración estable, paginación, PDF privado, aviso Word/Excel, escritorio y móvil sin errores ni desbordes.');
  } else {
  assert.equal((await request('/api/liberaciones',admin)).response.status,400);
  assert.equal((await request('/api/liberaciones?zona=*',admin)).response.status,400);
  assert.equal((await request('/api/liberaciones',admin,'POST',{})).response.status,400);
  result=await request('/api/liberaciones?zona=Chimbote',admin);assert.deepEqual(result.data.items.map(item=>item.inmuebleId),[1]);
  assert.ok((await request('/api/liberaciones?zona=Chimbote',admin,'POST',{inmuebleId:2,motivo:'alquilado',fechaAlquiler:'2026-10-01',rentaMensual:'1000'})).response.status >= 400);
  assert.equal((await db.query('SELECT estado FROM inm_inmuebles WHERE id=2'))[0][0].estado,'activo');
  assert.equal((await request('/api/liberaciones?zona=Lima',admin,'POST',{inmuebleId:2,motivo:'alquilado',fechaAlquiler:'2026-10-01',rentaMensual:'1000'})).response.status,201);
  assert.equal((await request('/api/listado-archivos?zona=Lima',admin)).data.paginacion.total,2,'Historical property files remain accessible');
  const upload=new FormData();upload.set('archivo',new File([pdf],'alquiler.pdf'));upload.set('tipoDocumento','CONTRATO_ALQUILER');upload.set('nombre','Contrato nuevo desde ficha');
  result=await request('/api/inmuebles/2/archivos',operator,'POST',upload);assert.equal(result.response.status,201,JSON.stringify(result.data));
  result=await request('/api/listado-archivos?zona=Lima&tipo=contratos-alquiler',admin);assert.equal(result.data.archivos.at(-1).tipo,'Contrato de alquiler 3');
  console.log('PASS API MySQL: permisos, cuatro tipos, categorías antiguas, zonas activas, paginación y numeración estables, archivos privados, cierre por zona y carga desde ficha.');
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'aa_session',value:admin,url:origin}]);page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/listado-archivos');await page.getByRole('heading',{name:'Listado de archivos',exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Zona',exact:true}).selectOption('Chimbote');await page.getByRole('combobox',{name:'Tipo de archivo',exact:true}).selectOption('tasaciones');
  await page.getByText('53 archivo(s)',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Buscar',exact:true}).count(),0);assert.equal(await page.locator('tbody td').getByText('Chimbote',{exact:true}).count(),0);assert.equal(await page.locator('tbody td').getByText('TASACION_EXPRESS',{exact:true}).count(),0);
  await page.getByRole('searchbox',{name:'Buscar archivos',exact:true}).fill('adicional 49');await page.getByText('1 archivo(s)',{exact:true}).waitFor();await page.getByText('Tasación 53',{exact:true}).waitFor();
  await page.getByRole('searchbox',{name:'Buscar archivos',exact:true}).fill('');await page.getByText('53 archivo(s)',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.getByText('Tasación 51',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Zona',exact:true}).selectOption('Lima');await page.getByText('No hay archivos cargados que coincidan con estos filtros.',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Tipo de archivo',exact:true}).selectOption('contratos-alquiler');await page.getByText('Contrato de alquiler 3',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.has('pagina'),false,'Filter change resets pagination');
  await page.getByRole('button',{name:/Ver Contrato de alquiler 1/}).click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').locator('object[type="application/pdf"]').waitFor();assert.match(await page.getByRole('dialog').locator('object').getAttribute('data'),/^blob:/);await page.getByRole('button',{name:'Cerrar vista previa'}).click();
  assert.equal(await page.locator('nav').getByRole('link',{name:'Contratos de alquiler',exact:true}).count(),0);
  const release=page.locator('nav').getByRole('link',{name:'Liberar inmueble',exact:true});assert.equal(await release.count(),1,'Release action available in a selected zone');assert.ok((await release.getAttribute('href')).includes('zona=Lima'));
  await page.goto(origin+'/liberar-inmuebles');await page.getByRole('heading',{name:'Selecciona una zona para trabajar'}).waitFor();
  await page.goto(origin+'/liberar-inmuebles?zona=Chimbote');await page.getByRole('heading',{name:'Liberar inmueble',exact:true}).waitFor();await page.getByText('Lidia Chavarria',{exact:true}).first().waitFor();
  await page.goto(origin+'/datos-inmuebles?codigo=2&pestana=documentacion&zona=Lima');await page.getByRole('heading',{name:'Contratos de alquiler',exact:true}).waitFor();
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
  await page.getByRole('combobox',{name:'Zona',exact:true}).selectOption('*');await page.waitForFunction(()=>document.querySelector('h1').getBoundingClientRect().top>=64);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'output/file-list-local/mobile-all-zones.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS navegador autenticado: filtros automáticos, navegación, vista PDF, categoría de carga, escritorio y móvil sin errores/desbordes.');
  // Destructive cases below run ONLY in this disposable local database/storage.
  await db.query('CREATE TABLE inm_asignaciones_posicion(id bigint PRIMARY KEY,inmueble_id bigint unsigned NOT NULL,FOREIGN KEY(inmueble_id) REFERENCES inm_inmuebles(id))');
  await db.query("INSERT INTO inm_propietarios(id,nombres,apellidos) VALUES(1,'Único','Eliminar'),(2,'Compartido','Conservar')");
  await db.query("UPDATE inm_inmuebles SET propietario_id=2 WHERE id=2");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,direccion,nombre_contacto,zona_id,propietario_id,inmueble_origen_id) VALUES(4,'004-CASA-ELIMINAR',4,'Casa','venta','Eliminar','Calle Cuatro','Contacto cuatro',1,1,NULL),(5,'005-CASA-OTRA',5,'Casa','venta','Conservar','Calle Cinco','Contacto cinco',1,2,4),(6,'006-CASA-PENDIENTE',6,'Casa','venta','Pendiente','Calle Seis','Contacto seis',1,NULL,NULL),(7,'007-CASA-UI',7,'Casa','venta','Interfaz','Calle Siete','Contacto siete',1,NULL,NULL)");
  await db.query('INSERT INTO inm_asignaciones_posicion VALUES(1,4)');
  await db.query('INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(3,1,2),(4,1,3),(5,1,4),(6,1,5)');
  await db.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(4,3),(5,4),(6,5),(7,6)');
  const [visit]=await db.query("INSERT INTO inm_visitas(inmueble_id,completada,usuario_id) VALUES(4,1,1)");
  await db.query("INSERT INTO inm_tasaciones(inmueble_id,fecha_tasacion,usuario_id) VALUES(4,'2026-10-01',1)");
  await db.query("INSERT INTO inm_publicaciones(inmueble_id,texto,drive_link,usuario_registro_id) VALUES(4,'Texto privado','',1)");
  await db.query("INSERT INTO inm_negociaciones(inmueble_id,usuario_id) VALUES(4,1)");
  await db.query("INSERT INTO inm_liberaciones(inmueble_id,motivo,usuario_registro_id,confirmado) VALUES(4,'otro',1,0)");
  await db.query("INSERT INTO inm_timeline(inmueble_id,evento,observacion,usuario_id) VALUES(4,'prueba','Historial privado',1)");
  await db.query("INSERT INTO inm_seguimiento(inmueble_id,actividad,responsable_id) VALUES(4,'visita',1)");
  await db.query("INSERT INTO inm_anuncios(inmueble_id,canal,enlace,fecha_publicacion,precio_publicado) VALUES(4,'Prueba','https://example.invalid','2026-10-01',100)");
  await db.query("INSERT INTO inm_expedientes(inmueble_id,configuracion) VALUES(4,'{}')");
  await db.query("INSERT INTO inm_codigos_anteriores(codigo,inmueble_id) VALUES('ANTERIOR-4',4)");
  const deletionPaths=['inmuebles/004-posicion-2/otro/one.pdf','inmuebles/004-posicion-2/foto-inmueble/two.png','inmuebles/004-posicion-2/otro/shared.pdf'];
  const deletionFiles=[];
  for(const [index,file]of deletionPaths.entries()){
    stored.set(file,pdf);const [inserted]=await db.query("INSERT INTO inm_archivos(inmueble_id,visita_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,tipo_mime,usuario_id) VALUES(4,?,?,'Eliminar',?,'hosting',?,?,1)",[index===1?visit.insertId:null,index===1?'FOTO_INMUEBLE':'TASACION_EXPRESS',file,file,index===1?'image/png':'application/pdf']);deletionFiles.push(inserted.insertId);
  }
  await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,tipo_mime,usuario_id) VALUES(5,'TASACION_EXPRESS','Compartido',?,'hosting',?,'application/pdf',1)",[deletionPaths[2],deletionPaths[2]]);
  await db.query("INSERT INTO inm_borradores(usuario_id,clave,contenido) VALUES(1,'ficha:simple-4',?),(1,'textos:actual',?)",[JSON.stringify({form:{id:4,nombreContacto:'Eliminar'}}),JSON.stringify({textos:{4:'Borrar',1:'Mantener'},textosListos:{4:'Borrar también',1:'Mantener también'}})]);
  await db.query("INSERT INTO inm_security_audit(actor_id,action,resource,outcome) VALUES(1,'dossier.update','property:4','success')");
  await db.query("INSERT INTO inm_borradores(usuario_id,clave,contenido) VALUES(1,'ficha:4',?),(1,'ficha:legacy-4',?),(1,'ficha:keep-1',?)",[JSON.stringify({form:{id:4}}),JSON.stringify({form:{id:4}}),JSON.stringify({form:{id:1}})]);
  const prepare=async(id,token=admin,zone='Chimbote')=>request('/api/liberaciones/eliminacion?'+new URLSearchParams({zona:zone}),token,'POST',{inmuebleId:id,motivo:'desistimiento'});
  const erase=async(id,token=admin,zone='Chimbote',confirmacion='ELIMINAR')=>request('/api/liberaciones/eliminacion?'+new URLSearchParams({zona:zone}),token,'DELETE',{eliminacionId:id,confirmacion});
  assert.equal((await request('/api/liberaciones/eliminacion?zona=Chimbote',null,'POST',{inmuebleId:4,motivo:'desistimiento'})).response.status,401);
  assert.equal((await prepare(4,operator)).response.status,403);
  assert.equal((await prepare(4,admin,'Lima')).response.status,409);
  assert.equal((await request('/api/liberaciones?zona=Chimbote',admin,'POST',{inmuebleId:4,motivo:'otro',detalleOtro:'No debe enviarse al histórico'})).response.status,400);
  result=await prepare(4);assert.equal(result.response.status,200,JSON.stringify(result.data));const oldJob=result.data.eliminacionId;
  assert.equal((await erase(oldJob,admin,'Chimbote','')).response.status,400);
  assert.equal((await erase(oldJob,operator)).response.status,403);
  assert.equal((await erase(oldJob,admin,'Lima')).response.status,409);
  await db.query("UPDATE inm_eliminaciones_pendientes SET expira=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE id=?",[oldJob]);
  assert.equal((await erase(oldJob)).response.status,409);
  result=await prepare(4);const stale=result.data.eliminacionId;
  await db.query("UPDATE inm_inmuebles SET direccion='Calle Cuatro actualizada' WHERE id=4");
  assert.equal((await erase(stale)).response.status,409);
  result=await prepare(4);const job=result.data.eliminacionId;assert.equal(result.data.archivos,3);
  await db.query('CREATE TABLE deletion_unknown_child(id int PRIMARY KEY,inmueble_id bigint unsigned,FOREIGN KEY(inmueble_id) REFERENCES inm_inmuebles(id))');await db.query('INSERT INTO deletion_unknown_child VALUES(1,4)');
  assert.equal((await erase(job)).response.status,500,'Unknown dependent FK causes complete database rollback');
  assert.equal((await db.query('SELECT COUNT(*) total FROM inm_archivos WHERE inmueble_id=4'))[0][0].total,3);assert.ok(stored.has(deletionPaths[0]));
  await db.query('DROP TABLE deletion_unknown_child');
  result=await erase(job);assert.equal(result.response.status,200,JSON.stringify(result.data));assert.equal(result.data.completo,true);
  for(const table of ['inm_inmuebles','inm_archivos','inm_visitas','inm_tasaciones','inm_publicaciones','inm_negociaciones','inm_liberaciones','inm_timeline','inm_seguimiento','inm_anuncios','inm_expedientes','inm_codigos_anteriores','inm_asignaciones_zona','inm_asignaciones_posicion'])assert.equal((await db.query(`SELECT COUNT(*) total FROM ${table} WHERE ${table==='inm_inmuebles'?'id':'inmueble_id'}=4`))[0][0].total,0,table);
  assert.equal((await db.query('SELECT COUNT(*) total FROM inm_propietarios WHERE id=1'))[0][0].total,0);
  assert.equal((await db.query('SELECT COUNT(*) total FROM inm_propietarios WHERE id=2'))[0][0].total,1);
  assert.equal((await db.query('SELECT inmueble_origen_id FROM inm_inmuebles WHERE id=5'))[0][0].inmueble_origen_id,null);
  assert.equal(stored.has(deletionPaths[0]),false);assert.equal(stored.has(deletionPaths[1]),false);assert.equal(stored.has(deletionPaths[2]),true,'Shared file of another property is preserved');
  assert.equal((await request(`/api/inmuebles/4/archivos/${deletionFiles[0]}`,admin)).response.status,404);
  assert.equal((await db.query("SELECT COUNT(*) total FROM inm_borradores WHERE clave='ficha:simple-4'"))[0][0].total,0);
  assert.equal((await db.query("SELECT COUNT(*) total FROM inm_borradores WHERE clave IN ('ficha:4','ficha:legacy-4')"))[0][0].total,0);assert.equal((await db.query("SELECT COUNT(*) total FROM inm_borradores WHERE clave='ficha:keep-1'"))[0][0].total,1);
  assert.deepEqual(JSON.parse((await db.query("SELECT contenido FROM inm_borradores WHERE clave='textos:actual'"))[0][0].contenido),{textos:{1:'Mantener'},textosListos:{1:'Mantener también'}});
  assert.equal((await request('/api/borradores?clave=ficha:simple-4',admin,'PUT',{contenido:{form:{id:4}}})).response.status,404);
  assert.equal((await request('/api/borradores?clave=textos:actual',admin,'PUT',{contenido:{textos:{4:'No reaparecer',1:'Mantener'}}})).response.status,200);
  assert.deepEqual(JSON.parse((await db.query("SELECT contenido FROM inm_borradores WHERE clave='textos:actual'"))[0][0].contenido),{textos:{1:'Mantener'}});
  assert.equal((await request('/api/borradores?clave=ficha:4',admin,'PUT',{contenido:{form:{id:4}}})).response.status,404);
  assert.equal((await request('/api/borradores?clave=ficha:legacy',admin,'PUT',{contenido:{form:{id:4}}})).response.status,404);
  const pendingPaths=['inmuebles/006-posicion-4/otro/one.pdf','inmuebles/006-posicion-4/otro/two.pdf'];
  for(const file of pendingPaths){stored.set(file,pdf);await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,tipo_mime,usuario_id) VALUES(6,'TASACION_EXPRESS','Pendiente',?,'hosting',?,'application/pdf',1)",[file,file]);}
  failDeletes.add(pendingPaths[1]);result=await prepare(6);const pendingJob=result.data.eliminacionId;result=await erase(pendingJob);assert.equal(result.response.status,202);assert.equal(result.data.completo,false);
  assert.equal((await db.query('SELECT COUNT(*) total FROM inm_inmuebles WHERE id=6'))[0][0].total,0);assert.equal(stored.has(pendingPaths[0]),false);assert.equal(stored.has(pendingPaths[1]),true);
  assert.deepEqual(JSON.parse((await db.query('SELECT rutas FROM inm_eliminaciones_pendientes WHERE id=?',[pendingJob]))[0][0].rutas),[pendingPaths[1]]);
  assert.equal((await request('/api/liberaciones?zona=Chimbote',admin)).data.eliminacionesPendientes.length,1);
  failDeletes.clear();result=await request('/api/liberaciones/eliminacion?zona=Chimbote',admin,'PATCH',{eliminacionId:pendingJob});assert.equal(result.response.status,200);assert.equal(result.data.completo,true);assert.equal(stored.has(pendingPaths[1]),false);
  assert.equal((await db.query("SELECT COUNT(*) total FROM inm_eliminaciones_pendientes WHERE estado='archivos'"))[0][0].total,0);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/cartera?zona=Chimbote');await page.getByRole('button',{name:'Ver detalle de Lidia Chavarria, posición 1',exact:true}).click();await page.getByText('ID del inmueble',{exact:true}).waitFor();assert.equal(await page.getByText('Contacto',{exact:true}).count(),0);await page.getByText('001-venta-local-av meigss c3-lidia chavarria',{exact:true}).waitFor();
  await page.goto(origin+'/liberar-inmuebles?zona=Chimbote');await page.getByText('Contacto siete',{exact:true}).waitFor();await page.locator('summary').filter({hasText:'Contacto siete'}).click();
  await page.getByRole('radio',{name:/Eliminar definitivamente/}).check();await page.getByRole('combobox',{name:/Motivo de eliminación/}).selectOption('desistimiento');await page.getByRole('button',{name:'Revisar eliminación'}).click();
  await page.getByRole('dialog',{name:'Eliminar inmueble',exact:true}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal((await db.query('SELECT COUNT(*) total FROM inm_inmuebles WHERE id=7'))[0][0].total,1);
  await page.getByRole('button',{name:'Revisar eliminación'}).click();await page.getByRole('button',{name:'Continuar con la eliminación',exact:true}).click();await page.getByRole('dialog',{name:'¿Seguro que quieres eliminar este inmueble?',exact:true}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal((await db.query('SELECT COUNT(*) total FROM inm_inmuebles WHERE id=7'))[0][0].total,1);
  await page.getByRole('button',{name:'Revisar eliminación'}).click();await page.getByRole('button',{name:'Continuar con la eliminación',exact:true}).click();await page.getByRole('dialog',{name:'¿Seguro que quieres eliminar este inmueble?',exact:true}).waitFor();
  fs.mkdirSync('output/property-delete-local',{recursive:true,mode:0o700});await page.screenshot({path:'output/property-delete-local/second-confirmation.png',fullPage:true});
  await page.getByRole('button',{name:'Sí, eliminar definitivamente',exact:true}).click();await page.getByText('Inmueble, documentos, fotos e historial eliminados. La posición está disponible.',{exact:true}).waitFor();assert.equal((await db.query('SELECT COUNT(*) total FROM inm_inmuebles WHERE id=7'))[0][0].total,0);
  await page.setViewportSize({width:375,height:850});await page.waitForFunction(()=>document.getElementById('navigation-panel').getBoundingClientRect().right<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'output/property-delete-local/mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS eliminación completa: dos confirmaciones cancelables, permisos, zona, caducidad, concurrencia, rollback SQL, borradores, FK antiguas, archivos compartidos, fallo del hosting y reintento durable. Sin tocar producción.');
  }
}catch(error){if(page){fs.mkdirSync('output/file-list-local',{recursive:true});await page.screenshot({path:'output/file-list-local/failure.png',fullPage:true}).catch(()=>{});}console.error(logs.slice(-2500));throw error;}
finally{if(browser)await browser.close();if(app)app.kill('SIGTERM');if(storage)await new Promise(resolve=>storage.close(resolve));await db.end();}
