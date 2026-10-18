// Browser checks against a disposable local database. Never loads .env.local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import mysql from 'mysql2/promise';
import {hashSessionToken} from '../lib/password.mjs';

const uri=process.env.TEST_DATABASE_URL,location=new URL(uri||'http://invalid');
assert.ok(['127.0.0.1','localhost'].includes(location.hostname)&&location.pathname==='/alfaro_task_search_test');
const db=await mysql.createConnection(uri),origin='http://127.0.0.1:3178';
let app,browser,logs='';
const contacts=['María Campos','José Campos','Luis Pérez'];
const locations=['Av. Meigss C. 4','Avenida Meiggs 320','Calle Las Palmeras'];
function rows(stage=0,publication=false) {
  return [10,2,1].map((position,index)=>({
    id:stage*100+index+1,inmuebleId:stage*100+index+1,codigo:`${String(stage*100+index+1).padStart(3,'0')}-LOCAL-LOCAL`,
    posicion:position+stage*10,zona:'Chimbote',distrito:'Chimbote',tipo:'Local',operacion:'venta',
    nombre:'Referencia local',referencia:'Referencia local',propietario:contacts[index],nombreContacto:contacts[index],
    direccion:locations[index],ubicacion:locations[index],dias:index===0?8:0,vencida:index===0,
    fotos:[],fechaTasacion:'2026-01-01',valorReferencia:'100',precioObjetivo:'95',precioVenta:'90',
    situacion:'aprobado',texto:'Texto local',publicado:publication,fechaPublicacion:publication?'2026-01-01':null,
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
  let dataRequests=0;
  await page.route(/\/api\/(visitas|tasaciones|publicaciones)(?:\?|$)/,async route=>{
    assert.equal(route.request().method(),'GET','Filtering must not save business data.');
    dataRequests++;
    const path=new URL(route.request().url()).pathname;
    const body=path.endsWith('/visitas')?{ok:true,items:rows()}:path.endsWith('/tasaciones')?{pendientes:rows(),registradas:rows(1),aprobadas:rows(1)}:{pendientes:rows(2),listos:rows(3),publicadas:rows(4,true)};
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
    if(path==='/registrar-tasaciones')await page.getByRole('status').filter({hasText:'6 de 6 inmuebles'}).waitFor();
    const baseline=dataRequests;
    for(const query of ['campos','AV MEIGGS','avenida meigss','campos meiggs']) {
      await search.fill(query);
      for(const list of lists) {await list.filter({hasText:'José Campos'}).waitFor();assert.deepEqual(await list.allTextContents(),['José Campos','María Campos'],query+' '+path);}
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
    await page.screenshot({path:`output/task-search-local/${path.slice(1)}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
  }
  await page.goto(origin+'/registrar-visitas?zona=Chimbote&inmueble=2');await page.getByRole('searchbox',{name:'Buscar inmueble'}).waitFor();await page.getByRole('heading',{name:'José Campos',exact:true}).waitFor();assert.equal(await page.locator('article').count(),1,'Selected-property link retained.');
  assert.deepEqual(errors,[]);assert.equal((await db.query('SELECT COUNT(*) total FROM inm_visitas'))[0][0].total,0);
  console.log('PASS cuatro pantallas: posiciones numéricas, contacto/dirección/ID, tildes, Meiggs/Meigss, cinco grupos, antigüedad, formulario conservado al filtrar, sin nuevas consultas al escribir y escritorio/móvil sin errores.');
} catch(error) {console.error(logs.slice(-5000));throw error;}
finally {if(browser)await browser.close();if(app)app.kill('SIGTERM');await db.end();}
