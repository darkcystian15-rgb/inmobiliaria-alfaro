import { propertyCode } from "@/lib/property-code.mjs";
import { propertyIdentifierCondition } from "@/lib/property-identity";
import {lockGeography,validateGeography} from "@/lib/geography";
import { assignedPropertyType } from "@/lib/property-types";
import { databaseInstant } from '@/lib/business-time';
import { publicationReadiness } from "@/lib/publication-readiness";
import { auditValues } from "@/lib/security-audit";
import { propertyInput, ownerInput, PropertyInputError } from "@/lib/property-input.mjs";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmCodigosAnteriores,
  inmPosiciones,
  inmPropietarios,
  inmTasaciones,
  inmPublicaciones,
  inmLiberaciones,
  securityAudit,
  inmTimeline,
  inmUsuarios,
} from "@/db/schema";

async function findProperty(key: string) {
  const [row] = await db
    .select({
      id: inmInmuebles.id,
      codigo: inmInmuebles.codigo,
      numeroOrden: inmInmuebles.numeroOrden,
      propietarioId: inmInmuebles.propietarioId,
      tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
      referencia: inmInmuebles.referencia,
      direccion: inmInmuebles.direccion,
        numeroDireccion: inmInmuebles.numeroDireccion,
        inmuebleOrigenId: inmInmuebles.inmuebleOrigenId,
      latitud: inmInmuebles.latitud,
      longitud: inmInmuebles.longitud,
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
      etapa: sql<string>`CASE WHEN ${inmInmuebles.estado}<>'activo' THEN 'historico' WHEN EXISTS(SELECT 1 FROM inm_publicaciones p WHERE p.inmueble_id=${inmInmuebles.id} AND p.publicado=1) THEN 'publicado' WHEN EXISTS(SELECT 1 FROM inm_tasaciones t WHERE t.inmueble_id=${inmInmuebles.id}) THEN 'material_pendiente' WHEN EXISTS(SELECT 1 FROM inm_visitas v WHERE v.inmueble_id=${inmInmuebles.id} AND v.completada=1) THEN 'tasacion_pendiente' ELSE 'visita_pendiente' END`,
      fechaRegistro: databaseInstant(inmInmuebles.fechaRegistro),
      fechaActualizacion: inmInmuebles.fechaActualizacion,
      fechaSalida: inmInmuebles.fechaSalida,
      visitaRealizada: sql<number>`EXISTS (SELECT 1 FROM inm_visitas v WHERE v.inmueble_id = ${inmInmuebles.id} AND v.completada = 1)`,
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
      precioVenta: inmTasaciones.precioVenta,
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

    const { visitaRealizada, tasacionId, fechaTasacion, valorReferencia, precioObjetivo, precioVenta, situacionTasacion, observacionTasacion, publicacionId, textoPublicacion, enlacePublicacion, publicado, fechaPublicacion, ...inmueble } = row;

    const expediente = (await publicationReadiness(db, row.id)).get(row.id);
    const [venta] = await db.select({ fechaVenta: inmLiberaciones.fechaVenta, precioFinal: inmLiberaciones.precioFinal, comision: inmLiberaciones.comision }).from(inmLiberaciones).where(and(eq(inmLiberaciones.inmuebleId, row.id), eq(inmLiberaciones.motivo, "vendido"), eq(inmLiberaciones.confirmado, true), eq(inmLiberaciones.anulada, false))).limit(1);
    const [alquiler] = await db.select({ fechaAlquiler: inmLiberaciones.fechaAlquiler, rentaMensual: inmLiberaciones.rentaMensual, comision: inmLiberaciones.comision, garantia: inmLiberaciones.garantia, adelanto: inmLiberaciones.adelanto, fechaInicioAlquiler: inmLiberaciones.fechaInicioAlquiler, fechaFinAlquiler: inmLiberaciones.fechaFinAlquiler }).from(inmLiberaciones).where(and(eq(inmLiberaciones.inmuebleId, row.id), eq(inmLiberaciones.motivo, "alquilado"), eq(inmLiberaciones.confirmado, true), eq(inmLiberaciones.anulada, false))).limit(1);
    const relacionados = row.propietarioId == null ? [] : await db.select({id:inmInmuebles.id,codigo:inmInmuebles.codigo,referencia:inmInmuebles.referencia}).from(inmInmuebles).where(eq(inmInmuebles.propietarioId,row.propietarioId));
    const historial = await db.select({id:inmTimeline.id,evento:inmTimeline.evento,observacion:inmTimeline.observacion,fecha:databaseInstant(inmTimeline.fechaEvento),usuario:inmUsuarios.nombre}).from(inmTimeline).leftJoin(inmUsuarios,eq(inmUsuarios.id,inmTimeline.usuarioId)).where(eq(inmTimeline.inmuebleId,row.id)).orderBy(inmTimeline.fechaEvento,inmTimeline.id);
    return NextResponse.json({
      relacionados,
      historial,
      inmueble,
      expediente,
      venta: venta ?? null,
      alquiler: alquiler ?? null,
      progreso: { estado: row.estado, visitaRealizada: Boolean(visitaRealizada), tasacionRegistrada: Boolean(tasacionId), situacionTasacion, publicado: Boolean(publicado), expedienteCompleto: Boolean(expediente?.complete) },
      tasacion: tasacionId ? { id: tasacionId, fechaTasacion, valorReferencia, precioObjetivo, precioVenta, situacion: situacionTasacion, observacion: observacionTasacion } : null,
      publicacion: publicacionId ? { id: publicacionId, texto: textoPublicacion, enlace: enlacePublicacion, publicado, fechaPublicacion } : null,
    });
  } catch (error) {
    console.error("Operación fallida: inmuebles/[id]", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");
    return NextResponse.json({ error: "No se pudo consultar la ficha del inmueble." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeApi(request, "informacion");
    if (auth.response) return auth.response;
    const key = (await context.params).id;
    const row = await findProperty(key);
    if (!row) return NextResponse.json({ error: "Inmueble no encontrado." }, { status: 404 });

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Datos no válidos." }, { status: 400 }); }
    const propertyValues: Partial<typeof inmInmuebles.$inferInsert> = propertyInput(body);
    const ownerValues = body.propietario === undefined ? undefined : ownerInput(body.propietario);
    await db.transaction(async tx => {
      const locationEdited=["departamento","provincia","distrito"].some(key=>body[key]!==undefined);
      if(locationEdited)await lockGeography(tx);
      const [current] = await tx.select().from(inmInmuebles)
        .where(eq(inmInmuebles.id, row.id)).limit(1).for("update");
      if (!current) throw new PropertyInputError("Inmueble no encontrado.");
      if(locationEdited)Object.assign(propertyValues,await validateGeography(tx,{departamento:propertyValues.departamento===undefined?current.departamento:propertyValues.departamento,provincia:propertyValues.provincia===undefined?current.provincia:propertyValues.provincia,distrito:propertyValues.distrito===undefined?current.distrito:propertyValues.distrito},current));
      if (propertyValues.operacion && propertyValues.operacion !== current.operacion) {
        if (auth.user.rol !== 'administrador') throw new PropertyInputError('Solo el administrador puede cambiar la operación.');
        const [prices] = await tx.select({ id: inmTasaciones.id }).from(inmTasaciones).where(eq(inmTasaciones.inmuebleId, current.id)).limit(1);
        const [publication] = await tx.select({ id: inmPublicaciones.id }).from(inmPublicaciones).where(eq(inmPublicaciones.inmuebleId, current.id)).limit(1);
        if (prices || publication || current.estado !== 'activo') throw new PropertyInputError('La operación solo se puede cambiar antes de registrar precios o publicación, y mientras el inmueble esté activo.');
      }
      if (propertyValues.tipo) propertyValues.tipo = await assignedPropertyType(tx, propertyValues.tipo, current.tipo);
      if ((propertyValues.tipo !== undefined || propertyValues.referencia !== undefined) && current.numeroOrden) {
        propertyValues.codigo = propertyCode(current.numeroOrden, propertyValues.tipo ?? current.tipo, propertyValues.referencia ?? current.referencia);
        if (propertyValues.codigo !== current.codigo) {
          await tx.insert(inmCodigosAnteriores).values({codigo: current.codigo, inmuebleId: current.id}).onDuplicateKeyUpdate({set:{inmuebleId: current.id}});
        }
      }
      if (Object.keys(propertyValues).length) await tx.update(inmInmuebles).set(propertyValues).where(eq(inmInmuebles.id, row.id));
      const before = current;
      if (ownerValues) {
        let ownerId = current.propietarioId;
        const [oldOwner] = ownerId == null ? [] : await tx.select().from(inmPropietarios).where(eq(inmPropietarios.id,ownerId)).limit(1).for('update');
        const changing = oldOwner && oldOwner.dni != null && oldOwner.dni !== ownerValues.dni;
        if(changing && body.cambiarPropietario !== true) throw new PropertyInputError('Para vincular otro DNI, selecciona Cambiar propietario de este inmueble.');
        const [knownOwner] = !oldOwner?.dni && ownerValues.dni
          ? await tx.select().from(inmPropietarios).where(eq(inmPropietarios.dni, ownerValues.dni)).limit(1).for('update')
          : [];
        if (ownerId == null || changing || (knownOwner && knownOwner.id !== ownerId)) {
          if (ownerValues.dni) {
            await tx.insert(inmPropietarios).values(ownerValues).onDuplicateKeyUpdate({set:{dni:sql`dni`}});
            const [owner] = await tx.select().from(inmPropietarios).where(eq(inmPropietarios.dni,ownerValues.dni)).limit(1).for('update');
            ownerId = owner.id;
          } else {
            const [owner] = await tx.insert(inmPropietarios).values(ownerValues).$returningId();
            ownerId = owner.id;
          }
          // Linking an existing owner preserves their shared personal information.
          await tx.update(inmInmuebles).set({propietarioId:ownerId}).where(eq(inmInmuebles.id,row.id));
          await tx.insert(inmTimeline).values({inmuebleId:row.id,evento:'propietario_vinculado',usuarioId:auth.user.id,observacion:JSON.stringify({anteriorId:current.propietarioId,nuevoId:ownerId})});
        } else if(oldOwner) {
          const changed = Object.keys(ownerValues).filter(key=>ownerValues[key as keyof typeof ownerValues] !== oldOwner[key as keyof typeof ownerValues]);
          if(changed.length){
            const related=await tx.select({id:inmInmuebles.id}).from(inmInmuebles).where(eq(inmInmuebles.propietarioId,ownerId!));
            if(related.length>1 && body.confirmarPropietarioCompartido !== true)throw new PropertyInputError('Este propietario está vinculado a varios inmuebles. Confirma el cambio compartido.');
            await tx.update(inmPropietarios).set(ownerValues).where(eq(inmPropietarios.id,ownerId!));
            for(const property of related) await tx.insert(inmTimeline).values({inmuebleId:property.id,evento:'propietario_actualizado',usuarioId:auth.user.id,observacion:JSON.stringify({campos:changed,anterior:{nombres:oldOwner.nombres,apellidos:oldOwner.apellidos},nuevo:{nombres:ownerValues.nombres,apellidos:ownerValues.apellidos}})});
          }
        }
      } else if (ownerValues === null && current.propietarioId != null) {
        throw new PropertyInputError("Completa los datos del propietario vinculado.");
      }
      const changedFields = Object.keys(propertyValues).filter(key=>propertyValues[key as keyof typeof propertyValues] !== before[key as keyof typeof before]);
      if(changedFields.length)await tx.insert(inmTimeline).values({inmuebleId:row.id,evento:'ficha_actualizada',usuarioId:auth.user.id,observacion:JSON.stringify({anterior:Object.fromEntries(changedFields.map(key=>[key,before[key as keyof typeof before]])),nuevo:propertyValues})});
      await tx.insert(securityAudit).values(auditValues(auth.user.id,"property.update",`property:${row.id}`));
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PropertyInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if ((error as { cause?: { code?: string } }).cause?.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "Ese DNI ya pertenece a otro propietario. Revisa la identificación." }, { status: 409 });
    console.error("Operación fallida: inmuebles/[id]", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");
    return NextResponse.json({ error: "No se pudieron guardar los datos del inmueble." }, { status: 500 });
  }
}
