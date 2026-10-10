import { databaseInstant } from '@/lib/business-time';
import { isDemoProperty } from '@/lib/demo-data';
import { publicationReadiness } from "@/lib/publication-readiness";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmNegociaciones,
  inmPosiciones,
  inmPublicaciones,
  inmTasaciones,
  inmTimeline,
  inmVisitas,
} from "@/db/schema";

const eventoMap: Record<string, string> = {
  ficha_organizada: "Ficha actualizada",
  ficha_actualizada: "Ficha actualizada",
  propietario_actualizado: "Datos del propietario actualizados",
  propietario_vinculado: "Propietario vinculado",
  seguimiento_actualizado: "Responsable o plazo actualizado",
  anuncio_actualizado: "Anuncio actualizado",
  alquiler_renovado: "Alquiler renovado",
  alquiler_reingresado: "Alquiler reingresado a cartera",
  inmueble_registrado: "Inmueble registrado",
  visita_realizada: "Visita realizada",
  tasacion_realizada: "Tasación realizada",
  tasacion_actualizada: "Tasación actualizada",
  publicacion_registrada: "Texto registrado",
  publicacion_actualizada: "Publicación actualizada",
  renta_mensual_actualizada: "Renta mensual actualizada",
  precio_venta_actualizado: "Precio de venta actualizado",
  listo_para_publicar: "Listo para publicar",
  publicado: "Publicado",
  liberacion_registrada: "Liberación registrada",
  inmueble_liberado: "Inmueble liberado",
};

export async function GET(request: Request) {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    const scope = new URL(request.url).searchParams.get("modo") || "todos";
    if (!["real", "demo", "todos"].includes(scope)) return NextResponse.json({error:"Modo no válido."},{status:400});
    const scopeFilter = scope === "todos" ? sql`1=1` : scope === "demo" ? isDemoProperty : sql`NOT ${isDemoProperty}`;
    const [
      inmueblesActivos,
      visitas,
      tasaciones,
      negociaciones,
      publicaciones,
      recientes,
      posicionesDisponibles,
    ] = await Promise.all([
      db
        .select({
          id: inmInmuebles.id,
          hasPosition: sql<number>`EXISTS (SELECT 1 FROM inm_asignaciones_posicion ap WHERE ap.inmueble_id = ${inmInmuebles.id} AND ap.activa = 1)`,
        })
        .from(inmInmuebles)
        .where(and(eq(inmInmuebles.estado,"activo"),scopeFilter)),

      db
        .select({
          inmuebleId: inmVisitas.inmuebleId,
          completada: inmVisitas.completada,
          fechaRegistro: inmVisitas.fechaRegistro,
        })
        .from(inmVisitas)
        .where(eq(inmVisitas.completada, true))
        .orderBy(desc(inmVisitas.fechaRegistro)),

      db
        .select({
          inmuebleId: inmTasaciones.inmuebleId,
          situacion: inmTasaciones.situacion,
        })
        .from(inmTasaciones),

      db
        .select({
          inmuebleId: inmNegociaciones.inmuebleId,
          estado: inmNegociaciones.estado,
          fechaRegistro: inmNegociaciones.fechaRegistro,
        })
        .from(inmNegociaciones)
        .orderBy(desc(inmNegociaciones.fechaRegistro)),

      db
        .select({
          inmuebleId: inmPublicaciones.inmuebleId,
          publicado: inmPublicaciones.publicado,
        })
        .from(inmPublicaciones),

      db
        .select({
          inmuebleId: inmInmuebles.id,
          numero: inmPosiciones.numero,
          nombre: inmInmuebles.referencia,
          evento: inmTimeline.evento,
          fecha: databaseInstant(inmTimeline.fechaEvento),
        })
        .from(inmTimeline)
        .innerJoin(
          inmInmuebles,
          eq(inmInmuebles.id, inmTimeline.inmuebleId)
        )
        .leftJoin(
          inmAsignacionesPosicion,
          and(eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id), eq(inmAsignacionesPosicion.activa, true))
        )
        .leftJoin(
          inmPosiciones,
          eq(
            inmPosiciones.id,
            inmAsignacionesPosicion.posicionId
          )
        )
        .where(scopeFilter)
        .orderBy(desc(inmTimeline.fechaEvento), desc(inmTimeline.id))
        .limit(5),

      db
        .select({
          posicionId: inmPosiciones.id,
          inmuebleId: inmAsignacionesPosicion.inmuebleId,
        })
        .from(inmPosiciones)
        .leftJoin(
          inmAsignacionesPosicion,
          and(eq(inmAsignacionesPosicion.posicionId, inmPosiciones.id), eq(inmAsignacionesPosicion.activa, true))
        )
        .where(eq(inmPosiciones.activo, true))
        .then((rows) =>
          rows.filter((row) => row.inmuebleId == null).length
        ),
    ]);

    const positioned = new Set(inmueblesActivos.filter(item => Boolean(item.hasPosition)).map(item => item.id));
    const activos = new Set(inmueblesActivos.map((item) => item.id));

    const ultimaVisita = new Map<
      number,
      { completada: boolean }
    >();

    for (const visita of visitas) {
      if (!activos.has(visita.inmuebleId)) continue;
      if (ultimaVisita.has(visita.inmuebleId)) continue;

      ultimaVisita.set(visita.inmuebleId, {
        completada: visita.completada,
      });
    }

    const tasacionPorInmueble = new Map<
      number,
      string
    >();

    for (const tasacion of tasaciones) {
      if (!activos.has(tasacion.inmuebleId)) continue;

      tasacionPorInmueble.set(
        tasacion.inmuebleId,
        tasacion.situacion
      );
    }

    const negociacionPorInmueble = new Map<
      number,
      string
    >();

    for (const negociacion of negociaciones) {
      if (!activos.has(negociacion.inmuebleId)) continue;
      if (negociacionPorInmueble.has(negociacion.inmuebleId)) {
        continue;
      }

      negociacionPorInmueble.set(
        negociacion.inmuebleId,
        negociacion.estado
      );
    }

    const publicacionPorInmueble = new Map<
      number,
      boolean
    >();

    for (const publicacion of publicaciones) {
      if (!activos.has(publicacion.inmuebleId)) continue;

      publicacionPorInmueble.set(
        publicacion.inmuebleId,
        publicacion.publicado
      );
    }

    let visitasPendientes = 0;
    let tasacionesPendientes = 0;
    let aprobaciones = 0;
    let negociacionesEnCurso = 0;
    let textosPendientes = 0;
    let listosParaPublicar = 0;

    const expedientes = await publicationReadiness();
    for (const inmuebleId of activos) {
      const visita = ultimaVisita.get(inmuebleId);
      const tasacion = tasacionPorInmueble.get(inmuebleId);
      const negociacion = negociacionPorInmueble.get(inmuebleId);
      const publicacion = publicacionPorInmueble.get(inmuebleId);

      if (positioned.has(inmuebleId) && (!visita || !visita.completada)) {
        visitasPendientes++;
      }

      if (positioned.has(inmuebleId) && visita?.completada && !tasacion) {
        tasacionesPendientes++;
      }

      if (tasacion === "pendiente_aprobacion") {
        aprobaciones++;
      }

      if (negociacion === "en_curso") {
        negociacionesEnCurso++;
      }

      if (tasacion === "aprobado" && !expedientes.get(inmuebleId)?.complete) {
        textosPendientes++;
      }

      if (publicacion === false && expedientes.get(inmuebleId)?.complete) {
        listosParaPublicar++;
      }
    }

    const totalActivos = activos.size;

    return NextResponse.json({
      modo: scope,
      resumen: {
        activos: totalActivos,
        posicionesDisponibles,
        visitasPendientes,
        tasacionesPendientes,
        aprobaciones,
        negociaciones: negociacionesEnCurso,
        textosPendientes,
        listosParaPublicar,
      },
      pendientes: [
        {
          etapa: "Visita pendiente",
          total: visitasPendientes,
          tone: "amber",
        },
        {
          etapa: "Tasación pendiente",
          total: tasacionesPendientes,
          tone: "orange",
        },
        {
          etapa: "Expediente pendiente",
          total: textosPendientes,
          tone: "rose",
        },
        {
          etapa: "Listo para publicar",
          total: listosParaPublicar,
          tone: "emerald",
        },
      ],
      recientes: recientes.map((item) => ({
        inmuebleId: item.inmuebleId,
        numero: item.numero
          ? String(item.numero).padStart(2, "0")
          : "—",
        nombre: item.nombre,
        etapa: eventoMap[item.evento] ?? item.evento.replaceAll("_", " ").replace(/^./, character => character.toUpperCase()),
        fecha: item.fecha,
      })),
    });
  } catch (error) {
    console.error("Operación fallida: dashboard", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      { error: "No se pudo consultar el dashboard." },
      { status: 500 }
    );
  }
}
