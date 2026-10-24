// Disposable local MySQL only. No production configuration is loaded.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {spawn} from 'node:child_process';
import {createSessionToken,hashSessionToken} from '../lib/password.mjs';
import {todayInPeru} from '../lib/calendar.mjs';
const uri=new URL(process.env.DATABASE_URL||'');assert.ok(['127.0.0.1','localhost'].includes(uri.hostname)&&uri.pathname==='/alfaro_test');
const db=await mysql.createConnection(process.env.DATABASE_URL);const base='http://127.0.0.1:3122';const tag=Date.now().toString(36);const ids={properties:[],positions:[],users:[]};let server;let logs='';
const tokens={admin:createSessionToken(),operator:createSessionToken()};
async function api(path,method='GET',body,role='admin',status=200){const response=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(tokens[role]?{Cookie:`aa_session=${tokens[role]}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return data;}
async function item(id){return (await api('/api/publicaciones')).todas.find(row=>row.inmuebleId===id);}
try{
 for(const[role,token]of Object.entries(tokens)){const[user]=await db.execute('INSERT INTO inm_usuarios (nombre,email,rol) VALUES (?,?,?)',[`Prueba difusión ${role}`,`${role}-${tag}@example.invalid`,role==='admin'?'administrador':'operador']);ids.users.push(user.insertId);await db.execute('INSERT INTO inm_sesiones (token_hash,usuario_id,expira) VALUES (?,?,?)',[hashSessionToken(token),user.insertId,new Date(Date.now()+3600000)]);}
 const[zone]=await db.execute('INSERT INTO inm_zonas (clave,nombre,capacidad) VALUES (?,?,10)',[`diff-${tag}`,`Difusión ${tag}`]);ids.zone=zone.insertId;
 for(let i=0;i<6;i++){
  const[position]=await db.execute('INSERT INTO inm_posiciones_zona (zona_id,numero) VALUES (?,?)',[ids.zone,i+1]);ids.positions.push(position.insertId);
  const[property]=await db.execute('INSERT INTO inm_inmuebles (codigo,tipo,referencia,nombre_contacto,zona_id,operacion,direccion) VALUES (?,?,?,?,?,?,?)',[`DIFF-${tag}-${i}`,'casa',`Referencia ${i}`,`Contacto difusión ${i}`,ids.zone,i===1?'alquiler':'venta',`Dirección ${i}`]);ids.properties.push(property.insertId);
  await db.execute('INSERT INTO inm_asignaciones_zona (inmueble_id,posicion_id) VALUES (?,?)',[property.insertId,position.insertId]);await db.execute('INSERT INTO inm_visitas (inmueble_id,fecha_visita,completada,usuario_id) VALUES (?,?,1,?)',[property.insertId,todayInPeru(),ids.users[0]]);
  await db.execute("INSERT INTO inm_tasaciones (inmueble_id,fecha_tasacion,valor_referencia,precio_objetivo,precio_venta,situacion,usuario_id) VALUES (?,?,100,200,300,'aprobado',?)",[property.insertId,todayInPeru(),ids.users[0]]);
 }
 for(const[index,published]of [[3,false],[4,true]])await db.execute("INSERT INTO inm_publicaciones (inmueble_id,texto,drive_link,usuario_registro_id,publicado,fecha_publicacion) VALUES (?,'Texto anterior','',?,?,?)",[ids.properties[index],ids.users[0],published,published?new Date():null]);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3122','-H','127.0.0.1'],{env:process.env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',chunk=>logs+=chunk);server.stderr.on('data',chunk=>logs+=chunk);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,200));}assert.ok(ready,logs);
 const[a,b,c,legacy,completed,browserId]=ids.properties;
 assert.equal((await item(a)).etapa,'texto_pendiente');assert.equal((await item(legacy)).etapa,'difusion_pendiente');assert.equal((await item(completed)).etapa,'completada');assert.equal((await item(completed)).mediosDifusion,null);
 await api('/api/publicaciones','POST',{inmuebleId:a,texto:'Borrador de prueba',textoRealizado:false},'operator',403);
 await api('/api/publicaciones','POST',{inmuebleId:a,texto:'Borrador de prueba',textoRealizado:false},'none',401);
 await api('/api/publicaciones','POST',{inmuebleId:a,texto:'Borrador de prueba',textoRealizado:false},'admin',201);assert.equal((await item(a)).etapa,'texto_pendiente');
 await api('/api/publicaciones','PATCH',{inmuebleId:a,mediosDifusion:'cartel',cartelColocado:true,redesPublicadas:false},'admin',400);
 await api('/api/publicaciones','PUT',{inmuebleId:a,texto:'Texto realizado',textoRealizado:true},'admin',400);
 await api('/api/publicaciones','PUT',{inmuebleId:a,texto:'Texto realizado',textoRealizado:true,mediosDifusion:'cartel'});assert.equal((await item(a)).etapa,'difusion_pendiente');assert.equal((await item(a)).expediente.complete,false,'Missing documents do not block text or diffusion');
 await api('/api/publicaciones','PATCH',{inmuebleId:a,mediosDifusion:'cartel',cartelColocado:true,redesPublicadas:false});assert.equal((await item(a)).etapa,'completada');
 await api('/api/publicaciones','PUT',{inmuebleId:a,texto:'Texto corregido'});await api('/api/tasaciones','PATCH',{inmuebleId:a,precioVenta:'350'});assert.equal((await item(a)).etapa,'completada');
 for(const[id,media]of [[b,'redes'],[c,'ambos']])await api('/api/publicaciones','POST',{inmuebleId:id,texto:'Texto preparado',textoRealizado:true,mediosDifusion:media},'admin',201);
 await api('/api/publicaciones','PATCH',{inmuebleId:b,mediosDifusion:'redes',cartelColocado:false,redesPublicadas:true});assert.equal((await item(b)).etapa,'completada');assert.deepEqual((await item(b)).referencias,[]);
 await api('/api/publicaciones','PATCH',{inmuebleId:c,mediosDifusion:'ambos',cartelColocado:true,redesPublicadas:false});assert.equal((await item(c)).etapa,'difusion_pendiente');
 await api('/api/publicaciones','PATCH',{inmuebleId:c,mediosDifusion:'ambos',cartelColocado:true,redesPublicadas:true,referencias:[{canal:'Facebook',url:'javascript:alert(1)'}]},'admin',400);
 await api('/api/publicaciones','PATCH',{inmuebleId:c,mediosDifusion:'ambos',cartelColocado:true,redesPublicadas:true,referencias:[{canal:'Facebook',url:'https://facebook.com/example'}]});assert.equal((await item(c)).etapa,'completada');assert.equal((await item(c)).referencias.length,1);
 await api('/api/publicaciones','PUT',{inmuebleId:completed,texto:'Corrección de texto anterior'});assert.equal((await item(completed)).etapa,'completada');assert.equal((await item(completed)).mediosDifusion,null);
 const details=await api(`/api/inmuebles/${c}`,'GET',undefined,'operator');assert.equal(details.publicacion.redesPublicadas,true);
 const cards=await api('/api/cartera');assert.ok(JSON.stringify(cards).includes('difusionPendiente'));
 for(const [report,expected]of [['Texto pendiente',1],['Difusión pendiente',1],['Difusión completada',4]]){const result=await api(`/api/reportes?reporte=${encodeURIComponent(report)}`);assert.equal(result.rows.length,expected,report);}
 const dashboard=await api('/api/dashboard');assert.equal(dashboard.resumen.textosPendientes,1);assert.equal(dashboard.resumen.listosParaPublicar,1);assert.equal(cards.resumen.materialPendiente,1);
 console.log('PASS API: drafts, independent documents, all 3 media, optional references, edits preserve completion, legacy states and permissions; dashboard/report queries.');
 if(process.env.PLAYWRIGHT_MODULE){const{chromium}=await import(process.env.PLAYWRIGHT_MODULE);const browser=await chromium.launch({headless:true});try{for(const width of [1440,375]){
  const context=await browser.newContext({viewport:{width,height:1000}});await context.addCookies([{name:'aa_session',value:tokens.admin,url:base}]);const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+`/tasaciones-textos-pendientes?zona=*&inmueble=${browserId}`);await page.getByRole('button',{name:/Registrar texto|Editar texto/,exact:true}).click();await page.getByRole('textbox',{name:'Texto de publicación',exact:true}).fill('Texto comercial ficticio para probar el flujo de difusión.');await page.getByRole('combobox',{name:'Medios de difusión'}).selectOption('ambos');
  await page.getByRole('button',{name:'Guardar texto y marcar como realizado',exact:true}).click();await page.getByRole('button',{name:'Actualizar difusión',exact:true}).click();await page.getByRole('checkbox',{name:'Cartel colocado',exact:true}).check();await page.getByRole('checkbox',{name:'Publicado en redes sociales',exact:true}).check();await page.getByRole('button',{name:'Guardar difusión',exact:true}).click();await page.getByRole('button',{name:'Actualizar difusión',exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar texto',exact:true}).click();await page.getByRole('textbox',{name:'Texto de publicación',exact:true}).fill('Texto comercial corregido sin reiniciar la difusión.');await page.getByRole('button',{name:'Guardar cambios del texto',exact:true}).click();await page.getByRole('button',{name:'Editar texto',exact:true}).waitFor();
  assert.equal((await item(browserId)).etapa,'completada');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.screenshot({path:`/tmp/text-diffusion-${width}.png`,fullPage:true});await page.goto(base+`/cartera?zona=${encodeURIComponent(`Difusión ${tag}`)}`);await page.getByRole('button',{name:/Ver detalle de Contacto difusión 0,/}).click();assert.equal(await page.getByRole('link',{name:'Editar tasación',exact:true}).count(),1);assert.equal(await page.getByRole('link',{name:'Editar texto',exact:true}).count(),1);await page.getByRole('link',{name:'Editar texto',exact:true}).click();await page.getByRole('textbox',{name:'Texto de publicación',exact:true}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await context.close();
  const op=await browser.newContext({viewport:{width,height:1000}});await op.addCookies([{name:'aa_session',value:tokens.operator,url:base}]);const opPage=await op.newPage();await opPage.goto(base+`/datos-inmuebles?codigo=${c}&carpeta=publicacion`);await opPage.getByRole('heading',{name:'Texto comercial',exact:true}).waitFor();assert.equal(await opPage.getByRole('button',{name:'Editar texto',exact:true}).count(),0);assert.equal(await opPage.getByRole('button',{name:'Actualizar difusión',exact:true}).count(),0);await op.close();
  // Start a new draft for the next viewport, using a separate fixture or clearing this test-only publication.
  await db.execute('DELETE FROM inm_publicaciones WHERE inmueble_id=?',[browserId]);
 }}finally{await browser.close();}console.log('PASS browser: desktop/mobile, text, both confirmations, editing without reset, no errors or overflow.');}
}finally{
 server?.kill('SIGTERM');for(const id of ids.properties){for(const table of ['inm_seguimiento','inm_timeline','inm_publicaciones','inm_tasaciones','inm_visitas','inm_asignaciones_zona'])await db.execute(`DELETE FROM ${table} WHERE inmueble_id=?`,[id]);await db.execute('DELETE FROM inm_inmuebles WHERE id=?',[id]);}
 for(const id of ids.positions)await db.execute('DELETE FROM inm_posiciones_zona WHERE id=?',[id]);if(ids.zone)await db.execute('DELETE FROM inm_zonas WHERE id=?',[ids.zone]);for(const id of ids.users){await db.execute('DELETE FROM inm_sesiones WHERE usuario_id=?',[id]);await db.execute('DELETE FROM inm_usuarios WHERE id=?',[id]);}await db.end();
}
