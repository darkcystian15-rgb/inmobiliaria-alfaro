import { propertyIdentifierCondition } from "@/lib/property-identity";
import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmInmuebles, inmVisitas, inmUsuarios } from '@/db/schema';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeApi(undefined, 'informacion');
    if (auth.response) return auth.response;
    const key = (await context.params).id;
    const [property] = await db.select({ id: inmInmuebles.id }).from(inmInmuebles)
      .where(propertyIdentifierCondition(key)).limit(1);
    if (!property) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    const visitas = await db.select({
      id: inmVisitas.id, fecha: inmVisitas.fechaVisita, observaciones: inmVisitas.observaciones,
      responsable: inmUsuarios.nombre,
      fotos: sql<number>`(SELECT COUNT(*) FROM inm_archivos a WHERE a.visita_id=${inmVisitas.id} AND a.inmueble_id=${inmVisitas.inmuebleId} AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime LIKE 'image/%')`,
    }).from(inmVisitas).leftJoin(inmUsuarios, eq(inmUsuarios.id, inmVisitas.usuarioId))
      .where(and(eq(inmVisitas.inmuebleId, property.id), eq(inmVisitas.completada, true)))
      .orderBy(desc(inmVisitas.fechaVisita), desc(inmVisitas.id));
    return NextResponse.json({ visitas: visitas.map(visit => ({ ...visit, pendienteEvidencia: Number(visit.fotos) === 0 })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudieron consultar las visitas.' }, { status: 500 });
  }
}
