// Checks the deployed application with isolated accounts; no business records are changed.
import assert from 'node:assert/strict';import {loadEnvFile} from 'node:process';import {randomBytes} from 'node:crypto';import mysql from 'mysql2/promise';import {hashSessionToken,hashPassword} from '../lib/password.mjs';
loadEnvFile('.env.local');const origin=process.env.TEST_ORIGIN;if(!origin||!origin.startsWith('https://'))throw new Error('Indica TEST_ORIGIN HTTPS.');
const db=await mysql.createConnection(process.env.DATABASE_URL),suffix=randomBytes(6).toString('hex'),users=[],cookies=[];
const request=(path,cookie='')=>fetch(origin+path,{headers:{...(cookie?{Cookie:cookie}:{})},redirect:'manual',signal:AbortSignal.timeout(30000)});
try{
 for(const rol of ['administrador','operador']){const token=randomBytes(32).toString('hex');const [user]=await db.execute('INSERT INTO inm_usuarios(nombre,email,usuario,password_hash,rol,activo) VALUES(?,?,?,?,?,1)',['Verificación de despliegue',suffix+rol+'@example.invalid','release_'+suffix+users.length,await hashPassword(randomBytes(24).toString('hex')),rol]);users.push(user.insertId);await db.execute('INSERT INTO inm_sesiones(token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES(?,?,?,?,?)',[hashSessionToken(token),user.insertId,new Date(Date.now()+600000),new Date(),new Date()]);cookies.push('aa_session='+token);}
 assert.equal((await request('/login')).status,200);assert.equal((await request('/api/reportes')).status,401);
 for(const path of ['/','/cartera','/datos-inmuebles','/registrar-inmueble','/registrar-visitas','/visitas-pendientes','/registrar-tasaciones','/tasaciones-textos-pendientes','/reportes','/alquileres','/liberar-inmuebles','/seguridad','/tipos-inmueble','/ubicaciones']){const response=await request(path,cookies[0]);assert.equal(response.status,200,path);const html=await response.text();assert.ok(!html.includes('Application error: a server-side exception'),path);if(path==='/')assert.ok(!html.includes('Datos del panel'),'Panel único sin selector');}
 assert.equal((await request('/api/catalogo-ubicaciones',cookies[1])).status,200);assert.equal((await request('/ubicaciones',cookies[1])).status,307);
 const data={};for(const path of ['/api/dashboard','/api/cartera','/api/reportes','/api/publicaciones','/api/seguimiento','/api/visitas','/api/tipos-inmueble','/api/catalogo-ubicaciones']){const response=await request(path,cookies[0]);assert.equal(response.status,200,path);data[path]=await response.json();}
 assert.equal((await (await request('/api/dashboard?modo=real',cookies[0])).json()).resumen.activos,(await (await request('/api/reportes?pruebas=0',cookies[0])).json()).resumen.activos);assert.equal(data['/api/dashboard'].modo,'todos');assert.ok(data['/api/dashboard'].resumen.activos>=12);assert.equal(data['/api/dashboard'].resumen.posicionesDisponibles,data['/api/reportes'].resumen.disponibles);
 const positions=data['/api/cartera'].inmuebles.filter(x=>x.posicion!=null).map(x=>x.posicion);assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
 assert.ok(data['/api/publicaciones'].listos.every(item=>item.expediente?.complete),'La bandeja solo cuenta expedientes completos');
 assert.equal((await request('/api/tipos-inmueble',cookies[1])).status,200);assert.equal((await request('/tipos-inmueble',cookies[1])).status,307);
 assert.equal((await request('/api/seguimiento',cookies[1])).status,403);assert.equal((await request('/api/reportes',cookies[1])).status,403);assert.equal((await request('/datos-inmuebles',cookies[1])).status,200);
 const [properties]=await db.query('SELECT id FROM inm_inmuebles ORDER BY id LIMIT 1');if(properties[0]){for(const suffix of ['','/seguimiento','/anuncios','/visitas'])assert.equal((await request('/api/inmuebles/'+properties[0].id+suffix,cookies[0])).status,200);}
 for (const op of ['venta','alquiler']) {
  const response=await request(`/api/reportes?operacion=${op}&pruebas=1`,cookies[0]);assert.equal(response.status,200);
  const result=await response.json();assert.ok(result.rows.every(row=>row.operacion===(op==='venta'?'Venta':'Alquiler')));
 }
 const rentals=await request('/api/reportes?reporte=Alquilados&operacion=alquiler&pruebas=1',cookies[0]);assert.equal(rentals.status,200);assert.equal((await rentals.json()).fechaFiltro,'fechaAlquiler');
 const demoPanelResponse=await request('/api/dashboard?modo=demo',cookies[0]);assert.equal(demoPanelResponse.status,200);const demoPanel=await demoPanelResponse.json();assert.equal(demoPanel.modo,'demo');assert.ok(demoPanel.resumen.activos>=12);
 assert.equal((await request('/api/seguimiento?modo=demo',cookies[0])).status,200);assert.equal((await request('/api/alquileres?modo=demo',cookies[0])).status,200);assert.equal((await request('/api/alquileres',cookies[1])).status,403);
 console.log('PASS producción: páginas y APIs disponibles; panel/reportes coherentes; expedientes completos; permisos de operador conservados.');
}finally{
 if(users.length){await db.query('DELETE FROM inm_borradores WHERE usuario_id IN (?)',[users]);await db.query('DELETE FROM inm_security_audit WHERE actor_id IN (?)',[users]);await db.query('DELETE FROM inm_sesiones WHERE usuario_id IN (?)',[users]);await db.query('DELETE FROM inm_usuarios WHERE id IN (?)',[users]);}await db.end();
}
