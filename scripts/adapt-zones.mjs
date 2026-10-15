// Read-only preview by default. Applying requires a verified full checkpoint and no drift.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { planZones, zoneKey } from '../lib/zone-plan.mjs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const dir=arg('--checkpoint'), apply=process.argv.includes('--apply');
if(!dir)throw Error('Indica --checkpoint.');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(dir+'/manifest.json','utf8'));
for(const file of ['source.tar.gz','database.json'])if(hash(readFileSync(dir+'/'+file))!==manifest.sha256[file])throw Error('Punto no verificable: '+file);
if(apply&&existsSync(dir+'/zones-journal.json'))throw Error('Ya existe diario; no repetir una aplicación.');
const before=JSON.parse(readFileSync(dir+'/database.json','utf8')).tables;
const config={uri:process.env.DATABASE_URL,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')}:{ }),rejectUnauthorized:true,verifyIdentity:true}}:{})};
const db=await mysql.createConnection(config);
let locked=false;
try{
 const [[lock]]=await db.query("SELECT GET_LOCK('cartera-zonas-v1',10) acquired");if(Number(lock.acquired)!==1)throw Error('Otra adaptación está en curso.');locked=true;
 const [properties]=await db.query('SELECT * FROM inm_inmuebles ORDER BY id');
 const [assignments]=await db.query('SELECT * FROM inm_asignaciones_posicion ORDER BY id');
 const [positions]=await db.query('SELECT * FROM inm_posiciones ORDER BY id');
 const plan=planZones(properties,assignments,positions,arg('--missing-zone'));
 console.log(JSON.stringify({modo:apply?'aplicar':'vista previa',inmuebles:properties.length,activos:plan.allocations.length,zonas:plan.zones.map(z=>({...z,ocupados:plan.allocations.filter(a=>a.zona===z.nombre).length}))},null,2));
 if(apply){
  const sql=readFileSync('db/updates/cartera-zonas.sql','utf8');
  for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.query(statement);
  const [columns]=await db.query('SHOW COLUMNS FROM inm_inmuebles');
  if(!columns.some(c=>c.Field==='zona_id'))await db.query('ALTER TABLE inm_inmuebles ADD COLUMN zona_id INT UNSIGNED NULL, ADD CONSTRAINT fk_inm_zona FOREIGN KEY(zona_id) REFERENCES inm_zonas(id)');
  // Guard the short cutover: an old deployment may read but cannot allocate legacy positions.
  const triggers=[
   ['inm_zona_guard_legacy_insert','BEFORE INSERT ON inm_asignaciones_posicion',"IF guard_active=1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Actualizacion por zonas: recarga la aplicacion'; END IF"],
   ['inm_zona_guard_legacy_update','BEFORE UPDATE ON inm_asignaciones_posicion',"IF guard_active=1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Actualizacion por zonas: recarga la aplicacion'; END IF"],
   ['inm_zona_guard_property','BEFORE INSERT ON inm_inmuebles',"IF NEW.zona_id IS NULL AND guard_active=1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selecciona una zona para registrar'; END IF"],
   ['inm_zona_guard_assignment','BEFORE INSERT ON inm_asignaciones_zona',"IF NOT EXISTS(SELECT 1 FROM inm_inmuebles i JOIN inm_posiciones_zona p ON p.zona_id=i.zona_id JOIN inm_zonas z ON z.id=p.zona_id WHERE i.id=NEW.inmueble_id AND p.id=NEW.posicion_id AND (NEW.activa=0 OR (p.activo=1 AND z.activo=1 AND p.numero<=z.capacidad))) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La posicion no pertenece a la zona del inmueble'; END IF"],
  ];
  const [existing]=await db.query('SHOW TRIGGERS');
  for(const [name,event,body] of triggers)if(!existing.some(t=>t.Trigger===name))await db.query(`CREATE TRIGGER ${name} ${event} FOR EACH ROW BEGIN DECLARE guard_active INT DEFAULT 0; SELECT activo INTO guard_active FROM inm_zona_cutover WHERE id=1 FOR SHARE; ${body}; END`);
  await db.beginTransaction();
  for(const [name,saved] of [['inm_inmuebles',before.inm_inmuebles.rows],['inm_asignaciones_posicion',before.inm_asignaciones_posicion.rows],['inm_posiciones',before.inm_posiciones.rows]]){
   const [now]=await db.query('SELECT * FROM ?? ORDER BY id FOR UPDATE',[name]);
   if(now.length!==saved.length||now.some((row,i)=>Object.keys(saved[i]).some(k=>String(row[k]??'')!==String(saved[i][k]??''))))throw Error('Hay cambios desde la copia: '+name+'. Crea un punto actualizado.');
  }
  const [[occupied]]=await db.query('SELECT COUNT(*) n FROM inm_asignaciones_zona');if(Number(occupied.n))throw Error('Las tablas de destino ya contienen asignaciones.');
  const zoneIds=new Map(), positionIds=new Map();
  for(const z of plan.zones){
   const members=properties.filter(p=>plan.properties.find(x=>x.id===Number(p.id))?.zona===z.nombre);
   const geography={};for(const k of ['departamento','provincia','distrito']){const values=[...new Set(members.map(p=>p[k]).filter(Boolean))];geography[k]=values.length===1?values[0]:null;}
   const [created]=await db.query('INSERT INTO inm_zonas SET ?',{clave:zoneKey(z.nombre),...z,...geography});zoneIds.set(z.nombre,created.insertId);
   for(let numero=1;numero<=z.capacidad;numero++){const [p]=await db.query('INSERT INTO inm_posiciones_zona SET ?',{zona_id:created.insertId,numero,activo:1});positionIds.set(z.nombre+':'+numero,p.insertId);}
  }
  for(const p of plan.properties)await db.query('UPDATE inm_inmuebles SET zona_id=?,fecha_actualizacion=fecha_actualizacion WHERE id=?',[zoneIds.get(p.zona),p.id]);
  const oldPos=new Map(positions.map(p=>[Number(p.id),Number(p.numero)]));
  const mapped=new Map(plan.properties.map(p=>[p.id,p]));
  const allocation=new Map(plan.allocations.map(a=>[a.inmuebleId,a]));
  for(const a of assignments){
   const p=mapped.get(Number(a.inmueble_id));const numero=Number(a.activa)?allocation.get(p.id).numero:oldPos.get(Number(a.posicion_id));
   const key=p.zona+':'+numero;
   if(!positionIds.has(key)){const [created]=await db.query('INSERT INTO inm_posiciones_zona SET ?',{zona_id:zoneIds.get(p.zona),numero,activo:0});positionIds.set(key,created.insertId);}
   await db.query('INSERT INTO inm_asignaciones_zona SET ?',{...a,posicion_id:positionIds.get(key)});
  }
  for(const a of plan.allocations.filter(a=>!assignments.some(p=>Number(p.inmueble_id)===a.inmuebleId&&Number(p.activa))))await db.query('INSERT INTO inm_asignaciones_zona SET ?',{inmueble_id:a.inmuebleId,posicion_id:positionIds.get(a.zona+':'+a.numero),activa:1});
  await db.query('UPDATE inm_zona_cutover SET activo=1 WHERE id=1');
  const journal={status:'prepared',createdAt:new Date().toISOString(),plan,legacyTablesPreserved:true};
  writeFileSync(dir+'/zones-journal.json',JSON.stringify(journal,null,2)+'\n',{mode:0o600,flag:'wx'});
  await db.commit();
  journal.status='committed';writeFileSync(dir+'/zones-journal.json',JSON.stringify(journal,null,2)+'\n',{mode:0o600});
  manifest.zonesMigration='committed';manifest.sha256['zones-journal.json']=hash(readFileSync(dir+'/zones-journal.json'));writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
  console.log('Adaptación confirmada. Tablas antiguas conservadas; códigos, archivos y fechas originales intactos.');
 }
}catch(error){await db.rollback();throw Error(error.code?`Adaptación detenida (${error.code}); sin confirmar transacción.`:error.message);}finally{if(locked)await db.query("SELECT RELEASE_LOCK('cartera-zonas-v1')");await db.end();}
