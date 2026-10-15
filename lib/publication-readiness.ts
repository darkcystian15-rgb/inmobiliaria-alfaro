import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmInmuebles, inmPublicaciones } from '@/db/schema';
import { publicationChecklist } from '@/lib/publication-checklist.mjs';

// Shared by publication writes, the ficha and portfolio indicators.
export async function publicationReadiness(executor: Pick<typeof db, 'select'> = db, propertyId?: number | number[]) {
  const rows = await executor.select({
    id: inmInmuebles.id,
    texto: inmPublicaciones.texto,
    documentoDni: sql<number>`EXISTS (SELECT 1 FROM inm_archivos a WHERE a.inmueble_id = ${inmInmuebles.id} AND a.tipo_documento = 'DNI_PROPIETARIO' AND a.almacenamiento = 'hosting')`,
    archivoTasacion: sql<number>`EXISTS (SELECT 1 FROM inm_archivos a WHERE a.inmueble_id = ${inmInmuebles.id} AND a.tipo_documento = 'TASACION' AND a.almacenamiento = 'hosting')`,
    fotosVisita: sql<number>`EXISTS (SELECT 1 FROM inm_archivos a INNER JOIN inm_visitas v ON v.id = a.visita_id AND v.inmueble_id = a.inmueble_id AND v.completada = 1 WHERE a.inmueble_id = ${inmInmuebles.id} AND a.tipo_documento = 'FOTO_INMUEBLE' AND a.almacenamiento = 'hosting' AND a.tipo_mime LIKE 'image/%')`,
  }).from(inmInmuebles)
    .leftJoin(inmPublicaciones, eq(inmPublicaciones.inmuebleId, inmInmuebles.id))
    .where(propertyId === undefined ? undefined : Array.isArray(propertyId) ? propertyId.length ? inArray(inmInmuebles.id,propertyId) : sql`0=1` : eq(inmInmuebles.id, propertyId));
  return new Map(rows.map(row => [row.id, { ...row, ...publicationChecklist(row) }]));
}
export async function requirePublicationReadiness(executor: Pick<typeof db, 'select'>, propertyId: number, texto?: string) {
  const row = (await publicationReadiness(executor, propertyId)).get(propertyId);
  const result = publicationChecklist({ ...row, texto: texto ?? row?.texto });
  if (!result.complete) throw new Error(`Expediente incompleto. Falta: ${result.missing.join(', ')}.`);
}
