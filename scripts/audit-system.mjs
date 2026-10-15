// Read-only integrity audit. Prints counts, never credentials or personal data.
import { loadEnvFile } from 'node:process';
import mysql from 'mysql2/promise';
try { loadEnvFile('.env.local'); } catch {}
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const checks = {
  operacion_no_valida: "SELECT COUNT(*) total FROM inm_inmuebles WHERE operacion NOT IN ('venta','alquiler')",
  cierre_incompatible_con_operacion: "SELECT COUNT(*) total FROM inm_liberaciones l JOIN inm_inmuebles i ON i.id=l.inmueble_id WHERE l.confirmado=1 AND l.anulada=0 AND ((l.motivo='vendido' AND i.operacion<>'venta') OR (l.motivo='alquilado' AND i.operacion<>'alquiler'))",
  cierres_duplicados: "SELECT COUNT(*) total FROM (SELECT inmueble_id FROM inm_liberaciones WHERE confirmado=1 AND anulada=0 GROUP BY inmueble_id HAVING COUNT(*)>1) a",
  cierres_sin_importe_o_fecha: "SELECT COUNT(*) total FROM inm_liberaciones WHERE confirmado=1 AND anulada=0 AND ((motivo='vendido' AND (fecha_venta IS NULL OR precio_final IS NULL OR precio_final<=0)) OR (motivo='alquilado' AND (fecha_alquiler IS NULL OR renta_mensual IS NULL OR renta_mensual<=0)))",
  tasaciones_anteriores_a_visita: "SELECT COUNT(*) total FROM inm_tasaciones t WHERE t.fecha_tasacion<(SELECT MIN(v.fecha_visita) FROM inm_visitas v WHERE v.inmueble_id=t.inmueble_id AND v.completada=1)",
  tipos_fuera_de_catalogo: "SELECT COUNT(*) total FROM inm_inmuebles i WHERE NOT EXISTS(SELECT 1 FROM inm_tipos_inmueble t WHERE t.nombre=i.tipo)",
  publicados_sin_expediente: `SELECT COUNT(*) total FROM inm_publicaciones p JOIN inm_inmuebles i ON i.id=p.inmueble_id LEFT JOIN inm_propietarios o ON o.id=i.propietario_id WHERE p.publicado=1 AND (o.dni IS NULL OR o.dni NOT REGEXP '^[0-9]{8}$' OR LENGTH(TRIM(p.texto))=0 OR NOT EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=i.id AND a.tipo_documento='DNI_PROPIETARIO' AND a.almacenamiento='hosting') OR NOT EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=i.id AND a.tipo_documento='TASACION' AND a.almacenamiento='hosting') OR NOT EXISTS(SELECT 1 FROM inm_archivos a JOIN inm_visitas v ON v.id=a.visita_id AND v.inmueble_id=a.inmueble_id AND v.completada=1 WHERE a.inmueble_id=i.id AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime LIKE 'image/%'))`,
  activos_sin_posicion: "SELECT COUNT(*) total FROM inm_inmuebles i WHERE i.estado='activo' AND NOT EXISTS (SELECT 1 FROM inm_asignaciones_posicion a WHERE a.inmueble_id=i.id AND a.activa=1)",
  posiciones_con_asignacion_duplicada: "SELECT COUNT(*) total FROM (SELECT posicion_id FROM inm_asignaciones_posicion WHERE activa=1 GROUP BY posicion_id HAVING COUNT(*)>1) a",
  inmuebles_con_posicion_duplicada: "SELECT COUNT(*) total FROM (SELECT inmueble_id FROM inm_asignaciones_posicion WHERE activa=1 GROUP BY inmueble_id HAVING COUNT(*)>1) a",
  inactivos_con_posicion_activa: "SELECT COUNT(*) total FROM inm_inmuebles i JOIN inm_asignaciones_posicion a ON a.inmueble_id=i.id WHERE i.estado<>'activo' AND a.activa=1",
  fotos_vinculadas_a_otro_inmueble: "SELECT COUNT(*) total FROM inm_archivos a JOIN inm_visitas v ON v.id=a.visita_id WHERE a.inmueble_id<>v.inmueble_id",
  inmuebles_con_varias_portadas: "SELECT COUNT(*) total FROM (SELECT inmueble_id FROM inm_archivos WHERE es_portada=1 GROUP BY inmueble_id HAVING COUNT(*)>1) a",
  visitas_completadas_sin_fotos_vinculadas: "SELECT COUNT(*) total FROM inm_visitas v WHERE v.completada=1 AND NOT EXISTS (SELECT 1 FROM inm_archivos a WHERE a.visita_id=v.id AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime LIKE 'image/%')",
  tasaciones_sin_visita_completada: "SELECT COUNT(*) total FROM inm_tasaciones t WHERE NOT EXISTS (SELECT 1 FROM inm_visitas v WHERE v.inmueble_id=t.inmueble_id AND v.completada=1)",
  activos_sin_propietario: "SELECT COUNT(*) total FROM inm_inmuebles WHERE estado='activo' AND propietario_id IS NULL",
};
try {
  const results = {};
  for (const [name, query] of Object.entries(checks)) {
    const [[row]] = await connection.query(query);
    results[name] = Number(row.total);
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await connection.end(); }
