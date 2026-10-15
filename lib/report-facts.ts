import { sql } from 'drizzle-orm';
import { inmInmuebles, inmTasaciones, inmPublicaciones } from '@/db/schema';
export const visitDone=sql`EXISTS(SELECT 1 FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1)`;
export const positioned=sql`EXISTS(SELECT 1 FROM inm_asignaciones_posicion p WHERE p.inmueble_id=${inmInmuebles.id} AND p.activa=1)`;
export const readyFile=sql`(EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=${inmInmuebles.id} AND a.tipo_documento='DNI_PROPIETARIO' AND a.almacenamiento='hosting') AND EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=${inmInmuebles.id} AND a.tipo_documento='TASACION' AND a.almacenamiento='hosting') AND EXISTS(SELECT 1 FROM inm_archivos a JOIN inm_visitas v ON v.id=a.visita_id AND v.inmueble_id=a.inmueble_id AND v.completada=1 WHERE a.inmueble_id=${inmInmuebles.id} AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime LIKE 'image/%') AND LENGTH(TRIM(COALESCE(${inmPublicaciones.texto},'')))>0)`;
export const factsFrom=sql`FROM ${inmInmuebles} LEFT JOIN ${inmTasaciones} ON ${inmTasaciones.inmuebleId}=${inmInmuebles.id} LEFT JOIN ${inmPublicaciones} ON ${inmPublicaciones.inmuebleId}=${inmInmuebles.id}`;
export const reportPredicates:Record<string,ReturnType<typeof sql>>={
 'Cartera activa':sql`${inmInmuebles.estado}='activo'`,
 'Histórico de inmuebles':sql`${inmInmuebles.estado}<>'activo'`,
 'Visitas realizadas':visitDone,
 'Visitas pendientes':sql`${inmInmuebles.estado}='activo' AND ${positioned} AND NOT ${visitDone}`,
 'Tasaciones realizadas':sql`${inmTasaciones.id} IS NOT NULL`,
 'Tasaciones pendientes':sql`${inmInmuebles.estado}='activo' AND ${positioned} AND ${visitDone} AND ${inmTasaciones.id} IS NULL`,
 'Material pendiente':sql`${inmInmuebles.estado}='activo' AND ${inmTasaciones.situacion}='aprobado' AND NOT COALESCE(${readyFile},0)`,
 'Listos para publicar':sql`${inmInmuebles.estado}='activo' AND ${inmPublicaciones.id} IS NOT NULL AND ${inmPublicaciones.publicado}=0 AND ${readyFile}`,
 'Publicados':sql`${inmInmuebles.estado}='activo' AND ${inmPublicaciones.publicado}=1`,
 'Alquilados':sql`EXISTS(SELECT 1 FROM inm_liberaciones l WHERE l.inmueble_id=${inmInmuebles.id} AND l.motivo='alquilado' AND l.confirmado=1 AND l.anulada=0)`,
 'Vendidos':sql`EXISTS(SELECT 1 FROM inm_liberaciones l WHERE l.inmueble_id=${inmInmuebles.id} AND l.motivo='vendido' AND l.confirmado=1 AND l.anulada=0)`,
 'Retirados / cancelados':sql`EXISTS(SELECT 1 FROM inm_liberaciones l WHERE l.inmueble_id=${inmInmuebles.id} AND l.motivo NOT IN ('vendido','alquilado') AND l.confirmado=1 AND l.anulada=0)`,
 'Motivos de liberación':sql`EXISTS(SELECT 1 FROM inm_liberaciones l WHERE l.inmueble_id=${inmInmuebles.id} AND l.confirmado=1 AND l.anulada=0)`,
};
export function reportSummaryQuery(where: ReturnType<typeof sql>, from = factsFrom) {
 return sql`SELECT COUNT(*) total,
 COALESCE(SUM(${inmInmuebles.estado}='activo'),0) activos,
 COALESCE(SUM(${inmInmuebles.estado}<>'activo'),0) historicos,
 COALESCE(SUM(${inmInmuebles.estado}='activo' AND ${positioned} AND NOT ${visitDone}),0) visitasPendientes,
 COALESCE(SUM(${inmInmuebles.estado}='activo' AND ${visitDone}),0) visitasRealizadas,
 COALESCE(SUM(${inmInmuebles.estado}='activo' AND ${positioned} AND ${visitDone} AND ${inmTasaciones.id} IS NULL),0) tasacionesPendientes,
 COALESCE(SUM(${inmInmuebles.estado}='activo' AND ${inmTasaciones.id} IS NOT NULL),0) tasacionesRealizadas,
 COALESCE(SUM(${inmInmuebles.estado}='activo' AND ${inmTasaciones.situacion}='aprobado' AND NOT COALESCE(${readyFile},0)),0) materialPendiente,
 COALESCE(SUM(${inmInmuebles.estado}='activo' AND ${inmPublicaciones.id} IS NOT NULL AND ${inmPublicaciones.publicado}=0 AND ${readyFile}),0) listosParaPublicar,
 COALESCE(SUM(${inmInmuebles.estado}='activo' AND ${inmPublicaciones.publicado}=1),0) publicados
 ${from} WHERE ${where}`;
}
