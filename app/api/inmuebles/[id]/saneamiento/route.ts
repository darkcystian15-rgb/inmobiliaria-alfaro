import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmArchivos, inmInmuebles, inmTimeline, securityAudit } from '@/db/schema';
import { assertWritable } from '@/lib/data-integrity-service';
import { propertyIdentifierCondition } from '@/lib/property-identity';
import { readDossier, writeSaneamiento } from '@/lib/dossier-record';
import { changeSaneamiento } from '@/lib/saneamiento-folders.mjs';
import { auditValues } from '@/lib/security-audit';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, 'informacion');
  if (auth.response) return auth.response;
  let body;
  try {
    body = await request.json();
    if (!body || !['create', 'rename', 'move', 'delete'].includes(body.action) || !Number.isSafeInteger(body.version) || body.version < 0) throw Error();
  } catch { return NextResponse.json({ error: 'Acción de subcarpeta no válida.' }, { status: 400 }); }
  try {
    const result = await db.transaction(async tx => {
      const [property] = await tx.select({ id: inmInmuebles.id, operacion: inmInmuebles.operacion }).from(inmInmuebles).where(propertyIdentifierCondition((await context.params).id)).limit(1).for('update');
      if (!property) return { error: 'Inmueble no encontrado.', status: 404 };
      await assertWritable(tx, property.id);
      const record = await readDossier(property.id, tx);
      if (record.version !== body.version) return { error: 'Otra persona actualizó el expediente. Recarga antes de guardar.', status: 409 };
      const files = await tx.select({ id: inmArchivos.id, tipoDocumento: inmArchivos.tipoDocumento, nombre: inmArchivos.nombre }).from(inmArchivos).where(eq(inmArchivos.inmuebleId, property.id));
      let saneamiento;
      try { saneamiento = changeSaneamiento(record.config.saneamiento, body, files, randomUUID()); }
      catch (error) { return { error: (error as Error).message, status: 400 }; }
      const next = await writeSaneamiento(property.id, record, saneamiento, tx);
      const oldFolder = record.config.saneamiento.folders.find(folder => folder.id === body.folderId);
      const file = files.find(file => file.id === body.fileId);
      const previousFolder = record.config.saneamiento.folders.find(folder => folder.id === record.config.saneamiento.files[String(body.fileId)]);
      const detail = body.action === 'move'
        ? { actividad: 'Documento movido', archivo: file?.nombre, anterior: previousFolder?.nombre || 'Carpeta principal', nuevo: oldFolder?.nombre || 'Carpeta principal' }
        : { actividad: ({ create: 'Subcarpeta creada', rename: 'Subcarpeta renombrada', delete: 'Subcarpeta vacía eliminada' } as Record<string, string>)[body.action], anterior: oldFolder?.nombre, nuevo: body.nombre };
      await tx.insert(inmTimeline).values({ inmuebleId: property.id, evento: 'saneamiento_organizado', observacion: JSON.stringify(detail), usuarioId: auth.user.id });
      await tx.insert(securityAudit).values(auditValues(auth.user.id, `saneamiento.${body.action}`, `property:${property.id}`));
      return next;
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    const closed = error instanceof Error && /expediente está cerrado|eliminación en curso/.test(error.message);
    return NextResponse.json({ error: closed ? error.message : 'No se pudo organizar el saneamiento.' }, { status: closed ? 409 : 500 });
  }
}
