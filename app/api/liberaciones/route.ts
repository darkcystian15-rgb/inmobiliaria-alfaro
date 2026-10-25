import { propertyCurrency, selectedPropertyCurrency } from "@/lib/property-currency.mjs";
import { synchronizePropertyCurrency } from "@/lib/property-currency-service";
import { closureWebListings, prepareClosureWithdrawal } from "@/lib/portal-web-closure";
import { deliver } from "@/lib/portal-web";
import { closureReadiness } from "@/lib/closure-readiness";
import { propertyZoneName, zoneCondition, selectedZone } from "@/lib/zone-scope";
import { propertyAddress } from "@/lib/property-address.mjs";
import { rentalResult } from "@/lib/rental-result.mjs";
import { saleResult } from "@/lib/sale-result.mjs";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmLiberaciones,
  inmPosiciones,
  inmTimeline,
  inmEliminacionesPendientes,
  inmTasaciones,
} from "@/db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const maxDuration = 60;

const MOTIVOS = new Set(["vendido", "alquilado", "venta_suspendida"]);


export async function GET(request: Request) {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    if (!selectedZone(request)) return NextResponse.json({ error: "Selecciona una zona de cartera para liberar inmuebles." }, { status: 400 });
    const rows = await db
      .select({
        inmuebleId: inmInmuebles.id,
        moneda: inmInmuebles.moneda,
        valorReferenciaMoneda: inmTasaciones.valorReferenciaMoneda,
        precioObjetivoMoneda: inmTasaciones.precioObjetivoMoneda,
        precioVentaMoneda: inmTasaciones.precioVentaMoneda,
        tasacionId: inmTasaciones.id,
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
        fechaRegistro: inmInmuebles.fechaRegistro,
      })
      .from(inmInmuebles)
      .leftJoin(inmTasaciones,eq(inmTasaciones.inmuebleId,inmInmuebles.id))

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
     .orderBy(inmPosiciones.numero);

    const documentacion = await closureReadiness(db, rows);
    const anunciosWeb = await closureWebListings(db);
    const pendientes = await db.select({ id: inmEliminacionesPendientes.id, creado: inmEliminacionesPendientes.creado }).from(inmEliminacionesPendientes).where(and(eq(inmEliminacionesPendientes.estado, 'archivos'), sql`${inmEliminacionesPendientes.zonaId}=(SELECT id FROM inm_zonas WHERE nombre=${selectedZone(request)} AND activo=1)`));
    return NextResponse.json({
      ok: true,
      eliminacionesPendientes: pendientes,
      items: rows.map((row) => ({
        inmuebleId: row.inmuebleId,
        moneda: propertyCurrency(row,row.tasacionId ? row : null),
        codigo: row.codigo,
        posicion: row.posicion
          ? String(row.posicion).padStart(2, "0")
          : "—",
        nombre: row.referencia,
        zona:row.zona,zonaId:row.zonaId,
        direccion: row.direccion,
        ubicacion: propertyAddress(row),
        tipo: row.tipo,
    operacion: row.operacion,
        propietario:
          [
            row.propietarioNombres,
            row.propietarioApellidos,
          ]
            .filter(Boolean)
            .join(" ") || "Sin contacto",
        fechaRegistro: row.fechaRegistro,
        cierreDocumental: documentacion.get(row.inmuebleId),
        tieneAnuncioWeb: anunciosWeb.has(row.inmuebleId),
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
    if (!selectedZone(request)) return NextResponse.json({ error: "Selecciona una zona de cartera para liberar inmuebles." }, { status: 400 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

    if (body.retirarAnuncioWeb !== undefined && typeof body.retirarAnuncioWeb !== "boolean") return NextResponse.json({error:"Elige si deseas retirar el anuncio web."},{status:400});
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
            "Selecciona un cierre de operación o la suspensión temporal de una venta.",
        },
        { status: 400 }
      );
    }

    if (detalleOtro.length > 500) return NextResponse.json({ error: "El detalle admite hasta 500 caracteres." }, { status: 400 });

    if (motivo === "venta_suspendida" && !detalleOtro) {
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
        .where(and(eq(inmInmuebles.id, inmuebleId),zoneCondition(request)))
        .limit(1).for("update");

      if (!property) {
        throw new Error("El inmueble no existe.");
      }

      if (motivo === 'venta_suspendida' && property.operacion !== 'venta') throw new Error('La suspensión no corresponde a un alquiler; solo se permite para ventas.');
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

      if (motivo === 'vendido' || motivo === 'alquilado') {
        const documentation = (await closureReadiness(tx, [{ inmuebleId, operacion: property.operacion }], true)).get(inmuebleId)!;
        if (!documentation.complete) return { blocked: true as const, missing: documentation.missing };
      }
      const [appraisal] = await tx.select().from(inmTasaciones).where(eq(inmTasaciones.inmuebleId,inmuebleId)).limit(1);
      const currency = motivo === 'venta_suspendida' ? propertyCurrency(property,appraisal) : selectedPropertyCurrency(body,property,appraisal);
      if (body.monedaEsperada !== undefined && body.monedaEsperada !== propertyCurrency(property,appraisal)) return { currencyConflict: true as const };
      if (motivo !== 'venta_suspendida') await synchronizePropertyCurrency(tx,inmuebleId,currency,auth.user.id);
      const user = auth.user;
      const ahora = new Date();

      await tx.insert(inmLiberaciones).values({
        inmuebleId,
        motivo,
        moneda: currency || null,
        ...(venta ?? {}),
        ...(alquiler ?? {}),
        detalleOtro:
          motivo === "venta_suspendida" ? detalleOtro : null,
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
        .where(and(eq(inmInmuebles.id, inmuebleId),zoneCondition(request)));

      const motivoLabel = {
        venta_suspendida: "Venta suspendida por el propietario",
        vendido: "Vendido",
        alquilado: "Alquilado",
        cancelacion_propietario:
          "Cancelación del propietario",
        cancelacion_externa: "Cancelación externa",
        otro: "Otro",
      }[motivo];

      await tx.insert(inmTimeline).values({
        inmuebleId,
        evento: motivo === "venta_suspendida" ? "venta_suspendida" : "inmueble_liberado",
        observacion:
          `Inmueble liberado. Motivo: ${motivoLabel}.` +
          (venta ? ` Fecha de venta: ${body.fechaVenta}; precio final: ${currency} ${venta.precioFinal}; comisión: ${currency} ${venta.comision}.` : "") +
          (alquiler ? ` Alquiler cerrado el ${alquiler.fechaAlquiler}; renta mensual: ${currency} ${alquiler.rentaMensual}; comisión: ${currency} ${alquiler.comision}.` : "") +
          (motivo === "venta_suspendida"
            ? ` Detalle: ${detalleOtro}`
            : ""),
        usuarioId: user.id,
      });

      const retiro = body.retirarAnuncioWeb ? await prepareClosureWithdrawal(tx, inmuebleId, user.id, `Retiro solicitado al ${motivo === 'venta_suspendida' ? 'suspender la venta' : 'cerrar la operación'}.`) : null;
      return {
        retiro,
        codigo: property.codigo,
        motivo: motivoLabel,
        posicionLiberada: Boolean(assignment),
      };
    });

    if ('currencyConflict' in result) return NextResponse.json({error:'La moneda del inmueble cambió. Actualiza antes de confirmar el cierre.'},{status:409});
    if (result.blocked === true) return NextResponse.json({ error: `Completa la documentación antes de cerrar. Pendiente: ${result.missing.join('; ')}.`, pendientesDocumentales: result.missing }, { status: 409 });

    const { retiro, ...closed } = result;
    let retiroWeb: { synced: boolean; error: string } | null = null;
    if (retiro) {
      try { retiroWeb = await deliver(retiro.key, retiro.version, retiro.body); }
      catch { retiroWeb = {synced:false,error:'El cierre se guardó; el retiro del anuncio está pendiente. Reintenta desde Publicaciones activas.'}; }
    }
    return NextResponse.json(
      {
        ok: true,
        ...closed,
        retiroWeb,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible liberar el inmueble.";

    const status = /moneda/.test(message) ? 400 :
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
