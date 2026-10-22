import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmArchivos, inmInmuebles, inmPosiciones, inmAsignacionesPosicion, inmTimeline, securityAudit } from '@/db/schema';
import { propertyIdentifierCondition } from '@/lib/property-identity';
import { documentPath, validateDocument } from '@/lib/document-files.mjs';
import { literalUploadInput, signLiteralUpload, verifyLiteralUpload } from '@/lib/literal-upload.mjs';
import { hostingRequest } from '@/lib/document-hosting';
import { auditValues } from '@/lib/security-audit';
import { fileActivitySnapshot } from '@/lib/file-activity.mjs';

export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, 'informacion');
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  try {
    if (Number(request.headers.get('content-length')) > 16384) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const body = await request.json();
    const [property] = await db.select().from(inmInmuebles).where(propertyIdentifierCondition((await context.params).id)).limit(1);
    if (!property) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    const secret = process.env.DOCUMENT_HOSTING_TOKEN;
    if (body.action === 'prepare') {
      const input = literalUploadInput(body);
      // Detect an older hosting service before sending a large file from the browser.
      const endpoint = new URL(process.env.DOCUMENT_HOSTING_URL || '');
      if (endpoint.protocol !== 'https:' || !secret) throw Error('Hosting no configurado.');
      endpoint.searchParams.set('capabilities', '1');
      const capabilities = await fetch(endpoint, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!capabilities.ok || (await capabilities.json()).literalUploadVersion !== 1) return NextResponse.json({ error: 'Falta actualizar el servicio de documentos en cPanel para habilitar copias literales de hasta 50 MB. Los archivos de hasta 4 MB siguen disponibles.' }, { status: 503 });
      const [position] = await db.select({ numero: inmPosiciones.numero }).from(inmAsignacionesPosicion).innerJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId)).where(eq(inmAsignacionesPosicion.inmuebleId, property.id)).limit(1);
      const path = documentPath({ position: position?.numero ?? null, propertyId: property.id, propertyCode: property.codigo, type: 'COPIA_LITERAL_CRI', name: input.filename.toLowerCase(), uniqueId: randomUUID() });
      const token = signLiteralUpload({ ...input, path, type: 'COPIA_LITERAL_CRI', propertyId: property.id, userId: auth.user.id, expires: Math.floor(Date.now() / 1000) + 1800 }, secret);
      endpoint.searchParams.delete('capabilities'); endpoint.searchParams.set('path', path);
      return NextResponse.json({ token, uploadUrl: endpoint.toString() }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const claims = verifyLiteralUpload(body.token, secret, { propertyId: property.id, userId: auth.user.id });
    if (!['complete', 'cancel'].includes(body.action)) return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
    if (body.action === 'cancel') {
      await db.transaction(async tx => {
        await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id, property.id)).for('update');
        const [existing] = await tx.select({ id: inmArchivos.id }).from(inmArchivos).where(and(eq(inmArchivos.inmuebleId, property.id), eq(inmArchivos.rutaAlmacenamiento, claims.path))).limit(1);
        if (!existing) await hostingRequest('DELETE', claims.path);
      });
      return NextResponse.json({ ok: true });
    }
    const response = await hostingRequest('GET', claims.path);
    if (Number(response.headers.get('content-length')) !== claims.size) throw Error('El archivo recibido no tiene el tamaño autorizado.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== claims.size) throw Error('La subida está incompleta.');
    const { contentType } = validateDocument(claims.filename, bytes, 'COPIA_LITERAL_CRI');
    const usuarioId = auth.user.id;
    const created = await db.transaction(async tx => {
      await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id, property.id)).for('update');
      const [existing] = await tx.select({ id: inmArchivos.id }).from(inmArchivos).where(and(eq(inmArchivos.inmuebleId, property.id), eq(inmArchivos.rutaAlmacenamiento, claims.path))).limit(1);
      if (existing) return existing;
      // Serialize cancellation with confirmation so a deleted upload cannot be registered.
      const stillStored = await hostingRequest('GET', claims.path);
      const storedSize = Number(stillStored.headers.get('content-length'));
      await stillStored.body?.cancel();
      if (storedSize !== claims.size) throw Error('La subida está incompleta.');
      const values = { inmuebleId: property.id, tipoDocumento: 'COPIA_LITERAL_CRI', nombre: claims.nombre, enlace: claims.path, almacenamiento: 'hosting', rutaAlmacenamiento: claims.path, nombreOriginal: claims.filename, tipoMime: contentType, tamanoBytes: claims.size, observacion: claims.observacion || null, usuarioId };
      const [row] = await tx.insert(inmArchivos).values(values).$returningId();
      await tx.insert(securityAudit).values(auditValues(usuarioId, 'file.upload', `file:${row.id}`));
      await tx.insert(inmTimeline).values({ inmuebleId: property.id, usuarioId, evento: 'archivo_subido', observacion: JSON.stringify({ archivo: fileActivitySnapshot({ ...values, id: row.id }, property.operacion) }) });
      return row;
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const safe = /^(Selecciona|La copia|Revisa|Datos de archivo|Autorización|La autorización|Ruta no válida|El archivo recibido|La subida está)/.test(message);
    return NextResponse.json({ error: safe ? message : 'No se pudo procesar la copia literal. Comprueba la conexión y la actualización del servicio de documentos.' }, { status: safe ? 400 : 503 });
  }
}
