// One-off read-only review; run in the private Vercel build environment.
import mysql from 'mysql2/promise';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '[SENSITIVE]') throw new Error('La conexión privada DATABASE_URL no está disponible.');
const db=await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA||process.env.DATABASE_TLS_REQUIRED==='1'?{ssl:{...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}}:{})});
const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const mentions=value=>/\bdolar(?:es)?\b|\busd\b|us\s*\$|\bdollar(?:s)?\b/.test(normalized(value));
try{
 const [rows]=await db.query(`SELECT i.id inmuebleId,i.nombre_contacto contacto,z.nombre zona,t.id tasacionId,t.observacion,i.observaciones observacionInmueble,t.valor_referencia valorReferencia,t.precio_objetivo precioObjetivo,t.precio_venta precioVenta,t.valor_referencia_moneda valorReferenciaMoneda,t.precio_objetivo_moneda precioObjetivoMoneda,t.precio_venta_moneda precioVentaMoneda FROM inm_inmuebles i LEFT JOIN inm_zonas z ON z.id=i.zona_id LEFT JOIN inm_tasaciones t ON t.inmueble_id=i.id ORDER BY i.id`);
 const [visits]=await db.query('SELECT inmueble_id inmuebleId,observaciones FROM inm_visitas WHERE observaciones IS NOT NULL');
 const candidates=rows.map(row=>({...row,observacionesVisitas:visits.filter(v=>v.inmuebleId===row.inmuebleId&&mentions(v.observaciones)).map(v=>v.observaciones)})).filter(row=>mentions(row.observacion)||mentions(row.observacionInmueble)||row.observacionesVisitas.length);
 console.log('APPRAISAL_REVIEW_SUMMARY '+JSON.stringify({inmuebles:rows.length,tasaciones:rows.filter(row=>row.tasacionId).length,candidatos:candidates.length}));
 for(const row of candidates)console.log('APPRAISAL_REVIEW_CANDIDATE '+JSON.stringify(row));
 const [admins]=await db.query("SELECT id,nombre,usuario,email FROM inm_usuarios WHERE activo=1 AND rol='administrador'");
 console.log('APPRAISAL_REVIEW_ADMINS '+JSON.stringify(admins));
}finally{await db.end();}
