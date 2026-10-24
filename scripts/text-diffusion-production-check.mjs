// Read-only business checks and temporary technical identities for browser verification.
import mysql from 'mysql2/promise';
const spec=JSON.parse(process.env.TEXT_DIFFUSION_SMOKE||'{}');
if(!/^[a-f0-9]{16}$/.test(spec.nonce||''))throw new Error('Identificador técnico no válido.');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}}:{})});
try{
 if(process.argv.includes('--create')){
  await db.beginTransaction();try{
   for(const role of ['administrador','operador']){
    if(!/^[a-f0-9]{64}$/.test(spec[role]||''))throw new Error('Hash de sesión no válido.');
    const username=`td-${spec.nonce}-${role}`;const[found]=await db.execute('SELECT id FROM inm_usuarios WHERE usuario=?',[username]);if(found.length)throw new Error('La identidad técnica ya existe.');
    const[user]=await db.execute('INSERT INTO inm_usuarios (nombre,email,usuario,rol,activo) VALUES (?,?,?,?,1)',[`Verificación texto y difusión ${role}`,`${username}@example.invalid`,username,role]);
    await db.execute('INSERT INTO inm_sesiones (token_hash,usuario_id,expira,last_seen,authenticated_at) VALUES (?,?,?,?,?)',[spec[role],user.insertId,new Date(Date.now()+3600000),new Date(),new Date()]);
   }await db.commit();console.log('TEXT_DIFFUSION_TECHNICAL_ACCOUNTS_CREATED 2');
  }catch(error){await db.rollback();throw error;}
 }
 if(process.argv.includes('--cleanup')){
  await db.beginTransaction();try{for(const role of ['administrador','operador']){const[rows]=await db.execute('SELECT id FROM inm_usuarios WHERE usuario=?',[`td-${spec.nonce}-${role}`]);for(const row of rows){await db.execute('DELETE FROM inm_sesiones WHERE usuario_id=?',[row.id]);await db.execute('DELETE FROM inm_borradores WHERE usuario_id=?',[row.id]);await db.execute('DELETE FROM inm_security_audit WHERE actor_id=?',[row.id]);await db.execute('DELETE FROM inm_usuarios WHERE id=?',[row.id]);}}await db.commit();console.log('TEXT_DIFFUSION_TECHNICAL_ACCOUNTS_REMOVED 2');}catch(error){await db.rollback();throw error;}
 }
 const[[summary]]=await db.query('SELECT (SELECT COUNT(*) FROM inm_inmuebles) inmuebles,(SELECT COUNT(*) FROM inm_tasaciones) tasaciones,(SELECT COUNT(*) FROM inm_archivos) archivos,(SELECT COUNT(*) FROM inm_publicaciones) textos,(SELECT COUNT(*) FROM inm_publicaciones WHERE publicado=1) difusionesCompletadas');
 console.log('TEXT_DIFFUSION_BUSINESS_SUMMARY '+JSON.stringify(summary));
}finally{await db.end();}
