import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmLiberaciones,
  inmPosiciones,
  inmPropietarios,
  inmTimeline,
  inmUsuarios,
} from "@/db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const MOTIVOS = new Set(["vendido", "cancelacion_propietario", "cancelacion_externa", "otro"]);

async function getSystemUser(tx: any) {
  const email = "sistema@inmobiliaria-alfaro.local";
  let [user] = await tx.select().from(inmUsuarios).where(eq(inmUsuarios.email, email)).limit(1);
  if (!user) {
    const [created] = await tx.insert(inmUsuarios).values({
      nombre: "Usuario actual",
      email,
      rol: "usuario",
      activo: true,
    }).$returningId();
    [user] = await tx.select().from(inmUsuarios).where(eq(inmUsuarios.id, created.id)).limit(1);
  }
  if (!user) throw new Error("No fue posible registrar el usuario de trazabilidad.");
  return user;
}

export async function GET() {
  try {
    const rows = await db.select({
      inmuebleId: inmInmuebles.id,
      codigo: inmInmuebles.codigo,
      tipo: inmInmuebles.tipo,
      referencia: inmInmuebles.referencia,
      direccion: inmInmuebles.direccion,
      distrito: inmInmuebles.distrito,
      provincia: inmInmuebles.provincia,
      departamento: inmInmuebles.departamento,
      propietarioNombres: inmPropietarios.nombres,
      propietarioApellidos: inmPropietarios.apellidos,
      dni: inmPropietarios.dni,
      posicion: inmPosiciones.numero,
      etapa: inmInmuebles.etapa,
      fechaRegistro: inmInmuebles.fechaRegistro,
    })
      .from(inmInmuebles)
      .innerJoin(inmPropietarios, eq(inmPropietarios.id, inmInmuebles.propietarioId))
      .leftJoin(
        inmAsignacionesPosicion,
        and(
          eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id),
          eq(inmAsignacionesPosicion.activa, true),
        ),
      )
      .leftJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId))
      .where(eq(inmInmuebles.estado, "activo"))
      .orderBy(desc(inmInmuebles.fechaRegistro));

    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        inmuebleId: row.inmuebleId,
        codigo: row.codigo,
        posicion: row.posicion ? String(row.posicion).padStart(2, "0") : "—",
        nombre: row.referencia,
        ubicacion: [row.distrito, row.provincia, row.departamento, row.direccion].filter(Boolean).join(", ") || "Sin ubicación registrada",
        tipo: row.tipo,
        propietario: [row.propietarioNombres, row.propietarioApellidos].filter(Boolean).join(" ") || "Sin propietario",
        dni: row.dni,
        etapa: row.etapa,
        fechaRegistro: row.fechaRegistro,
      })),
    });
  } catch (error) {
    console.error("Error al consultar inmuebles para liberar:", error);
    return NextResponse.json({ ok: false, error: "No se pudieron consultar los inmuebles activos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inmuebleId = Number(body.inmuebleId);
    const motivo = clean(body.motivo);
    const detalleOtro = clean(body.detalleOtro);

    if (!Number.isInteger(inmuebleId) || inmuebleId <= 0) {
      return NextResponse.json({ ok: false, error: "Inmueble no válido." }, { status: 400 });
    }
    if (!MOTIVOS.has(motivo)) {
      return NextResponse.json({ ok: false, error: "El motivo de liberación no es válido." }, { status: 400 });
    }
    if (motivo === "otro" && !detalleOtro) {
      return NextResponse.json({ ok: false, error: "Indica el detalle del motivo de liberación." }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [property] = await tx.select().from(inmInmuebles).where(eq(inmInmuebles.id, inmuebleId)).limit(1);
      if (!property) throw new Error("El inmueble no existe.");
      if (property.estado !== "activo") throw new Error("El inmueble ya no está activo.");

      const [pendiente] = await tx.select({ id: inmLiberaciones.id })
        .from(inmLiberaciones)
        .where(and(
          eq(inmLiberaciones.inmuebleId, inmuebleId),
          eq(inmLiberaciones.confirmado, true),
          eq(inmLiberaciones.anulada, false),
        ))
        .limit(1);
      if (pendiente) throw new Error("El inmueble ya tiene una liberación registrada.");

      const user = await getSystemUser(tx);
      const ahora = new Date();

      await tx.insert(inmLiberaciones).values({
        inmuebleId,
        motivo,
        detalleOtro: motivo === "otro" ? detalleOtro : null,
        usuarioRegistroId: user.id,
        confirmado: true,
        fechaConfirmacion: ahora,
        usuarioConfirmacionId: user.id,
      });

      const [assignment] = await tx.select({ id: inmAsignacionesPosicion.id, posicionId: inmAsignacionesPosicion.posicionId })
        .from(inmAsignacionesPosicion)
        .where(and(
          eq(inmAsignacionesPosicion.inmuebleId, inmuebleId),
          eq(inmAsignacionesPosicion.activa, true),
        ))
        .limit(1);

      if (assignment) {
        await tx.update(inmAsignacionesPosicion)
          .set({ activa: false, fechaFin: ahora })
          .where(eq(inmAsignacionesPosicion.id, assignment.id));
      }

      await tx.update(inmInmuebles).set({
        estado: "inactivo",
        etapa: "liberado",
        fechaSalida: ahora,
      }).where(eq(inmInmuebles.id, inmuebleId));

      const motivoLabel = {
        vendido: "Vendido",
        cancelacion_propietario: "Cancelación del propietario",
        cancelacion_externa: "Cancelación externa",
        otro: "Otro",
      }[motivo];

      await tx.insert(inmTimeline).values({
        inmuebleId,
        evento: "inmueble_liberado",
        observacion: `Inmueble liberado. Motivo: ${motivoLabel}.${motivo === "otro" ? ` Detalle: ${detalleOtro}` : ""}`,
        usuarioId: user.id,
      });

      return { codigo: property.codigo, motivo: motivoLabel, posicionLiberada: Boolean(assignment) };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible liberar el inmueble.";
    const status = /no existe|ya no está|ya tiene/i.test(message) ? 409 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
