import { propertyAddress } from "@/lib/property-address.mjs";
import { rentalResult } from "@/lib/rental-result.mjs";
import { saleResult } from "@/lib/sale-result.mjs";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmLiberaciones,
  inmPosiciones,
  inmPropietarios,
  inmTimeline,
} from "@/db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const MOTIVOS = new Set([
  "vendido",
  "alquilado",
  "cancelacion_propietario",
  "cancelacion_externa",
  "otro",
]);


export async function GET() {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    const rows = await db
      .select({
        inmuebleId: inmInmuebles.id,
        codigo: inmInmuebles.codigo,
        tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
        referencia: inmInmuebles.referencia,
        direccion: inmInmuebles.direccion,
        numeroDireccion: inmInmuebles.numeroDireccion,
        distrito: inmInmuebles.distrito,
        provincia: inmInmuebles.provincia,
        departamento: inmInmuebles.departamento,
        propietarioNombres: inmPropietarios.nombres,
        propietarioApellidos: inmPropietarios.apellidos,
        dni: inmPropietarios.dni,
        posicion: inmPosiciones.numero,
        fechaRegistro: inmInmuebles.fechaRegistro,
      })
      .from(inmInmuebles)
      .leftJoin(
        inmPropietarios,
        eq(
          inmPropietarios.id,
          inmInmuebles.propietarioId
        )
      )
      .leftJoin(
        inmAsignacionesPosicion,
        and(
          eq(
            inmAsignacionesPosicion.inmuebleId,
            inmInmuebles.id
          ),
          eq(inmAsignacionesPosicion.activa, true)
        )
      )
      .leftJoin(
        inmPosiciones,
        eq(
          inmPosiciones.id,
          inmAsignacionesPosicion.posicionId
        )
      )
      .where(eq(inmInmuebles.estado, "activo"))
     .orderBy(inmPosiciones.numero);

    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        inmuebleId: row.inmuebleId,
        codigo: row.codigo,
        posicion: row.posicion
          ? String(row.posicion).padStart(2, "0")
          : "—",
        nombre: row.referencia,
        ubicacion: propertyAddress(row),
        tipo: row.tipo,
    operacion: row.operacion,
        propietario:
          [
            row.propietarioNombres,
            row.propietarioApellidos,
          ]
            .filter(Boolean)
            .join(" ") || "Sin propietario",
        dni: row.dni,
        fechaRegistro: row.fechaRegistro,
      })),
    });
  } catch (error) {
    console.error("Operación fallida: liberaciones", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudieron consultar los inmuebles activos.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeApi(request);
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

    const inmuebleId = Number(body.inmuebleId);
    const motivo = clean(body.motivo);
    const detalleOtro = clean(body.detalleOtro);

    if (
      !Number.isInteger(inmuebleId) ||
      inmuebleId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Inmueble no válido.",
        },
        { status: 400 }
      );
    }

    if (!MOTIVOS.has(motivo)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El motivo de liberación no es válido.",
        },
        { status: 400 }
      );
    }

    if (detalleOtro.length > 500) return NextResponse.json({ error: "El detalle admite hasta 500 caracteres." }, { status: 400 });

    if (motivo === "otro" && !detalleOtro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Indica el detalle del motivo de liberación.",
        },
        { status: 400 }
      );
    }

    let venta: ReturnType<typeof saleResult> | null = null;
    if (motivo === "vendido") {
      try { venta = saleResult(body); }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Resultado de venta no válido." }, { status: 400 }); }
    }

    let alquiler: ReturnType<typeof rentalResult> | null = null;
    if (motivo === 'alquilado') {
      try { alquiler = rentalResult(body); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Revisa los datos del alquiler.' }, { status: 400 }); }
    }
    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .select()
        .from(inmInmuebles)
        .where(eq(inmInmuebles.id, inmuebleId))
        .limit(1).for("update");

      if (!property) {
        throw new Error("El inmueble no existe.");
      }

      if ((motivo === 'vendido' && property.operacion !== 'venta') || (motivo === 'alquilado' && property.operacion !== 'alquiler')) throw new Error('El motivo de cierre no corresponde al tipo de operación del inmueble.');
      if (property.estado !== "activo") {
        throw new Error(
          "El inmueble ya no está activo."
        );
      }

      const [registeredRelease] = await tx
        .select({
          id: inmLiberaciones.id,
        })
        .from(inmLiberaciones)
        .where(
          and(
            eq(
              inmLiberaciones.inmuebleId,
              inmuebleId
            ),
            eq(inmLiberaciones.confirmado, true),
            eq(inmLiberaciones.anulada, false)
          )
        )
        .limit(1);

      if (registeredRelease) {
        throw new Error(
          "El inmueble ya tiene una liberación registrada."
        );
      }

      const user = auth.user;
      const ahora = new Date();

      await tx.insert(inmLiberaciones).values({
        inmuebleId,
        motivo,
        ...(venta ?? {}),
        ...(alquiler ?? {}),
        detalleOtro:
          motivo === "otro" ? detalleOtro : null,
        usuarioRegistroId: user.id,
        confirmado: true,
        fechaConfirmacion: ahora,
        usuarioConfirmacionId: user.id,
      });

      const [assignment] = await tx
        .select({
          id: inmAsignacionesPosicion.id,
          posicionId:
            inmAsignacionesPosicion.posicionId,
        })
        .from(inmAsignacionesPosicion)
        .where(
          and(
            eq(
              inmAsignacionesPosicion.inmuebleId,
              inmuebleId
            ),
            eq(
              inmAsignacionesPosicion.activa,
              true
            )
          )
        )
        .limit(1);

      if (assignment) {
        await tx
          .update(inmAsignacionesPosicion)
          .set({
            activa: false,
            fechaFin: ahora,
          })
          .where(
            eq(
              inmAsignacionesPosicion.id,
              assignment.id
            )
          );
      }

      await tx
        .update(inmInmuebles)
        .set({
          estado: "inactivo",
          fechaSalida: ahora,
        })
        .where(eq(inmInmuebles.id, inmuebleId));

      const motivoLabel = {
        vendido: "Vendido",
        alquilado: "Alquilado",
        cancelacion_propietario:
          "Cancelación del propietario",
        cancelacion_externa: "Cancelación externa",
        otro: "Otro",
      }[motivo];

      await tx.insert(inmTimeline).values({
        inmuebleId,
        evento: "inmueble_liberado",
        observacion:
          `Inmueble liberado. Motivo: ${motivoLabel}.` +
          (venta ? ` Fecha de venta: ${body.fechaVenta}; precio final: S/ ${venta.precioFinal}; comisión: S/ ${venta.comision}.` : "") +
          (alquiler ? ` Alquiler cerrado el ${alquiler.fechaAlquiler}; renta mensual: S/ ${alquiler.rentaMensual}; comisión: S/ ${alquiler.comision}.` : "") +
          (motivo === "otro"
            ? ` Detalle: ${detalleOtro}`
            : ""),
        usuarioId: user.id,
      });

      return {
        codigo: property.codigo,
        motivo: motivoLabel,
        posicionLiberada: Boolean(assignment),
      };
    });

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible liberar el inmueble.";

    const status =
      /no existe|ya no está|ya tiene|no corresponde/i.test(message)
        ? 409
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}
