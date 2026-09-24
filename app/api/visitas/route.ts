import { NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
  inmPropietarios,
  inmTimeline,
  inmUsuarios,
  inmVisitas,
} from "@/db/schema";

const SYSTEM_EMAIL = "sistema@inmobiliaria-alfaro.local";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidHttpUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const rows = await db
      .select({
        id: inmInmuebles.id,
        codigo: inmInmuebles.codigo,
        tipo: inmInmuebles.tipo,
        referencia: inmInmuebles.referencia,
        direccion: inmInmuebles.direccion,
        distrito: inmInmuebles.distrito,
        provincia: inmInmuebles.provincia,
        departamento: inmInmuebles.departamento,
        propietario: sql<string>`
          CONCAT(${inmPropietarios.nombres}, ' ', ${inmPropietarios.apellidos})
        `,
        dni: inmPropietarios.dni,
        posicion: inmPosiciones.numero,
        fechaRegistro: inmInmuebles.fechaRegistro,
      })
      .from(inmInmuebles)
      .innerJoin(
        inmPropietarios,
        eq(inmInmuebles.propietarioId, inmPropietarios.id)
      )
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
      .where(eq(inmInmuebles.etapa, "visita_pendiente"))
      .orderBy(asc(inmInmuebles.fechaRegistro));

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
        tipo: row.tipo,
        nombre: row.referencia,
        ubicacion:
          [row.direccion, row.distrito, row.provincia, row.departamento]
            .filter(Boolean)
            .join(", ") || "Ubicación no registrada",
        propietario: row.propietario,
        dni: row.dni,
        posicion: String(row.posicion),
        dias,
      };
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("Error al obtener visitas pendientes:", error);

    return NextResponse.json(
      { error: "No fue posible obtener las visitas pendientes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const inmuebleId = Number(body.inmuebleId);
    const fechaVisita = clean(body.fechaVisita);
    const observaciones = clean(body.observaciones);
    const driveLink = clean(body.driveLink);

    if (!Number.isInteger(inmuebleId) || inmuebleId <= 0) {
      return NextResponse.json(
        { error: "El inmueble seleccionado no es válido." },
        { status: 400 }
      );
    }

    if (!isValidDate(fechaVisita)) {
      return NextResponse.json(
        { error: "La fecha de visita no es válida." },
        { status: 400 }
      );
    }

    const fechaVisitaObj = new Date(`${fechaVisita}T00:00:00`);

    if (Number.isNaN(fechaVisitaObj.getTime())) {
      return NextResponse.json(
        { error: "La fecha de visita no es válida." },
        { status: 400 }
      );
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaVisitaObj > hoy) {
      return NextResponse.json(
        { error: "La fecha de visita no puede ser futura." },
        { status: 400 }
      );
    }

    if (!isValidHttpUrl(driveLink)) {
      return NextResponse.json(
        { error: "El enlace de Google Drive no es válido." },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .select({
          id: inmInmuebles.id,
          codigo: inmInmuebles.codigo,
          etapa: inmInmuebles.etapa,
          referencia: inmInmuebles.referencia,
        })
        .from(inmInmuebles)
        .where(eq(inmInmuebles.id, inmuebleId))
        .limit(1);

      if (!property) {
        throw new Error("El inmueble seleccionado no existe.");
      }

      if (property.etapa !== "visita_pendiente") {
        throw new Error(
          "El inmueble ya no se encuentra pendiente de visita. Actualiza la pantalla."
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
        throw new Error("Este inmueble ya tiene una visita completada.");
      }

      let [user] = await tx
        .select()
        .from(inmUsuarios)
        .where(eq(inmUsuarios.email, SYSTEM_EMAIL))
        .limit(1);

      if (!user) {
        const [createdUser] = await tx
          .insert(inmUsuarios)
          .values({
            nombre: "Usuario actual",
            email: SYSTEM_EMAIL,
            rol: "usuario",
            activo: true,
          })
          .$returningId();

        [user] = await tx
          .select()
          .from(inmUsuarios)
          .where(eq(inmUsuarios.id, createdUser.id))
          .limit(1);
      }

      if (!user) {
        throw new Error(
          "No fue posible registrar el usuario de trazabilidad."
        );
      }

      const ahora = new Date();

      await tx.insert(inmVisitas).values({
        inmuebleId,
        fechaVisita: fechaVisitaObj,
        completada: true,
        fechaCompletada: ahora,
        observaciones: observaciones || null,
        driveLink: driveLink || null,
        usuarioId: user.id,
      });

      await tx
        .update(inmInmuebles)
        .set({
          etapa: "tasacion_pendiente",
        })
        .where(eq(inmInmuebles.id, inmuebleId));

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
        etapa: "tasacion_pendiente",
      };
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Visita registrada correctamente.",
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar visita:", error);

    const message =
      error instanceof Error
        ? error.message
        : "No fue posible registrar la visita.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
