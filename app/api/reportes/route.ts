import { textDone } from "@/lib/diffusion.mjs";
import { formatPrice } from "@/lib/prices.mjs";
import { reportCatalog } from '@/lib/report-catalog.mjs';
import { workflowTasks } from '@/lib/workflow-tasks';
import { inReportPeriod } from '@/lib/report-period.mjs';
import { propertyZoneName, zoneCondition, positionZoneCondition } from "@/lib/zone-scope";
import { propertyAddress } from "@/lib/property-address.mjs";
import { databaseBusinessDay, databaseInstant } from '@/lib/business-time';
import { reportPeriodField, validCalendarDate } from '@/lib/report-period.mjs';
import { factsFrom, reportPredicates, reportSummaryQuery } from '@/lib/report-facts';
import { publicationReadiness } from "@/lib/publication-readiness";
import type { ReportRow } from "@/lib/report-types";
import { authorizeApi } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmLiberaciones,
  inmNegociaciones,
  inmPosiciones,
  inmPublicaciones,
  inmTasaciones,
  inmTimeline,
  inmVisitas,
} from "@/db/schema";

const tipoMap: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  local: "Local",
  oficina: "Oficina",
  otros: "Otros",
};

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return null;

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function daysBetween(
  a?: Date | string | null,
  b?: Date | string | null,
) {
  if (!a || !b) return null;

  const diff = new Date(b).getTime() - new Date(a).getTime();

  if (!Number.isFinite(diff)) return null;

  return Math.max(0, Math.round(diff / 86400000));
}

function normalizarTipo(value: string | null | undefined) {
  if (!value) return "Otros";
  return tipoMap[value.toLowerCase()] ?? value;
}

function esActivo(estado: string | null | undefined) {
  return estado?.toLowerCase() === "activo";
}

function esTasacionAprobada(
  situacion: string | null | undefined,
) {
  return ["aprobado", "aprobada"].includes(
    situacion?.toLowerCase() ?? "",
  );
}

function esTasacionRechazada(
  situacion: string | null | undefined,
) {
  return ["rechazado", "rechazada", "tasacion_rechazada"].includes(
    situacion?.toLowerCase() ?? "",
  );
}

function agregarSituaciones(item: {
  visitaPendiente: boolean;
  tasacionPendiente: boolean;
  aprobacionPendiente: boolean;
  materialPendiente: boolean;
  negociacionEnCurso: boolean;
  listoParaPublicar: boolean;
  publicado: boolean;
}) {
  const situaciones: string[] = [];

  if (item.visitaPendiente) situaciones.push("Visita pendiente");
  if (item.tasacionPendiente) situaciones.push("Tasación pendiente");
  if (item.aprobacionPendiente) {
    situaciones.push("Pendiente de aprobación");
  }
  if (item.materialPendiente) situaciones.push("Texto pendiente");
  if (item.negociacionEnCurso) situaciones.push("En negociación");
  if (item.listoParaPublicar) situaciones.push("Difusión pendiente");
  if (item.publicado) situaciones.push("Difusión completada");

  return situaciones;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    const sp = request.nextUrl.searchParams;

    const aliases:Record<string,string>={"Material pendiente":"Texto pendiente","Listos para publicar":"Difusión pendiente","Publicados":"Difusión completada"};
    const requested=sp.get("reporte")||"Cartera activa";
    const reporte=aliases[requested]||requested;
    if(!reportCatalog.some(report=>report.nombre===reporte))return NextResponse.json({error:'Reporte no válido.'},{status:400});
    const plazo=sp.get('plazo')||'Todos';
    if(!['Todos','Vencido','Vence hoy','En plazo'].includes(plazo))return NextResponse.json({error:'Estado de plazo no válido.'},{status:400});
    const desde = sp.get("desde") || "";
    const hasta = sp.get("hasta") || "";
    const oldSituation=sp.get("situacion")||"Todas";
    const situacion=({"Material pendiente":"Texto pendiente","Listo para publicar":"Difusión pendiente","Publicado":"Difusión completada"} as Record<string,string>)[oldSituation]||oldSituation;
    const estado = sp.get("estado") || "Todos";
    const posicionFiltro = sp.get("posicion") || "";
    const operacion = sp.get("operacion") || "Todos";
    if (!["Todos", "venta", "alquiler"].includes(operacion)) return NextResponse.json({error:"Operación no válida."},{status:400});
    const tipo = sp.get("tipo") || "Todos";
    if(!['Todos','Activo','Histórico'].includes(estado)||!['Todas','Visita pendiente','Tasación pendiente','Texto pendiente','Difusión pendiente','Difusión completada'].includes(situacion))return NextResponse.json({error:'Estado o actividad no válidos.'},{status:400});
    if(posicionFiltro&&(!Number.isSafeInteger(Number(posicionFiltro))||Number(posicionFiltro)<1||Number(posicionFiltro)>999999))return NextResponse.json({error:'Posición no válida.'},{status:400});

    if ((desde && !validCalendarDate(desde)) || (hasta && !validCalendarDate(hasta)) || (desde && hasta && desde > hasta)) return NextResponse.json({error:'Indica un período válido, con Desde anterior o igual a Hasta.'},{status:400});
    const all=sp.get('todos')==='1';
    const page=Number(sp.get('pagina')||1),pageSize=50;
    if(!Number.isSafeInteger(page)||page<1)return NextResponse.json({error:'Página no válida.'},{status:400});
    const periodField=reportPeriodField(reporte);
    if(reporte==='Posiciones disponibles'){
      const scope=and(eq(inmPosiciones.activo,true),positionZoneCondition(request),sql`NOT EXISTS(SELECT 1 FROM inm_asignaciones_zona a WHERE a.posicion_id=${inmPosiciones.id} AND a.activa=1)`,...(posicionFiltro?[eq(inmPosiciones.numero,Number(posicionFiltro))]:[]))!;
      const [result]=await db.execute(sql`SELECT COUNT(*) total FROM ${inmPosiciones} WHERE ${scope}`);
      const total=Number((result as unknown as {total:number}[])[0].total);
      if(all&&total>10000)return NextResponse.json({error:'Reduce la zona o posición para descargar como máximo 10 000 posiciones.'},{status:400});
      const rows=await db.select({zona:sql<string>`(SELECT z.nombre FROM inm_zonas z WHERE z.id=${inmPosiciones.zonaId})`,posicion:inmPosiciones.numero,estado:sql<string>`'Disponible'`}).from(inmPosiciones).where(scope).orderBy(asc(inmPosiciones.zonaId),asc(inmPosiciones.numero)).limit(all?10000:pageSize).offset(all?0:(page-1)*pageSize);
      return NextResponse.json({ok:true,reporte,rows,resumen:{total,activos:0,historicos:0,disponibles:total,visitasPendientes:0,visitasRealizadas:0,tasacionesPendientes:0,tasacionesRealizadas:0,materialPendiente:0,listosParaPublicar:0,publicados:0,aprobaciones:0,negociaciones:0},paginacion:{pagina:page,tamano:pageSize,total,paginas:Math.ceil(total/pageSize)},fechaFiltro:null});
    }
    const withDeadline=reporte==='Alertas de actividades'||plazo!=='Todos';
    const pending=withDeadline?await workflowTasks(zoneCondition(request)):[];
    const deadlineMatch=pending.filter(task=>(plazo==='Todos'||task.estadoPlazo===({'Vencido':'vencido','Vence hoy':'vence_hoy','En plazo':'en_plazo'}[plazo]))&&(reporte!=='Alertas de actividades'||inReportPeriod(task.fechaLimite,desde,hasta,true)));

    const flowStarts:Record<string,string>={'Registro → visita':'inmueble_registrado','Visita → tasación':'visita_realizada','Tasación → publicación':'tasacion_realizada','Tasación → aprobación':'tasacion_realizada'};
    const periods:Record<string,ReturnType<typeof sql>>={
      fechaInicioFlujo:sql`(SELECT DATE(DATE_SUB(t.fecha_evento, INTERVAL (TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),NOW()) + 18000) SECOND)) FROM inm_timeline t WHERE t.inmueble_id=${inmInmuebles.id} AND t.evento=${flowStarts[reporte]??""} ORDER BY t.fecha_evento,t.id LIMIT 1)`,
      fechaRegistro:databaseBusinessDay(inmInmuebles.fechaRegistro),
      fechaSalida:sql`DATE(DATE_SUB(${inmInmuebles.fechaSalida}, INTERVAL 5 HOUR))`,
      fechaAlquiler:sql`(SELECT l.fecha_alquiler FROM inm_liberaciones l WHERE l.inmueble_id=${inmInmuebles.id} AND l.motivo='alquilado' AND l.confirmado=1 AND l.anulada=0 ORDER BY l.id DESC LIMIT 1)`,
      fechaVenta:sql`(SELECT l.fecha_venta FROM inm_liberaciones l WHERE l.inmueble_id=${inmInmuebles.id} AND l.motivo='vendido' AND l.confirmado=1 AND l.anulada=0 ORDER BY l.id DESC LIMIT 1)`,
      fechaVisita:sql`(SELECT v.fecha_visita FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1 ORDER BY v.fecha_registro DESC,v.id DESC LIMIT 1)`,
      fechaTasacion:sql`${inmTasaciones.fechaTasacion}`,
      fechaPublicacion:sql`DATE(DATE_SUB(${inmPublicaciones.fechaPublicacion}, INTERVAL 5 HOUR))`,
      fechaInicioPosicion:sql`(SELECT DATE(DATE_SUB(p.fecha_inicio, INTERVAL (TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),NOW()) + 18000) SECOND)) FROM inm_asignaciones_zona p WHERE p.inmueble_id=${inmInmuebles.id} ORDER BY p.fecha_inicio DESC LIMIT 1)`,
    };
    const conditions=[zoneCondition(request)];
    if(withDeadline)conditions.push(deadlineMatch.length?inArray(inmInmuebles.id,deadlineMatch.map(task=>task.id)):sql`0=1`);
    if(desde&&periodField!=='fechaLimite')conditions.push(sql`${periods[periodField]} >= ${desde}`);
    if(hasta&&periodField!=='fechaLimite')conditions.push(sql`${periods[periodField]} <= ${hasta}`);
    if(estado==='Activo')conditions.push(eq(inmInmuebles.estado,'activo'));
    if(estado==='Histórico')conditions.push(sql`${inmInmuebles.estado}<>'activo'`);
    if(operacion!=='Todos')conditions.push(eq(inmInmuebles.operacion,operacion));
    if(tipo!=='Todos')conditions.push(eq(inmInmuebles.tipo,tipo));
    if(posicionFiltro){const position=Number(posicionFiltro);if(!Number.isSafeInteger(position)||position<1||position>999999)return NextResponse.json({error:'Posición no válida.'},{status:400});conditions.push(sql`(SELECT p.numero FROM inm_asignaciones_zona a JOIN inm_posiciones_zona p ON p.id=a.posicion_id WHERE a.inmueble_id=${inmInmuebles.id} ORDER BY a.activa DESC,a.fecha_inicio DESC,a.id DESC LIMIT 1)=${position}`);}
    if(flowStarts[reporte])conditions.push(sql`EXISTS(SELECT 1 FROM inm_timeline t WHERE t.inmueble_id=${inmInmuebles.id} AND t.evento=${flowStarts[reporte]})`);
    if(reportPredicates[reporte])conditions.push(reportPredicates[reporte]);
    const situationReports:Record<string,string>={'Visita pendiente':'Visitas pendientes','Tasación pendiente':'Tasaciones pendientes','Texto pendiente':'Texto pendiente','Difusión pendiente':'Difusión pendiente','Difusión completada':'Difusión completada'};
    if(situacion!=='Todas'&&situationReports[situacion])conditions.push(reportPredicates[situationReports[situacion]]);
    const where=and(...conditions)??sql`1=1`;
    const [countResult]=await db.execute(sql`SELECT COUNT(*) total ${factsFrom} WHERE ${where}`);
    const count=Number((countResult as unknown as {total:number}[])[0]?.total??0);
    if(all&&count>10000)return NextResponse.json({error:'La descarga supera 10 000 inmuebles. Reduce el período o los filtros.'},{status:400});
    const [summaryResult]=await db.execute(reportSummaryQuery(where));
    const filteredSummary=Object.fromEntries(Object.entries((summaryResult as unknown as Record<string,unknown>[])[0]??{}).map(([key,value])=>[key,Number(value)]));
    if(reporte==='Posición ocupada'){
      const positionConditions=[zoneCondition(request)];
      if(withDeadline)positionConditions.push(deadlineMatch.length?inArray(inmInmuebles.id,deadlineMatch.map(task=>task.id)):sql`0=1`);
      if(desde)positionConditions.push(sql`${databaseBusinessDay(inmAsignacionesPosicion.fechaInicio)} >= ${desde}`);
      if(hasta)positionConditions.push(sql`${databaseBusinessDay(inmAsignacionesPosicion.fechaInicio)} <= ${hasta}`);
      if(estado==='Activo')positionConditions.push(eq(inmInmuebles.estado,'activo'));
      if(estado==='Histórico')positionConditions.push(sql`${inmInmuebles.estado}<>'activo'`);
      if(operacion!=='Todos')positionConditions.push(eq(inmInmuebles.operacion,operacion));
      if(tipo!=='Todos')positionConditions.push(eq(inmInmuebles.tipo,tipo));
      if(posicionFiltro)positionConditions.push(eq(inmPosiciones.numero,Number(posicionFiltro)));
      if(situacion!=='Todas'&&situationReports[situacion])positionConditions.push(reportPredicates[situationReports[situacion]]);
      const positionWhere=and(...positionConditions)??sql`1=1`;
      const positionFrom=sql`${factsFrom} INNER JOIN ${inmAsignacionesPosicion} ON ${inmAsignacionesPosicion.inmuebleId}=${inmInmuebles.id} INNER JOIN ${inmPosiciones} ON ${inmPosiciones.id}=${inmAsignacionesPosicion.posicionId}`;
      const [positionSummaryResult]=await db.execute(reportSummaryQuery(positionWhere, positionFrom));
      const positionSummary=Object.fromEntries(Object.entries((positionSummaryResult as unknown as Record<string,unknown>[])[0]??{}).map(([key,value])=>[key,Number(value)]));
      const [positionCountResult]=await db.execute(sql`SELECT COUNT(*) total ${positionFrom} WHERE ${positionWhere}`);
      const total=Number((positionCountResult as unknown as {total:number}[])[0]?.total??0);
      if(all&&total>10000)return NextResponse.json({error:'Reduce el período o los filtros para descargar como máximo 10 000 asignaciones.'},{status:400});
      const [positionData]=await db.execute(sql`SELECT ${inmInmuebles.id} inmuebleId,${propertyZoneName} zona,${inmInmuebles.codigo} codigo,${inmInmuebles.referencia} nombre,${inmInmuebles.direccion} direccion,${inmInmuebles.distrito} distrito,${inmInmuebles.provincia} provincia,${inmInmuebles.departamento} departamento,${inmInmuebles.tipo} tipo,${inmInmuebles.operacion} operacion,${inmInmuebles.nombreContacto} propietario,${inmPosiciones.numero} posicion,IF(${inmInmuebles.estado}='activo','Activo','Histórico') estado,${databaseInstant(inmAsignacionesPosicion.fechaInicio)} fechaInicioPosicion,${inmAsignacionesPosicion.fechaFin} fechaFinPosicion,${inmAsignacionesPosicion.activa} activaPosicion ${positionFrom} WHERE ${positionWhere} ORDER BY ${inmAsignacionesPosicion.fechaInicio},${inmAsignacionesPosicion.id} LIMIT ${all?10000:pageSize} OFFSET ${all?0:(page-1)*pageSize}`);
      const [available]=await db.execute(sql`SELECT COUNT(*) total FROM inm_posiciones_zona p WHERE p.activo=1 AND ${new URL(request.url).searchParams.get("zona") && new URL(request.url).searchParams.get("zona")!=="*" ? sql`p.zona_id=(SELECT id FROM inm_zonas WHERE nombre=${new URL(request.url).searchParams.get("zona")})`:sql`1=1`} AND NOT EXISTS(SELECT 1 FROM inm_asignaciones_zona a WHERE a.posicion_id=p.id AND a.activa=1)`);
      return NextResponse.json({ok:true,reporte,rows:(positionData as unknown as Record<string,unknown>[]).map(row=>({...row,ubicacion:propertyAddress(row),activaPosicion:Boolean(row.activaPosicion)})),resumen:{...positionSummary,total,disponibles:Number((available as unknown as {total:number}[])[0]?.total??0),aprobaciones:0,negociaciones:0},paginacion:{pagina:page,tamano:pageSize,total,paginas:Math.ceil(total/pageSize)},fechaFiltro:periodField});
    }
    const reportOrder=reporte==='Alertas de actividades'&&deadlineMatch.length?sql`FIELD(${inmInmuebles.id},${sql.join([...deadlineMatch].sort((a,b)=>String(a.fechaLimite||'9999').localeCompare(String(b.fechaLimite||'9999'))||a.id-b.id).map(task=>sql`${task.id}`),sql`,`)})`:inmInmuebles.fechaRegistro;
    const inmuebleRows = await db
      .select({
        id: inmInmuebles.id,
        codigo: inmInmuebles.codigo,
        referencia: inmInmuebles.referencia,
        zona:propertyZoneName,
        tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
        estado: inmInmuebles.estado,
        fechaRegistro: databaseInstant(inmInmuebles.fechaRegistro),
        fechaSalida: inmInmuebles.fechaSalida,
        direccion: inmInmuebles.direccion,

        distrito: inmInmuebles.distrito,
        provincia: inmInmuebles.provincia,
        departamento: inmInmuebles.departamento,
        propietario: inmInmuebles.nombreContacto,
        propietarioApellidos: sql<string>`NULL`,
      })
      .from(inmInmuebles)

      .leftJoin(inmTasaciones,eq(inmTasaciones.inmuebleId,inmInmuebles.id))
      .leftJoin(inmPublicaciones,eq(inmPublicaciones.inmuebleId,inmInmuebles.id))
      .where(where)
      .orderBy(asc(reportOrder),asc(inmInmuebles.id))
      .limit(all ? 10000 : pageSize).offset(all ? 0 : (page-1)*pageSize);

    const ids=inmuebleRows.map(item=>item.id);
    const deadlines=withDeadline?pending:ids.length?await workflowTasks(inArray(inmInmuebles.id,ids)):[];
    const deadlinesById=new Map(deadlines.map(task=>[task.id,task]));
    const positionRows = await db
      .select({
        inmuebleId: inmAsignacionesPosicion.inmuebleId,
        posicion: inmPosiciones.numero,
        activa: inmAsignacionesPosicion.activa,
        fechaInicio: databaseInstant(inmAsignacionesPosicion.fechaInicio),
        fechaFin: inmAsignacionesPosicion.fechaFin,
      })
      .from(inmAsignacionesPosicion)
      .leftJoin(
        inmPosiciones,
        eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId),
      )
      .where(ids.length?inArray(inmAsignacionesPosicion.inmuebleId,ids):sql`0=1`)
      .orderBy(
        asc(inmAsignacionesPosicion.fechaInicio),asc(inmAsignacionesPosicion.id),
      );

    const positionAvailability = await db.select({ zona: sql<string>`(SELECT z.nombre FROM inm_zonas z WHERE z.id=${inmPosiciones.zonaId})`, numero: inmPosiciones.numero, assigned: inmAsignacionesPosicion.id })
      .from(inmPosiciones).leftJoin(inmAsignacionesPosicion, and(
        eq(inmAsignacionesPosicion.posicionId, inmPosiciones.id), eq(inmAsignacionesPosicion.activa, true),
      )).where(and(eq(inmPosiciones.activo, true),positionZoneCondition(request)));
    const availablePositions = positionAvailability.filter(position => position.assigned == null);

    const visitas = await db
      .select()
      .from(inmVisitas)
      .where(and(eq(inmVisitas.completada,true),ids.length?inArray(inmVisitas.inmuebleId,ids):sql`0=1`))
      .orderBy(desc(inmVisitas.fechaRegistro),desc(inmVisitas.id));

    const expedientes = await publicationReadiness(db, ids);

    const tasaciones = await db
      .select()
      .from(inmTasaciones)
      .where(ids.length?inArray(inmTasaciones.inmuebleId,ids):sql`0=1`)
      .orderBy(desc(inmTasaciones.fechaRegistro));

    const publicaciones = await db
      .select()
      .from(inmPublicaciones)
      .where(ids.length?inArray(inmPublicaciones.inmuebleId,ids):sql`0=1`)
      .orderBy(desc(inmPublicaciones.fechaRegistro));

    const negociaciones = await db
      .select()
      .from(inmNegociaciones)
      .where(ids.length?inArray(inmNegociaciones.inmuebleId,ids):sql`0=1`)
      .orderBy(desc(inmNegociaciones.fechaRegistro));

    const liberaciones = await db
      .select()
      .from(inmLiberaciones)
      .where(and(ids.length?inArray(inmLiberaciones.inmuebleId,ids):sql`0=1`,eq(inmLiberaciones.confirmado,true),eq(inmLiberaciones.anulada,false)))
      .orderBy(desc(inmLiberaciones.fechaRegistro));

    const timeline = await db
      .select({id:inmTimeline.id,inmuebleId:inmTimeline.inmuebleId,evento:inmTimeline.evento,fechaEvento:databaseInstant(inmTimeline.fechaEvento)})
      .from(inmTimeline)
      .where(ids.length?inArray(inmTimeline.inmuebleId,ids):sql`0=1`)
      .orderBy(asc(inmTimeline.fechaEvento),asc(inmTimeline.id));

    const posByInmueble = new Map<
      number,
      typeof positionRows
    >();

    for (const position of positionRows) {
      const arr = posByInmueble.get(position.inmuebleId) || [];
      arr.push(position);
      posByInmueble.set(position.inmuebleId, arr);
    }

    const visitaByInmueble = new Map<number, (typeof visitas)[number]>();

    for (const visita of visitas) {
      if (!visitaByInmueble.has(visita.inmuebleId)) {
        visitaByInmueble.set(visita.inmuebleId, visita);
      }
    }

    const tasacionByInmueble = new Map<
      number,
      (typeof tasaciones)[number]
    >();

    for (const tasacion of tasaciones) {
      if (!tasacionByInmueble.has(tasacion.inmuebleId)) {
        tasacionByInmueble.set(tasacion.inmuebleId, tasacion);
      }
    }

    const publicacionByInmueble = new Map<
      number,
      (typeof publicaciones)[number]
    >();

    for (const publicacion of publicaciones) {
      if (!publicacionByInmueble.has(publicacion.inmuebleId)) {
        publicacionByInmueble.set(
          publicacion.inmuebleId,
          publicacion,
        );
      }
    }

    const negociacionByInmueble = new Map<
      number,
      (typeof negociaciones)[number]
    >();

    for (const negociacion of negociaciones) {
      if (!negociacionByInmueble.has(negociacion.inmuebleId)) {
        negociacionByInmueble.set(
          negociacion.inmuebleId,
          negociacion,
        );
      }
    }

    const liberacionByInmueble = new Map<
      number,
      (typeof liberaciones)[number]
    >();

    for (const liberacion of liberaciones) {
      if (!liberacionByInmueble.has(liberacion.inmuebleId)) {
        liberacionByInmueble.set(
          liberacion.inmuebleId,
          liberacion,
        );
      }
    }

    const timelineByInmueble = new Map<
      number,
      typeof timeline
    >();

    for (const event of timeline) {
      const arr =
        timelineByInmueble.get(event.inmuebleId) || [];

      arr.push(event);
      timelineByInmueble.set(event.inmuebleId, arr);
    }

    const base = inmuebleRows.map((x) => {
      const positions = posByInmueble.get(x.id) || [];

      const activePosition = positions.find(
        (position) => position.activa,
      );

      const latestPosition =
        positions.length > 0
          ? positions[positions.length - 1]
          : null;

      const visita = visitaByInmueble.get(x.id);
      const tasacion = tasacionByInmueble.get(x.id);
      const publicacion = publicacionByInmueble.get(x.id);
      const negociacion = negociacionByInmueble.get(x.id);
      const liberacion = liberacionByInmueble.get(x.id);

      const task=deadlinesById.get(x.id);
      const activo = esActivo(x.estado);

      const visitaRealizada = Boolean(
        visita?.completada,
      );

      const visitaPendiente =
        activo && Boolean(activePosition) && !visitaRealizada;

      const tasacionPendiente =
        activo &&
        Boolean(activePosition) &&
        visitaRealizada &&
        !tasacion;

      const aprobacionPendiente =
        activo &&
        Boolean(
          tasacion &&
            tasacion.situacion?.toLowerCase() ===
              "pendiente_aprobacion",
        );

      const materialPendiente =
        activo &&
        esTasacionAprobada(tasacion?.situacion) &&
        !publicacion?.publicado && !textDone(publicacion);

      const negociacionEnCurso =
        activo &&
        negociacion?.estado?.toLowerCase() ===
          "en_curso";

      const listoParaPublicar =
        activo &&
        Boolean(
          publicacion &&
            !publicacion.publicado && textDone(publicacion),
        );

      const publicado =
        activo &&
        Boolean(publicacion?.publicado);

      const situaciones = agregarSituaciones({
        visitaPendiente,
        tasacionPendiente,
        aprobacionPendiente,
        materialPendiente,
        negociacionEnCurso,
        listoParaPublicar,
        publicado,
      });

      const fechaVisita =
        visita?.fechaVisita ??
        visita?.fechaCompletada ??
        null;

      return {
        inmuebleId: x.id,
        actividadPendiente:task?.actividad??null,
        fechaLimite:task?.fechaLimite??null,
        estadoPlazo:task?.estadoPlazo??null,
        diasRetraso:task?.diasRetraso??null,
        plazoOrigen:task?(task.fechaLimiteAsignada?'Particular':'General'):null,
        codigo: x.codigo,
        nombre: x.referencia,
        zona:x.zona,
        tipo: normalizarTipo(x.tipo),
        operacion: x.operacion === "alquiler" ? "Alquiler" : "Venta",
        rentaMensualSolicitada: x.operacion === "alquiler" ? tasacion?.precioVenta ? formatPrice(tasacion.precioVenta, tasacion.precioVentaMoneda) : null : null,
        direccion: x.direccion,
        ubicacion: propertyAddress(x),
        propietario:
          [
            x.propietario,
            x.propietarioApellidos,
          ]
            .filter(Boolean)
            .join(" ") || "Sin contacto",
        posicion:
          activePosition?.posicion ??
          latestPosition?.posicion ??
          null,
        estado: activo ? "Activo" : "Histórico",

        visitaRealizada,
        visitaPendiente,
        fechaVisita: fechaVisita ? new Date(fechaVisita).toISOString().slice(0,10) : null,

        tasacionRegistrada: Boolean(tasacion),
        tasacionPendiente,
        fechaTasacion: tasacion?.fechaTasacion ? new Date(tasacion.fechaTasacion).toISOString().slice(0,10) : null,
        tasacion: tasacion && x.operacion !== "alquiler" ? (tasacion.precioObjetivo ? formatPrice(tasacion.precioObjetivo, tasacion.precioObjetivoMoneda) : tasacion.valorReferencia ? formatPrice(tasacion.valorReferencia, tasacion.valorReferenciaMoneda) : null) : null,
        situacionTasacion:
          tasacion?.situacion ?? null,
        aprobacionPendiente,
        tasacionAprobada:
          esTasacionAprobada(
            tasacion?.situacion,
          ),
        tasacionRechazada:
          esTasacionRechazada(
            tasacion?.situacion,
          ),

        materialPendiente,

        negociacionEnCurso,
        estadoNegociacion:
          negociacion?.estado ?? null,

        publicacionRegistrada:
          Boolean(publicacion),
        listoParaPublicar,
        publicado,
        fechaPublicacion: fmtDate(
          publicacion?.fechaPublicacion,
        ),

        situaciones,

        fechaRegistro: fmtDate(
          x.fechaRegistro,
        ),
        fechaSalida: fmtDate(
          x.fechaSalida,
        ),

        motivoLiberacion:
          liberacion?.motivo ?? null,
        fechaVenta: liberacion?.fechaVenta ? new Date(liberacion.fechaVenta).toISOString().slice(0,10) : null,
        precioFinal: liberacion?.precioFinal ?? null,
        fechaAlquiler: liberacion?.fechaAlquiler ?? null,
        rentaMensual: liberacion?.rentaMensual ?? null,
        garantia: liberacion?.garantia ?? null,
        adelanto: liberacion?.adelanto ?? null,
        fechaInicioAlquiler: liberacion?.fechaInicioAlquiler ?? null,
        fechaFinAlquiler: liberacion?.fechaFinAlquiler ?? null,
        comision: liberacion?.comision ?? null,
        expedientePendiente: expedientes.get(x.id)?.missing ?? [],
        detalleLiberacion:
          liberacion?.detalleOtro ?? null,
      };
    });

    const filtered = base.filter((x) => {
      if (
        situacion !== "Todas" &&
        !x.situaciones.includes(situacion)
      ) {
        return false;
      }

      if (
        estado !== "Todos" &&
        x.estado !== estado
      ) {
        return false;
      }

      if (
        posicionFiltro &&
        String(x.posicion) !==
          posicionFiltro.replace(/^0+/, "")
      ) {
        return false;
      }

      if (
        tipo !== "Todos" &&
        x.tipo !== normalizarTipo(tipo)
      ) {
        return false;
      }

      return true;
    });

    const active = filtered.filter(
      (x) => x.estado === "Activo",
    );

    let rows: ReportRow[] = filtered;

    if (reporte === "Visitas realizadas") {
      rows = filtered.filter(
        (x) => x.visitaRealizada,
      );
    } else if (
      reporte === "Visitas pendientes"
    ) {
      rows = filtered.filter(
        (x) => x.visitaPendiente,
      );
    } else if (
      reporte === "Tasaciones realizadas"
    ) {
      rows = filtered.filter(
        (x) => x.tasacionRegistrada,
      );
    } else if (
      reporte === "Tasaciones pendientes"
    ) {
      rows = filtered.filter(
        (x) => x.tasacionPendiente,
      );
    } else if (
      reporte === "Aprobaciones pendientes"
    ) {
      rows = filtered.filter(
        (x) => x.aprobacionPendiente,
      );
    } else if (
      reporte === "Negociaciones"
    ) {
      rows = filtered.filter(
        (x) => x.negociacionEnCurso,
      );
    } else if (
      reporte === "Aprobaciones y negociación"
    ) {
      rows = filtered.filter(
        (x) =>
          x.aprobacionPendiente ||
          x.negociacionEnCurso ||
          x.tasacionAprobada ||
          x.tasacionRechazada,
      );
    } else if (
      reporte === "Texto pendiente"
    ) {
      rows = filtered.filter(
        (x) => x.materialPendiente,
      );
    } else if (
      reporte === "Difusión pendiente"
    ) {
      rows = filtered.filter(
        (x) => x.listoParaPublicar,
      );
    } else if (
      reporte === "Difusión completada"
    ) {
      rows = filtered.filter(
        (x) => x.publicado,
      );
    } else if (
      reporte === "Alquilados"
    ) {
      rows = filtered.filter(x => x.motivoLiberacion === "alquilado");
    } else if (
      reporte === "Vendidos"
    ) {
      rows = filtered.filter(
        (x) => x.motivoLiberacion === "vendido",
      );
    } else if (
      reporte === "Retirados / cancelados"
    ) {
      rows = filtered.filter(
        (x) =>
          Boolean(x.motivoLiberacion)&&!['vendido','alquilado'].includes(x.motivoLiberacion||''),
      );
    } else if (
      reporte === "Motivos de liberación"
    ) {
      rows = filtered.filter(
        (x) => Boolean(x.motivoLiberacion),
      );
    } else if (
      reporte === "Tiempo de permanencia"
    ) {
      rows = filtered.map((x) => ({
        ...x,
        dias:
          daysBetween(
            x.fechaRegistro,
            x.fechaSalida,
          ) ??
          daysBetween(
            x.fechaRegistro,
            new Date(),
          ),
      }));
    } else if (
      reporte === "Posición ocupada"
    ) {
      rows = positionRows
        .map((position) => {
          const x = base.find(
            (item) =>
              item.inmuebleId ===
              position.inmuebleId,
          );

          if (!x) return null;

          if (
            posicionFiltro &&
            String(position.posicion) !==
              posicionFiltro.replace(/^0+/, "")
          ) {
            return null;
          }

          return {
            ...x,
            posicion: position.posicion,
            fechaInicioPosicion:
              fmtDate(position.fechaInicio),
            fechaFinPosicion:
              fmtDate(position.fechaFin),
            activaPosicion:
              position.activa,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
    } else if (reporte.includes("→")) {
      const events = timelineByInmueble;

      const targetMap: Record<
        string,
        [string, string]
      > = {
        "Registro → visita": [
          "inmueble_registrado",
          "visita_realizada",
        ],
        "Visita → tasación": [
          "visita_realizada",
          "tasacion_realizada",
        ],
        "Tasación → aprobación": [
          "tasacion_realizada",
          "tasacion_actualizada",
        ],
        "Tasación → publicación": [
          "tasacion_realizada",
          "publicado",
        ],
      };

      const [from, to] =
        targetMap[reporte] || ["", ""];

      rows = filtered
        .map((x) => {
          const ev =
            events.get(x.inmuebleId) || [];

          const startEvent = ev.find(
            (event) =>
              event.evento === from,
          );

          const endEvent = ev.find(
            (event) =>
              event.evento === to &&
              (!startEvent ||
                new Date(event.fechaEvento).getTime() >=
                  new Date(
                    startEvent.fechaEvento,
                  ).getTime()),
          );

          const fechaInicioFlujo =
            fmtDate(
              startEvent?.fechaEvento,
            );

          const fechaFinFlujo =
            fmtDate(
              endEvent?.fechaEvento,
            );

          return {
            ...x,
            fechaInicioFlujo,
            fechaFinFlujo,
            dias: daysBetween(
              startEvent?.fechaEvento,
              endEvent?.fechaEvento,
            ),
          };
        })
        .filter(
          (x) =>
            x.fechaInicioFlujo,
        );
    } else if (
      reporte === "Histórico de inmuebles"
    ) {
      rows = filtered.filter(
        (x) => x.estado === "Histórico",
      );
    } else if (
      reporte === "Inmuebles por estado"
    ) {
      rows = filtered;
    } else if (
      reporte === "Situación de cartera"
    ) {
      rows = filtered;
    } else if (
      reporte === "Cartera activa"
    ) {
      rows = active;
    }

    const total = count;
    const resumen={...filteredSummary,total,disponibles:availablePositions.length,aprobaciones:0,negociaciones:0};
    return NextResponse.json({
      ok: true,
      reporte,
      resumen,
      rows,
      paginacion:{pagina:page,tamano:pageSize,total,paginas:Math.ceil(total/pageSize)},
      fechaFiltro:periodField,
    });
  } catch (error) {
    console.error("Operación fallida: reportes", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo generar el reporte.",
      },
      { status: 500 },
    );
  }
}
