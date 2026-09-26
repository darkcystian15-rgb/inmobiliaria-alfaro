import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
  inmPropietarios,
  inmTasaciones,
  inmPublicaciones,
} from "@/db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: unknown) {
  const v = clean(value);
  return v || null;
}

function numOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function decimalOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return sql`NULL`;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : sql`NULL`;
}

function nullableSql(value: unknown) {
  const v = clean(value);
  return v || sql`NULL`;
}

async function findProperty(key: string) {
  const [row] = await db
    .select({
      id: inmInmuebles.id,
      codigo: inmInmuebles.codigo,
      propietarioId: inmInmuebles.propietarioId,
      tipo: inmInmuebles.tipo,
      referencia: inmInmuebles.referencia,
      direccion: inmInmuebles.direccion,
      distrito: inmInmuebles.distrito,
      provincia: inmInmuebles.provincia,
      departamento: inmInmuebles.departamento,
      areaTerreno: inmInmuebles.areaTerreno,
      areaConstruida: inmInmuebles.areaConstruida,
      habitaciones: inmInmuebles.habitaciones,
      banos: inmInmuebles.banos,
      caracteristicas: inmInmuebles.caracteristicas,
      observaciones: inmInmuebles.observaciones,
      estado: inmInmuebles.estado,
      etapa: inmInmuebles.etapa,
      fechaRegistro: inmInmuebles.fechaRegistro,
      fechaActualizacion: inmInmuebles.fechaActualizacion,
      fechaSalida: inmInmuebles.fechaSalida,
      posicion: inmPosiciones.numero,
      propietarioDni: inmPropietarios.dni,
      propietarioNombres: inmPropietarios.nombres,
      propietarioApellidos: inmPropietarios.apellidos,
      propietarioTelefono: inmPropietarios.telefono,
      propietarioEmail: inmPropietarios.email,
      propietarioReferencia: inmPropietarios.referenciaContacto,
      tasacionId: inmTasaciones.id,
      fechaTasacion: inmTasaciones.fechaTasacion,
      valorReferencia: inmTasaciones.valorReferencia,
      precioObjetivo: inmTasaciones.precioObjetivo,
      situacionTasacion: inmTasaciones.situacion,
      observacionTasacion: inmTasaciones.observacion,
      publicacionId: inmPublicaciones.id,
      textoPublicacion: inmPublicaciones.texto,
      enlacePublicacion: inmPublicaciones.driveLink,
      publicado: inmPublicaciones.publicado,
      fechaPublicacion: inmPublicaciones.fechaPublicacion,
    })
    .from(inmInmuebles)
    .leftJoin(inmPropietarios, eq(inmPropietarios.id, inmInmuebles.propietarioId))
    .leftJoin(
      inmAsignacionesPosicion,
      and(eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id), eq(inmAsignacionesPosicion.activa, true))
    )
    .leftJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId))
    .leftJoin(inmTasaciones, eq(inmTasaciones.inmuebleId, inmInmuebles.id))
    .leftJoin(inmPublicaciones, eq(inmPublicaciones.inmuebleId, inmInmuebles.id))
    .where(key.match(/^\d+$/) ? eq(inmInmuebles.id, Number(key)) : eq(inmInmuebles.codigo, key))
    .limit(1);

  return row;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const key = (await context.params).id;
    const row = await findProperty(key);
    if (!row) return NextResponse.json({ error: "Inmueble no encontrado." }, { status: 404 });

    const { tasacionId, fechaTasacion, valorReferencia, precioObjetivo, situacionTasacion, observacionTasacion, publicacionId, textoPublicacion, enlacePublicacion, publicado, fechaPublicacion, ...inmueble } = row;

    return NextResponse.json({
      inmueble,
      tasacion: tasacionId ? { id: tasacionId, fechaTasacion, valorReferencia, precioObjetivo, situacion: situacionTasacion, observacion: observacionTasacion } : null,
      publicacion: publicacionId ? { id: publicacionId, texto: textoPublicacion, enlace: enlacePublicacion, publicado, fechaPublicacion } : null,
    });
  } catch (error) {
    console.error("Error al consultar ficha:", error);
    return NextResponse.json({ error: "No se pudo consultar la ficha del inmueble." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const key = (await context.params).id;
    const row = await findProperty(key);
    if (!row) return NextResponse.json({ error: "Inmueble no encontrado." }, { status: 404 });

    const body = await request.json();
    const propertyValues = {
      tipo: nullable(body.tipo) ?? row.tipo,
      referencia: nullable(body.referencia) ?? row.referencia,
      direccion: nullable(body.direccion),
      distrito: nullable(body.distrito),
      provincia: nullable(body.provincia),
      departamento: nullable(body.departamento),
      areaTerreno: decimalOrNull(body.areaTerreno),
      areaConstruida: decimalOrNull(body.areaConstruida),
      habitaciones: numOrNull(body.habitaciones),
      banos: numOrNull(body.banos),
      caracteristicas: nullable(body.caracteristicas),
      observaciones: nullable(body.observaciones),
    };

    await db.update(inmInmuebles).set(propertyValues).where(eq(inmInmuebles.id, row.id));

    if (body.propietario) {
      await db.update(inmPropietarios).set({
        dni: clean(body.propietario.dni) || row.propietarioDni || "",
        nombres: clean(body.propietario.nombres) || row.propietarioNombres || "",
        apellidos: clean(body.propietario.apellidos) || row.propietarioApellidos || "",
        telefono: nullableSql(body.propietario.telefono),
        email: nullableSql(body.propietario.email),
        referenciaContacto: nullableSql(body.propietario.referenciaContacto),
      }).where(eq(inmPropietarios.id, row.propietarioId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al actualizar ficha:", error);
    return NextResponse.json({ error: "No se pudieron guardar los datos del inmueble." }, { status: 500 });
  }
}
