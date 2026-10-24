import { inmAnuncios } from "@/db/schema";
import { readReferences } from "@/lib/diffusion.mjs";
import { propertyZoneName } from "@/lib/zone-scope";
import { validatePropertyEditFields, canChangeOperation } from "@/lib/property-edit-policy.mjs";
import { propertyCode } from "@/lib/property-code.mjs";
import { propertyIdentifierCondition } from "@/lib/property-identity";
import { assignedPropertyType } from "@/lib/property-types";
import { databaseInstant } from '@/lib/business-time';
import { publicationReadiness } from "@/lib/publication-readiness";
import { readDossier } from '@/lib/dossier-record';
import { dossierStatus } from '@/lib/transaction-dossier.mjs';
import { auditValues } from "@/lib/security-audit";
import { propertyInput, PropertyInputError } from "@/lib/property-input.mjs";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmCodigosAnteriores,
  inmPosiciones,
  inmTasaciones,
  inmPublicaciones,
  inmLiberaciones,
  securityAudit,
  inmTimeline,
  inmUsuarios,
  inmArchivos,
} from "@/db/schema";

async function findProperty(key: string) {
  const [row] = await db
    .select({
      id: inmInmuebles.id,
      codigo: inmInmuebles.codigo,
      zona: propertyZoneName,
      numeroOrden: inmInmuebles.numeroOrden,
      nombreContacto: inmInmuebles.nombreContacto,
      tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
      referencia: inmInmuebles.referencia,
      direccion: inmInmuebles.direccion,

        inmuebleOrigenId: inmInmuebles.inmuebleOrigenId,
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
      etapa: sql<string>`CASE WHEN ${inmInmuebles.estado}<>'activo' THEN 'historico' WHEN EXISTS(SELECT 1 FROM inm_publicaciones p WHERE p.inmueble_id=${inmInmuebles.id} AND p.publicado=1) THEN 'difusion_completada' WHEN EXISTS(SELECT 1 FROM inm_publicaciones p WHERE p.inmueble_id=${inmInmuebles.id} AND p.texto_realizado=1 AND LENGTH(TRIM(p.texto))>0) THEN 'difusion_pendiente' WHEN EXISTS(SELECT 1 FROM inm_tasaciones t WHERE t.inmueble_id=${inmInmuebles.id}) THEN 'texto_pendiente' WHEN EXISTS(SELECT 1 FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1) THEN 'tasacion_pendiente' ELSE 'visita_pendiente' END`,
      fechaRegistro: databaseInstant(inmInmuebles.fechaRegistro),
      fechaActualizacion: inmInmuebles.fechaActualizacion,
      fechaSalida: inmInmuebles.fechaSalida,
      visitaRealizada: sql<number>`EXISTS (SELECT 1 FROM inm_visitas v WHERE v.inmueble_id = ${inmInmuebles.id} AND v.completada = 1)`,
      posicion: inmPosiciones.numero,
      tasacionId: inmTasaciones.id,
      fechaTasacion: inmTasaciones.fechaTasacion,
      valorReferencia: inmTasaciones.valorReferencia,
        valorReferenciaMoneda: inmTasaciones.valorReferenciaMoneda,
      precioObjetivo: inmTasaciones.precioObjetivo,
        precioObjetivoMoneda: inmTasaciones.precioObjetivoMoneda,
      precioVenta: inmTasaciones.precioVenta,
        precioVentaMoneda: inmTasaciones.precioVentaMoneda,
      situacionTasacion: inmTasaciones.situacion,
      observacionTasacion: inmTasaciones.observacion,
      publicacionId: inmPublicaciones.id,
      textoPublicacion: inmPublicaciones.texto,
      textoRealizado: inmPublicaciones.textoRealizado,
      mediosDifusion: inmPublicaciones.mediosDifusion,
      cartelColocado: inmPublicaciones.cartelColocado,
      redesPublicadas: inmPublicaciones.redesPublicadas,
      referenciasDifusion: inmPublicaciones.referenciasDifusion,
      enlacePublicacion: inmPublicaciones.driveLink,
      publicado: inmPublicaciones.publicado,
      fechaPublicacion: inmPublicaciones.fechaPublicacion,
    })
    .from(inmInmuebles)
    .leftJoin(
      inmAsignacionesPosicion,
      and(eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id), eq(inmAsignacionesPosicion.activa, true))
    )
    .leftJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId))
    .leftJoin(inmTasaciones, eq(inmTasaciones.inmuebleId, inmInmuebles.id))
    .leftJoin(inmPublicaciones, eq(inmPublicaciones.inmuebleId, inmInmuebles.id))
    .where(propertyIdentifierCondition(key))
    .limit(1);

  return row;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeApi(undefined, "informacion");
    if (auth.response) return auth.response;
    const key = (await context.params).id;
    const row = await findProperty(key);
    if (!row) return NextResponse.json({ error: "Inmueble no encontrado." }, { status: 404 });

    const { visitaRealizada, tasacionId, fechaTasacion, valorReferencia, precioObjetivo, precioVenta, valorReferenciaMoneda, precioObjetivoMoneda, precioVentaMoneda, situacionTasacion, observacionTasacion, publicacionId, textoPublicacion, textoRealizado, mediosDifusion, cartelColocado, redesPublicadas, referenciasDifusion, enlacePublicacion, publicado, fechaPublicacion, ...inmueble } = row;

    const referenciasAnteriores = await db.select({canal:inmAnuncios.canal,url:inmAnuncios.enlace}).from(inmAnuncios).where(eq(inmAnuncios.inmuebleId,row.id));
    const expediente = (await publicationReadiness(db, row.id)).get(row.id);
    const dossier = await readDossier(row.id);
    const files = await db.select({ tipoDocumento: inmArchivos.tipoDocumento, almacenamiento: inmArchivos.almacenamiento }).from(inmArchivos).where(eq(inmArchivos.inmuebleId, row.id));
    const { complete, completed, total, alerts } = dossierStatus(dossier.config, files, row.operacion);
    const [venta] = await db.select({ fechaVenta: inmLiberaciones.fechaVenta, precioFinal: inmLiberaciones.precioFinal, comision: inmLiberaciones.comision }).from(inmLiberaciones).where(and(eq(inmLiberaciones.inmuebleId, row.id), eq(inmLiberaciones.motivo, "vendido"), eq(inmLiberaciones.confirmado, true), eq(inmLiberaciones.anulada, false))).limit(1);
    const [alquiler] = await db.select({ fechaAlquiler: inmLiberaciones.fechaAlquiler, rentaMensual: inmLiberaciones.rentaMensual, comision: inmLiberaciones.comision, garantia: inmLiberaciones.garantia, adelanto: inmLiberaciones.adelanto, fechaInicioAlquiler: inmLiberaciones.fechaInicioAlquiler, fechaFinAlquiler: inmLiberaciones.fechaFinAlquiler }).from(inmLiberaciones).where(and(eq(inmLiberaciones.inmuebleId, row.id), eq(inmLiberaciones.motivo, "alquilado"), eq(inmLiberaciones.confirmado, true), eq(inmLiberaciones.anulada, false))).limit(1);
    const historial = await db.select({id:inmTimeline.id,evento:inmTimeline.evento,observacion:inmTimeline.observacion,fecha:databaseInstant(inmTimeline.fechaEvento),usuario:inmUsuarios.nombre}).from(inmTimeline).leftJoin(inmUsuarios,eq(inmUsuarios.id,inmTimeline.usuarioId)).where(eq(inmTimeline.inmuebleId,row.id)).orderBy(inmTimeline.fechaEvento,inmTimeline.id);
    return NextResponse.json({
      documentacion: { complete, completed, total, alerts },
      historial,
      inmueble,
      expediente,
      venta: venta ?? null,
      alquiler: alquiler ?? null,
      progreso: { estado: row.estado, visitaRealizada: Boolean(visitaRealizada), tasacionRegistrada: Boolean(tasacionId), situacionTasacion, publicado: Boolean(publicado), expedienteCompleto: Boolean(expediente?.complete), textoRealizado: Boolean(textoRealizado && textoPublicacion?.trim()) },
      tasacion: tasacionId ? { id: tasacionId, fechaTasacion, valorReferencia, precioObjetivo, precioVenta, valorReferenciaMoneda, precioObjetivoMoneda, precioVentaMoneda, situacion: situacionTasacion, observacion: observacionTasacion } : null,
      publicacion: publicacionId ? { id: publicacionId, texto: textoPublicacion, textoRealizado, mediosDifusion, cartelColocado, redesPublicadas, referencias: referenciasDifusion === null ? referenciasAnteriores : readReferences(referenciasDifusion), enlace: enlacePublicacion, publicado, fechaPublicacion } : null,
    });
  } catch (error) {
    console.error("Operación fallida: inmuebles/[id]", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");
    return NextResponse.json({ error: "No se pudo consultar la ficha del inmueble." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateProperty(request, context, false);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateProperty(request, context, true);
}

async function updateProperty(request: Request, context: { params: Promise<{ id: string }> }, portfolio: boolean) {
  try {
    const auth = await authorizeApi(request, portfolio ? "administrador" : "informacion");
    if (auth.response) return auth.response;
    const key = (await context.params).id;
    const row = await findProperty(key);
    if (!row) return NextResponse.json({ error: "Inmueble no encontrado." }, { status: 404 });

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Datos no válidos." }, { status: 400 }); }
    const propertyValues: Partial<typeof inmInmuebles.$inferInsert> = propertyInput(body);
    validatePropertyEditFields(body, portfolio);
    await db.transaction(async tx => {
      const [current] = await tx.select().from(inmInmuebles)
        .where(eq(inmInmuebles.id, row.id)).limit(1).for("update");
      if (!current) throw new PropertyInputError("Inmueble no encontrado.");
      if (propertyValues.operacion && propertyValues.operacion !== current.operacion) {
        if (auth.user.rol !== 'administrador') throw new PropertyInputError('Solo el administrador puede cambiar la operación.');
        const [prices] = await tx.select({ id: inmTasaciones.id }).from(inmTasaciones).where(eq(inmTasaciones.inmuebleId, current.id)).limit(1);
        const [publication] = await tx.select({ id: inmPublicaciones.id }).from(inmPublicaciones).where(eq(inmPublicaciones.inmuebleId, current.id)).limit(1);
        if (!canChangeOperation({ estado: current.estado, hasPrices: Boolean(prices), hasPublication: Boolean(publication) })) throw new PropertyInputError('La operación solo se puede cambiar antes de registrar precios o publicación, y mientras el inmueble esté activo.');
      }
      if (propertyValues.tipo) propertyValues.tipo = await assignedPropertyType(tx, propertyValues.tipo, current.tipo);
      if (propertyValues.direccion !== undefined) propertyValues.referencia = propertyValues.direccion!.slice(0, 255);
      const identityChanged = (propertyValues.tipo !== undefined && propertyValues.tipo !== current.tipo) || (propertyValues.referencia !== undefined && propertyValues.referencia !== current.referencia);
      if (identityChanged && current.numeroOrden) {
        propertyValues.codigo = propertyCode(current.numeroOrden, propertyValues.tipo ?? current.tipo, propertyValues.referencia ?? current.referencia);
        if (propertyValues.codigo !== current.codigo) {
          await tx.insert(inmCodigosAnteriores).values({codigo: current.codigo, inmuebleId: current.id}).onDuplicateKeyUpdate({set:{inmuebleId: current.id}});
        }
      }
      if (Object.keys(propertyValues).length) await tx.update(inmInmuebles).set(propertyValues).where(eq(inmInmuebles.id, row.id));
      const before = current;
      const changedFields = Object.keys(propertyValues).filter(key=>propertyValues[key as keyof typeof propertyValues] !== before[key as keyof typeof before]);
      if(changedFields.length)await tx.insert(inmTimeline).values({inmuebleId:row.id,evento:'ficha_actualizada',usuarioId:auth.user.id,observacion:JSON.stringify({anterior:Object.fromEntries(changedFields.map(key=>[key,before[key as keyof typeof before]])),nuevo:propertyValues})});
      await tx.insert(securityAudit).values(auditValues(auth.user.id,"property.update",`property:${row.id}`));
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PropertyInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Operación fallida: inmuebles/[id]", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");
    return NextResponse.json({ error: "No se pudieron guardar los datos del inmueble." }, { status: 500 });
  }
}
