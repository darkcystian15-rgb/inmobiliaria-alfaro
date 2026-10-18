// Only a new, empty local database. Never reads .env.local or writes production.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { hashSessionToken } from '../lib/password.mjs';
import { todayInPeru } from '../lib/calendar.mjs';
import { workflowDeadline } from '../lib/workflow-deadline.mjs';

const uri = process.env.TEST_DATABASE_URL, location = new URL(uri || 'http://invalid');
assert.ok(['127.0.0.1','localhost'].includes(location.hostname) && /^\/alfaro_deadline_test(?:_[a-z0-9]+)?$/.test(location.pathname));
const db = await mysql.createConnection({uri,dateStrings:true}), origin = 'http://127.0.0.1:3188';
const token = randomBytes(32).toString('hex');
let app, browser, logs = '';
const headers = {Cookie:`aa_session=${token}`};
async function get(path) {
  const response = await fetch(origin+path,{headers,signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,path);return response.json();
}
async function agenda() { return (await get('/api/seguimiento?zona=Chimbote')).items; }
try {
  assert.equal((await db.query('SHOW TABLES'))[0].length,0,'Never clear an existing database');
  const schema = execFileSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','export','--dialect=mysql','--schema=./db/schema.ts'],{encoding:'utf8'});
  for(const query of schema.slice(schema.indexOf('CREATE TABLE')).split(';').map(x=>x.trim()).filter(Boolean))await db.query(query);
  await db.query("INSERT INTO inm_usuarios(id,nombre,email,rol) VALUES(1,'Administrador local','deadline@example.invalid','administrador')");
  await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,1,DATE_ADD(NOW(),INTERVAL 1 HOUR),NOW(),NOW())',[hashSessionToken(token)]);
  await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'chimbote','Chimbote',10)");
  await db.query("INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(1,1,1),(2,1,2)");
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,direccion,nombre_contacto,zona_id) VALUES(1,'901-CASA-LOCAL',901,'Casa','venta','Ensayo','Calle local','Visita histórica',1),(2,'902-CASA-PENDIENTE',902,'Casa','venta','Pendiente','Calle pendiente','Visita pendiente',1)");
  await db.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(1,1),(2,2)');
  await db.query("INSERT INTO inm_config_alertas(tipo,dias,activo) VALUES('visita',2,1),('tasacion',3,1),('expediente',3,1),('publicacion',2,1)");
  await db.query("INSERT INTO inm_visitas(id,inmueble_id,fecha_visita,completada,usuario_id) VALUES(1,1,'2025-06-17',1,1)");
  app = spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3188','-H','127.0.0.1'],{env:{...process.env,DATABASE_URL:uri,DATABASE_TLS_REQUIRED:'',DATABASE_SSL_CA:'',AUTH_LOGIN_MFA_REQUIRED:'0'},stdio:['ignore','pipe','pipe']});
  app.stdout.on('data',data=>{logs+=data;});app.stderr.on('data',data=>{logs+=data;});
  for(let attempt=0;attempt<80;attempt++){try{if((await fetch(origin+'/login')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  const today = todayInPeru();
  let task = (await agenda()).find(item=>item.id===1);
  assert.equal(task.actividad,'tasacion');assert.equal(task.inicio,today);
  assert.equal(task.fechaLimite,workflowDeadline(today,3).fechaLimite,'Visit dated 2025, registered today: deadline starts today');
  assert.equal(task.estadoPlazo,'en_plazo');
  const visit = (await get('/api/visitas?zona=Chimbote')).items.find(item=>item.id===2);
  const visitTask = (await agenda()).find(item=>item.id===2);
  assert.equal(visit.fechaLimite,visitTask.fechaLimite);assert.equal(visit.estadoPlazo,visitTask.estadoPlazo);
  assert.equal(visit.dias,0);

  // Adding another completed visit cannot postpone an already pending appraisal.
  await db.query('UPDATE inm_visitas SET fecha_registro=DATE_SUB(NOW(),INTERVAL 4 DAY) WHERE id=1');
  await db.query("INSERT INTO inm_visitas(id,inmueble_id,fecha_visita,completada,usuario_id) VALUES(2,1,'2025-06-18',1,1)");
  task=(await agenda()).find(item=>item.id===1);
  assert.equal(task.estadoPlazo,'vencido','Uses the first completed visit registration, not the new visit');
  await db.query('UPDATE inm_visitas SET fecha_registro=NOW() WHERE id=1');

  await db.query("INSERT INTO inm_tasaciones(inmueble_id,fecha_tasacion,valor_referencia,precio_objetivo,precio_venta,situacion,usuario_id) VALUES(1,'2025-06-20',100,100,100,'aprobado',1)");
  task=(await agenda()).find(item=>item.id===1);
  assert.equal(task.actividad,'expediente');assert.equal(task.inicio,today);
  assert.equal(task.fechaLimite,workflowDeadline(today,3).fechaLimite,'Material starts when appraisal is recorded, not its historical date');
  await db.query("INSERT INTO inm_publicaciones(inmueble_id,texto,drive_link,usuario_registro_id) VALUES(1,'Texto local','',1)");
  for(const [category,mime,visitId] of [['DNI_PROPIETARIO','application/pdf',null],['TASACION','application/pdf',null],['FOTO_INMUEBLE','image/webp',1]]) {
    await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,tipo_mime,visita_id,usuario_id) VALUES(1,?,?,'local-test','hosting',?,?,1)",[category,category,mime,visitId]);
  }
  task=(await agenda()).find(item=>item.id===1);
  assert.equal(task.actividad,'publicacion');assert.equal(task.fechaLimite,workflowDeadline(today,2).fechaLimite);
  await db.query("INSERT INTO inm_seguimiento(inmueble_id,actividad,fecha_limite) VALUES(1,'publicacion','2025-06-21'),(2,'visita',?)",[today]);
  task=(await agenda()).find(item=>item.id===1);assert.equal(task.fechaLimite,'2025-06-21');assert.equal(task.estadoPlazo,'vencido','An explicit deadline remains unchanged');
  let pending=(await get('/api/visitas?zona=Chimbote')).items.find(item=>item.id===2);
  assert.equal(pending.estadoPlazo,'vence_hoy');assert.equal(pending.vencida,false);
  assert.equal(pending.estadoPlazo,(await agenda()).find(item=>item.id===2).estadoPlazo);
  await db.query("UPDATE inm_seguimiento SET fecha_limite=DATE_SUB(?,INTERVAL 1 DAY) WHERE inmueble_id=2",[today]);
  pending=(await get('/api/visitas?zona=Chimbote')).items.find(item=>item.id===2);assert.equal(pending.estadoPlazo,'vencido');assert.equal(pending.vencida,true);

  // More than ten overdue tasks: totals must describe the entire group, not the page.
  for(let id=3;id<=14;id++){
    await db.query("INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(?,1,?)",[id,id]);
    await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,nombre_contacto,zona_id) VALUES(?, ?,?,'Casa','venta','Prueba','Caso local',1)",[id,`LOCAL-${id}`,900+id]);
    await db.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(?,?)',[id,id]);
    await db.query("INSERT INTO inm_seguimiento(inmueble_id,actividad,fecha_limite) VALUES(?,'visita',DATE_SUB(?,INTERVAL 2 DAY))",[id,today]);
  }
  let alerts=await get('/api/seguimiento?estado=vencidos&limite=10');
  assert.equal(alerts.total,14);assert.equal(alerts.items.length,10);assert.equal(alerts.resumen.vencidos,14);
  assert.equal(alerts.items[0].id,1,'Oldest effective deadline first');
  const next=await get('/api/seguimiento?estado=vencidos&limite=10&pagina=2');
  assert.equal(next.items.length,4);assert.ok(!next.items.some(t=>alerts.items.some(first=>first.id===t.id)));
  async function put(path,body){const response=await fetch(origin+path,{method:'PUT',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200,await response.text());}
  const future=workflowDeadline(today,8).fechaLimite;
  await put('/api/inmuebles/2/seguimiento',{actividad:'visita',fechaLimite:future,observacion:'Reprogramación local'});
  alerts=await get('/api/seguimiento?estado=vencidos&limite=10');
  assert.equal(alerts.total,13);assert.ok(!alerts.items.some(item=>item.id===2));
  assert.equal((await get('/api/visitas?zona=Chimbote')).items.find(item=>item.id===2).fechaLimite,future);
  assert.equal((await get('/api/inmuebles/2/seguimiento')).vigente.fechaLimite,future);
  const [history]=await db.query("SELECT observacion FROM inm_timeline WHERE inmueble_id=2 AND evento='seguimiento_actualizado'");
  assert.equal(history.length,1);assert.equal(JSON.parse(history[0].observacion).nuevo.fechaLimite,future);
  await put('/api/inmuebles/2/seguimiento',{actividad:'visita',fechaLimite:null,observacion:'Volver al general'});
  assert.equal((await get('/api/inmuebles/2/seguimiento')).vigente.plazoOrigen,'automatico');
  assert.equal((await get('/api/visitas?zona=Chimbote')).items.find(item=>item.id===2).fechaLimite,workflowDeadline(today,2).fechaLimite);
  await put('/api/plazos',{actividad:'visita',dias:4});
  assert.equal((await get('/api/inmuebles/2/seguimiento')).vigente.fechaLimite,workflowDeadline(today,4).fechaLimite);
  assert.equal((await get('/api/inmuebles/3/seguimiento')).vigente.estadoPlazo,'vencido','Global change does not overwrite particular deadlines');
  await db.query("INSERT INTO inm_usuarios(id,nombre,email,rol) VALUES(2,'Operador local','operator@example.invalid','usuario')");
  const operator=randomBytes(32).toString('hex');
  await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,2,DATE_ADD(NOW(),INTERVAL 1 HOUR),NOW(),NOW())',[hashSessionToken(operator)]);
  for(const path of ['/api/inmuebles/2/seguimiento','/api/seguimiento','/api/plazos'])assert.equal((await fetch(origin+path,{headers:{Cookie:`aa_session=${operator}`}})).status,403);

  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'aa_session',value:token,url:origin}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/');const region=page.getByRole('region',{name:'Alertas de actividades',exact:true});await region.getByText(/^Vencido:/).first().waitFor();assert.ok(!(await region.innerText()).includes('Automático'));
  assert.equal(await region.locator('li').count(),10);
  await region.getByRole('button',{name:'Ver más →',exact:true}).click();await region.getByText(/Página 2/).waitFor();
  await page.goto(origin+'/datos-inmuebles?codigo=2&pestana=seguimiento');
  await page.getByRole('heading',{name:'Plazos de este inmueble',exact:true}).waitFor();
  assert.equal(await page.getByRole('combobox',{name:'Responsable',exact:true}).count(),0);
  assert.equal(await page.getByText('Plazos generales de alerta',{exact:true}).count(),0);
  const visitField=page.getByRole('group',{name:'Visita · Pendiente',exact:true});
  await visitField.getByLabel('Fecha límite particular').fill(future);
  await visitField.getByRole('button',{name:'Guardar seguimiento'}).click();
  await page.getByRole('status').filter({hasText:'Plazo del inmueble guardado'}).waitFor();
  const operatorContext=await browser.newContext();await operatorContext.addCookies([{name:'aa_session',value:operator,url:origin}]);
  const operatorPage=await operatorContext.newPage();await operatorPage.goto(origin+'/datos-inmuebles?codigo=2&pestana=seguimiento');
  await operatorPage.getByRole('button',{name:'Resumen',exact:true}).waitFor();assert.equal(await operatorPage.getByRole('button',{name:'Seguimiento',exact:true}).count(),0);
  await page.goto(origin+'/configuracion-plazos');await page.getByRole('heading',{name:'Plazos generales',exact:true}).waitFor();
  await page.goto(origin+'/visitas-pendientes?zona=Chimbote');await page.getByText(/^Vencido:/).first().waitFor();
  await page.setViewportSize({width:375,height:850});await page.waitForFunction(()=>document.getElementById('navigation-panel').getBoundingClientRect().right<=1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  const [dates]=await db.query('SELECT fecha_visita FROM inm_visitas ORDER BY id');
  assert.deepEqual(dates.map(row=>String(row.fecha_visita).slice(0,10)),['2025-06-17','2025-06-18']);
  console.log('PASS plazos: visita histórica registrada hoy, primera activación sin reinicio por visita repetida, tasación histórica registrada hoy, publicación, plazo particular, visita y agenda sincronizadas, vencido/vence hoy y navegador móvil sin errores.');
} catch(error){console.error(logs.slice(-3000));throw error;}
finally {if(browser)await browser.close();if(app)app.kill('SIGTERM');await db.end();}
