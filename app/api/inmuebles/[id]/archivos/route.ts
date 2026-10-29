import { assertWritable } from '@/lib/data-integrity-service';
import { inmTareasArchivos } from '@/db/schema';
import { pool } from '@/lib/db';
import { prepareUpload, cleanFileJob } from '@/lib/data-integrity.mjs';
import { canWritePropertyFile } from '@/lib/phase-one-access.mjs';
import { isAdministrator } from '@/lib/access.mjs';
import { fileActivitySnapshot } from '@/lib/file-activity.mjs';
import { propertyIdentifierCondition } from "@/lib/property-identity";
import { auditValues } from "@/lib/security-audit";
import { authorizeApi } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { hostingRequest } from '@/lib/document-hosting';
import { IMAGE_EXTENSIONS, prepareImage } from '@/lib/image-files.mjs';
import { db } from '@/lib/db';
import { inmArchivos, inmInmuebles, inmAsignacionesPosicion, inmPosiciones, inmVisitas, inmTimeline, securityAudit } from '@/db/schema';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, documentPath, storageConfigured, storeDocument, validateDocument } from '@/lib/document-files.mjs';
import { documentByteLimit } from '@/lib/document-limits.mjs';
import { readDossier } from '@/lib/dossier-record';
import { dossierDocuments, documentApplies, dossierDocumentType, validateExtraDocumentDescription } from '@/lib/transaction-dossier.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function findInmueble(key: string) {
  const [row] = await db.select({ id: inmInmuebles.id, codigo: inmInmuebles.codigo, operacion: inmInmuebles.operacion }).from(inmInmuebles)
    .where(propertyIdentifierCondition(key)).limit(1);
  return row;
}
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeApi(undefined, 'informacion');
    if (auth.response) return auth.response;
    const inmueble = await findInmueble((await context.params).id);
    if (!inmueble) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    const rows = await db.select().from(inmArchivos).where(eq(inmArchivos.inmuebleId, inmueble.id)).orderBy(asc(inmArchivos.tipoDocumento), asc(inmArchivos.fechaRegistro));
    const archivos = rows.map(row => ({ ...row, enlace: row.almacenamiento === 'hosting' ? `/api/inmuebles/${inmueble.id}/archivos/${row.id}` : row.enlace, rutaAlmacenamiento: undefined }));
    return NextResponse.json({ archivos, subidaHabilitada: storageConfigured() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { if(error instanceof Error && /expediente está cerrado|eliminación en curso/.test(error.message)) return NextResponse.json({error:error.message},{status:409}); return NextResponse.json({ error: 'No se pudieron consultar los archivos.' }, { status: 500 }); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeApi(request, 'informacion');
    if (auth.response) return auth.response;
    const inmueble = await findInmueble((await context.params).id);
    if (!inmueble) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    if (!auth.user) return NextResponse.json({ error: 'Usuario no disponible.' }, { status: 401 });
    const usuarioId = auth.user.id;
    const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data');
    if (Number(request.headers.get('content-length')) > MAX_DOCUMENT_BYTES + 65536) return NextResponse.json({ error: 'El archivo debe pesar como máximo 4 MB.' }, { status: 413 });
    let body: Record<string, unknown>;
    let file: File | null = null;
    try {
      if (multipart) {
        const form = await request.formData();
        body = Object.fromEntries(form.entries());
        const selected = form.get('archivo');
        if (selected instanceof File) file = selected;
      } else body = await request.json();
    } catch (error) { if(error instanceof Error && /expediente está cerrado|eliminación en curso/.test(error.message)) return NextResponse.json({error:error.message},{status:409}); return NextResponse.json({ error: 'Solicitud de documento no válida.' }, { status: 400 }); }
    const requestedType = String(body.tipoDocumento ?? '').trim();
    const tipoDocumento = dossierDocumentType(requestedType, inmueble.operacion), nombre = String(body.nombre ?? '').trim(), observacion = String(body.observacion ?? '').trim();
    if (!DOCUMENT_TYPES.has(tipoDocumento) || !nombre || nombre.length > 255 || observacion.length > 500) return NextResponse.json({ error: 'Revisa el tipo, nombre (máximo 255 caracteres) y observación (máximo 500).' }, { status: 400 });
    try { validateExtraDocumentDescription(tipoDocumento, observacion); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    if (!canWritePropertyFile(auth.user, tipoDocumento)) return NextResponse.json({ error: 'La FASE 1 es de solo consulta para el operador.' }, { status: 403 });
    const definition = dossierDocuments.find(item => item.key === tipoDocumento);
    if (definition && !documentApplies(definition, (await readDossier(inmueble.id)).config, inmueble.operacion)) return NextResponse.json({ error: 'Guarda primero el tipo de persona y las condiciones de esta sección del expediente.' }, { status: 409 });
    const visitaId = body.visitaId === undefined ? null : Number(body.visitaId);
    if (visitaId !== null) {
      if (!multipart || tipoDocumento !== 'FOTO_INMUEBLE' || !Number.isSafeInteger(visitaId) || visitaId < 1) return NextResponse.json({ error: 'La visita seleccionada no es válida.' }, { status: 400 });
      const [visit] = await db.select({ id: inmVisitas.id }).from(inmVisitas).where(and(eq(inmVisitas.id, visitaId), eq(inmVisitas.inmuebleId, inmueble.id), eq(inmVisitas.completada, true))).limit(1);
      if (!visit) return NextResponse.json({ error: 'La visita no corresponde a este inmueble o no está realizada.' }, { status: 400 });
    }
    // Compatibility for previously registered external links and existing API clients.
    if (!multipart) {
      const enlace = String(body.enlace ?? '').trim();
      if (tipoDocumento === 'FOTO_INMUEBLE') return NextResponse.json({ error: 'Sube una imagen directamente; no se admiten enlaces para fotos.' }, { status: 400 });
      if (!/^https?:\/\//i.test(enlace) || enlace.length > 1000) return NextResponse.json({ error: 'Enlace no válido.' }, { status: 400 });
      const created = await db.transaction(async tx => {
        await tx.select({id:inmInmuebles.id}).from(inmInmuebles).where(eq(inmInmuebles.id,inmueble.id)).for('update');
      await assertWritable(tx, inmueble.id);
        if(definition&&!documentApplies(definition,(await readDossier(inmueble.id,tx)).config,inmueble.operacion))throw new Error('Las condiciones del expediente cambiaron.');
        const [row]=await tx.insert(inmArchivos).values({inmuebleId:inmueble.id,tipoDocumento,nombre,enlace,observacion:observacion||null,usuarioId}).$returningId();
        await tx.insert(securityAudit).values(auditValues(usuarioId,'file.link',`file:${row.id}`));
        await tx.insert(inmTimeline).values({inmuebleId:inmueble.id,usuarioId,evento:'archivo_enlazado',observacion:JSON.stringify({archivo:fileActivitySnapshot({...row,tipoDocumento,nombre,observacion},inmueble.operacion)})});
      await tx.delete(inmTareasArchivos).where(eq(inmTareasArchivos.id, uploadJob));
      return row;
      });
      return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
    }
    if (!file) return NextResponse.json({ error: 'Selecciona un archivo.' }, { status: 400 });
    if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: 'El archivo debe pesar como máximo 4 MB.' }, { status: 413 });
    if (file.name.length > 255) return NextResponse.json({ error: 'El nombre del archivo es demasiado largo.' }, { status: 400 });
    let bytes = Buffer.from(await file.arrayBuffer());
    let storedName = file.name;
    let contentType: string;
    try {
      if (IMAGE_EXTENSIONS.has(file.name.split('.').pop()?.toLowerCase() || '')) {
        const prepared = await prepareImage(file.name, bytes);
        bytes = prepared.bytes; storedName = prepared.name; contentType = prepared.contentType;
      } else {
        if (tipoDocumento === 'FOTO_INMUEBLE') throw new Error('Las fotos del inmueble deben ser imágenes JPG, PNG o WebP.');
        contentType = validateDocument(file.name, bytes).contentType;
      }
    }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Archivo no válido.' }, { status: 400 }); }
    if (!storageConfigured()) return NextResponse.json({ error: 'Falta configurar el almacenamiento de documentos.' }, { status: 503 });
    const [position] = await db.select({ numero: inmPosiciones.numero }).from(inmAsignacionesPosicion).innerJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId)).where(and(eq(inmAsignacionesPosicion.inmuebleId, inmueble.id), eq(inmAsignacionesPosicion.activa, true))).limit(1);
    const pathname = documentPath({ position: position?.numero ?? null, propertyId: inmueble.id, propertyCode: inmueble.codigo, type: tipoDocumento, name: storedName, uniqueId: randomUUID() });
    const originalName = file.name;
    const uploadJob = await prepareUpload(pool, inmueble.id, pathname);
    const created = await storeDocument({ pathname, bytes,
      upload: async (path: string, data: Uint8Array) => { await hostingRequest('PUT', path, data); },
      remove: async () => { await pool.query('UPDATE inm_tareas_archivos SET expira=NOW() WHERE id=?',[uploadJob]); },
      register: async (stored: { pathname: string }) => {
      return db.transaction(async tx => {
      await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id, inmueble.id)).for('update');
      await assertWritable(tx, inmueble.id);
      if (definition && !documentApplies(definition, (await readDossier(inmueble.id, tx)).config, inmueble.operacion)) throw new Error('Las condiciones del expediente cambiaron.');
      if (visitaId !== null) {
        const [visit] = await tx.select({ id: inmVisitas.id }).from(inmVisitas).where(and(eq(inmVisitas.id, visitaId), eq(inmVisitas.inmuebleId, inmueble.id), eq(inmVisitas.completada, true))).limit(1).for('update');
        if (!visit) throw new Error('La visita ya no está disponible.');
      }
      const [jobs] = await tx.execute(sql`SELECT id FROM inm_tareas_archivos WHERE id=${uploadJob} FOR UPDATE`);
      if (!(jobs as unknown as {id:string}[]).length) throw new Error('La autorización de subida venció.');
      const [row] = await tx.insert(inmArchivos).values({ inmuebleId: inmueble.id, visitaId, tipoDocumento, nombre, enlace: stored.pathname, almacenamiento: 'hosting', rutaAlmacenamiento: stored.pathname, nombreOriginal: originalName, tamanoBytes: bytes.length, tipoMime: contentType, observacion: observacion || null, usuarioId }).$returningId();
      await tx.insert(securityAudit).values(auditValues(usuarioId,"file.upload",`file:${row.id}`));
      await tx.insert(inmTimeline).values({inmuebleId:inmueble.id,usuarioId,evento:'archivo_subido',observacion:JSON.stringify({archivo:fileActivitySnapshot({...row,tipoDocumento,nombre,nombreOriginal:originalName,tipoMime:contentType,tamanoBytes:bytes.length,visitaId,observacion},inmueble.operacion)})});
      await tx.delete(inmTareasArchivos).where(eq(inmTareasArchivos.id, uploadJob));
      return row;
      });
    } });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) { if(error instanceof Error && /expediente está cerrado|eliminación en curso/.test(error.message)) return NextResponse.json({error:error.message},{status:409}); return NextResponse.json({ error: 'No se pudo guardar el documento. Comprueba la configuración del almacenamiento de documentos.' }, { status: 500 }); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeApi(request);
    if (auth.response) return auth.response;
    const inmueble = await findInmueble((await context.params).id);
    if (!inmueble) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    const fileId = Number(new URL(request.url).searchParams.get('archivoId'));
    if (!Number.isSafeInteger(fileId) || fileId < 1) return NextResponse.json({ error: 'Archivo no válido.' }, { status: 400 });
    const condition = and(eq(inmArchivos.id, fileId), eq(inmArchivos.inmuebleId, inmueble.id));
    const found = await db.transaction(async tx => {
      await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id, inmueble.id)).for('update');
      await assertWritable(tx, inmueble.id);
      const [file] = await tx.select().from(inmArchivos).where(condition).limit(1).for('update');
      if (!file) return false;
      const jobId = randomUUID();
      if (file.almacenamiento === 'hosting') {
        if (!file.rutaAlmacenamiento) throw new Error('Ruta no disponible.');
        await tx.insert(inmTareasArchivos).values({id:jobId,inmuebleId:inmueble.id,archivoId:file.id,ruta:file.rutaAlmacenamiento,tipo:'borrado',usuarioId:auth.user.id,expira:new Date()});
      }
      await tx.delete(inmArchivos).where(condition);
      await tx.insert(inmTimeline).values({inmuebleId:inmueble.id,usuarioId:auth.user.id,evento:'archivo_eliminado',observacion:JSON.stringify({archivo:fileActivitySnapshot(file,inmueble.operacion)})});
      await tx.insert(securityAudit).values(auditValues(auth.user.id,"file.delete",`file:${fileId}`));
      return file.almacenamiento === 'hosting' ? jobId : true;
    });
    if (!found) return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
    if (typeof found === 'string') {
      const connection=await pool.getConnection();
      try { await cleanFileJob(connection,found,async (path:string)=>{await hostingRequest('DELETE',path);}); }
      catch { return NextResponse.json({ok:true,pendiente:true,mensaje:'Documento retirado; limpieza del archivo pendiente.'},{status:202}); }
      finally {connection.release();}
    }
    return NextResponse.json({ ok: true });
  } catch (error) { if(error instanceof Error && /expediente está cerrado|eliminación en curso/.test(error.message)) return NextResponse.json({error:error.message},{status:409}); return NextResponse.json({ error: 'No se pudo eliminar el documento. Puedes intentarlo de nuevo.' }, { status: 500 }); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeApi(request, 'informacion');
    if (auth.response) return auth.response;
    const inmueble = await findInmueble((await context.params).id);
    if (!inmueble) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Datos no válidos.' }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
    const archivoId = Number(body.archivoId);
    const nombre = String(body.nombre ?? '').trim();
    const observacion = String(body.observacion ?? '').trim();
    if (!Number.isSafeInteger(archivoId) || archivoId < 1 || !nombre || nombre.length > 255 || observacion.length > 500 || (body.esPortada !== undefined && typeof body.esPortada !== 'boolean')) return NextResponse.json({ error: 'Revisa el nombre y la descripción de la foto.' }, { status: 400 });
    if (body.tipoDocumento !== undefined) {
      const definition = dossierDocuments.find(item => item.key === body.tipoDocumento);
      if (!definition || body.esPortada !== undefined) return NextResponse.json({ error: 'Categoría del expediente no válida.' }, { status: 400 });
      try { validateExtraDocumentDescription(definition.key, observacion); }
      catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
      const result = await db.transaction(async tx => {
        await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id, inmueble.id)).for('update');
      await assertWritable(tx, inmueble.id);
        if (!documentApplies(definition, (await readDossier(inmueble.id, tx)).config, inmueble.operacion)) return 'conditions';
        const condition = and(eq(inmArchivos.id, archivoId), eq(inmArchivos.inmuebleId, inmueble.id));
        const [file] = await tx.select().from(inmArchivos).where(condition).limit(1).for('update');
        if (!file || file.tipoDocumento === 'FOTO_INMUEBLE') return 'missing';
        if (!canWritePropertyFile(auth.user, file.tipoDocumento)) return 'forbidden';
        if (file.tamanoBytes && file.tamanoBytes > documentByteLimit(definition.key)) return 'size';
        if(file.nombre===nombre&&(file.observacion||null)===(observacion||null)&&file.tipoDocumento===definition.key)return 'ok';
        await tx.update(inmArchivos).set({ nombre, observacion: observacion || null, tipoDocumento: definition.key }).where(condition);
        await tx.insert(securityAudit).values(auditValues(auth.user.id, 'dossier.file.update', `file:${archivoId}`));
        await tx.insert(inmTimeline).values({inmuebleId:inmueble.id,usuarioId:auth.user.id,evento:'archivo_actualizado',observacion:JSON.stringify({anterior:fileActivitySnapshot(file,inmueble.operacion),nuevo:fileActivitySnapshot({...file,nombre,observacion:observacion||null,tipoDocumento:definition.key},inmueble.operacion)})});
        return 'ok';
      });
      if (result !== 'ok') return NextResponse.json({ error: result === 'forbidden' ? 'La FASE 1 es de solo consulta para el operador.' : result === 'missing' ? 'Documento no encontrado.' : result === 'size' ? 'Los documentos de más de 4 MB solo pueden permanecer en Copia literal o CRI.' : 'Guarda primero las condiciones de esta categoría.' }, { status: result === 'forbidden' ? 403 : result === 'missing' ? 404 : 409 });
      return NextResponse.json({ ok: true });
    }
    if (!isAdministrator(auth.user)) return NextResponse.json({ error: 'La FASE 1 es de solo consulta para el operador.' }, { status: 403 });
    const found = await db.transaction(async tx => {
      // Lock the property so simultaneous cover changes keep a single cover.
      await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id, inmueble.id)).for('update');
      await assertWritable(tx, inmueble.id);
      const condition = and(eq(inmArchivos.id, archivoId), eq(inmArchivos.inmuebleId, inmueble.id), eq(inmArchivos.tipoDocumento, 'FOTO_INMUEBLE'), eq(inmArchivos.almacenamiento, 'hosting'));
      const [file] = await tx.select().from(inmArchivos).where(condition).limit(1);
      if (!file?.tipoMime?.startsWith('image/')) return false;
      if(file.nombre===nombre&&(file.observacion||null)===(observacion||null)&&(body.esPortada===undefined||file.esPortada===body.esPortada))return true;
      if (body.esPortada === true) await tx.update(inmArchivos).set({ esPortada: false }).where(and(eq(inmArchivos.inmuebleId, inmueble.id), eq(inmArchivos.tipoDocumento, 'FOTO_INMUEBLE')));
      await tx.update(inmArchivos).set({ nombre, observacion: observacion || null, ...(typeof body.esPortada === 'boolean' ? { esPortada: body.esPortada } : {}) }).where(condition);
      await tx.insert(securityAudit).values(auditValues(auth.user.id,"photo.update",`file:${archivoId}`));
      await tx.insert(inmTimeline).values({inmuebleId:inmueble.id,usuarioId:auth.user.id,evento:'archivo_actualizado',observacion:JSON.stringify({anterior:fileActivitySnapshot(file,inmueble.operacion),nuevo:fileActivitySnapshot({...file,nombre,observacion:observacion||null,...(typeof body.esPortada==='boolean'?{esPortada:body.esPortada}:{})},inmueble.operacion)})});
      return true;
    });
    if (!found) return NextResponse.json({ error: 'Foto no encontrada.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { if(error instanceof Error && /expediente está cerrado|eliminación en curso/.test(error.message)) return NextResponse.json({error:error.message},{status:409}); return NextResponse.json({ error: 'No se pudo actualizar la foto.' }, { status: 500 }); }
}
