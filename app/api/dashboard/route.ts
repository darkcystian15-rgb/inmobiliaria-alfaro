import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
  inmTimeline,
  inmPublicaciones,
  inmTasaciones,
} from "@/db/schema";

const etapaMap: Record<string, string> = {
  visita_pendiente: "Visita pendiente",
  visita_realizada: "Visita realizada",
  tasacion_pendiente: "Tasación pendiente",
  pendiente_aprobacion: "Pendiente de aprobación",
  en_negociacion: "En negociación",
  listo_para_publicar: "Listo para publicar",
  publicado: "Publicado",
};

const eventoMap: Record<string, string> = {
  inmueble_registrado: "Inmueble registrado",
  visita_realizada: "Visita realizada",
  tasacion_realizada: "Tasación realizada",
  tasacion_actualizada: "Tasación actualizada",
  publicacion_registrada: "Texto registrado",
  listo_para_publicar: "Listo para publicar",
  publicado: "Publicado",
  liberacion_registrada: "Liberación registrada",
  inmueble_liberado: "Inmueble liberado",
};

export async function GET() {
  try {
    const [activosResult, posicionesResult, etapasResult, textosResult, recientes] = await Promise.all([
      db.select({ total: sql<number>`count(*)` })
        .from(inmInmuebles)
        .where(eq(inmInmuebles.estado, "activo")),

      db.select({ total: sql<number>`count(*)` })
        .from(inmPosiciones)
        .leftJoin(
          inmAsignacionesPosicion,
          and(eq(inmAsignacionesPosicion.posicionId, inmPosiciones.id), eq(inmAsignacionesPosicion.activa, true))
        )
        .where(sql`inm_asignaciones_posicion.id is null`),

      db.select({ etapa: inmInmuebles.etapa, total: sql<number>`count(*)` })
        .from(inmInmuebles)
        .where(eq(inmInmuebles.estado, "activo"))
        .groupBy(inmInmuebles.etapa),

      db.select({ total: sql<number>`count(*)` })
        .from(inmInmuebles)
        .innerJoin(inmTasaciones, eq(inmTasaciones.inmuebleId, inmInmuebles.id))
        .leftJoin(inmPublicaciones, eq(inmPublicaciones.inmuebleId, inmInmuebles.id))
        .where(and(
          eq(inmInmuebles.estado, "activo"),
          eq(inmTasaciones.situacion, "aprobado"),
          sql`inm_publicaciones.id is null`
        )),

      db.select({
        numero: inmPosiciones.numero,
        nombre: inmInmuebles.referencia,
        etapa: inmInmuebles.etapa,
        evento: inmTimeline.evento,
        fecha: inmTimeline.fechaEvento,
      })
        .from(inmTimeline)
        .innerJoin(inmInmuebles, eq(inmInmuebles.id, inmTimeline.inmuebleId))
        .leftJoin(
          inmAsignacionesPosicion,
          and(eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id), eq(inmAsignacionesPosicion.activa, true))
        )
        .leftJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId))
        .orderBy(desc(inmTimeline.fechaEvento))
        .limit(5),
    ]);

    const etapas = Object.fromEntries(etapasResult.map((item) => [item.etapa, Number(item.total)]));
    const totalActivos = Number(activosResult[0]?.total ?? 0);
    const posicionesDisponibles = Number(posicionesResult[0]?.total ?? 0);
    const textosPendientes = Number(textosResult[0]?.total ?? 0);

    return NextResponse.json({
      resumen: {
        activos: totalActivos,
        posicionesDisponibles,
        visitasPendientes: etapas.visita_pendiente ?? 0,
        tasacionesPendientes: etapas.tasacion_pendiente ?? 0,
        aprobaciones: etapas.pendiente_aprobacion ?? 0,
        negociaciones: etapas.en_negociacion ?? 0,
        textosPendientes,
        listosParaPublicar: etapas.listo_para_publicar ?? 0,
      },
      pendientes: [
        { etapa: "Visita pendiente", total: etapas.visita_pendiente ?? 0, tone: "amber" },
        { etapa: "Tasación pendiente", total: etapas.tasacion_pendiente ?? 0, tone: "orange" },
        { etapa: "Pendiente de aprobación", total: etapas.pendiente_aprobacion ?? 0, tone: "violet" },
        { etapa: "En negociación", total: etapas.en_negociacion ?? 0, tone: "violet" },
        { etapa: "Texto pendiente", total: textosPendientes, tone: "rose" },
        { etapa: "Listo para publicar", total: etapas.listo_para_publicar ?? 0, tone: "emerald" },
      ],
      recientes: recientes.map((item) => ({
        numero: item.numero ? String(item.numero).padStart(2, "0") : "—",
        nombre: item.nombre,
        etapa: eventoMap[item.evento] ?? etapaMap[item.etapa] ?? item.evento,
        fecha: item.fecha,
      })),
    });
  } catch (error) {
    console.error("Error al consultar dashboard:", error);
    return NextResponse.json({ error: "No se pudo consultar el dashboard." }, { status: 500 });
  }
}
