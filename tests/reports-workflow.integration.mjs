// New, empty local database only; never loads production credentials.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import {stat} from 'node:fs/promises';
import {hashSessionToken} from '../lib/password.mjs';
import {reportCatalog} from '../lib/report-catalog.mjs';
import {workflowDeadline} from '../lib/workflow-deadline.mjs';
import {todayInPeru} from '../lib/calendar.mjs';
const uri=process.env.TEST_DATABASE_URL,location=new URL(uri||'http://invalid');
assert.ok(['localhost','127.0.0.1'].includes(location.hostname)&&/^\/alfaro_reports_test(?:_[a-z0-9]+)?$/.test(location.pathname));
const db=await mysql.createConnection({uri,dateStrings:true}),origin='http://127.0.0.1:3192',token=randomBytes(32).toString('hex');
const headers={Cookie:`aa_session=${token}`};let app,browser,logs='';
async function get(params={}){const response=await fetch(origin+'/api/reportes?'+new URLSearchParams(params),{headers,signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,await response.clone().text());return response.json();}
try{
 assert.equal((await db.query('SHOW TABLES'))[0].length,0);
 const schema=execFileSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','export','--dialect=mysql','--schema=./db/schema.ts'],{encoding:'utf8'});
 for(const statement of schema.slice(schema.indexOf('CREATE TABLE')).split(';').map(s=>s.trim()).filter(Boolean))await db.query(statement);
 await db.query("INSERT INTO inm_usuarios(id,nombre,email,rol) VALUES(1,'Admin local','reports@example.invalid','administrador'),(2,'Operador local','op@example.invalid','usuario')");
 await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,1,DATE_ADD(NOW(),INTERVAL 1 HOUR),NOW(),NOW())',[hashSessionToken(token)]);
 await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'chimbote','Chimbote',200),(2,'lima','Lima',100)");
 for(let id=1;id<=131;id++)await db.query('INSERT INTO inm_posiciones_zona(id,zona_id,numero) VALUES(?,?,?)',[id,id===131?2:1,id===131?1:id]);
 for(let id=1;id<=67;id++){
  const historical=[61,63,64,65].includes(id);
  await db.query("INSERT INTO inm_inmuebles(id,codigo,numero_orden,tipo,operacion,referencia,direccion,nombre_contacto,zona_id,estado,fecha_salida) VALUES(?,?,?,'Casa',?,'Referencia','Calle local',?,?,?,?)",[id,`CASA-LOCAL-${id}`,id,id===63?'alquiler':'venta',`Contacto ${id}`,id===66?2:1,historical?'historico':'activo',historical?'2026-06-30 12:00:00':null]);
  if(id<=60||id===66||id===67)await db.query('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES(?,?)',[id,id===66?131:id===67?101:id]);
  await db.query("INSERT INTO inm_timeline(inmueble_id,evento,usuario_id) VALUES(?,'inmueble_registrado',1)",[id]);
 }
 await db.query("INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id,activa,fecha_inicio,fecha_fin) VALUES(61,1,0,'2025-01-01 12:00:00','2025-02-01 12:00:00'),(61,2,0,'2025-02-01 12:00:00','2026-06-30 12:00:00')");
 for(let id=1;id<=5;id++){
  await db.query("INSERT INTO inm_visitas(id,inmueble_id,fecha_visita,completada,usuario_id) VALUES(?,?,'2025-06-17',1,1)",[id,id]);
  await db.query("INSERT INTO inm_timeline(inmueble_id,evento,usuario_id) VALUES(?,'visita_realizada',1)",[id]);
 }
 await db.query("INSERT INTO inm_visitas(inmueble_id,fecha_visita,completada,usuario_id) VALUES(1,'2025-06-18',1,1)");
 for(let id=3;id<=5;id++){
  await db.query("INSERT INTO inm_tasaciones(inmueble_id,fecha_tasacion,valor_referencia,precio_objetivo,precio_venta,situacion,usuario_id) VALUES(?,'2025-06-20',100,100,100,'aprobado',1)",[id]);
  await db.query("INSERT INTO inm_timeline(inmueble_id,evento,usuario_id) VALUES(?,'tasacion_realizada',1)",[id]);
  await db.query('INSERT INTO inm_publicaciones(inmueble_id,texto,drive_link,publicado,usuario_registro_id,fecha_publicacion) VALUES(?,?,?,?,1,?)',[id,id===3?'':'Texto','',id===5?1:0,id===5?'2026-10-18 12:00:00':null]);
  if(id>3)for(const [type,mime,visit] of [['VENDEDOR_DNI','application/pdf',null],['TASACION_EXPRESS','application/pdf',null],['FOTO_INMUEBLE','image/webp',id]])await db.query("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,tipo_mime,visita_id,usuario_id) VALUES(?,?,'Local','local-test','hosting',?,?,1)",[id,type,mime,visit]);
 }
 await db.query("INSERT INTO inm_timeline(inmueble_id,evento,usuario_id) VALUES(5,'publicado',1)");
 for(const [id,motivo] of [[61,'vendido'],[63,'alquilado'],[64,'otro'],[65,'cancelacion_anterior']])await db.query("INSERT INTO inm_liberaciones(inmueble_id,motivo,fecha_venta,fecha_alquiler,confirmado,usuario_registro_id) VALUES(?,?,'2026-06-30','2026-06-30',1,1)",[id,motivo]);
 await db.query("INSERT INTO inm_config_alertas(tipo,dias,activo) VALUES('visita',2,1),('tasacion',3,1),('expediente',3,1),('publicacion',2,1)");
 const today=todayInPeru(),future=workflowDeadline(today,8).fechaLimite;
 await db.query("INSERT INTO inm_seguimiento(inmueble_id,actividad,fecha_limite) VALUES(1,'tasacion','2025-06-20'),(2,'tasacion',?),(6,'visita',DATE_SUB(?,INTERVAL 1 DAY)),(7,'visita',?)",[future,today,today]);
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3192','-H','127.0.0.1'],{env:{...process.env,DATABASE_URL:uri,DATABASE_TLS_REQUIRED:'',DATABASE_SSL_CA:'',AUTH_LOGIN_MFA_REQUIRED:'0'},stdio:['ignore','pipe','pipe']});app.stdout.on('data',data=>logs+=data);app.stderr.on('data',data=>logs+=data);
 for(let attempt=0;attempt<80;attempt++){try{if((await fetch(origin+'/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 for(const report of reportCatalog){const result=await get({reporte:report.nombre,todos:'1'});assert.equal(result.rows.length,result.paginacion.total,report.nombre);assert.equal(result.resumen.total,result.paginacion.total,report.nombre);}
 assert.equal((await get()).paginacion.total,62,'Active portfolio excludes unassigned active property');
 const first=await get(),second=await get({pagina:'2'});assert.equal(first.rows.length,50);assert.equal(second.rows.length,12);assert.ok(!second.rows.some(row=>first.rows.some(a=>a.inmuebleId===row.inmuebleId)));
 assert.equal((await get({posicion:'101'})).rows[0].inmuebleId,67);
 assert.equal((await get({zona:'Lima'})).paginacion.total,1);
 assert.equal((await get({reporte:'Histórico de inmuebles',posicion:'1'})).paginacion.total,0);
 assert.equal((await get({reporte:'Histórico de inmuebles',posicion:'2'})).paginacion.total,1);
 const free=await get({reporte:'Posiciones disponibles',todos:'1',zona:'Chimbote'});assert.equal(free.rows.length,69);assert.equal(free.resumen.disponibles,69);
 assert.equal((await get({reporte:'Posiciones disponibles',pagina:'2',zona:'Chimbote'})).rows.length,19);
 const oneFree=await get({reporte:'Posiciones disponibles',posicion:'130',zona:'Chimbote'});assert.equal(oneFree.paginacion.total,1);assert.equal(oneFree.resumen.total,1);
 assert.equal((await get({reporte:'Retirados / cancelados'})).rows.length,2);
 const oldDate=await get({reporte:'Visitas realizadas',desde:'2025-06-17',hasta:'2025-06-17'});assert.equal(oldDate.rows.length,4);assert.ok(!oldDate.rows.some(row=>row.inmuebleId===1));
 const alert=await get({reporte:'Alertas de actividades',todos:'1'});
 const panel=await (await fetch(origin+'/api/seguimiento?estado=todos&limite=20',{headers})).json();
 assert.equal(alert.paginacion.total,panel.total);assert.deepEqual(alert.rows.slice(0,20).map(row=>row.inmuebleId),panel.items.map(item=>item.id));
 for(const item of panel.items){const row=alert.rows.find(row=>row.inmuebleId===item.id);assert.equal(row.fechaLimite,item.fechaLimite);assert.equal(row.diasRetraso,item.diasRetraso);}
 const overdue=await get({reporte:'Alertas de actividades',plazo:'Vencido'});assert.equal(overdue.paginacion.total,2);assert.equal(overdue.rows[0].inmuebleId,1);
 const due=await get({reporte:'Alertas de actividades',desde:today,hasta:today});assert.equal(due.rows.length,1);assert.equal(due.rows[0].inmuebleId,7);
 const response=await fetch(origin+'/api/inmuebles/6/seguimiento',{method:'PUT',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({actividad:'visita',fechaLimite:future,observacion:'Reprogramar'})});assert.equal(response.status,200);
 assert.equal((await get({reporte:'Alertas de actividades',plazo:'Vencido'})).paginacion.total,1);
 const pending=await get({reporte:'Visitas pendientes',plazo:'En plazo',todos:'1'});assert.ok(pending.rows.some(row=>row.inmuebleId===6));assert.ok(pending.rows.every(row=>row.estadoPlazo==='en_plazo'));
 for(const params of [{reporte:'inexistente'},{reporte:'Negociaciones'},{desde:'2026-02-30'},{plazo:'invalid'},{situacion:'invalid'},{pagina:'0'}])assert.equal((await fetch(origin+'/api/reportes?'+new URLSearchParams(params),{headers})).status,400);
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'aa_session',value:token,url:origin}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/reportes?zona=Chimbote');
 await page.getByRole('searchbox',{name:'Buscar en esta página'}).waitFor();
 await page.getByRole('button',{name:/^Alertas de actividades/}).click();
 await page.getByRole('columnheader',{name:/Fecha límite/}).waitFor();await page.getByRole('columnheader',{name:/Estado del plazo/}).waitFor();
 await page.getByLabel(/Plazo de actividad/).selectOption('Vencido');await page.getByRole('button',{name:'Generar reporte',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===1);
 assert.ok((await page.locator('tbody').innerText()).includes('Contacto 1'));
 for(const format of ['PDF','Excel']){
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:`Descargar ${format}`,exact:true}).first().click();const file=await downloadPromise;assert.ok((await stat(await file.path())).size>1000);
  if(format==='Excel'){const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile(await file.path());assert.match(String(workbook.getWorksheet('Resumen').getCell('A8').value),/Zona: Chimbote/);const sheet=workbook.getWorksheet('Detalle');assert.equal(sheet.rowCount,2);assert.ok(sheet.getRow(1).values.includes('Fecha límite'));assert.ok(sheet.getRow(2).values.includes('Vencido'));}
 }
 await page.getByRole('button',{name:'Limpiar',exact:true}).click();
 await page.getByRole('button',{name:/^Visitas realizadas/}).click();await page.getByRole('columnheader',{name:/Visita/}).waitFor();
 await page.getByRole('button',{name:/^Posiciones disponibles/}).click();await page.getByRole('columnheader',{name:/Pos\./}).waitFor();assert.equal(await page.getByLabel(/Plazo de actividad/).isDisabled(),true);
 await page.setViewportSize({width:375,height:850});await page.waitForFunction(()=>document.getElementById('navigation-panel').getBoundingClientRect().right<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('PASS reportes: catálogo completo con filas/totales iguales; paginación de inmuebles y posiciones; posición >90; visita repetida y fechas reales; plazos alineados con panel; reprogramación; filtros; columnas por actividad; PDF/Excel con zona y valores; escritorio/móvil.');
}catch(error){console.error(logs.slice(-2500));throw error;}finally{if(browser)await browser.close();if(app)app.kill('SIGTERM');await db.end();}
