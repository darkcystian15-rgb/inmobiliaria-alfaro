import { propertyZoneName, zoneCondition } from "@/lib/zone-scope";
import { propertyAddress } from "@/lib/property-address.mjs";
import { nextPropertyOrder } from "@/lib/property-identity";
import { propertyCode } from "@/lib/property-code.mjs";
import { assignedPropertyType } from "@/lib/property-types";
import { registrationInput, PropertyInputError } from "@/lib/property-input.mjs";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmZonas,
  inmPosiciones,
  inmTimeline,
} from "@/db/schema";

// Minimal selector for the property information module, independent of cartera.
export async function GET(request: Request) {
  try {
    const auth = await authorizeApi(undefined, "informacion");
    if (auth.response) return auth.response;
    const rows = await db.select({
      id: inmInmuebles.codigo,
      nombre: inmInmuebles.referencia,
      zona: propertyZoneName,
      zonaId: inmInmuebles.zonaId,
      tipo: inmInmuebles.tipo,
      operacion: inmInmuebles.operacion,
      direccion: inmInmuebles.direccion,
      distrito: inmInmuebles.distrito,
      provincia: inmInmuebles.provincia,
      departamento: inmInmuebles.departamento,
      estado: inmInmuebles.estado,
      contacto: inmInmuebles.nombreContacto,
      posicion: inmPosiciones.numero,
    }).from(inmInmuebles)
      .leftJoin(inmAsignacionesPosicion, and(
        eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id),
        eq(inmAsignacionesPosicion.activa, true),
      ))
      .leftJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId))
      .where(zoneCondition(request))
      .orderBy(sql`CASE WHEN ${inmInmuebles.estado} = 'activo' THEN 0 ELSE 1 END`, sql`${inmPosiciones.numero} IS NULL`, asc(inmPosiciones.numero), asc(inmInmuebles.referencia));
    return NextResponse.json({ inmuebles: rows.map(({ direccion, distrito, provincia, departamento, ...row }) => ({
      ...row,
      estado: row.estado === "activo" ? "activo" : "historico",
      ubicacion: propertyAddress({direccion, distrito, provincia, departamento, zona: row.zona}),
      propietario: row.contacto || "Sin contacto",
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

    const { posicion, tipo: selectedType, ...values } = registrationInput(body);
    const zonaId=Number(body.zonaId);
    if(!Number.isSafeInteger(zonaId)||zonaId<1)throw new PropertyInputError("Selecciona una zona de la cartera.");
    let tipo = selectedType;

    const result = await db.transaction(async (tx) => {
      tipo = await assignedPropertyType(tx, tipo);
      const [zone] = await tx.select().from(inmZonas).where(and(eq(inmZonas.id,zonaId),eq(inmZonas.activo,true))).limit(1).for("update");
      if(!zone || posicion>zone.capacidad)throw new PropertyInputError("La posición no corresponde al cupo de la zona.");
      const requested=new URL(request.url).searchParams.get("zona");
      if(requested && requested!==zone.nombre)throw new PropertyInputError("La zona seleccionada cambió; vuelve a abrir su carpeta.");
      const location={zonaId:zone.id,departamento:zone.departamento,provincia:zone.provincia,distrito:zone.distrito};
      // Buscar y bloquear la posición seleccionada
      const [positionRows] = (await tx.execute(
        sql`
          SELECT id, activo
          FROM inm_posiciones_zona
          WHERE numero = ${posicion} AND zona_id=${zonaId}
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
          FROM inm_asignaciones_zona
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

      const numeroOrden = await nextPropertyOrder(tx);
      const codigo = propertyCode(numeroOrden, tipo, values.referencia);

      // Crear inmueble
      const [createdProperty] = await tx
        .insert(inmInmuebles)
        .values({
          ...values,
          ...location,
          codigo,
          numeroOrden,
          tipo,
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
