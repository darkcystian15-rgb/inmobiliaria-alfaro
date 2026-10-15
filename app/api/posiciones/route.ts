import { positionZoneCondition } from "@/lib/zone-scope";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
} from "@/db/schema";

const tipoMap: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  local: "Local",
  oficina: "Oficina",
  otros: "Otros",
};

export async function GET(request: Request) {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    const rows = await db
      .select({
        id: inmPosiciones.id,
        zonaId: inmPosiciones.zonaId,
        zona: sql<string>`(SELECT z.nombre FROM inm_zonas z WHERE z.id=${inmPosiciones.zonaId})`,
        numero: inmPosiciones.numero,
        activa: inmPosiciones.activo,
        inmuebleId: inmInmuebles.id,
        codigo: inmInmuebles.codigo,
        referencia: inmInmuebles.referencia,
        tipo: inmInmuebles.tipo,
        propietarioNombres: inmInmuebles.nombreContacto,
        propietarioApellidos: sql<string>`NULL`,
      })
      .from(inmPosiciones)
      .leftJoin(
        inmAsignacionesPosicion,
        and(
          eq(inmAsignacionesPosicion.posicionId, inmPosiciones.id),
          eq(inmAsignacionesPosicion.activa, true)
        )
      )
      .leftJoin(
        inmInmuebles,
        eq(inmInmuebles.id, inmAsignacionesPosicion.inmuebleId)
      )

      .where(and(eq(inmPosiciones.activo,true),positionZoneCondition(request)))
      .orderBy(inmPosiciones.zonaId,inmPosiciones.numero);

    return NextResponse.json({
      posiciones: rows.map((row) => ({
        id:row.id,zonaId:row.zonaId,zona:row.zona,
        numero: row.numero,
        disponible: Boolean(row.activa) && row.inmuebleId == null,
        codigo: row.codigo ?? null,
        nombre: row.referencia ?? null,
        tipo: row.tipo
          ? tipoMap[row.tipo.toLowerCase()] ?? row.tipo
          : null,
        propietario:
          [row.propietarioNombres, row.propietarioApellidos]
            .filter(Boolean)
            .join(" ") || null,
      })),
    });
  } catch (error) {
    console.error("Operación fallida: posiciones", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      { error: "No se pudo consultar la disponibilidad de posiciones." },
      { status: 500 }
    );
  }
}
