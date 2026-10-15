import { propertyZoneName, zoneCondition } from "@/lib/zone-scope";
import { propertyAddress } from "@/lib/property-address.mjs";
import { databaseInstant } from '@/lib/business-time';
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmArchivos,
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
  inmTimeline,
  inmVisitas,
  inmSeguimiento,
  inmConfigAlertas,
  inmUsuarios,
} from "@/db/schema";


import { parseBusinessDate, todayInPeru } from "@/lib/calendar.mjs";
import { visitPhotoIds } from '@/lib/visit-photos.mjs';

class VisitInputError extends Error {}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    const rows = await db
      .select({
        id: inmInmuebles.id,
        codigo: inmInmuebles.codigo,
        tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
        referencia: inmInmuebles.referencia,
      zona: propertyZoneName,
      zonaId: inmInmuebles.zonaId,
        direccion: inmInmuebles.direccion,

        distrito: inmInmuebles.distrito,
        provincia: inmInmuebles.provincia,
        departamento: inmInmuebles.departamento,
        propietario: inmInmuebles.nombreContacto,
        posicion: inmPosiciones.numero,
        fechaRegistro: databaseInstant(inmInmuebles.fechaRegistro),
      })
      .from(inmInmuebles)

      .innerJoin(
        inmAsignacionesPosicion,
        and(
          eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id),
          eq(inmAsignacionesPosicion.activa, true)
        )
      )
      .innerJoin(
        inmPosiciones,
        eq(inmAsignacionesPosicion.posicionId, inmPosiciones.id)
      )
      .leftJoin(
        inmVisitas,
        and(
          eq(inmVisitas.inmuebleId, inmInmuebles.id),
          eq(inmVisitas.completada, true)
        )
      )
      .where(
        and(zoneCondition(request),
          eq(inmInmuebles.estado, "activo"),
          sql`${inmVisitas.id} IS NULL`
        )
      )
      .orderBy(asc(inmInmuebles.fechaRegistro));

    const drafts = rows.length ? await db.select({
      id: inmArchivos.id, inmuebleId: inmArchivos.inmuebleId, nombre: inmArchivos.nombre,
    }).from(inmArchivos).where(and(
      inArray(inmArchivos.inmuebleId, rows.map(row => row.id)), eq(inmArchivos.usuarioId, auth.user.id),
      eq(inmArchivos.tipoDocumento, "FOTO_INMUEBLE"), eq(inmArchivos.almacenamiento, "hosting"), isNull(inmArchivos.visitaId),
    )) : [];

    const [config] = await db.select({dias:inmConfigAlertas.dias}).from(inmConfigAlertas).where(and(eq(inmConfigAlertas.tipo,'visita'),eq(inmConfigAlertas.activo,true))).limit(1);
    const seguimiento=rows.length ? await db.select({inmuebleId:inmSeguimiento.inmuebleId,fechaLimite:inmSeguimiento.fechaLimite,responsable:inmUsuarios.nombre}).from(inmSeguimiento).leftJoin(inmUsuarios,eq(inmUsuarios.id,inmSeguimiento.responsableId)).where(and(inArray(inmSeguimiento.inmuebleId,rows.map(row=>row.id)),eq(inmSeguimiento.actividad,'visita'))) : [];
    const ahora = Date.now();

    const items = rows.map((row) => {
      const fechaRegistro = new Date(row.fechaRegistro).getTime();
      const dias = Math.max(
        0,
        Math.floor((ahora - fechaRegistro) / (1000 * 60 * 60 * 24))
      );

      return {
        id: row.id,
        codigo: row.codigo,
        distrito: row.distrito,
        tipo: row.tipo,
    operacion: row.operacion,
        nombre: row.referencia,
        zona: row.zona,
        zonaId: row.zonaId,
        direccion: row.direccion,
        ubicacion: propertyAddress(row),
        propietario: row.propietario || "",
        posicion: String(row.posicion),
        dias,
        responsable:seguimiento.find(item=>item.inmuebleId===row.id)?.responsable??null,
        fechaLimite:seguimiento.find(item=>item.inmuebleId===row.id)?.fechaLimite??null,
        vencida:seguimiento.find(item=>item.inmuebleId===row.id)?.fechaLimite ? seguimiento.find(item=>item.inmuebleId===row.id)!.fechaLimite! < todayInPeru() : dias>(config?.dias??2),
        fotos: drafts.filter(photo => photo.inmuebleId === row.id).map(photo => ({
          id: photo.id, nombre: photo.nombre, enlace: `/api/inmuebles/${row.id}/archivos/${photo.id}`,
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("Operación fallida: visitas", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      { error: "No fue posible obtener las visitas pendientes." },
      { status: error instanceof VisitInputError ? 409 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeApi(request);
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
    let photoIds: number[];
    try { photoIds = visitPhotoIds(body.fotoIds, body.pendienteEvidencia === true); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Adjunta fotos de la visita.' }, { status: 400 }); }

    const inmuebleId = Number(body.inmuebleId);
    const fechaVisita = clean(body.fechaVisita);
    const observaciones = clean(body.observaciones);

    if (!Number.isInteger(inmuebleId) || inmuebleId <= 0) {
      return NextResponse.json(
        { error: "El inmueble seleccionado no es válido." },
        { status: 400 }
      );
    }

    const fechaVisitaObj = parseBusinessDate(fechaVisita);
    if (!fechaVisitaObj) return NextResponse.json({ error: "Indica una fecha de visita válida que no sea futura." }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .select({
          id: inmInmuebles.id,
          codigo: inmInmuebles.codigo,
          estado: inmInmuebles.estado,
          referencia: inmInmuebles.referencia,
      zona: propertyZoneName,
      zonaId: inmInmuebles.zonaId,
        })
        .from(inmInmuebles)
        .where(and(eq(inmInmuebles.id, inmuebleId),zoneCondition(request)))
        .limit(1).for("update");

      if (!property) {
        throw new VisitInputError("El inmueble seleccionado no existe.");
      }

      if (property.estado !== "activo") {
        throw new VisitInputError(
          "El inmueble ya no se encuentra activo en cartera. Actualiza la pantalla."
        );
      }

      const [activePosition] = await tx
        .select({
          id: inmAsignacionesPosicion.id,
        })
        .from(inmAsignacionesPosicion)
        .where(
          and(
            eq(inmAsignacionesPosicion.inmuebleId, inmuebleId),
            eq(inmAsignacionesPosicion.activa, true)
          )
        )
        .limit(1);

      if (!activePosition) {
        throw new VisitInputError(
          "El inmueble no tiene una posición activa en cartera."
        );
      }

      const [existingVisit] = await tx
        .select({ id: inmVisitas.id })
        .from(inmVisitas)
        .where(
          and(
            eq(inmVisitas.inmuebleId, inmuebleId),
            eq(inmVisitas.completada, true)
          )
        )
        .limit(1);

      if (existingVisit) {
        throw new VisitInputError("Este inmueble ya tiene una visita completada.");
      }

      const user = auth.user;

      const photos = photoIds.length ? await tx.select({ id: inmArchivos.id, tipoMime: inmArchivos.tipoMime }).from(inmArchivos).where(and(
        inArray(inmArchivos.id, photoIds), eq(inmArchivos.inmuebleId, inmuebleId),
        eq(inmArchivos.tipoDocumento, 'FOTO_INMUEBLE'), eq(inmArchivos.almacenamiento, 'hosting'),
        eq(inmArchivos.usuarioId, user.id), isNull(inmArchivos.visitaId),
      )).for('update') : [];
      if (photos.length !== photoIds.length || photos.some(photo => !photo.tipoMime?.startsWith('image/'))) {
        throw new VisitInputError('Las fotos deben pertenecer a este inmueble y estar subidas por ti para esta visita.');
      }
      const ahora = new Date();

      const [visit] = await tx.insert(inmVisitas).values({
        inmuebleId,
        fechaVisita: fechaVisitaObj,
        completada: true,
        fechaCompletada: ahora,
        observaciones: observaciones || null,
        usuarioId: user.id,
      }).$returningId();
      if (photoIds.length) await tx.update(inmArchivos).set({ visitaId: visit.id }).where(inArray(inmArchivos.id, photoIds));

      await tx.insert(inmTimeline).values({
        inmuebleId,
        evento: "visita_realizada",
        observacion:
          `Visita realizada el ${fechaVisita}.` +
          (observaciones ? ` ${observaciones}` : ""),
        usuarioId: user.id,
      });

      return {
        inmuebleId,
        codigo: property.codigo,
        referencia: property.referencia,
        estadoVisita: "realizada",
        pendienteEvidencia: photoIds.length === 0,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        message: photoIds.length ? "Visita registrada correctamente." : "Visita registrada como pendiente de evidencia. Agrega al menos una foto en Información de inmuebles → Visitas.",
        ...result,
        fotos: photoIds.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Operación fallida: visitas", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      {
        error:
          error instanceof VisitInputError
            ? error.message
            : "No fue posible registrar la visita.",
      },
      { status: error instanceof VisitInputError ? 409 : 500 }
    );
  }
}
