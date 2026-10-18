// Read-only business verification. Creates isolated temporary accounts/sessions and removes them in finally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { hashPassword, hashSessionToken } from '../lib/password.mjs';
import { propertyPanelContactId } from '../lib/property-panel-id.mjs';
import { fileListType, fileListTypes } from '../lib/file-list.mjs';
process.loadEnvFile('.env.local');
const origin='https://intranet.inmobiliariaalbertoalfaro.com.pe';
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})});
const users=[],suffix=randomBytes(6).toString('hex');let browser;
async function request(path,token){return fetch(origin+path,{headers:token?{Cookie:`aa_session=${token}`}:{},redirect:'manual',signal:AbortSignal.timeout(30000)});}
try{
  const tokens=[];
  for(const role of ['administrador','usuario']){
    const [user]=await db.query('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo,mfa_secret) VALUES(?,?,?,?,?,1,?)',[`Verificación archivos ${role}`,`files-${role}-${suffix}@example.invalid`,`files_${role}_${suffix}`,await hashPassword(randomBytes(32).toString('hex')),role,randomBytes(48).toString('base64')]);users.push(user.insertId);
    const token=randomBytes(32).toString('hex');tokens.push(token);await db.query('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)',[hashSessionToken(token),user.insertId,new Date(Date.now()+600000),new Date(),new Date()]);
  }
  const [admin,operator]=tokens;
  assert.equal((await request('/api/listado-archivos')).status,401);
  assert.equal((await request('/api/listado-archivos',operator)).status,403);
  const [files]=await db.query("SELECT a.id,a.tipo_documento,i.operacion,i.codigo,i.tipo,i.direccion,i.nombre_contacto,z.nombre zona FROM inm_archivos a JOIN inm_inmuebles i ON i.id=a.inmueble_id JOIN inm_zonas z ON z.id=i.zona_id WHERE z.activo=1 AND a.almacenamiento='hosting' AND a.ruta_almacenamiento IS NOT NULL AND a.ruta_almacenamiento<>''");
  const expected=files.filter(file=>fileListType(file.tipo_documento,file.operacion));
  let response=await request('/api/listado-archivos',admin);assert.equal(response.status,200);let data=await response.json();assert.equal(data.paginacion.total,expected.length);for(const row of data.archivos)assert.equal(row.inmueble,propertyPanelContactId(expected.find(file=>Number(file.id)===Number(row.id))));
  for(const type of fileListTypes){response=await request('/api/listado-archivos?tipo='+type.key,admin);assert.equal(response.status,200);const result=await response.json();assert.equal(result.paginacion.total,expected.filter(file=>fileListType(file.tipo_documento,file.operacion).key===type.key).length);}
  const zonesResponse=await request('/api/zonas',admin),{zonas}=await zonesResponse.json();
  for(const zone of zonas){response=await request('/api/listado-archivos?'+new URLSearchParams({zona:zone.nombre}),admin);assert.equal(response.status,200);const result=await response.json();assert.equal(result.paginacion.total,expected.filter(file=>file.zona===zone.nombre).length);assert.ok(result.archivos.every(file=>file.zona===zone.nombre));}
  if(data.archivos.length){const file=data.archivos[0];assert.equal((await request(file.enlace)).status,401);response=await request(file.enlace,admin);assert.equal(response.status,200);await response.arrayBuffer();}
  assert.equal((await request('/api/liberaciones',admin)).status,400);
  assert.equal((await request('/api/liberaciones?zona=*',admin)).status,400);
  if(zonas.length){response=await request('/api/liberaciones?'+new URLSearchParams({zona:zonas[0].nombre}),admin);assert.equal(response.status,200);const result=await response.json();assert.ok(result.items.every(item=>item.zona===zonas[0].nombre));}
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'aa_session',value:admin,url:origin}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/listado-archivos');await page.getByRole('heading',{name:'Listado de archivos',exact:true}).waitFor({timeout:60000});await page.getByText(`${expected.length} archivo(s)`,{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Buscar',exact:true}).count(),0);
  if(data.archivos.length)assert.equal((await page.locator('tbody tr').first().locator('td').nth(1).innerText()).trim(),data.archivos[0].tipo);
  if(zonas.length){await page.getByRole('combobox',{name:'Zona',exact:true}).selectOption(zonas[0].nombre);const count=expected.filter(file=>file.zona===zonas[0].nombre).length;await page.getByText(`${count} archivo(s)`,{exact:true}).waitFor();assert.equal(await page.locator('tbody').getByText(zonas[0].nombre,{exact:true}).count(),0);await page.getByRole('combobox',{name:'Zona',exact:true}).selectOption('*');await page.getByText(`${expected.length} archivo(s)`,{exact:true}).waitFor();}
  assert.equal(await page.locator('nav').getByRole('link',{name:'Contratos de alquiler',exact:true}).count(),0);
  assert.equal(await page.getByText('Estadística',{exact:true}).count()>0,true);
  for(const type of fileListTypes){await page.getByRole('combobox',{name:'Tipo de archivo',exact:true}).selectOption(type.key);const count=expected.filter(file=>fileListType(file.tipo_documento,file.operacion).key===type.key).length;await page.getByText(`${count} archivo(s)`,{exact:true}).waitFor();}
  await page.getByRole('combobox',{name:'Tipo de archivo',exact:true}).selectOption('*');await page.getByText(`${expected.length} archivo(s)`,{exact:true}).waitFor();
  if(data.archivos.length){await page.getByRole('button',{name:`Ver ${data.archivos[0].tipo} de ${data.archivos[0].inmueble}`,exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Cerrar vista previa'}).click();}
  fs.mkdirSync('output/file-list-production',{recursive:true,mode:0o700});await page.screenshot({path:'output/file-list-production/desktop.png',fullPage:true});
  await page.setViewportSize({width:375,height:850});await page.waitForFunction(()=>document.getElementById('navigation-panel').getBoundingClientRect().right<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.locator('h1').evaluate(element=>element.getBoundingClientRect().top)>=64,'Mobile title is below the fixed header');await page.screenshot({path:'output/file-list-production/mobile.png',fullPage:true});
  if(zonas.length){await page.goto(origin+'/liberar-inmuebles?'+new URLSearchParams({zona:zonas[0].nombre}));await page.getByRole('heading',{name:'Liberar inmueble',exact:true}).waitFor();assert.equal(await page.getByText('Seguimiento',{exact:true}).count()>0,true);}
  if(zonas.length){
    const response=await request('/api/liberaciones?'+new URLSearchParams({zona:zonas[0].nombre}),admin), scoped=await response.json();
    if(scoped.items.length){
      const item=scoped.items[0];await page.goto(origin+'/cartera?'+new URLSearchParams({zona:zonas[0].nombre}));await page.getByRole('button',{name:`Ver detalle de ${item.propietario || 'Sin contacto'}, posición ${Number(item.posicion)}`,exact:true}).click();await page.getByText('ID del inmueble',{exact:true}).waitFor();await page.getByText(propertyPanelContactId(item),{exact:true}).waitFor();assert.equal(await page.getByText('Contacto',{exact:true}).count(),0);
      await page.goto(origin+'/liberar-inmuebles?'+new URLSearchParams({zona:zonas[0].nombre}));await page.locator('summary').first().click();await page.getByRole('radio',{name:/Eliminar definitivamente/}).check();await page.getByRole('combobox',{name:/Motivo de eliminación/}).selectOption('desistimiento');await page.getByRole('button',{name:'Revisar eliminación'}).click();await page.getByRole('dialog',{name:'Eliminar inmueble',exact:true}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    }
  }
  await page.goto(origin+'/liberar-inmuebles');await page.getByRole('heading',{name:'Selecciona una zona para trabajar'}).waitFor();
  assert.deepEqual(errors,[]);console.log(`PASS producción: ${zonas.length} zonas activas, ${expected.length} archivos coincidentes; cuatro filtros, permisos, consulta privada, menú, zona obligatoria y navegador escritorio/móvil. ID con contacto, textos sin duplicar y cancelación del primer diálogo de eliminación. Sin escrituras de negocio.`);
}finally{
  if(browser)await browser.close();
  for(const id of users){await db.query('DELETE FROM inm_sesiones WHERE usuario_id=?',[id]);await db.query('DELETE FROM inm_security_audit WHERE actor_id=?',[id]);await db.query('DELETE FROM inm_usuarios WHERE id=?',[id]);}
  if(users.length)assert.equal((await db.query('SELECT COUNT(*) total FROM inm_usuarios WHERE id IN (?)',[users]))[0][0].total,0);
  await db.end();console.log('Cuentas y sesiones temporales eliminadas.');
}
