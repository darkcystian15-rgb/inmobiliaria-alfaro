// Dos bases locales vacías, registros ficticios y almacenamiento HTTPS en memoria.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import {execFileSync,spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import mysql from 'mysql2/promise';
import sharp from 'sharp';
import {hashSessionToken} from '../lib/password.mjs';
import {initialWebDraft} from '../lib/portal-web-rules.mjs';
const dbUrl=process.env.TEST_DATABASE_URL,portalDbUrl=process.env.TEST_PORTAL_DATABASE_URL;
for(const [value,name]of [[dbUrl,'alfaro_web_test'],[portalDbUrl,'alfaro_web_portal_test']]){const u=new URL(value||'http://invalid');assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&new RegExp(`^/${name}(?:_[a-z0-9]+)?$`).test(u.pathname),'Se requieren bases locales de ensayo');}
const db=await mysql.createConnection(dbUrl),portal=await mysql.createPool(portalDbUrl);
const portalRepo=path.resolve(process.env.PORTAL_REPO_PATH||'../portal-dark');
const {createIntranetSyncHandler}=await import(pathToFileURL(path.join(portalRepo,'server/intranet-sync.js')));
const {installIntranetSchema}=await import(pathToFileURL(path.join(portalRepo,'server/intranet-schema.mjs')));
const secret=randomBytes(32).toString('hex'),origin='http://127.0.0.1:3164',webOrigin='http://127.0.0.1:3166';
const stored=new Map(),work=fs.mkdtempSync(path.join(os.tmpdir(),'alfaro-web-'));
let app,storage,web,browser;let logs='';let rejectDelivery=false;
const tokens={};
async function request(resource,method='GET',body,token=tokens.admin,foreign=false){const r=await fetch(origin+resource,{method,headers:{Origin:foreign?'https://otro.invalid':origin,...(token?{Cookie:`aa_session=${token}`}:{ }),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body==null?undefined:body instanceof FormData?body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(45000)});return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.arrayBuffer()};}
try{
 assert.equal((await db.query('SHOW TABLES'))[0].length,0,'No se vacían bases existentes');assert.equal((await portal.query('SHOW TABLES'))[0].length,0);
 const exported=execFileSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','export','--dialect=mysql','--schema=./db/schema.ts'],{encoding:'utf8'});
 for(const statement of exported.slice(exported.indexOf('CREATE TABLE')).split(';').map(s=>s.trim()).filter(Boolean))await db.query(statement);
 for(const statement of fs.readFileSync('db/migrations/0030_portal_web.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.query(statement);
 for(const [key,role]of [['admin','administrador'],['operator','usuario']]){const [u]=await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,rol) VALUES(?,?,?,?)',[`Ensayo ${key}`,`${key}@example.invalid`,key,role]);tokens[key]=randomBytes(32).toString('hex');await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 2 HOUR),NOW(),NOW())',[hashSessionToken(tokens[key]),u.insertId]);}
 await db.query("INSERT INTO inm_zonas(id,clave,nombre,capacidad) VALUES(1,'ensayo','Zona de ensayo',10)");
 await db.query("INSERT INTO inm_inmuebles(id,codigo,zona_id,tipo,operacion,referencia,area_terreno,area_construida,distrito) VALUES(1,'ENSAYO-VENTA',1,'Casa','venta','Referencia privada de ensayo',120,100,'Chimbote'),(2,'ENSAYO-ALQUILER',1,'Departamento','alquiler','Referencia privada de ensayo',NULL,80,'Chimbote'),(3,'ENSAYO-INCOMPLETO',1,'Terreno','venta','Referencia privada de ensayo',NULL,NULL,NULL),(4,'ENSAYO-VINCULAR',1,'Casa','venta','Referencia privada de ensayo',120,100,'Chimbote')");
 for(const id of [1,2,4]){
  await db.query("INSERT INTO inm_tasaciones(inmueble_id,fecha_tasacion,precio_venta,situacion,usuario_id) VALUES(?,CURDATE(),1500,'aprobado',1)",[id]);
  await db.query("INSERT INTO inm_visitas(id,inmueble_id,completada,usuario_id) VALUES(?,?,1,1)",[id,id]);
  await db.query("INSERT INTO inm_publicaciones(inmueble_id,texto,drive_link,usuario_registro_id) VALUES(?,?,'',1)",[id,'Un inmueble de ensayo con ambientes amplios y buena iluminación. Esta ficha contiene únicamente datos ficticios.']);
  for(const type of ['VENDEDOR_DNI','TASACION','FOTO_INMUEBLE'])await db.query("INSERT INTO inm_archivos(inmueble_id,visita_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,tipo_mime,usuario_id) VALUES(?,?,?,?,?,'hosting',?,?,1)",[id,type==='FOTO_INMUEBLE'?id:null,type,type,`ensayo/${id}/${type}`,`ensayo/${id}/${type}`,type==='FOTO_INMUEBLE'?'image/webp':'application/pdf']);
 }
 // Esquema mínimo con las mismas restricciones y contratos que usa la integración.
 await portal.query(`CREATE TABLE properties(id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,title VARCHAR(100) NOT NULL,image VARCHAR(250) NOT NULL,price DECIMAL(15,2) NOT NULL,moneda VARCHAR(10) NOT NULL,address VARCHAR(250) NOT NULL,location VARCHAR(25) NOT NULL,status VARCHAR(25) NOT NULL,bedrooms INT,bathrooms INT,cocheras INT,area DECIMAL(15,2),area_c DECIMAL(15,2),description VARCHAR(10000),distribution VARCHAR(5000),latitude DECIMAL(15,7),longitude DECIMAL(15,7),destacado BOOLEAN,currency_code CHAR(3),price_basis VARCHAR(40),property_type_id INT,modality_id INT,district_id INT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
 await portal.query("CREATE TABLE publications(property_id INT UNSIGNED PRIMARY KEY,publication_status VARCHAR(30),approved_at DATETIME,source_system VARCHAR(40),internal_reference VARCHAR(191))");
 await portal.query("CREATE TABLE sub_properties(id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,property_id INT,property_ref_id INT UNSIGNED,content VARCHAR(50),text_content VARCHAR(100),image VARCHAR(250),`order` INT)");
 for(const name of ['tipos','modalidades','distritos'])await portal.query(`CREATE TABLE ${name}(id INT AUTO_INCREMENT PRIMARY KEY,nombre VARCHAR(100))`);
 for(const type of ['Casa','Departamento','Terreno','Oficina','Local Comercial','Terreno Comercial','Hotel'])await portal.query('INSERT INTO tipos(nombre) VALUES(?)',[type]);
 await portal.query("INSERT INTO modalidades(nombre) VALUES('Venta'),('Alquiler')");await portal.query("INSERT INTO distritos(nombre) VALUES('Chimbote')");
 await portal.query("CREATE SQL SECURITY INVOKER VIEW public_properties AS SELECT p.id AS id,p.title AS title,p.price AS price,p.image AS image FROM properties p JOIN publications pub ON pub.property_id=p.id WHERE pub.publication_status='published' AND pub.approved_at IS NOT NULL");
 const connection=await portal.getConnection();try{await installIntranetSchema(connection);await installIntranetSchema(connection);}finally{connection.release();}
 const image=await sharp({create:{width:1200,height:800,channels:3,background:'#c80000'}}).webp().toBuffer();for(const id of [1,2,4])stored.set(`ensayo/${id}/FOTO_INMUEBLE`,image);
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(work,'key.pem'),'-out',path.join(work,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 storage=https.createServer({key:fs.readFileSync(path.join(work,'key.pem')),cert:fs.readFileSync(path.join(work,'cert.pem'))},async(req,res)=>{if(req.headers.authorization!=='Bearer ensayo')return res.writeHead(401).end();const key=new URL(req.url,'https://localhost').searchParams.get('path');if(req.method==='PUT'){const chunks=[];for await(const chunk of req)chunks.push(chunk);stored.set(key,Buffer.concat(chunks));return res.writeHead(201).end();}if(req.method==='DELETE'){stored.delete(key);return res.writeHead(200).end();}return stored.has(key)?res.writeHead(200).end(stored.get(key)):res.writeHead(404).end();});
 await new Promise(resolve=>storage.listen(3165,'127.0.0.1',resolve));
 const handler=createIntranetSyncHandler({pool:portal,secret,bridgeUrl:origin+'/api/portal-web/bridge',origin:webOrigin});
 web=http.createServer(async(req,res)=>{const u=new URL(req.url,webOrigin);req.query=Object.fromEntries(u.searchParams);res.status=n=>{res.statusCode=n;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};res.send=value=>{res.end(value);return res;};if(u.pathname==='/legacy-photo')return res.writeHead(200,{'Content-Type':'image/webp'}).end(image);if(rejectDelivery&&req.method==='POST')return res.status(503).json({error:'Ensayo de error'});if(req.method==='POST'){let data='';for await(const chunk of req)data+=chunk;req.body=JSON.parse(data);}await handler(req,res);});await new Promise(resolve=>web.listen(3166,'127.0.0.1',resolve));
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3164','-H','127.0.0.1'],{env:{...process.env,DATABASE_URL:dbUrl,DATABASE_TLS_REQUIRED:'',DATABASE_SSL_CA:'',AUTH_LOGIN_MFA_REQUIRED:'0',DOCUMENT_HOSTING_URL:'https://127.0.0.1:3165',DOCUMENT_HOSTING_TOKEN:'ensayo',NODE_EXTRA_CA_CERTS:path.join(work,'cert.pem'),PORTAL_WEB_SYNC_TOKEN:secret,PORTAL_WEB_SYNC_URL:webOrigin+'/api/intranet-sync',PORTAL_WEB_ORIGIN:webOrigin},stdio:['ignore','pipe','pipe']});app.stdout.on('data',b=>{logs+=b;});app.stderr.on('data',b=>{logs+=b;});
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/login')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 assert.equal((await request('/api/portal-web','GET',null,'')).status,401);assert.equal((await request('/api/portal-web','GET',null,tokens.operator)).status,403);
 assert.equal((await request('/api/portal-web/1','PUT',{},tokens.admin,true)).status,403);
 assert.equal((await fetch(origin+'/api/portal-web/bridge?kind=photo&property=1&id=3')).status,401);
 assert.equal((await request('/api/portal-web/1','POST',{action:'publish',version:0,reason:'Intento sin completar'})).status,409);
 const first=(await request('/api/portal-web/1')).data;assert.equal(first.checklist.complete,false);
 let draft={...initialWebDraft(first.source),listingMode:'new',title:'Casa de ensayo con patio amplio',description:first.source.baseText,publicLocation:'Ubicación pública de ensayo',district:'Chimbote',landArea:'120',builtArea:'100',priceMode:'consult',photos:[{id:first.source.photos[0].id,caption:'Fachada autorizada'}],coverPhotoId:first.source.photos[0].id,dataAuthorized:true,photosAuthorized:true};
 let saved=await request('/api/portal-web/1','PUT',{draft:{...draft,dataAuthorized:false},version:0,sourceRevision:first.source.revision});assert.equal(saved.status,200);assert.equal(saved.data.checklist.complete,false);
 assert.equal((await request('/api/portal-web/1','POST',{action:'publish',version:1,reason:'Intento sin permiso'})).status,409);
 assert.equal((await request('/api/portal-web/1','PUT',{draft,version:0,sourceRevision:first.source.revision})).status,409);
 saved=await request('/api/portal-web/1','PUT',{draft,version:1,sourceRevision:first.source.revision});assert.equal(saved.status,200);assert.equal(saved.data.checklist.complete,true);
 let result=await request('/api/portal-web/1','POST',{action:'publish',version:2,reason:'Ensayo de publicación autorizada'});assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.synced,true);
 const portalId=result.data.portalId;assert.ok(portalId);const [[received]]=await portal.query("SELECT contenido FROM portal_intranet_sync WHERE clave='property:1'");const reordered=typeof received.contenido==='string'?JSON.parse(received.contenido):received.contenido;assert.equal((await fetch(webOrigin+'/api/intranet-sync',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify(reordered)})).status,200,'Reintento con claves JSON reordenadas');const [[publicRow]]=await portal.query('SELECT * FROM public_properties WHERE id=?',[portalId]);assert.equal(publicRow.price,null);
 const photoUrl=webOrigin+`/api/intranet-sync?media=photo&property=1&id=${first.source.photos[0].id}`;assert.equal((await fetch(photoUrl)).status,200);
 assert.equal((await fetch(webOrigin+'/api/intranet-sync?media=photo&property=1&id=1')).status,404,'El DNI no se entrega como foto');
 assert.equal((await request('/api/portal-web/1','POST',{action:'publish',version:2,reason:'Segundo envío'})).data.portalId,portalId);assert.equal(Number((await portal.query('SELECT COUNT(*) n FROM properties'))[0][0].n),1);
 assert.equal((await request('/api/portal-web/1','POST',{action:'suspend',version:2,reason:'Suspensión de ensayo'})).status,200);assert.equal((await portal.query('SELECT * FROM public_properties WHERE id=?',[portalId]))[0].length,0);assert.equal((await fetch(photoUrl)).status,404);
 rejectDelivery=true;assert.equal((await request('/api/portal-web/1','POST',{action:'publish',version:2,reason:'Ensayo de desconexión'})).status,202);assert.equal((await request('/api/portal-web/1')).data.publication.syncState,'error');rejectDelivery=false;
 assert.equal((await request('/api/portal-web/1','POST',{action:'retry',version:2,reason:'Reintento'})).data.synced,true);
 await db.query("UPDATE inm_inmuebles SET estado='historico' WHERE id=1");assert.equal((await request('/api/portal-web/1','POST',{action:'publish',version:2,reason:'Intento sobre histórico'})).status,409);await db.query("UPDATE inm_inmuebles SET estado='activo' WHERE id=1");
 // Preparar un alquiler con precio mensual y moneda explícita.
 const second=(await request('/api/portal-web/2')).data;const rent={...initialWebDraft(second.source),listingMode:'new',title:'Departamento de ensayo para alquiler',publicLocation:'Sector público de ensayo',district:'Chimbote',builtArea:'80',currency:'PEN',price:'1500',photos:[{id:second.source.photos[0].id,caption:'Sala'}],coverPhotoId:second.source.photos[0].id,dataAuthorized:true,photosAuthorized:true};
 assert.equal((await request('/api/portal-web/2','PUT',{draft:rent,version:0,sourceRevision:second.source.revision})).status,200);assert.equal((await request('/api/portal-web/2','POST',{action:'publish',version:1,reason:'Alquiler revisado'})).status,200);
 await portal.query("INSERT INTO properties(id,title,image,price,moneda,address,location,status) VALUES(100,'Anuncio heredado ficticio','/foto.png',100,'S/','Referencia','Chimbote','Venta')");await portal.query("INSERT INTO publications(property_id,publication_status,approved_at,source_system) VALUES(100,'published',NOW(),'legacy_portal')");
 const fourth=(await request('/api/portal-web/4')).data;const linked={...draft,listingMode:'existing',existingPortalId:'100',photos:[{id:fourth.source.photos[0].id,caption:'Fachada'}],coverPhotoId:fourth.source.photos[0].id};
 assert.equal((await request('/api/portal-web/4','PUT',{draft:linked,version:0,sourceRevision:fourth.source.revision})).status,200);assert.equal((await request('/api/portal-web/4','POST',{action:'publish',version:1,reason:'Vinculación explícita de ensayo'})).data.portalId,100);assert.equal(Number((await portal.query('SELECT COUNT(*) n FROM properties'))[0][0].n),3);
 // Un anuncio anterior se administra sin crear ficha interna ni completar expediente.
 await portal.query("INSERT INTO properties(id,title,image,price,moneda,address,location,status,description) VALUES(101,'Casa anterior ficticia',?,120,'S/','Referencia pública','Chimbote','Venta','Descripción ya publicada')",[webOrigin+'/legacy-photo']);
 await portal.query("INSERT INTO publications(property_id,publication_status,approved_at,source_system) VALUES(101,'published',NOW(),'legacy_portal')");
 assert.equal((await fetch(webOrigin+'/api/intranet-sync?admin=existing')).status,401);
 const catalogue=await request('/api/portal-web?includeCatalog=1');assert.equal(catalogue.status,200);assert.equal(catalogue.data.existingRecords.length,1);assert.equal(catalogue.data.existingRecords[0].source.id,101);assert.equal(catalogue.data.existingRecords[0].checklist.complete,true);
 const legacyPath='/api/portal-web/existentes/101';
 assert.equal((await request(legacyPath,'GET',null,'')).status,401);assert.equal((await request(legacyPath,'GET',null,tokens.operator)).status,403);
 let legacy=(await request(legacyPath)).data;assert.equal(legacy.source.identityDocument,false);assert.equal(legacy.checklist.total,13);assert.equal((await request(legacyPath+'/foto?foto=0')).status,200);assert.equal((await request(legacyPath+'/foto?foto=999')).status,404);
 const legacyAct=async(action,expected=legacy)=>request(legacyPath,'POST',{action,version:expected.version,sourceRevision:expected.source.revision,reason:'Ensayo sobre anuncio anterior'});
 assert.equal((await legacyAct('publish')).status,200,'Republicar con datos ya existentes sin nueva ficha');
 legacy=(await request(legacyPath)).data;
 assert.equal((await legacyAct('suspend')).status,200);assert.equal((await portal.query('SELECT * FROM public_properties WHERE id=101'))[0].length,0);
 assert.equal((await legacyAct('publish')).status,409,'Impide actuar con versión remota antigua');
 legacy=(await request(legacyPath)).data;assert.equal((await legacyAct('publish')).status,200,'Reactivar sin documentos retroactivos');
 legacy=(await request(legacyPath)).data;
 const edited={...legacy.draft,title:'Casa anterior actualizada',dataAuthorized:true,photosAuthorized:true};
 const savedLegacy=await request(legacyPath,'PUT',{draft:edited,version:legacy.version,sourceRevision:legacy.source.revision});assert.equal(savedLegacy.status,200);legacy=savedLegacy.data;
 assert.equal((await legacyAct('publish')).status,200);assert.equal((await portal.query('SELECT title FROM properties WHERE id=101'))[0][0].title,edited.title);
 const [[priorLegacy]]=await portal.query("SELECT contenido FROM portal_intranet_sync WHERE clave='legacy:101'");const repeated=typeof priorLegacy.contenido==='string'?JSON.parse(priorLegacy.contenido):priorLegacy.contenido;
 assert.equal((await fetch(webOrigin+'/api/intranet-sync',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify(repeated)})).status,200,'Entrega antigua idempotente tras actualizar datos');
 legacy=(await request(legacyPath)).data;
 const bad={...legacy.draft,dataAuthorized:false};assert.equal((await request(legacyPath,'PUT',{draft:bad,version:legacy.version,sourceRevision:legacy.source.revision})).status,200);legacy=(await request(legacyPath)).data;
 assert.equal((await legacyAct('publish')).status,409,'Los cambios sin autorización siguen bloqueados');
 assert.equal(Number((await db.query('SELECT COUNT(*) n FROM inm_inmuebles'))[0][0].n),4);assert.equal(Number((await portal.query('SELECT COUNT(*) n FROM properties'))[0][0].n),4);
 const form=new FormData();form.set('image',new File([image],'portada.webp',{type:'image/webp'}));const uploaded=await request('/api/portal-web/medios','POST',form);assert.equal(uploaded.status,201,JSON.stringify(uploaded.data));
 const banner={id:'banner-ensayo',imageId:uploaded.data.id,title:'Encuentra tu próximo espacio',subtitle:'Contenido de ensayo',href:'/propiedades?status=Venta',buttonLabel:'Ver inmuebles',enabled:true,authorized:true,position:'center'};
 assert.equal((await request('/api/portal-web/portada','PUT',{items:[{...banner,authorized:false}],version:0})).status,200);assert.equal((await request('/api/portal-web/portada','POST',{version:1})).status,409);
 assert.equal((await request('/api/portal-web/portada','PUT',{items:[banner],version:1})).status,200);assert.equal((await request('/api/portal-web/portada','POST',{version:2})).data.synced,true);
 const home=await(await fetch(webOrigin+'/api/intranet-sync?content=home')).json();assert.equal(home.banners[0].label,banner.title);assert.equal((await fetch(webOrigin+home.banners[0].image)).status,200);
 const {chromium}=await import(pathToFileURL(path.join(portalRepo,'node_modules/playwright/index.mjs')));browser=await chromium.launch({headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'aa_session',value:tokens.admin,url:origin}]);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('output/portal-web',{recursive:true});
 await page.goto(origin+'/portal-web/por-publicar');await page.getByText('Inmuebles por publicar',{exact:true}).last().waitFor();await page.getByRole('button',{name:'Completar y revisar'}).first().click();assert.equal(await page.getByRole('button',{name:'Publicar en la web',exact:true}).isDisabled(),true);await page.screenshot({path:'output/portal-web/pendientes-escritorio.png',fullPage:true});
 await page.route('**/api/portal-web?includeCatalog=1',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});await page.goto(origin+'/portal-web/activas');assert.equal(await page.getByText('La conexión con el portal está pendiente.',{exact:false}).count(),0);await page.getByRole('button',{name:'Gestionar publicación'}).first().waitFor();await page.getByRole('heading',{name:'Casa anterior actualizada'}).waitFor();await page.screenshot({path:'output/portal-web/activas-escritorio.png',fullPage:true});
 await page.goto(origin+'/portal-web/portada');await page.getByRole('button',{name:'Actualizar portada en la web'}).waitFor();await page.screenshot({path:'output/portal-web/portada-escritorio.png',fullPage:true});
 await page.setViewportSize({width:375,height:850});for(const route of ['por-publicar','activas','portada']){await page.goto(origin+'/portal-web/'+route);await page.waitForLoadState('networkidle');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' tiene desborde móvil');await page.screenshot({path:`output/portal-web/${route}-movil.png`,fullPage:true});}
 assert.deepEqual(errors,[]);
 const report={date:new Date().toISOString(),isolated:true,fictitiousData:true,authentication:true,operatorDenied:true,sameOriginRequired:true,missingFieldsBlockedServer:true,buttonDisabled:true,optimisticLock:true,saleAndRentalPublished:true,stablePortalId:true,explicitLegacyLink:true,legacyWithoutInternalRecord:true,legacyUpdateSuspendRepublish:true,legacyPublicConditions:true,noFalseConnectionWarning:true,consultPrice:true,privateDocumentsExcluded:true,suspensionHidesPhoto:true,retryAfterFailure:true,retryWithReorderedJson:true,inactivePropertyBlocked:true,bannerConditions:true,bannerAndPhotoDelivery:true,mobileOverflow:false,runtimeErrors:errors,realBusinessRowsChanged:0};
 fs.mkdirSync('docs/evidencia-portal-web',{recursive:true});fs.writeFileSync('docs/evidencia-portal-web/INTEGRACION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){console.error('Integración detenida:',error.code||error.message);fs.mkdirSync('output/portal-web',{recursive:true});fs.writeFileSync('output/portal-web/server.log',logs,{mode:0o600});process.exitCode=1;}
finally{await browser?.close();app?.kill('SIGTERM');await new Promise(resolve=>web?web.close(resolve):resolve());await new Promise(resolve=>storage?storage.close(resolve):resolve());await db.end();await portal.end();}
