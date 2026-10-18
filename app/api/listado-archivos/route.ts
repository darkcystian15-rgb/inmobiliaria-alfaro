import { NextResponse } from 'next/server';
import { and, asc, eq, inArray, isNotNull, ne, or, sql } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmArchivos, inmInmuebles, inmZonas } from '@/db/schema';
import { fileListFilters, fileListTypes } from '@/lib/file-list.mjs';
import { propertyPanelId } from '@/lib/property-panel-id.mjs';

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
    const [count] = await db.select({ total: sql<number>`COUNT(*)` }).from(inmArchivos)
      .innerJoin(inmInmuebles, eq(inmInmuebles.id, inmArchivos.inmuebleId))
      .innerJoin(inmZonas, eq(inmZonas.id, inmInmuebles.zonaId)).where(where);
    const rows = await db.select({
      id: inmArchivos.id, inmuebleId: inmInmuebles.id, codigo: inmInmuebles.codigo,
      operacion: inmInmuebles.operacion, tipo: inmInmuebles.tipo, direccion: inmInmuebles.direccion,
      nombre: inmArchivos.nombre, tipoMime: inmArchivos.tipoMime, zona: inmZonas.nombre,
      grupo: categoryGroup,
      numero: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${inmInmuebles.id}, ${categoryGroup} ORDER BY ${inmArchivos.id})`,
    }).from(inmArchivos).innerJoin(inmInmuebles, eq(inmInmuebles.id, inmArchivos.inmuebleId))
      .innerJoin(inmZonas, eq(inmZonas.id, inmInmuebles.zonaId)).where(where)
      .orderBy(asc(inmInmuebles.numeroOrden), categoryGroup, asc(inmArchivos.id))
      .limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);
    const total = Number(count.total);
    return NextResponse.json({
      archivos: rows.map(row => ({
        id: row.id, inmuebleId: row.inmuebleId, inmueble: propertyPanelId(row), zona: row.zona,
        nombre: row.nombre, tipoMime: row.tipoMime, almacenamiento: 'hosting',
        tipo: `${fileListTypes.find(type => type.key === row.grupo)!.singular} ${Number(row.numero)}`,
        enlace: `/api/inmuebles/${row.inmuebleId}/archivos/${row.id}`,
      })),
      paginacion: { pagina: filters.page, paginas: Math.ceil(total / filters.pageSize), total },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo consultar el listado de archivos.' }, { status: 500 }); }
}
