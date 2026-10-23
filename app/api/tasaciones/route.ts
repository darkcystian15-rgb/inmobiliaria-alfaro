import { propertyZoneName, zoneCondition } from "@/lib/zone-scope";
import { propertyAddress } from "@/lib/property-address.mjs";
import { appraisalAfterVisit } from "@/lib/workflow-dates.mjs";
import { priceLabel, referenceLabel, targetLabel } from "@/lib/operation.mjs";
import { authorizeApi } from "@/lib/auth";
import { parseBusinessDate } from "@/lib/calendar.mjs";
import { appraisalPrices, formatPrice } from "@/lib/prices.mjs";
import { NextResponse } from "next/server";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
  inmTasaciones,
  inmTimeline,
  inmVisitas,
} from "@/db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}


type TasacionRow = {
  zona: string; zonaId: number | null; inmuebleId: number; codigo: string; posicion: number | null; referencia: string; tipo: string; operacion: string;
  distrito: string | null; provincia: string | null; departamento: string | null; direccion: string | null;
  propietarioNombres: string | null; propietarioApellidos: string | null;
  tasacionId?: number; fechaTasacion?: Date | string | null; valorReferencia?: string | null;
  valorReferenciaMoneda?: string; precioObjetivoMoneda?: string; precioVentaMoneda?: string; precioObjetivo?: string | null; precioVenta?: string | null; situacion?: string | null; observacion?: string | null;
};

function mapRow(row: TasacionRow) {
  return {
    id: row.tasacionId ?? null,
    inmuebleId: row.inmuebleId,
    codigo: row.codigo,
    distrito: row.distrito,
    posicion: row.posicion
      ? String(row.posicion).padStart(2, "0")
      : "—",
    nombre: row.referencia,
    zona: row.zona,
    zonaId: row.zonaId,
    direccion: row.direccion,
    ubicacion: propertyAddress(row),
    tipo: row.tipo,
    operacion: row.operacion,
    propietario:
      [row.propietarioNombres, row.propietarioApellidos]
        .filter(Boolean)
        .join(" ") || "Sin contacto",
    fechaTasacion: row.fechaTasacion ?? null,
    valorReferencia: row.valorReferencia ?? null,
    valorReferenciaMoneda: row.valorReferenciaMoneda ?? "PEN",
    precioObjetivo: row.precioObjetivo ?? null,
    precioObjetivoMoneda: row.precioObjetivoMoneda ?? "PEN",
    precioVenta: row.precioVenta ?? null,
    precioVentaMoneda: row.precioVentaMoneda ?? "PEN",
    situacion: row.situacion ?? null,
    observacion: row.observacion ?? null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    const pendientes = await db
      .select({
        inmuebleId: inmInmuebles.id,
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
        propietarioNombres: inmInmuebles.nombreContacto,
        propietarioApellidos: sql<string>`NULL`,
        posicion: inmPosiciones.numero,
      })
      .from(inmInmuebles)

      .leftJoin(
        inmTasaciones,
        eq(inmTasaciones.inmuebleId, inmInmuebles.id)
      )
      .innerJoin(
        inmAsignacionesPosicion,
        and(
          eq(
            inmAsignacionesPosicion.inmuebleId,
            inmInmuebles.id
          ),
          eq(inmAsignacionesPosicion.activa, true)
        )
      )
      .innerJoin(
        inmPosiciones,
        eq(
          inmPosiciones.id,
          inmAsignacionesPosicion.posicionId
        )
      )
      .where(
        and(zoneCondition(request),
          eq(inmInmuebles.estado, "activo"),
          sql`EXISTS (SELECT 1 FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1)`,
          isNull(inmTasaciones.id)
        )
      )
      .orderBy(asc(inmPosiciones.numero));

    const registradas = await db
      .select({
        tasacionId: inmTasaciones.id,
        inmuebleId: inmInmuebles.id,
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
        propietarioNombres: inmInmuebles.nombreContacto,
        propietarioApellidos: sql<string>`NULL`,
        posicion: inmPosiciones.numero,
        fechaTasacion: inmTasaciones.fechaTasacion,
        valorReferencia: inmTasaciones.valorReferencia,
        valorReferenciaMoneda: inmTasaciones.valorReferenciaMoneda,
        precioObjetivo: inmTasaciones.precioObjetivo,
        precioObjetivoMoneda: inmTasaciones.precioObjetivoMoneda,
        precioVenta: inmTasaciones.precioVenta,
        precioVentaMoneda: inmTasaciones.precioVentaMoneda,
        situacion: inmTasaciones.situacion,
        observacion: inmTasaciones.observacion,
      })
      .from(inmTasaciones)
      .innerJoin(
        inmInmuebles,
        eq(inmInmuebles.id, inmTasaciones.inmuebleId)
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
      .where(and(eq(inmInmuebles.estado, "activo"),zoneCondition(request)))
      .orderBy(desc(inmTasaciones.fechaActualizacion));

    const aprobadas = registradas.filter(
      (item) => item.situacion === "aprobado"
    );

    return NextResponse.json({
      ok: true,
      pendientes: pendientes.map(mapRow),
      registradas: registradas.map(mapRow),
      aprobadas: aprobadas.map(mapRow),
    });
  } catch (error) {
    console.error("Operación fallida: tasaciones", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudieron consultar las tasaciones.",
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
    const fechaTasacion = clean(body.fechaTasacion);
    const situacion = "aprobado";
    let prices;
    try { prices = appraisalPrices(body); } catch (error) {
      return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
    }
    const observacion = clean(body.observacion);

    if (!Number.isInteger(inmuebleId) || inmuebleId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Inmueble no válido." },
        { status: 400 }
      );
    }

    const fecha = parseBusinessDate(fechaTasacion);
    if (!fecha) return NextResponse.json({ ok: false, error: "Indica una fecha de tasación válida que no sea futura." }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .select()
        .from(inmInmuebles)
        .where(and(eq(inmInmuebles.id, inmuebleId),zoneCondition(request)))
        .limit(1).for("update");

      if (!property) {
        throw new Error("El inmueble no existe.");
      }

      if (property.estado !== "activo") {
        throw new Error("El inmueble ya no está activo.");
      }

      const [position] = await tx.select({ id: inmAsignacionesPosicion.id }).from(inmAsignacionesPosicion)
        .where(and(eq(inmAsignacionesPosicion.inmuebleId, inmuebleId), eq(inmAsignacionesPosicion.activa, true))).limit(1);
      const [visit] = await tx.select({ id: inmVisitas.id, fecha: inmVisitas.fechaVisita }).from(inmVisitas)
        .where(and(eq(inmVisitas.inmuebleId, inmuebleId), eq(inmVisitas.completada, true))).orderBy(inmVisitas.fechaVisita).limit(1);
      if (!position || !visit) throw new Error("El inmueble no tiene una posición activa y una visita completada. Actualiza la pantalla.");

      if (!appraisalAfterVisit(fechaTasacion,visit.fecha)) throw new Error("La fecha de tasación no puede ser anterior a la visita realizada.");
      const [existing] = await tx
        .select({ id: inmTasaciones.id })
        .from(inmTasaciones)
        .where(eq(inmTasaciones.inmuebleId, inmuebleId))
        .limit(1);

      if (existing) {
        throw new Error(
          "El inmueble ya tiene una tasación vigente registrada."
        );
      }

      const user = auth.user;

      await tx.insert(inmTasaciones).values({
        inmuebleId,
        fechaTasacion: fecha,
        ...prices,
        situacion,
        observacion: observacion || null,
        usuarioId: user.id,
      });

      await tx.insert(inmTimeline).values({
        inmuebleId,
        evento: "tasacion_realizada",
        observacion:
          observacion ||
          `Tasación registrada. Situación: ${situacion}.`,
        usuarioId: user.id,
      });

      return {
        codigo: property.codigo,
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
        : "No fue posible registrar la tasación.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: message.includes("anterior a la visita") ? 400 :
          /no existe|ya no está|ya tiene|no tiene/i.test(message)
            ? 409
            : 500,
      }
    );
  }
}

// Price changes do not update the property stage or publication status.
export async function PATCH(request: Request) {
  const auth = await authorizeApi(request);
  if (auth.response) return auth.response;
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
  }
  const inmuebleId = Number(body?.inmuebleId);
  if (!Number.isSafeInteger(inmuebleId) || inmuebleId <= 0 || !body ||
      (body.observacion !== undefined && typeof body.observacion !== "string")) {
    return NextResponse.json({ ok: false, error: "Ingresa un precio válido, mayor que cero y con hasta dos decimales." }, { status: 400 });
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [property] = await tx.select({ estado: inmInmuebles.estado, operacion: inmInmuebles.operacion }).from(inmInmuebles)
        .where(and(eq(inmInmuebles.id, inmuebleId),zoneCondition(request))).limit(1).for("update");
      if (property?.estado !== "activo") throw new Error("El inmueble ya no está activo.");
      const [tasacion] = await tx.select().from(inmTasaciones)
        .where(eq(inmTasaciones.inmuebleId, inmuebleId)).limit(1).for("update");
      if (!tasacion) throw new Error("El inmueble no tiene una tasación registrada.");
      const observacion = body.observacion === undefined ? tasacion.observacion : body.observacion.trim() || null;
      const prices = appraisalPrices(body, tasacion);
      if (Object.entries(prices).every(([key, value]) => tasacion[key as keyof typeof tasacion] === value) && observacion === tasacion.observacion) return prices;
      await tx.update(inmTasaciones).set({ ...prices, observacion }).where(eq(inmTasaciones.id, tasacion.id));
      await tx.insert(inmTimeline).values({
        inmuebleId, evento: property.operacion === "alquiler" ? "renta_mensual_actualizada" : "precio_venta_actualizado", usuarioId: auth.user.id,
        observacion: ["valorReferencia", "precioObjetivo", "precioVenta"].map((key, index) => `${[referenceLabel(property.operacion), targetLabel(property.operacion), priceLabel(property.operacion)][index]}: ${formatPrice(tasacion[key as keyof typeof tasacion], String(tasacion[`${key}Moneda` as keyof typeof tasacion]))} → ${formatPrice(prices[key], prices[`${key}Moneda`])}`).join(". ") + `. Observación: ${observacion ?? "sin observación"}`,
      });
      return prices;
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el precio o la renta mensual.";
    return NextResponse.json({ ok: false, error: /no tiene|no está activo|tres importes/.test(message) ? message : "No se pudo actualizar el precio o la renta mensual." },
      { status: /tres importes/.test(message) ? 400 : /no tiene|no está activo/.test(message) ? 409 : 500 });
  }
}
