// Browser checks against a disposable local database. Never loads .env.local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import mysql from 'mysql2/promise';
import {publicationChecklist} from '../lib/publication-checklist.mjs';
import {hashSessionToken} from '../lib/password.mjs';

const uri=process.env.TEST_DATABASE_URL,location=new URL(uri||'http://invalid');
assert.ok(['127.0.0.1','localhost'].includes(location.hostname)&&/^\/alfaro_task_search_test(?:_[a-z0-9]+)?$/.test(location.pathname));
const db=await mysql.createConnection(uri),origin='http://127.0.0.1:3178';
let app,browser,logs='';
const contacts=['María Campos','José Campos','Luis Pérez'];
const locations=['Av. Meigss C. 4','Avenida Meiggs 320','Calle Las Palmeras'];
function rows(stage=0,publication=false) {
  return [10,2,1].map((position,index)=>({
    id:stage*100+index+1,inmuebleId:stage*100+index+1,codigo:`${String(9000+stage*100+index+1).padStart(3,'0')}-LOCAL-LOCAL`,
    posicion:position+stage*10,zona:'Chimbote',distrito:'Chimbote',tipo:'Local',operacion:'venta',
    nombre:'Referencia local',referencia:'Referencia local',propietario:contacts[index],nombreContacto:contacts[index],
    direccion:locations[index],ubicacion:locations[index],dias:index===0?8:0,vencida:index===0,
    fotos:[],fechaTasacion:'2026-01-01',valorReferencia:'100',precioObjetivo:'95',precioVenta:'90',
    situacion:'aprobado',texto:'Texto local',publicado:publication,fechaPublicacion:publication?'2026-01-01':null,
    expediente:publicationChecklist({documentoDni:stage!==3||index!==0,archivoTasacion:true,fotosVisita:true,texto:'Texto local'}),
  }));
}
try {
  assert.equal((await db.query('SHOW TABLES'))[0].length,0,'Only an empty disposable database.');
  const schema=execFileSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','export','--dialect=mysql','--schema=./db/schema.ts'],{encoding:'utf8'});
  for(const query of schema.slice(schema.indexOf('CREATE TABLE')).split(';').map(x=>x.trim()).filter(Boolean))await db.query(query);
  const token=randomBytes(32).toString('hex');
  await db.query("INSERT INTO inm_usuarios(id,nombre,email,rol) VALUES(1,'Administrador local','local@example.invalid','administrador')");
  await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,1,DATE_ADD(NOW(),INTERVAL 1 HOUR),NOW(),NOW())',[hashSessionToken(token)]);
  await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'chimbote','Chimbote',90),(2,'lima','Lima',10)");
  app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3178','-H','127.0.0.1'],{env:{...process.env,DATABASE_URL:uri,DATABASE_TLS_REQUIRED:'',DATABASE_SSL_CA:'',AUTH_LOGIN_MFA_REQUIRED:'0',DOCUMENT_HOSTING_URL:'https://127.0.0.1:1',DOCUMENT_HOSTING_TOKEN:'local-test'},stdio:['ignore','pipe','pipe']});
  app.stdout.on('data',data=>{logs+=data;});app.stderr.on('data',data=>{logs+=data;});
  for(let attempt=0;attempt<80;attempt++){try{if((await fetch(origin+'/login')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'aa_session',value:token,url:origin}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,direccion,nombre_contacto,zona_id) VALUES(1,'901-CASA-LOCAL',901,'Casa','venta','Ensayo','Av. Local','Contacto local',1)");
  await db.query("INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(1,1,3)");
  await db.query("INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(1,1)");
  await db.query("INSERT INTO inm_timeline(inmueble_id,evento,usuario_id) VALUES(1,'inmueble_registrado',1)");

  await db.query("INSERT INTO inm_visitas(inmueble_id,fecha_visita,completada,usuario_id) VALUES(1,'2026-01-01',1,1),(1,'2026-01-02',1,1)");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,direccion,nombre_contacto,zona_id,estado) VALUES(2,'902-CASA-ALQUILER',902,'Casa','alquiler','Ensayo alquiler','Calle Local','Contacto alquiler local',2,'historico')");
  await db.query("INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(2,2,7)");
  await db.query("INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id,activa) VALUES(2,2,0)");
  await db.query("INSERT INTO inm_liberaciones(inmueble_id,motivo,confirmado,usuario_registro_id,fecha_inicio_alquiler,fecha_fin_alquiler,renta_mensual) VALUES(2,'alquilado',1,1,'2020-01-01','2021-01-01','1500')");
  const real=await context.request.get(origin+'/api/tasaciones?zona=Chimbote');
  assert.equal(real.status(),200);assert.equal((await real.json()).pendientes.length,1,'Repeated completed visits produce one appraisal task');
  const panel=await context.request.get(origin+'/api/dashboard');assert.equal((await panel.json()).resumen.tasacionesPendientes,1);
  const portfolio=await context.request.get(origin+'/api/cartera?zona=Chimbote');assert.equal((await portfolio.json()).resumen.tasacionesPendientes,1,'Portfolio, panel and inbox agree');


  let dataRequests=0;
  await page.route(/\/api\/(visitas|tasaciones|publicaciones)(?:\?|$)/,async route=>{
    assert.equal(route.request().method(),'GET','Filtering must not save business data.');
    dataRequests++;
    const path=new URL(route.request().url()).pathname;
    const prepared=rows(3);
    const body=path.endsWith('/visitas')?{ok:true,items:rows()}:path.endsWith('/tasaciones')?{pendientes:rows(),registradas:rows(1),aprobadas:rows(1)}:{pendientes:rows(2),listos:prepared.filter(item=>item.expediente.complete),incompletos:prepared.filter(item=>!item.expediente.complete),publicadas:rows(4,true)};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  const expected=['Luis Pérez','José Campos','María Campos'];
  fs.mkdirSync('output/task-search-local',{recursive:true,mode:0o700});
  for(const path of ['/registrar-visitas','/visitas-pendientes','/registrar-tasaciones','/tasaciones-textos-pendientes']) {
    await page.goto(origin+path+'?zona=Chimbote');
    const search=page.getByRole('searchbox',{name:'Buscar inmueble',exact:true});await search.waitFor();await page.waitForFunction(()=>{const input=document.querySelector('input[type="search"]');return input&&!input.disabled;});
    const lists=path==='/visitas-pendientes'?[page.locator('main h3')]:path==='/tasaciones-textos-pendientes'?['tasaciones','negociadas','material','listos','publicados'].map(id=>page.locator('#'+id+' h3')):[page.locator('article h3')];
    for(const list of lists)assert.deepEqual(await list.allTextContents(),expected,'Initial order '+path);
    let date,amount,text;
    if(path==='/registrar-visitas') {date=page.locator('article').first().locator('input[type="date"]');await date.fill('2026-01-02');}
    if(path==='/registrar-tasaciones') {amount=page.locator('article').first().locator('input[type="number"]').first();await amount.fill('1234.50');}
    if(path==='/tasaciones-textos-pendientes') {text=page.locator('#material textarea').first();await text.fill('Borrador local conservado');}
    if(path==='/tasaciones-textos-pendientes') {
      await page.getByRole('button',{name:/Textos preparados/}).filter({hasText:'1 por completar · 2 listos para publicar'}).waitFor();
      const ready=page.locator('#listos > div.space-y-4 > div').filter({hasText:'Luis Pérez'});
      await ready.locator('textarea').fill('');
      assert.match(await ready.getByRole('region',{name:'Documentos y material para publicar'}).innerText(),/Pendiente:.*Texto para publicar/s,'Checklist follows its visible textarea');
      assert.equal(await ready.getByRole('button',{name:'Marcar como publicado',exact:true}).isDisabled(),true);
      await ready.locator('textarea').fill('Texto local');
    }

    if(path==='/registrar-tasaciones')await page.getByRole('status').filter({hasText:'6 de 6 inmuebles'}).waitFor();
    const baseline=dataRequests;
    for(const query of ['campos','AV MEIGGS','avenida meigss','campos meiggs']) {
      await search.fill(query);
      for(const list of lists) {await list.filter({hasText:'José Campos'}).waitFor();assert.deepEqual(await list.allTextContents(),['José Campos','María Campos'],query+' '+path);}
    }
    // A visible ID must use the position, even when the stored global code differs.
    await search.fill('010-venta-local-av. meigss c. 4');
    assert.deepEqual(await lists[0].allTextContents(),['María Campos']);
    await page.getByText('010-venta-local-av. meigss c. 4',{exact:true}).first().waitFor();
    for(const query of ['Referencia local','Chimbote','9001-LOCAL-LOCAL']) {
      await search.fill(query);for(const list of lists)assert.equal(await list.count(),0,'Hidden fields must not match '+query);
    }
    await search.fill('jose campos');for(const list of lists)assert.deepEqual(await list.allTextContents(),['José Campos']);
    await search.fill('inexistente 999999');for(const list of lists)assert.equal(await list.count(),0);
    await page.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();
    for(const list of lists)assert.deepEqual(await list.allTextContents(),expected);
    if(date)assert.equal(await date.inputValue(),'2026-01-02');if(amount)assert.equal(await amount.inputValue(),'1234.50');if(text)assert.equal(await text.inputValue(),'Borrador local conservado');
    assert.equal(dataRequests,baseline,'Typing must not re-fetch task lists.');
    if(path==='/visitas-pendientes') {await page.getByRole('combobox',{name:'Filtrar antigüedad de visitas'}).selectOption('Más de 2 días');assert.deepEqual(await lists[0].allTextContents(),['María Campos']);await page.getByRole('combobox',{name:'Filtrar antigüedad de visitas'}).selectOption('Todas');}
    await page.screenshot({path:`output/task-search-local/${path.slice(1)}-desktop.png`,fullPage:true});
    await page.setViewportSize({width:375,height:850});await search.fill('meiggs');for(const list of lists)assert.deepEqual(await list.allTextContents(),['José Campos','María Campos']);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile overflow '+path);
    await page.evaluate(()=>window.scrollTo(0,0));
    const heading=await page.locator('main h1').boundingBox();assert.ok(heading.y+await page.evaluate(()=>scrollY)>=64,'Heading below fixed mobile header '+path);
    const zoneBanner=page.locator('[aria-current="page"]').filter({hasText:'Zona actual'});
    if(await zoneBanner.count())assert.ok((await zoneBanner.first().boundingBox()).y+await page.evaluate(()=>scrollY)>=64,'Zone context below header');

    await page.screenshot({path:`output/task-search-local/${path.slice(1)}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
  }
  await page.goto(origin+'/registrar-visitas?zona=Chimbote&inmueble=2');await page.getByRole('searchbox',{name:'Buscar inmueble'}).waitFor();await page.getByRole('heading',{name:'José Campos',exact:true}).waitFor();assert.equal(await page.locator('article').count(),1,'Selected-property link retained.');
  for(const path of ['/visitas-pendientes','/tasaciones-textos-pendientes']) {
    await page.goto(origin+path);await page.getByRole('button',{name:/Chimbote/}).first().waitFor();
    await page.getByRole('button',{name:'Ver listado general →',exact:true}).click();
    await page.getByRole('searchbox',{name:'Buscar inmueble',exact:true}).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('zona'),'*');
    const action=path==='/visitas-pendientes'?page.getByRole('link',{name:'Registrar visita',exact:true}).first():page.getByRole('link',{name:'Registrar tasación →',exact:true}).first();
    const href=await action.getAttribute('href');assert.equal(new URL(href,origin).searchParams.get('zona'),'Chimbote','Global task link keeps the actual zone');
    await Promise.all([page.waitForURL(url=>url.searchParams.get('zona')==='Chimbote'&&url.pathname.startsWith('/registrar-')),action.click()]);await page.getByRole('searchbox',{name:'Buscar inmueble',exact:true}).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('zona'),'Chimbote');
  }

  await page.goto(origin+'/datos-inmuebles?codigo=1');
  const nextAction=page.getByRole('link',{name:'Registrar tasación →',exact:true}).first();await nextAction.waitFor();
  assert.equal(new URL(await nextAction.getAttribute('href'),origin).searchParams.get('zona'),'Chimbote','Ficha reached without zone resolves it from the actual property');
  await page.goto(origin+'/');await page.getByRole('region',{name:'Seguimiento de alquileres',exact:true}).getByText('07',{exact:true}).waitFor();
  await page.getByRole('link',{name:/^Ver historial de /}).first().click();
  await page.locator('#historial[open]').waitFor();
  await page.goto(origin+'/alquileres');await page.getByRole('heading',{name:'Contratos de alquiler',exact:true}).waitFor();
  fs.mkdirSync('output/design-audit-local',{recursive:true,mode:0o700});
  for(const path of ['/cartera','/visitas-pendientes','/tasaciones-textos-pendientes']) {
    await page.goto(origin+path);await page.getByRole('button',{name:/Chimbote/}).first().waitFor();
    await page.screenshot({path:`output/design-audit-local/${path.slice(1)}-desktop.png`,fullPage:true});
    await page.setViewportSize({width:375,height:850});
    await page.waitForFunction(()=>document.getElementById('navigation-panel').getBoundingClientRect().right<=1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Zone folder mobile overflow '+path);
    assert.ok((await page.locator('main h1').boundingBox()).y+await page.evaluate(()=>scrollY)>=64);
    await page.screenshot({path:`output/design-audit-local/${path.slice(1)}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
  }
  assert.deepEqual(errors,[]);assert.equal((await db.query('SELECT COUNT(*) total FROM inm_visitas'))[0][0].total,2);
  console.log('PASS auditoría: API real sin duplicados por visitas, cabecera móvil, checklist reactivo, carpetas y vista general, contexto de zona, enlace a historial, título de contratos; cuatro pantallas: posiciones numéricas, contacto/dirección/ID, tildes, Meiggs/Meigss, cinco grupos, antigüedad, formulario conservado al filtrar, sin nuevas consultas al escribir y escritorio/móvil sin errores.');
} catch(error) {console.error(logs.slice(-5000));throw error;}
finally {if(browser)await browser.close();if(app)app.kill('SIGTERM');await db.end();}
