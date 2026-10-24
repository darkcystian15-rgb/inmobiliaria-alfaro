import { propertyZoneName } from "@/lib/zone-scope";
import { workflowDeadline } from '@/lib/workflow-deadline.mjs';
import { databaseBusinessDay } from '@/lib/business-time';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { factsFrom, positioned, textDoneSql, visitDone } from '@/lib/report-facts';
import { inmInmuebles, inmTasaciones, inmPublicaciones } from '@/db/schema';
export async function workflowTasks(scope: SQL = sql`1=1`) {
 const activity=sql`CASE WHEN NOT ${visitDone} THEN 'visita' WHEN ${inmTasaciones.id} IS NULL THEN 'tasacion' WHEN NOT COALESCE(${textDoneSql},0) THEN 'expediente' ELSE 'publicacion' END`;
 const visitRegistered=sql`(SELECT v.fecha_registro FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1 ORDER BY v.fecha_registro ASC,v.id ASC LIMIT 1)`;
 const start=sql`DATE_FORMAT(CASE WHEN NOT ${visitDone} THEN ${databaseBusinessDay(inmInmuebles.fechaRegistro)} WHEN ${inmTasaciones.id} IS NULL THEN ${databaseBusinessDay(visitRegistered)} WHEN NOT COALESCE(${textDoneSql},0) THEN ${databaseBusinessDay(inmTasaciones.fechaRegistro)} ELSE ${databaseBusinessDay(sql`COALESCE(${inmPublicaciones.fechaTextoRealizado},${inmPublicaciones.fechaRegistro})`)} END,'%Y-%m-%d')`;
 const [rows]=await db.execute(sql`SELECT q.*, CASE WHEN s.fecha_limite IS NOT NULL THEN 'asignado' ELSE 'automatico' END plazoOrigen, COALESCE(c.dias,2) diasPlazo, DATE_FORMAT(s.fecha_limite,'%Y-%m-%d') fechaLimiteAsignada FROM (SELECT ${inmInmuebles.id} id, ${inmInmuebles.codigo} codigo, ${propertyZoneName} zona, ${inmInmuebles.referencia} nombre, ${inmInmuebles.tipo} tipo, ${inmInmuebles.operacion} operacion, ${inmInmuebles.direccion} direccion, ${inmInmuebles.distrito} distrito, ${inmInmuebles.nombreContacto} propietarioNombres, NULL propietarioApellidos, (SELECT pos.numero FROM inm_asignaciones_zona ap JOIN inm_posiciones_zona pos ON pos.id=ap.posicion_id WHERE ap.inmueble_id=${inmInmuebles.id} AND ap.activa=1 ORDER BY ap.id DESC LIMIT 1) posicion, ${activity} actividad, ${start} inicio ${factsFrom} WHERE ${scope} AND ${inmInmuebles.estado}='activo' AND ${positioned} AND COALESCE(${inmPublicaciones.publicado},0)=0) q LEFT JOIN inm_seguimiento s ON s.inmueble_id=q.id AND s.actividad=q.actividad LEFT JOIN inm_config_alertas c ON c.tipo=q.actividad AND c.activo=1`);
 return (rows as unknown as {id:number;zona:string;actividad:string;inicio:string|null;diasPlazo:number;fechaLimiteAsignada:string|null}[]).map(row=>({...row,...workflowDeadline(row.inicio,row.diasPlazo,row.fechaLimiteAsignada)}));
}
