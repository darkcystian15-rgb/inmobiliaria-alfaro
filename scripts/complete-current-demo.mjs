// Only the twelve reviewed demonstration records. Does not advance workflow stages.
import {loadEnvFile} from 'node:process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {jsPDF} from 'jspdf';
import sharp from 'sharp';
loadEnvFile('.env.local');
const baseline=JSON.parse(await readFile('/tmp/alfaro-audit-before.json','utf8'));
const expected=new Map(baseline.inm_inmuebles.map(p=>[p.id,p.codigo]));
const db=await mysql.createConnection(process.env.DATABASE_URL);
const marker='auditoria_demo_20261006';
async function hosting(method,path,bytes){const url=new URL(process.env.DOCUMENT_HOSTING_URL);url.searchParams.set('path',path);const res=await fetch(url,{method,headers:{Authorization:`Bearer ${process.env.DOCUMENT_HOSTING_TOKEN}`,'Content-Type':'application/octet-stream'},...(bytes?{body:bytes}:{}),redirect:'error',signal:AbortSignal.timeout(45000)});if(!res.ok)throw new Error(`Archivo ${path}: HTTP ${res.status}`);return res;}
const checked=[];
try {
 const [existing]=await db.query("SELECT id,tipo_documento,ruta_almacenamiento,tipo_mime FROM inm_archivos WHERE almacenamiento='hosting'");
 for(const f of existing){const response=await hosting('GET',f.ruta_almacenamiento);const bytes=Buffer.from(await response.arrayBuffer());if(f.tipo_mime.startsWith('image/'))await sharp(bytes).metadata();else if(f.tipo_mime==='application/pdf'&&bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('PDF inválido');checked.push({id:f.id,bytes:bytes.length,ok:true});}
 await db.beginTransaction();
 const [records]=await db.query('SELECT i.*,a.posicion_id FROM inm_inmuebles i JOIN inm_asignaciones_posicion a ON a.inmueble_id=i.id AND a.activa=1 ORDER BY i.id FOR UPDATE');
 if(records.length!==12||records.some(p=>expected.get(p.id)!==p.codigo))throw new Error('Cambió el conjunto revisado; repetir auditoría.');
 const changed=[];
 for(const p of records){
  const [done]=await db.query('SELECT id FROM inm_timeline WHERE inmueble_id=? AND evento=?',[p.id,marker]);if(done.length)continue;
  const [ownerRows]=await db.query('SELECT * FROM inm_propietarios WHERE id=?',[p.propietario_id]);const owner=ownerRows[0];if(!owner)throw new Error('Propietario no disponible.');
  await db.execute("UPDATE inm_propietarios SET dni=COALESCE(NULLIF(dni,''),?),apellidos=COALESCE(NULLIF(apellidos,''),'Ejemplo de prueba'),telefono=COALESCE(NULLIF(telefono,''),'000000000'),email=COALESCE(NULLIF(email,''),?),referencia_contacto=COALESCE(NULLIF(referencia_contacto,''),'Contacto ficticio; no llamar ni enviar mensajes.') WHERE id=?",[String(99000000+p.id),`propietario-${p.id}@example.invalid`,owner.id]);
  const terrain=p.tipo.toLowerCase()==='terreno';const area=p.area_terreno|| (p.tipo==='Local'?'90.00':'120.00');
  const construction=terrain?'0.00':p.area_construida||'120.00';
  const note='SOLO PRUEBA: ficha completada con datos ficticios en auditoría 2026-10-06. Dirección y medidas no verificadas.'+(p.id===7?' Se retiraron coordenadas anteriores no verificadas y se corrigió terreno sin edificación (antes: 18000 m² construidos).':'');
  const operation=[2,5].includes(p.id)?'alquiler':p.operacion;
  await db.execute("UPDATE inm_inmuebles SET datos_prueba=1,datos_validados=0,distrito=COALESCE(NULLIF(distrito,''),'Chimbote'),provincia=COALESCE(NULLIF(provincia,''),'Santa'),departamento=COALESCE(NULLIF(departamento,''),'Áncash'),area_terreno=?,area_construida=?,habitaciones=?,banos=?,caracteristicas=COALESCE(NULLIF(caracteristicas,''),?),observaciones=?,operacion=? WHERE id=?",[area,construction,terrain?0:p.habitaciones??2,terrain?0:p.banos??1,terrain?'SOLO PRUEBA: terreno sin construcción, acceso por vía urbana.':'SOLO PRUEBA: servicios básicos, buena iluminación y acceso independiente.',[p.observaciones,note].filter(Boolean).join('\n'),operation,p.id]);
  const [visits]=await db.query('SELECT id FROM inm_visitas WHERE inmueble_id=? AND completada=1',[p.id]);const [prices]=await db.query('SELECT id FROM inm_tasaciones WHERE inmueble_id=?',[p.id]);const [pub]=await db.query('SELECT id,publicado FROM inm_publicaciones WHERE inmueble_id=?',[p.id]);
  const stage=pub[0]?.publicado?'publicado':prices.length?'material_pendiente':visits.length?'tasacion_pendiente':'visita_pendiente';
  await db.execute('UPDATE inm_inmuebles SET etapa=? WHERE id=?',[stage,p.id]);
  if(p.id===11){
   await db.execute("UPDATE inm_tasaciones SET observacion='SOLO PRUEBA: precio acordado simulado; sin validez comercial.' WHERE inmueble_id=?",[p.id]);
   await db.execute("UPDATE inm_publicaciones SET texto=?,drive_link='' WHERE inmueble_id=?",[`SOLO PRUEBA — Casa de demostración en Chimbote. Área de terreno: ${area} m²; área construida: ${construction} m². Dos habitaciones, un baño. Precio de venta simulado: S/ 450 000. Dirección ficticia: ${p.direccion}. Este anuncio no constituye una oferta real.`,p.id]);
  }
  const activity=!visits.length?'visita':!prices.length?'tasacion':pub[0]?.publicado?null:'expediente';
  if(activity)await db.execute("INSERT INTO inm_seguimiento(inmueble_id,actividad,responsable_id,fecha_limite,observacion) VALUES(?,?,?,'2026-10-09','SOLO PRUEBA: plazo y responsable de demostración; no acredita una actividad realizada.') ON DUPLICATE KEY UPDATE inmueble_id=VALUES(inmueble_id)",[p.id,activity,activity==='visita'?2:1]);
  await db.execute('INSERT INTO inm_timeline(inmueble_id,evento,observacion,usuario_id) VALUES(?,?,?,1)',[p.id,marker,JSON.stringify({nota:note,operacionAnterior:p.operacion,operacionActual:operation,etapa:stage})]);changed.push({id:p.id,position:p.posicion_id,operation,stage});
 }
 // Complete only the already-published property's missing documents with visibly synthetic PDFs.
 const [published]=await db.query('SELECT i.id,i.codigo FROM inm_inmuebles i JOIN inm_publicaciones p ON p.inmueble_id=i.id WHERE i.id=11 AND p.publicado=1 AND i.datos_prueba=1');
 if(published.length)for(const category of ['DNI_PROPIETARIO','TASACION']){
  const [found]=await db.query("SELECT id FROM inm_archivos WHERE inmueble_id=11 AND tipo_documento=? AND almacenamiento='hosting'",[category]);if(found.length)continue;
  const pdf=new jsPDF();pdf.setFontSize(22);pdf.text('SOLO PRUEBA - SIN VALIDEZ',15,25);pdf.setFontSize(12);pdf.text(category==='DNI_PROPIETARIO'?'Adjunto ficticio para probar el expediente.':'Tasacion ficticia para probar el expediente.',15,45);pdf.text('No es un documento de identidad ni una tasacion profesional.',15,60);pdf.text('Inmueble de demostracion 11. Auditoria: 2026-10-06.',15,75);if(category==='TASACION')pdf.text('Referencia: S/ 500000. Objetivo y venta: S/ 450000.',15,90);
  const bytes=Buffer.from(pdf.output('arraybuffer'));const path=`inmuebles/${published[0].codigo}-posicion-11/${category.toLowerCase().replaceAll('_','-')}/auditoria-demo-20261006.pdf`;
  await hosting('PUT',path,bytes);const check=Buffer.from(await (await hosting('GET',path)).arrayBuffer());if(createHash('sha256').update(check).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('El adjunto no coincide.');
  await db.execute("INSERT INTO inm_archivos(inmueble_id,tipo_documento,nombre,enlace,almacenamiento,ruta_almacenamiento,nombre_original,tamano_bytes,tipo_mime,observacion,usuario_id) VALUES(11,?,?,?,'hosting',?,?,?,'application/pdf','SOLO PRUEBA: documento sintético sin validez; agregado para regularizar expediente de demostración.',1)",[category,`${category} — SOLO PRUEBA`,path,path,'SOLO-PRUEBA.pdf',bytes.length]);
  await db.execute("INSERT INTO inm_timeline(inmueble_id,evento,observacion,usuario_id) VALUES(11,'documento_registrado',?,1)",[`SOLO PRUEBA: adjunto ${category} de demostración agregado en auditoría.`]);
 }
 await db.commit();await writeFile('/tmp/alfaro-demo-completed.json',JSON.stringify({checked,changed},null,2),{mode:0o600});console.log(JSON.stringify({checked,changed},null,2));
} catch(error){await db.rollback();throw error;}finally{await db.end();}
