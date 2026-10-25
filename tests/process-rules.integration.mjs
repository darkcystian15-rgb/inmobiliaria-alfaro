// All writes belong to disposable local fixtures; remote business databases are refused.
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createSessionToken, hashSessionToken } from '../lib/password.mjs';
import { dossierDefaults, dossierStatus } from '../lib/transaction-dossier.mjs';
import { todayInPeru } from '../lib/calendar.mjs';
const uri=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(uri.hostname)&&uri.pathname==='/alfaro_test');
const db=await mysql.createConnection(process.env.DATABASE_URL),base='http://127.0.0.1:3130',bridge='http://127.0.0.1:3131/sync',tag=Date.now().toString(36);
const tokens={admin:createSessionToken(),operator:createSessionToken()},ids={users:[],properties:[],positions:[]};
const calls=[],fixtures=[];let server,remote,browser,logs='',rejectDelivery=false,bannerBackup=null;const assetId=randomUUID();
const decode=value=>typeof value==='string'?JSON.parse(value):value;
const saleConfig={...dossierDefaults(),vendedorTipo:'natural',vendedorPropietarios:'uno',vendedorRepresentante:'no',compradorAsignado:true,compradorTipo:'natural',renta:'afecto',rentaObservacion:'Sustento de prueba'};
const rentConfig={...dossierDefaults(),arrendadorRepresentante:'no',arrendatarioRepresentante:'no'};
async function api(path,method='GET',body,role='admin',expected=200){const response=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:`aa_session=${tokens[role]}`},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert.equal(response.status,expected,`${path}: ${JSON.stringify(data)}`);return data;}
async function live(id){const [[row]]=await db.execute('SELECT contenido,version FROM inm_portal_web WHERE clave=?',[`live:${id}`]);return row?{...decode(row.contenido),version:row.version}:null;}
async function state(id){const [[p]]=await db.execute('SELECT estado,moneda FROM inm_inmuebles WHERE id=?',[id]);const [[a]]=await db.execute('SELECT activa FROM inm_asignaciones_zona WHERE inmueble_id=? ORDER BY id DESC LIMIT 1',[id]);return{property:p,assignment:a};}
async function document(id,key){await db.execute("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,usuario_id) VALUES (?,?,?,?,'hosting',?)",[id,key,key,`https://example.invalid/${tag}/${key}`,ids.users[0]]);}
async function completeDocuments(fixture){for(const item of dossierStatus(fixture.config,[],fixture.operation).items.filter(item=>item.applies&&item.required))await document(fixture.id,item.key);}
try{
 for(const[role,token]of Object.entries(tokens)){const[user]=await db.execute('INSERT INTO inm_usuarios(nombre,email,rol) VALUES (?,?,?)',[`Reglas ${role}`,`reglas-${role}-${tag}@example.invalid`,role==='admin'?'administrador':'operador']);ids.users.push(user.insertId);await db.execute('INSERT INTO inm_sesiones(token_hash,usuario_id,expira) VALUES (?,?,?)',[hashSessionToken(token),user.insertId,new Date(Date.now()+3600000)]);}
 const[testType]=await db.execute('INSERT INTO inm_tipos_inmueble(nombre,activo) VALUES (?,1)',[`Tipo reglas ${tag}`]);ids.type=testType.insertId;
 const[z]=await db.execute('INSERT INTO inm_zonas(clave,nombre,capacidad) VALUES (?,?,20)',[`reglas-${tag}`,`Reglas ${tag}`]);ids.zone=z.insertId;const zone=`?zona=${encodeURIComponent(`Reglas ${tag}`)}`;
 for(let i=0;i<7;i++){
  const operation=i===4||i===6?'alquiler':'venta',config=operation==='alquiler'?rentConfig:saleConfig;
  const[p]=await db.execute("INSERT INTO inm_inmuebles(codigo,tipo,referencia,nombre_contacto,zona_id,operacion,direccion,moneda,area_terreno) VALUES (?,?,?,?,?,?,?,'USD',120)",[`RULES-${tag}-${i}`,'casa',`Regla ${i}`,`Contacto reglas ${i}`,ids.zone,operation,`Dirección reglas ${i}`]);ids.properties.push(p.insertId);
  const[pos]=await db.execute('INSERT INTO inm_posiciones_zona(zona_id,numero) VALUES (?,?)',[ids.zone,i+1]);ids.positions.push(pos.insertId);await db.execute('INSERT INTO inm_asignaciones_zona(inmueble_id,posicion_id) VALUES (?,?)',[p.insertId,pos.insertId]);
  const[v]=await db.execute('INSERT INTO inm_visitas(inmueble_id,fecha_visita,completada,usuario_id) VALUES (?,?,1,?)',[p.insertId,todayInPeru(),ids.users[0]]);
  await db.execute("INSERT INTO inm_tasaciones(inmueble_id,fecha_tasacion,valor_referencia,precio_objetivo,precio_venta,valor_referencia_moneda,precio_objetivo_moneda,precio_venta_moneda,situacion,usuario_id) VALUES (?,?,100000,95000,110000,'USD','USD','USD','aprobado',?)",[p.insertId,todayInPeru(),ids.users[0]]);
  await db.execute('INSERT INTO inm_expedientes(inmueble_id,configuracion,version) VALUES (?,?,1)',[p.insertId,JSON.stringify(config)]);
  const f={id:p.insertId,operation,config,visit:v.insertId};fixtures.push(f);
  if([1,2,4].includes(i))await completeDocuments(f);
  if([1,2,3,5].includes(i)){
   const payload={status:'published',snapshot:{sourceId:p.insertId,title:`Prueba ${i}`,photos:[],currency:'USD',price:110000},draftVersion:1,sourceRevision:'anterior',approvedBy:ids.users[0],approvedAt:new Date().toISOString(),syncState:'synced',portalId:p.insertId+1000,portalUrl:`https://example.com/inmueble/${p.insertId+1000}`};
   await db.execute('INSERT INTO inm_portal_web(clave,contenido,version,usuario_id) VALUES (?,?,1,?)',[`live:${p.insertId}`,JSON.stringify(payload),ids.users[0]]);
  }
 }
 remote=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method==='GET'){const url=new URL(req.url,bridge);return res.end(JSON.stringify({items:url.searchParams.get('admin')==='extras'?[{additionalInfo:[],latitude:null,longitude:null}]:[]}));}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);calls.push(body);if(rejectDelivery){res.statusCode=503;return res.end('{}');}res.end(JSON.stringify(body.kind==='banners'?{ok:true}:{portalId:body.sourceId+1000,portalUrl:`https://example.com/inmueble/${body.sourceId+1000}`}));});await new Promise(resolve=>remote.listen(3131,'127.0.0.1',resolve));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3130','-H','127.0.0.1'],{env:{...process.env,PORTAL_WEB_SYNC_URL:bridge,PORTAL_WEB_SYNC_TOKEN:'local-test-token-32-characters-minimum',PORTAL_WEB_ORIGIN:'https://example.com'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/login')).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,200));}assert.ok(ready,logs);
 // Operator has all portal endpoints but still no Phase 1 or user-management API.
 for(const path of ['/api/portal-web','/api/portal-web/portada','/api/zonas'])await api(path,'GET',null,'operator');
 for(const path of ['/api/tasaciones','/api/liberaciones'+zone,'/api/usuarios'])await api(path,'GET',null,'operator',403);
 await db.execute("INSERT IGNORE INTO inm_secuencias(nombre,valor) SELECT 'inmueble',COALESCE(MAX(numero_orden),0) FROM inm_inmuebles");
 // Initial currency is selected once at capture and inherited even when a later API omits currency fields.
 const[initialPosition]=await db.execute('INSERT INTO inm_posiciones_zona(zona_id,numero) VALUES (?,8)',[ids.zone]);ids.positions.push(initialPosition.insertId);
 const created=await api('/api/inmuebles'+zone,'POST',{zonaId:ids.zone,posicion:8,operacion:'venta',tipo:`Tipo reglas ${tag}`,direccion:'Nueva captación de prueba',nombreContacto:'Contacto nuevo',moneda:'USD'},'admin',201);ids.properties.push(created.inmuebleId);
 await db.execute('INSERT INTO inm_visitas(inmueble_id,fecha_visita,completada,usuario_id) VALUES (?,?,1,?)',[created.inmuebleId,todayInPeru(),ids.users[0]]);
 assert.equal((await api('/api/tasaciones'+zone)).pendientes.find(row=>row.inmuebleId===created.inmuebleId).moneda,'USD');
 await api('/api/tasaciones'+zone,'POST',{inmuebleId:created.inmuebleId,fechaTasacion:todayInPeru(),valorReferencia:'1000',precioObjetivo:'900',precioVenta:'1100'},'admin',201);
 assert.equal((await api(`/api/inmuebles/${created.inmuebleId}`)).tasacion.precioVentaMoneda,'USD');
 // Operator can save and publish the global cover too; restore its local prior state before browser checks.
 [bannerBackup]=await db.execute("SELECT * FROM inm_portal_web WHERE clave IN ('banners:draft','banners:live')");
 await db.execute('INSERT INTO inm_portal_web(clave,contenido,version,usuario_id) VALUES (?,?,1,?)',[`asset:${assetId}`,JSON.stringify({name:'Imagen de prueba',path:'/fixture/no-real-file.webp',mime:'image/webp'}),ids.users[1]]);
 const banners=await api('/api/portal-web/portada','GET',null,'operator');
 const savedBanners=await api('/api/portal-web/portada','PUT',{version:banners.version,items:[{id:'banner-'+tag,imageId:assetId,title:'Portada de prueba',subtitle:'',buttonLabel:'',href:'',position:'center',enabled:true,authorized:true}]},'operator');
 const publishedBanners=await api('/api/portal-web/portada','POST',{version:savedBanners.version},'operator');assert.equal(publishedBanners.synced,true);
 await db.execute("DELETE FROM inm_portal_web WHERE clave IN ('banners:draft','banners:live')");for(const row of bannerBackup)await db.execute('INSERT INTO inm_portal_web(clave,contenido,version,usuario_id,actualizado) VALUES (?,?,?,?,?)',[row.clave,JSON.stringify(decode(row.contenido)),row.version,row.usuario_id,row.actualizado]);bannerBackup=null;
 await db.execute('DELETE FROM inm_portal_web WHERE clave=?',[`asset:${assetId}`]);calls.length=0;
 const listing=(await api('/api/liberaciones'+zone)).items;assert.equal(listing.find(row=>row.inmuebleId===fixtures[0].id).cierreDocumental.complete,false);assert.equal(listing.find(row=>row.inmuebleId===fixtures[4].id).cierreDocumental.complete,true);
 const closeBody=id=>({inmuebleId:id,motivo:'vendido',fechaVenta:todayInPeru(),precioFinal:'105000',comision:'2000'});
 const before=await state(fixtures[0].id);await api('/api/liberaciones'+zone,'POST',closeBody(fixtures[0].id),'admin',409);assert.deepEqual(await state(fixtures[0].id),before);assert.equal(calls.length,0);
 // A document removed after loading the screen is checked again by the server.
 const [[removed]]=await db.execute('SELECT id,tipo_documento FROM inm_archivos WHERE inmueble_id=? LIMIT 1',[fixtures[2].id]);await db.execute('DELETE FROM inm_archivos WHERE id=?',[removed.id]);await api('/api/liberaciones'+zone,'POST',{...closeBody(fixtures[2].id),retirarAnuncioWeb:true},'admin',409);assert.equal((await state(fixtures[2].id)).property.estado,'activo');assert.equal((await live(fixtures[2].id)).status,'published');await document(fixtures[2].id,removed.tipo_documento);
 // User can intentionally keep a web announcement, or explicitly withdraw it.
 await api('/api/liberaciones'+zone,'POST',{...closeBody(fixtures[1].id),retirarAnuncioWeb:false},'admin',201);assert.equal((await live(fixtures[1].id)).status,'published');assert.equal(calls.length,0);
 const closed=await api('/api/liberaciones'+zone,'POST',{...closeBody(fixtures[2].id),retirarAnuncioWeb:true},'admin',201);assert.equal(closed.retiroWeb.synced,true);assert.equal((await live(fixtures[2].id)).status,'withdrawn');assert.equal((await state(fixtures[2].id)).assignment.activa,0);
 await api('/api/liberaciones'+zone,'POST',{...closeBody(fixtures[2].id),retirarAnuncioWeb:true},'admin',409);
 // Suspending is allowed with pending documents. Failed delivery is durable and retryable by operator.
 rejectDelivery=true;const paused=await api('/api/liberaciones'+zone,'POST',{inmuebleId:fixtures[3].id,motivo:'venta_suspendida',detalleOtro:'Pausa de prueba',retirarAnuncioWeb:true},'admin',201);assert.equal(paused.retiroWeb.synced,false);assert.equal((await state(fixtures[3].id)).property.estado,'inactivo');assert.equal((await live(fixtures[3].id)).syncState,'error');
 rejectDelivery=false;await api(`/api/portal-web/${fixtures[3].id}`,'POST',{action:'retry',version:0,reason:'Reintento de prueba'},'operator');assert.equal((await live(fixtures[3].id)).syncState,'synced');
 // No powers required when both rental parties sign in person; closing currency is inherited.
 await api('/api/liberaciones'+zone,'POST',{inmuebleId:fixtures[4].id,motivo:'alquilado',fechaAlquiler:todayInPeru(),rentaMensual:'1500',comision:'1500',garantia:'3000',adelanto:'1500'},'admin',201);
 const rental=(await api(`/api/inmuebles/${fixtures[4].id}`)).alquiler;assert.equal(rental.moneda,'USD');assert.equal(rental.garantia,'3000.00');
 const [[sale]]=await db.execute('SELECT moneda,precio_final FROM inm_liberaciones WHERE inmueble_id=?',[fixtures[2].id]);assert.equal(sale.moneda,'USD');assert.equal(sale.precio_final,'105000.00');
 // One explicit currency change covers appraisal, manual advertisements and web draft, with no automatic conversion.
 const currencyId=fixtures[5].id;
 await db.execute("INSERT INTO inm_anuncios(inmueble_id,canal,enlace,fecha_publicacion,precio_publicado,precio_publicado_moneda) VALUES (?,'Prueba','https://example.com/anuncio',?,110000,'USD')",[currencyId,todayInPeru()]);
 let record=await api(`/api/portal-web/${currencyId}`,'GET',null,'operator');
 let draft={...record.draft,listingMode:'new',title:'Casa de prueba de reglas',description:'Una descripción suficientemente amplia para completar la publicación de prueba.',type:'Casa',priceMode:'amount',price:'110000',currency:'USD',publicLocation:'Ubicación de prueba',district:'Prueba',landArea:'120',additionalInfoMode:'replace',map:{mode:'none',latitude:'',longitude:''},dataAuthorized:true,photosAuthorized:true};
 await api(`/api/portal-web/${currencyId}`,'PUT',{version:record.version,sourceRevision:record.source.revision,draft},'operator');
 const [[savedBefore]]=await db.execute('SELECT contenido,version FROM inm_portal_web WHERE clave=?',[`draft:${currencyId}`]);
 await api('/api/tasaciones'+zone,'PATCH',{inmuebleId:currencyId,precioVenta:'109000',valorReferenciaMoneda:'PEN',precioObjetivoMoneda:'PEN',precioVentaMoneda:'PEN'});
 const updated=(await api(`/api/inmuebles/${currencyId}`)).tasacion;assert.equal(updated.valorReferencia,'100000.00');assert.equal(updated.precioVenta,'109000.00');for(const key of ['valorReferenciaMoneda','precioObjetivoMoneda','precioVentaMoneda'])assert.equal(updated[key],'PEN');
 const [[ad]]=await db.execute('SELECT precio_publicado,precio_publicado_moneda FROM inm_anuncios WHERE inmueble_id=?',[currencyId]);assert.equal(ad.precio_publicado,'110000.00');assert.equal(ad.precio_publicado_moneda,'PEN');
 const [[savedAfter]]=await db.execute('SELECT contenido,version FROM inm_portal_web WHERE clave=?',[`draft:${currencyId}`]);assert.equal(decode(savedAfter.contenido).draft.currency,'PEN');assert.equal(decode(savedAfter.contenido).draft.price,'110000');assert.equal(decode(savedAfter.contenido).draft.dataAuthorized,false);assert.ok(savedAfter.version>savedBefore.version);assert.equal((await live(currencyId)).snapshot.currency,'USD');
 await api(`/api/portal-web/${currencyId}`,'PUT',{version:savedBefore.version,sourceRevision:record.source.revision,draft},'operator',409);
 record=await api(`/api/portal-web/${currencyId}`,'GET',null,'operator');draft={...record.draft,currency:'USD',dataAuthorized:true,photosAuthorized:true};
 await api(`/api/portal-web/${currencyId}`,'PUT',{version:record.version,sourceRevision:record.source.revision,draft},'operator');assert.equal((await state(currencyId)).property.moneda,'USD');
 // Phase 3 can publish with an incomplete closing dossier while retaining the minimum public requirements.
 for(const key of ['VENDEDOR_DNI','TASACION_EXPRESS'])await document(currencyId,key);
 const[photo]=await db.execute("INSERT INTO inm_archivos(inmueble_id,visita_id,tipo_documento,nombre,enlace,almacenamiento,tipo_mime,usuario_id) VALUES (?,?,'FOTO_INMUEBLE','Prueba','https://example.invalid/prueba.webp','hosting','image/webp',?)",[currencyId,fixtures[5].visit,ids.users[0]]);
 await db.execute("INSERT INTO inm_publicaciones(inmueble_id,texto,texto_realizado,drive_link,usuario_registro_id) VALUES (?,'Texto comercial suficientemente amplio para la publicación de prueba.',1,'',?)",[currencyId,ids.users[0]]);
 record=await api(`/api/portal-web/${currencyId}`,'GET',null,'operator');draft={...record.draft,photos:[{id:photo.insertId,caption:'Prueba'}],coverPhotoId:photo.insertId,dataAuthorized:true,photosAuthorized:true};
 const saved=await api(`/api/portal-web/${currencyId}`,'PUT',{version:record.version,sourceRevision:record.source.revision,draft},'operator');assert.equal(saved.checklist.complete,true,JSON.stringify(saved.checklist.missing));
 await api(`/api/portal-web/${currencyId}`,'POST',{action:'publish',version:saved.version,reason:'Publicación de prueba por operador'},'operator');
 assert.equal((await api('/api/liberaciones'+zone)).items.find(row=>row.inmuebleId===currencyId).cierreDocumental.complete,false);
 // Browser: no Phase 1 for operator, both Phase 2 and 3 available; document gating and voluntary withdrawal are visible.
 const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,375]){
  const context=await browser.newContext({viewport:{width,height:1000}});await context.addCookies([{name:'aa_session',value:tokens.operator,url:base}]);const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await db.execute('UPDATE inm_expedientes SET configuracion=?,version=version+1 WHERE inmueble_id=?',[JSON.stringify(rentConfig),fixtures[6].id]);
  await page.goto(base+'/datos-inmuebles'+zone+`&codigo=${fixtures[6].id}&carpeta=identificacion`);
  await page.getByRole('combobox',{name:/^¿El arrendador firma mediante representante/}).selectOption('si');await page.getByRole('button',{name:'Guardar condiciones para adjuntar archivos',exact:true}).click();await page.getByText('Condiciones del expediente guardadas.',{exact:true}).waitFor();
  await page.goto(base+'/portal-web/por-publicar'+zone);await page.getByRole('heading',{name:'Inmuebles por publicar',exact:true}).waitFor();if(width<1280)await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
  const nav=page.locator('#navigation-panel');assert.equal(await nav.locator('#navigation-phase-one').count(),0);assert.equal(await nav.locator('#navigation-phase-two').count(),1);assert.equal(await nav.locator('#navigation-phase-three').count(),1);await nav.locator('#navigation-phase-three').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/reglas-operador-${width}.png`,animations:'disabled'});
  if(width<1280)await page.getByRole('button',{name:'Cerrar menú',exact:true}).first().click();await page.goto(base+'/portal-web/portada');await page.getByRole('heading',{name:'Portada del sitio',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
  const admin=await browser.newContext({viewport:{width,height:1000}});await admin.addCookies([{name:'aa_session',value:tokens.admin,url:base}]);const ap=await admin.newPage();await ap.goto(base+'/liberar-inmuebles'+zone+`&inmueble=${fixtures[0].id}`);await ap.getByRole('radio',{name:/Cerrar operación y conservar/}).check();assert.equal(await ap.getByRole('button',{name:'Revisar cierre',exact:true}).isEnabled(),false);await ap.getByRole('region',{name:'Documentación para cerrar',exact:true}).waitFor();assert.equal(await ap.getByRole('combobox',{name:'Moneda del inmueble',exact:true}).inputValue(),'USD');assert.equal(await ap.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await ap.screenshot({path:`/tmp/reglas-cierre-${width}.png`,fullPage:true,animations:'disabled'});
  await ap.goto(base+'/liberar-inmuebles'+zone+`&inmueble=${currencyId}`);await ap.getByRole('radio',{name:/Suspender venta y conservar/}).check();await ap.getByRole('textbox',{name:/^Motivo de suspensión/}).fill('Pausa de prueba sin confirmar');const retire=ap.getByRole('checkbox',{name:/Retirar anuncio del Portal web al suspender/});assert.equal(await retire.isChecked(),false);await ap.getByRole('button',{name:'Revisar suspensión',exact:true}).click();await ap.getByText('El anuncio del Portal web se conservará sin cambios.',{exact:true}).waitFor();await ap.getByRole('button',{name:'Cancelar',exact:true}).click();await retire.check();await ap.getByRole('button',{name:'Revisar suspensión',exact:true}).click();await ap.getByText('También se solicitará retirar el anuncio del Portal web.',{exact:true}).waitFor();await ap.screenshot({path:`/tmp/reglas-retiro-${width}.png`,fullPage:true,animations:'disabled'});await ap.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal((await state(currencyId)).property.estado,'activo');await admin.close();
 }
 console.log('PASS: required closing uploads/server recheck, conditional rental powers, inherited currency/manual conversion/global synchronization, draft concurrency/public snapshot retained, voluntary keep/withdraw, durable failed withdrawal/operator retry, operator full Phase 3 with Phase 1 blocked, incomplete dossier may publish, desktop/mobile.');
}finally{
 if(browser)await browser.close();server?.kill('SIGTERM');if(remote)await new Promise(resolve=>remote.close(resolve));
 await db.execute('DELETE FROM inm_portal_web WHERE clave=?',[`asset:${assetId}`]);if(bannerBackup){await db.execute("DELETE FROM inm_portal_web WHERE clave IN ('banners:draft','banners:live')");for(const row of bannerBackup)await db.execute('INSERT INTO inm_portal_web(clave,contenido,version,usuario_id,actualizado) VALUES (?,?,?,?,?)',[row.clave,JSON.stringify(decode(row.contenido)),row.version,row.usuario_id,row.actualizado]);}
 for(const id of ids.properties){await db.execute('DELETE FROM inm_portal_web_eventos WHERE clave IN (?,?)',[`draft:${id}`,`live:${id}`]);await db.execute('DELETE FROM inm_portal_web WHERE clave IN (?,?)',[`draft:${id}`,`live:${id}`]);for(const table of ['inm_anuncios','inm_archivos','inm_expedientes','inm_seguimiento','inm_timeline','inm_publicaciones','inm_tasaciones','inm_visitas','inm_liberaciones','inm_asignaciones_zona'])await db.execute(`DELETE FROM ${table} WHERE inmueble_id=?`,[id]);await db.execute('DELETE FROM inm_inmuebles WHERE id=?',[id]);}
 if(ids.type)await db.execute('DELETE FROM inm_tipos_inmueble WHERE id=?',[ids.type]);
 for(const id of ids.positions)await db.execute('DELETE FROM inm_posiciones_zona WHERE id=?',[id]);if(ids.zone)await db.execute('DELETE FROM inm_zonas WHERE id=?',[ids.zone]);
 for(const id of ids.users){for(const[table,column]of [['inm_borradores','usuario_id'],['inm_security_audit','actor_id'],['inm_sesiones','usuario_id']])await db.execute(`DELETE FROM ${table} WHERE ${column}=?`,[id]);await db.execute('DELETE FROM inm_portal_web_eventos WHERE usuario_id=?',[id]);await db.execute('DELETE FROM inm_usuarios WHERE id=?',[id]);}await db.end();
}
