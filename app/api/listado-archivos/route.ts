import { propertyLastPosition } from '@/lib/property-position';
import { NextResponse } from 'next/server';
import { and, asc, eq, inArray, isNotNull, ne, or, sql } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmArchivos, inmInmuebles, inmZonas } from '@/db/schema';
import { fileListFilters, fileListTypes } from '@/lib/file-list.mjs';
import { propertyPanelContactId } from '@/lib/property-panel-id.mjs';

export async function GET(request: Request) {
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  let filters: ReturnType<typeof fileListFilters>;
  try { filters = fileListFilters(new URL(request.url).searchParams); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Filtros no válidos.' }, { status: 400 }); }
  try {
    const selected = fileListTypes.filter(type => filters.type === '*' || type.key === filters.type);
    const categories = selected.flatMap(type => type.categories);
    const categoryCondition = selected.some(type => type.key === 'contratos-alquiler')
      ? or(inArray(inmArchivos.tipoDocumento, categories), and(eq(inmArchivos.tipoDocumento, 'CONTRATO'), eq(inmInmuebles.operacion, 'alquiler')))
      : inArray(inmArchivos.tipoDocumento, categories);
    const where = and(
      eq(inmZonas.activo, true), eq(inmArchivos.almacenamiento, 'hosting'),
      isNotNull(inmArchivos.rutaAlmacenamiento), ne(inmArchivos.rutaAlmacenamiento, ''), categoryCondition,
      filters.zone === '*' ? undefined : eq(inmZonas.nombre, filters.zone),
    );
    // Number before pagination, grouping legacy and current categories into the same user-facing type.
    const categoryGroup = sql<string>`CASE
      WHEN ${inmArchivos.tipoDocumento} IN ('TASACION','TASACION_EXPRESS','TASACION_PROPIETARIO') THEN 'tasaciones'
      WHEN ${inmArchivos.tipoDocumento} IN ('CONTRATO','CONTRATO_ALQUILER') THEN 'contratos-alquiler'
      WHEN ${inmArchivos.tipoDocumento} = 'MINUTA_COMPRAVENTA' THEN 'minutas'
      ELSE 'escrituras' END`;
    const numbered = db.select({
      numeroOrden: inmInmuebles.numeroOrden, id: inmArchivos.id, inmuebleId: sql<number>`${inmInmuebles.id}`.as('inmueble_id'), codigo: inmInmuebles.codigo,
      operacion: inmInmuebles.operacion, tipo: inmInmuebles.tipo, direccion: inmInmuebles.direccion,
      nombreContacto: inmInmuebles.nombreContacto, posicion: propertyLastPosition.as('posicion'),
      nombre: inmArchivos.nombre, nombreOriginal: inmArchivos.nombreOriginal, tipoMime: inmArchivos.tipoMime, zona: sql<string>`${inmZonas.nombre}`.as('zona'),
      grupo: categoryGroup.as('grupo'),
      numero: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${inmInmuebles.id}, ${categoryGroup} ORDER BY ${inmArchivos.id})`.as('numero'),
    }).from(inmArchivos).innerJoin(inmInmuebles, eq(inmInmuebles.id, inmArchivos.inmuebleId))
      .innerJoin(inmZonas, eq(inmZonas.id, inmInmuebles.zonaId)).where(where)
      .as('numbered_files');
    // Search after numbering so matching one document does not rename it “1”.
    const search = filters.query ? and(...filters.query.split(/[\s-]+/).filter(Boolean).map((term: string) => sql`LOCATE(${term}, CONCAT_WS(' ',
      ${numbered.codigo}, LPAD(COALESCE(${numbered.posicion}, SUBSTRING_INDEX(${numbered.codigo}, '-', 1)), 3, '0'),
      ${numbered.operacion}, ${numbered.tipo}, ${numbered.direccion}, ${numbered.nombreContacto},
      ${numbered.nombre}, ${numbered.nombreOriginal}, ${numbered.zona})) > 0`)) : undefined;
    const [count] = await db.select({ total: sql<number>`COUNT(*)` }).from(numbered).where(search);
    const total = Number(count.total), pages = Math.ceil(total / filters.pageSize);
    const page = Math.min(filters.page, Math.max(1, pages));
    const rows = await db.select().from(numbered).where(search)
      .orderBy(asc(numbered.numeroOrden), numbered.grupo, asc(numbered.id))
      .limit(filters.pageSize).offset((page - 1) * filters.pageSize);
    return NextResponse.json({
      archivos: rows.map(row => ({
        id: row.id, inmuebleId: row.inmuebleId, inmueble: propertyPanelContactId(row), zona: row.zona,
        nombre: row.nombreOriginal || row.nombre, tipoMime: row.tipoMime, almacenamiento: 'hosting',
        tipo: `${fileListTypes.find(type => type.key === row.grupo)!.singular} ${Number(row.numero)}`,
        enlace: `/api/inmuebles/${row.inmuebleId}/archivos/${row.id}`,
      })),
      paginacion: { pagina: page, paginas: pages, total },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo consultar el listado de archivos.' }, { status: 500 }); }
}
