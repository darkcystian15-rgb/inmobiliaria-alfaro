import { propertyAddress } from "@/lib/property-address.mjs";
import { nextPropertyOrder } from "@/lib/property-identity";
import { propertyCode } from "@/lib/property-code.mjs";
import {lockGeography,validateGeography} from "@/lib/geography";
import { operation } from "@/lib/operation.mjs";
import { assignedPropertyType } from "@/lib/property-types";
import { propertyInput, ownerInput, PropertyInputError } from "@/lib/property-input.mjs";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
  inmPropietarios,
  inmTimeline,
} from "@/db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Minimal selector for the property information module, independent of cartera.
export async function GET() {
  try {
    const auth = await authorizeApi(undefined, "informacion");
    if (auth.response) return auth.response;
    const rows = await db.select({
      id: inmInmuebles.codigo,
      nombre: inmInmuebles.referencia,
      tipo: inmInmuebles.tipo,
      operacion: inmInmuebles.operacion,
      direccion: inmInmuebles.direccion,
        numeroDireccion: inmInmuebles.numeroDireccion,
      distrito: inmInmuebles.distrito,
      provincia: inmInmuebles.provincia,
      departamento: inmInmuebles.departamento,
      estado: inmInmuebles.estado,
      propietarioNombres: inmPropietarios.nombres,
      propietarioApellidos: inmPropietarios.apellidos,
      posicion: inmPosiciones.numero,
    }).from(inmInmuebles)
      .leftJoin(inmPropietarios, eq(inmPropietarios.id, inmInmuebles.propietarioId))
      .leftJoin(inmAsignacionesPosicion, and(
        eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id),
        eq(inmAsignacionesPosicion.activa, true),
      ))
      .leftJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId))
      .orderBy(sql`CASE WHEN ${inmInmuebles.estado} = 'activo' THEN 0 ELSE 1 END`, sql`${inmPosiciones.numero} IS NULL`, asc(inmPosiciones.numero), asc(inmInmuebles.referencia));
    return NextResponse.json({ inmuebles: rows.map(({ direccion, distrito, provincia, departamento, propietarioNombres, propietarioApellidos, ...row }) => ({
      ...row,
      estado: row.estado === "activo" ? "activo" : "historico",
      ubicacion: propertyAddress({direccion, numeroDireccion: row.numeroDireccion, distrito, provincia, departamento}),
      propietario: [propietarioNombres, propietarioApellidos].filter(Boolean).join(" ") || "Sin propietario",
    })) });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los inmuebles." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeApi(request);
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

    let operacion: string;
    try { operacion = operation(body.operacion); } catch { throw new PropertyInputError("Selecciona Venta o Alquiler."); }
    const posicion = Number(body.posicion);
    let tipo = clean(body.tipo);
    const referencia = clean(body.referencia) || clean(body.nombres);
    const dni = clean(body.dni);
    const nombres = clean(body.nombres);
    const apellidos = clean(body.apellidos);
    const telefono = clean(body.telefono);
    const direccion = clean(body.ubicacion);

    if (!Number.isInteger(posicion) || posicion < 1 || posicion > 90) {
      return NextResponse.json(
        { error: "La posición debe estar entre 01 y 90." },
        { status: 400 }
      );
    }

    if (!referencia || !direccion) {
      return NextResponse.json(
        { error: "Completa tipo, nombre del inmueble y dirección." },
        { status: 400 }
      );
    }

    const address = propertyInput({direccion,numeroDireccion:body.numeroDireccion,distrito:body.distrito,provincia:body.provincia,departamento:body.departamento});
    propertyInput({ tipo, referencia, direccion });
    const ownerValues = ownerInput({ dni, nombres, apellidos, telefono });

    const result = await db.transaction(async (tx) => {
      tipo = await assignedPropertyType(tx, tipo);
      await lockGeography(tx);
      const location=await validateGeography(tx,{departamento:body.departamento,provincia:body.provincia,distrito:body.distrito});
      // Buscar y bloquear la posición seleccionada
      const [positionRows] = (await tx.execute(
        sql`
          SELECT id, activo
          FROM inm_posiciones
          WHERE numero = ${posicion}
          LIMIT 1
          FOR UPDATE
        `
      )) as unknown as [
        { id: number; activo: number }[],
        unknown
      ];

      // execute() devuelve un arreglo de filas.
      // Tomamos la primera fila encontrada.
      const position = positionRows[0];

      if (!position || !position.activo) {
        throw new Error(
          "La posición seleccionada no existe o está deshabilitada."
        );
      }

      // Leer el estado actual, no la instantánea anterior de REPEATABLE READ.
      // Otra captación puede haber confirmado mientras esperábamos la posición.
      const [assignmentRows] = (await tx.execute(
        sql`
          SELECT id
          FROM inm_asignaciones_posicion
          WHERE posicion_id = ${position.id}
            AND activa = 1
          LIMIT 1
          FOR UPDATE
        `
      )) as unknown as [{ id: number }[], unknown];

      const activeAssignment = assignmentRows[0];

      if (activeAssignment) {
        throw new Error(
          "La posición seleccionada acaba de ser ocupada. Actualiza la pantalla y elige otra."
        );
      }

      let propietarioId: number | null = null;
      if (ownerValues) {
        if (ownerValues.dni) {
          await tx.insert(inmPropietarios).values(ownerValues)
            .onDuplicateKeyUpdate({ set: { dni: sql`dni` } });
          const [owner] = await tx.select({ id: inmPropietarios.id }).from(inmPropietarios)
            .where(eq(inmPropietarios.dni, ownerValues.dni)).limit(1);
          propietarioId = owner.id;
        } else {
          const [owner] = await tx.insert(inmPropietarios).values(ownerValues).$returningId();
          propietarioId = owner.id;
        }
      }

      const numeroOrden = await nextPropertyOrder(tx);
      const codigo = propertyCode(numeroOrden, tipo, referencia);

      // Crear inmueble
      const [createdProperty] = await tx
        .insert(inmInmuebles)
        .values({
          ...address,
          ...location,
          codigo,
          numeroOrden,
          propietarioId,
          tipo,
          operacion,
          referencia,
          direccion: direccion || null,
          estado: "activo",
          etapa: "visita_pendiente",
        })
        .$returningId();

      // Asignar posición al inmueble
      await tx.insert(inmAsignacionesPosicion).values({
        inmuebleId: createdProperty.id,
        posicionId: position.id,
        activa: true,
      });

      const user = auth.user;

      // Registrar evento en timeline
      await tx.insert(inmTimeline).values({
        inmuebleId: createdProperty.id,
        evento: "inmueble_registrado",
        observacion: `Inmueble registrado en la posición ${String(
          posicion
        ).padStart(2, "0")}.`,
        usuarioId: user.id,
      });

      return {
        inmuebleId: createdProperty.id,
        codigo,
        posicion,
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
        : "No fue posible registrar el inmueble.";

    return NextResponse.json(
      { error: error instanceof PropertyInputError || /posición seleccionada/.test(message) ? message : "No fue posible registrar el inmueble." },
      { status: error instanceof PropertyInputError ? 400 : /posición seleccionada/.test(message) ? 409 : 500 }
    );
  }
}
