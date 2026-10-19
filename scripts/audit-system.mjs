// Read-only integrity audit. Prints counts, never credentials or personal data.
import { loadEnvFile } from 'node:process';
import mysql from 'mysql2/promise';
try { loadEnvFile('.env.local'); } catch {}
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? {
    ssl: { ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\\\n/g, '\n') } : {}), rejectUnauthorized: true, verifyIdentity: true },
  } : {}),
});
const checks = {
  operacion_no_valida: "SELECT COUNT(*) total FROM inm_inmuebles WHERE operacion NOT IN ('venta','alquiler')",
  cierre_incompatible_con_operacion: "SELECT COUNT(*) total FROM inm_liberaciones l JOIN inm_inmuebles i ON i.id=l.inmueble_id WHERE l.confirmado=1 AND l.anulada=0 AND ((l.motivo='vendido' AND i.operacion<>'venta') OR (l.motivo='alquilado' AND i.operacion<>'alquiler'))",
  cierres_duplicados: "SELECT COUNT(*) total FROM (SELECT inmueble_id FROM inm_liberaciones WHERE confirmado=1 AND anulada=0 GROUP BY inmueble_id HAVING COUNT(*)>1) a",
  cierres_sin_importe_o_fecha: "SELECT COUNT(*) total FROM inm_liberaciones WHERE confirmado=1 AND anulada=0 AND ((motivo='vendido' AND (fecha_venta IS NULL OR precio_final IS NULL OR precio_final<=0)) OR (motivo='alquilado' AND (fecha_alquiler IS NULL OR renta_mensual IS NULL OR renta_mensual<=0)))",
  tasaciones_anteriores_a_visita: "SELECT COUNT(*) total FROM inm_tasaciones t WHERE t.fecha_tasacion<(SELECT MIN(v.fecha_visita) FROM inm_visitas v WHERE v.inmueble_id=t.inmueble_id AND v.completada=1)",
  tipos_fuera_de_catalogo: "SELECT COUNT(*) total FROM inm_inmuebles i WHERE NOT EXISTS(SELECT 1 FROM inm_tipos_inmueble t WHERE t.nombre=i.tipo)",
  publicados_sin_expediente: `SELECT COUNT(*) total FROM inm_publicaciones p JOIN inm_inmuebles i ON i.id=p.inmueble_id WHERE p.publicado=1 AND (LENGTH(TRIM(COALESCE(p.texto,'')))=0 OR NOT EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=i.id AND (a.tipo_documento IN ('DNI_PROPIETARIO','VENDEDOR_DNI','VENDEDOR_DNI_GERENTE') OR (i.operacion='alquiler' AND a.tipo_documento='ARRENDADOR_DNI')) AND a.almacenamiento='hosting') OR NOT EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=i.id AND a.tipo_documento IN ('TASACION','TASACION_EXPRESS') AND a.almacenamiento='hosting') OR NOT EXISTS(SELECT 1 FROM inm_archivos a JOIN inm_visitas v ON v.id=a.visita_id AND v.inmueble_id=a.inmueble_id AND v.completada=1 WHERE a.inmueble_id=i.id AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime LIKE 'image/%'))`,
  activos_sin_posicion: "SELECT COUNT(*) total FROM inm_inmuebles i WHERE i.estado='activo' AND NOT EXISTS (SELECT 1 FROM inm_asignaciones_zona a WHERE a.inmueble_id=i.id AND a.activa=1)",
  posiciones_con_asignacion_duplicada: "SELECT COUNT(*) total FROM (SELECT posicion_id FROM inm_asignaciones_zona WHERE activa=1 GROUP BY posicion_id HAVING COUNT(*)>1) a",
  inmuebles_con_posicion_duplicada: "SELECT COUNT(*) total FROM (SELECT inmueble_id FROM inm_asignaciones_zona WHERE activa=1 GROUP BY inmueble_id HAVING COUNT(*)>1) a",
  inactivos_con_posicion_activa: "SELECT COUNT(*) total FROM inm_inmuebles i JOIN inm_asignaciones_zona a ON a.inmueble_id=i.id WHERE i.estado<>'activo' AND a.activa=1",
  posicion_de_otra_zona_o_inactiva: "SELECT COUNT(*) total FROM inm_asignaciones_zona a JOIN inm_posiciones_zona p ON p.id=a.posicion_id JOIN inm_inmuebles i ON i.id=a.inmueble_id WHERE a.activa=1 AND (p.zona_id<>i.zona_id OR i.zona_id IS NULL OR p.activo=0)",
  fotos_vinculadas_a_otro_inmueble: "SELECT COUNT(*) total FROM inm_archivos a JOIN inm_visitas v ON v.id=a.visita_id WHERE a.inmueble_id<>v.inmueble_id",
  inmuebles_con_varias_portadas: "SELECT COUNT(*) total FROM (SELECT inmueble_id FROM inm_archivos WHERE es_portada=1 GROUP BY inmueble_id HAVING COUNT(*)>1) a",
  tasaciones_sin_visita_completada: "SELECT COUNT(*) total FROM inm_tasaciones t WHERE NOT EXISTS (SELECT 1 FROM inm_visitas v WHERE v.inmueble_id=t.inmueble_id AND v.completada=1)",
};
// Allowed by the visit workflow, but still requires documentary follow-up.
const pending = {
  visitas_completadas_sin_fotos_vinculadas: "SELECT COUNT(*) total FROM inm_visitas v WHERE v.completada=1 AND NOT EXISTS (SELECT 1 FROM inm_archivos a WHERE a.visita_id=v.id AND a.inmueble_id=v.inmueble_id AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime LIKE 'image/%')",
  contactos_provisionales: "SELECT COUNT(*) total FROM inm_inmuebles WHERE nombre_contacto LIKE '%-FTO'",
};
try {
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  const results = {};
  for (const [name, query] of Object.entries(checks)) {
    const [[row]] = await connection.query(query);
    results[name] = Number(row.total);
  }
  const pendientes = {};
  for (const [name, query] of Object.entries(pending)) {
    const [[row]] = await connection.query(query);
    pendientes[name] = Number(row.total);
  }
  await connection.rollback();
  console.log(JSON.stringify({ comprobado: new Date().toISOString(), integridad: results, pendientes }, null, 2));
  if (Object.values(results).some(total => total > 0)) process.exitCode = 1;
} finally { await connection.end(); }
