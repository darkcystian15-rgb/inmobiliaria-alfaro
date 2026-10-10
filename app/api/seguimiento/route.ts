import { databaseBusinessDay } from '@/lib/business-time';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { factsFrom, positioned, readyFile, visitDone } from '@/lib/report-facts';
import { isDemoProperty } from '@/lib/demo-data';
import { inmInmuebles, inmTasaciones, inmPublicaciones, inmPropietarios } from '@/db/schema';
export async function GET(request: Request){
 const auth=await authorizeApi();if(auth.response)return auth.response;
 try{
 const modo=new URL(request.url).searchParams.get("modo")||"todos";
 if(!["real","demo","todos"].includes(modo))return NextResponse.json({error:"Modo no válido."},{status:400});
 const scope=modo==="todos"?sql`1=1`:modo==="demo"?isDemoProperty:sql`NOT ${isDemoProperty}`;
 const activity=sql`CASE WHEN NOT ${visitDone} THEN 'visita' WHEN ${inmTasaciones.id} IS NULL THEN 'tasacion' WHEN NOT COALESCE(${readyFile},0) THEN 'expediente' ELSE 'publicacion' END`;
 const start=sql`CASE WHEN NOT ${visitDone} THEN ${databaseBusinessDay(inmInmuebles.fechaRegistro)} WHEN ${inmTasaciones.id} IS NULL THEN (SELECT v.fecha_visita FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1 ORDER BY v.fecha_registro DESC LIMIT 1) WHEN NOT COALESCE(${readyFile},0) THEN ${inmTasaciones.fechaTasacion} ELSE ${databaseBusinessDay(inmPublicaciones.fechaRegistro)} END`;
 const [rows]=await db.execute(sql`SELECT q.*, u.nombre responsable, CASE WHEN s.fecha_limite IS NOT NULL THEN 'asignado' ELSE 'automatico' END plazoOrigen, DATE_FORMAT(COALESCE(s.fecha_limite,DATE_ADD(q.inicio,INTERVAL COALESCE(c.dias,2) DAY)),'%Y-%m-%d') fechaLimite FROM (SELECT ${inmInmuebles.id} id, ${inmInmuebles.codigo} codigo, ${inmInmuebles.referencia} nombre, ${inmInmuebles.tipo} tipo, ${inmInmuebles.distrito} distrito, ${inmPropietarios.nombres} propietarioNombres, ${inmPropietarios.apellidos} propietarioApellidos, (SELECT pos.numero FROM inm_asignaciones_posicion ap JOIN inm_posiciones pos ON pos.id=ap.posicion_id WHERE ap.inmueble_id=${inmInmuebles.id} AND ap.activa=1 ORDER BY ap.id DESC LIMIT 1) posicion, ${activity} actividad, ${start} inicio ${factsFrom} WHERE ${inmInmuebles.estado}='activo' AND ${positioned} AND ${scope} AND (COALESCE(${inmPublicaciones.publicado},0)=0 OR NOT COALESCE(${readyFile},0))) q LEFT JOIN inm_seguimiento s ON s.inmueble_id=q.id AND s.actividad=q.actividad LEFT JOIN inm_usuarios u ON u.id=s.responsable_id LEFT JOIN inm_config_alertas c ON c.tipo=q.actividad AND c.activo=1 ORDER BY (COALESCE(s.fecha_limite,DATE_ADD(q.inicio,INTERVAL COALESCE(c.dias,2) DAY)) IS NULL),COALESCE(s.fecha_limite,DATE_ADD(q.inicio,INTERVAL COALESCE(c.dias,2) DAY)),q.id LIMIT 20`);
 return NextResponse.json({items:rows});
 }catch{return NextResponse.json({error:'No se pudo consultar la agenda de seguimiento.'},{status:500});}
}
