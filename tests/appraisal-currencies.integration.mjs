// Run only against the disposable schema created by drizzle-kit push.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {spawn} from 'node:child_process';
import {createSessionToken,hashSessionToken} from '../lib/password.mjs';
import {todayInPeru} from '../lib/calendar.mjs';
const url=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/alfaro_test','Requires isolated local alfaro_test database');
const db=await mysql.createConnection(process.env.DATABASE_URL);
const base='http://127.0.0.1:3118';
let server;
let output='';
const ids={};
const suffix=Date.now().toString(36);
const tokens={admin:createSessionToken(),operator:createSessionToken()};
async function api(path,method='GET',body,role='admin',status=200){
 const response=await fetch(base+path,{method,headers:{Origin:base,Cookie:`aa_session=${tokens[role]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return data;
}
try{
 for(const [role,token] of Object.entries(tokens)){
  const [user]=await db.execute('INSERT INTO inm_usuarios (nombre,email,rol) VALUES (?,?,?)',[`Currency ${role}`,`currency_${role}_${suffix}@example.invalid`,role==='admin'?'administrador':'operador']);ids[role]=user.insertId;
  await db.execute('INSERT INTO inm_sesiones (token_hash,usuario_id,expira) VALUES (?,?,?)',[hashSessionToken(token),user.insertId,new Date(Date.now()+3600000)]);
 }
 const [zone]=await db.execute("INSERT INTO inm_zonas (clave,nombre,capacidad) VALUES (?,?,10)",[`currency-${suffix}`,`Prueba monedas ${suffix}`]);ids.zone=zone.insertId;
 const [position]=await db.execute('INSERT INTO inm_posiciones_zona (zona_id,numero) VALUES (?,1)',[ids.zone]);
 ids.position=position.insertId;
 const [property]=await db.execute("INSERT INTO inm_inmuebles (codigo,tipo,referencia,nombre_contacto,zona_id,direccion) VALUES (?,'casa','Prueba','Contacto de prueba',?,'Dirección de prueba')",[`CURRENCY-${suffix}`,ids.zone]);ids.property=property.insertId;
 await db.execute('INSERT INTO inm_asignaciones_zona (inmueble_id,posicion_id) VALUES (?,?)',[ids.property,position.insertId]);
 await db.execute('INSERT INTO inm_visitas (inmueble_id,fecha_visita,completada,usuario_id) VALUES (?,?,1,?)',[ids.property,todayInPeru(),ids.admin]);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3118','-H','127.0.0.1'],{env:process.env,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',chunk=>output+=chunk);server.stderr.on('data',chunk=>output+=chunk);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,200));}assert.ok(ready,output);
 const prices={inmuebleId:ids.property,fechaTasacion:todayInPeru(),valorReferencia:'300000',precioObjetivo:'80000',precioVenta:'95000',valorReferenciaMoneda:'PEN',precioObjetivoMoneda:'USD',precioVentaMoneda:'USD',observacion:'Precio de salida en dólares americanos'};
 await api('/api/tasaciones','POST',{...prices,precioObjetivoMoneda:'EUR'},'admin',400);
 await api('/api/tasaciones','POST',prices,'operator',403);
 await api('/api/tasaciones','POST',prices,'admin',201);
 let valuations=await api('/api/tasaciones');let saved=valuations.aprobadas.find(row=>row.inmuebleId===ids.property);
 assert.equal(saved.precioObjetivoMoneda,'USD');assert.equal(saved.valorReferenciaMoneda,'PEN');
 const publication=await api('/api/publicaciones');assert.equal(publication.pendientes.find(row=>row.inmuebleId===ids.property).precioVentaMoneda,'USD');
 const portfolio=await api('/api/cartera');assert.match(JSON.stringify(portfolio),/precioVentaMoneda/);
 const details=await api(`/api/inmuebles/${ids.property}`, 'GET',undefined,'operator');assert.equal(details.tasacion.precioObjetivoMoneda,'USD');
 const [[before]]=await db.execute('SELECT estado,etapa FROM inm_inmuebles WHERE id=?',[ids.property]);
 await api('/api/tasaciones','PATCH',{inmuebleId:ids.property,valorReferencia:'310000',valorReferenciaMoneda:'USD',precioObjetivo:'85000',precioObjetivoMoneda:'PEN',precioVenta:'98000',precioVentaMoneda:'USD'});
 await api('/api/tasaciones','PATCH',{inmuebleId:ids.property,precioVenta:'99000'});
 await api('/api/tasaciones','PATCH',{inmuebleId:ids.property,precioVentaMoneda:'EUR'},'admin',400);
 const [[after]]=await db.execute('SELECT estado,etapa FROM inm_inmuebles WHERE id=?',[ids.property]);assert.deepEqual(after,before);
 const updated=await api(`/api/inmuebles/${ids.property}`);assert.equal(updated.tasacion.valorReferencia,'310000.00');assert.equal(updated.tasacion.valorReferenciaMoneda,'USD');assert.equal(updated.tasacion.precioObjetivo,'85000.00');assert.equal(updated.tasacion.precioObjetivoMoneda,'PEN');assert.equal(updated.tasacion.precioVentaMoneda,'USD');
 await api(`/api/inmuebles/${ids.property}/anuncios`,'POST',{canal:'Prueba',enlace:'https://example.com/anuncio',fechaPublicacion:todayInPeru(),precioPublicado:'99000',precioPublicadoMoneda:'USD'},'admin',201);
 assert.equal((await api(`/api/inmuebles/${ids.property}/anuncios`)).items[0].pendiente,false);
 await api('/api/tasaciones','PATCH',{inmuebleId:ids.property,precioVentaMoneda:'PEN'});
 assert.equal((await api(`/api/inmuebles/${ids.property}/anuncios`)).items[0].pendiente,false,'Price edits do not create automatic diffusion update tasks');
 console.log('PASS API: registro mixto, lectura, edición de tres montos, moneda conservada, permisos y anuncios conservados sin tareas automáticas.');
 if(process.env.PLAYWRIGHT_MODULE){
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);const browser=await chromium.launch({headless:true});
  try{for(const width of [1440,375]){
   const context=await browser.newContext({viewport:{width,height:1000}});await context.addCookies([{name:'aa_session',value:tokens.admin,url:base}]);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+`/datos-inmuebles?codigo=${ids.property}&carpeta=precios&editar=precios`);await page.getByRole('combobox',{name:'Moneda de la tasación',exact:true}).waitFor();
   assert.equal(await page.getByRole('combobox',{name:'Moneda de la tasación',exact:true}).count(),1);await page.getByRole('combobox',{name:'Moneda de la tasación',exact:true}).selectOption('USD');
   await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('button',{name:'Actualizar valores'}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   await page.screenshot({path:`/tmp/appraisal-currencies-${width}.png`,fullPage:true});await context.close();
  }}finally{await browser.close();}console.log('PASS navegador: editor con una sola moneda, guardado real en BD aislada, 1440/375 px sin errores ni desbordes.');
 }
}finally{
 server?.kill('SIGTERM');
 if(ids.property){for(const table of ['inm_anuncios','inm_timeline','inm_expedientes','inm_visitas','inm_tasaciones','inm_asignaciones_zona'])await db.execute(`DELETE FROM ${table} WHERE inmueble_id=?`,[ids.property]);await db.execute('DELETE FROM inm_inmuebles WHERE id=?',[ids.property]);}
 if(ids.position)await db.execute('DELETE FROM inm_posiciones_zona WHERE id=?',[ids.position]);
 if(ids.zone)await db.execute('DELETE FROM inm_zonas WHERE id=?',[ids.zone]);
 for(const role of ['admin','operator'])if(ids[role]){await db.execute('DELETE FROM inm_sesiones WHERE usuario_id=?',[ids[role]]);await db.execute('DELETE FROM inm_usuarios WHERE id=?',[ids[role]]);}
 await db.end();
}
