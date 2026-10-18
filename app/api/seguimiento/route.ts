import { propertyZoneName, zoneCondition } from "@/lib/zone-scope";
import { workflowDeadline } from '@/lib/workflow-deadline.mjs';
import { databaseBusinessDay } from '@/lib/business-time';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { factsFrom, positioned, readyFile, visitDone } from '@/lib/report-facts';
import { inmInmuebles, inmTasaciones, inmPublicaciones } from '@/db/schema';
export async function GET(request: Request){
 const auth=await authorizeApi();if(auth.response)return auth.response;
 try{
 const params=new URL(request.url).searchParams;
 const oldest=params.get("orden")==="antiguedad";
 const limit=params.get("limite")==="3"?3:params.get("limite")==="2"?2:20;
 const activity=sql`CASE WHEN NOT ${visitDone} THEN 'visita' WHEN ${inmTasaciones.id} IS NULL THEN 'tasacion' WHEN NOT COALESCE(${readyFile},0) THEN 'expediente' ELSE 'publicacion' END`;
 const visitRegistered=sql`(SELECT v.fecha_registro FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1 ORDER BY v.fecha_registro ASC,v.id ASC LIMIT 1)`;
 const start=sql`DATE_FORMAT(CASE WHEN NOT ${visitDone} THEN ${databaseBusinessDay(inmInmuebles.fechaRegistro)} WHEN ${inmTasaciones.id} IS NULL THEN ${databaseBusinessDay(visitRegistered)} WHEN NOT COALESCE(${readyFile},0) THEN ${databaseBusinessDay(inmTasaciones.fechaRegistro)} ELSE ${databaseBusinessDay(inmPublicaciones.fechaRegistro)} END,'%Y-%m-%d')`;
 const order=oldest?sql`(q.inicio IS NULL),q.inicio,q.id`:sql`(COALESCE(s.fecha_limite,DATE_ADD(q.inicio,INTERVAL COALESCE(c.dias,2) DAY)) IS NULL),COALESCE(s.fecha_limite,DATE_ADD(q.inicio,INTERVAL COALESCE(c.dias,2) DAY)),q.id`;
 const [rows]=await db.execute(sql`SELECT q.*, u.nombre responsable, CASE WHEN s.fecha_limite IS NOT NULL THEN 'asignado' ELSE 'automatico' END plazoOrigen, COALESCE(c.dias,2) diasPlazo, DATE_FORMAT(s.fecha_limite,'%Y-%m-%d') fechaLimiteAsignada FROM (SELECT ${inmInmuebles.id} id, ${inmInmuebles.codigo} codigo, ${propertyZoneName} zona, ${inmInmuebles.referencia} nombre, ${inmInmuebles.tipo} tipo, ${inmInmuebles.operacion} operacion, ${inmInmuebles.direccion} direccion, ${inmInmuebles.distrito} distrito, ${inmInmuebles.nombreContacto} propietarioNombres, NULL propietarioApellidos, (SELECT pos.numero FROM inm_asignaciones_zona ap JOIN inm_posiciones_zona pos ON pos.id=ap.posicion_id WHERE ap.inmueble_id=${inmInmuebles.id} AND ap.activa=1 ORDER BY ap.id DESC LIMIT 1) posicion, ${activity} actividad, ${start} inicio ${factsFrom} WHERE ${zoneCondition(request)} AND ${inmInmuebles.estado}='activo' AND ${positioned} AND (COALESCE(${inmPublicaciones.publicado},0)=0 OR NOT COALESCE(${readyFile},0))) q LEFT JOIN inm_seguimiento s ON s.inmueble_id=q.id AND s.actividad=q.actividad LEFT JOIN inm_usuarios u ON u.id=s.responsable_id LEFT JOIN inm_config_alertas c ON c.tipo=q.actividad AND c.activo=1 ORDER BY ${order} LIMIT ${limit}`);
 const items=(rows as unknown as {inicio:string|null;diasPlazo:number;fechaLimiteAsignada:string|null}[]).map(row=>({...row,...workflowDeadline(row.inicio,row.diasPlazo,row.fechaLimiteAsignada)}));
 return NextResponse.json({items});
 }catch{return NextResponse.json({error:'No se pudo consultar la agenda de seguimiento.'},{status:500});}
}
