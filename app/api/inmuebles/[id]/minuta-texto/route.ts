import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { db, pool } from '@/lib/db';
import { inmInmuebles, inmArchivos, inmTimeline, securityAudit } from '@/db/schema';
import { authorizeApi } from '@/lib/auth';
import { auditValues } from '@/lib/security-audit';
import { assertWritable } from '@/lib/data-integrity-service';
import { propertyIdentifierCondition } from '@/lib/property-identity';
import sharp from 'sharp';
import type { MinuteDocument } from '@/lib/minute-document';
import { intermediationStructureBase } from '@/lib/minute-template';
import { minuteInput } from '@/lib/minute-document';
import { documentEditorConfig, documentEditorKind } from '@/lib/document-editor';
import { readMinute } from '@/lib/minute-record';
import { MINUTE_PDF_DESIGN, minutePdf } from '@/lib/minute-export';
import { hostingRequest } from '@/lib/document-hosting';
import { minuteDocx, WORD_MIME } from '@/lib/minute-docx';
import { extractMinuteWord } from '@/lib/minute-word';
import { POST as uploadDocument } from '../archivos/route';

export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
const privateHeaders = { 'Cache-Control': 'private, no-store' };
async function find(context: Context) {
  const [property] = await db.select().from(inmInmuebles).where(propertyIdentifierCondition((await context.params).id)).limit(1);
  if (!property) throw new InputError('Inmueble no encontrado.', 404);
  if (!['venta', 'alquiler'].includes(property.operacion)) throw new InputError('La estructura requiere una operación de venta o alquiler.');
  return property;
}
function errorResponse(error: unknown) {
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && /cerrado|eliminación/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ error: 'No se pudo completar la operación. El texto guardado y los archivos originales se conservan.' }, { status: 500 });
}
async function bodyFor(request: Request) {
  try { const body = await request.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); return body; } catch { throw new InputError('Solicitud no válida.'); }
}
function scope(request: Request, operation: string) {
  try {
    const kind = documentEditorKind(new URL(request.url).searchParams.get('document'));
    return { kind, ...documentEditorConfig(kind, operation) };
  } catch (error) { throw new InputError((error as Error).message); }
}
async function documentImages(data: MinuteDocument, property: { id: number; operacion: string }, category: string, load = false, executor: Pick<typeof db, 'select'> = db) {
  const images: Record<number, Uint8Array> = {};
  let total = 0;
  for (const fileId of new Set((data.images || []).map(image => image.fileId))) {
    const [file] = await executor.select().from(inmArchivos).where(and(eq(inmArchivos.id, fileId), eq(inmArchivos.inmuebleId, property.id), eq(inmArchivos.tipoDocumento, category), eq(inmArchivos.almacenamiento, 'hosting'))).limit(1);
    if (!file?.rutaAlmacenamiento || !['image/png', 'image/jpeg', 'image/webp'].includes(file.tipoMime || '') || Number(file.tamanoBytes) > 4 * 1024 * 1024) throw new InputError('Una imagen ya no está disponible en este apartado. Retírala o vuelve a subirla.', 422);
    if (!load) continue;
    const response = await hostingRequest('GET', file.rutaAlmacenamiento);
    if (!response.ok || !response.body) throw new InputError('No se pudo leer una imagen. Reintenta antes de exportar el documento.', 422);
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; total += value.byteLength;
        if (size > 4 * 1024 * 1024 || total > 16 * 1024 * 1024) { await reader.cancel(); throw new InputError('Las imágenes superan el tamaño permitido para exportar.', 422); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    try { images[fileId] = new Uint8Array(await sharp(Buffer.concat(chunks), { limitInputPixels: 40000000 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).png().toBuffer()); }
    catch { throw new InputError('Una imagen está dañada. Retírala o vuelve a subirla.', 422); }
  }
  return images;
}
export async function GET(_request: Request, context: Context) {
  const auth = await authorizeApi(undefined, 'informacion'); if (auth.response) return auth.response;
  try {
    const property = await find(context), config = scope(_request, property.operacion), saved = await readMinute(property.id, db, property.operacion, config.kind);
    const query = new URL(_request.url).searchParams;
    if (query.get('format') === 'pdf') {
      if (!saved.version || saved.version !== Number(query.get('version'))) throw new InputError('El texto cambió. Vuelve al editor y abre el archivo actualizado.', 409);
      if (!saved.data.text.trim()) throw new InputError('Completa el texto del documento.');
      return new NextResponse(new Uint8Array(await minutePdf(saved.data, { kind: config.kind, propertyCode: property.codigo, images: await documentImages(saved.data, property, config.category, true) })), { headers: { ...privateHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${config.filename}.pdf"`, 'X-Content-Type-Options': 'nosniff' } });
    }
    return NextResponse.json({ ...saved, propertyCode: property.codigo, property: { operation: property.operacion, type: property.tipo, address: property.direccion, code: property.codigo } }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion'); if (auth.response) return auth.response;
  try {
    const body = await bodyFor(request);
    if (!Number.isSafeInteger(body.version) || body.version < 0) throw new InputError('Versión no válida.');
    let data; try { data = minuteInput(body.data); } catch (error) { throw new InputError((error as Error).message); }
    const property = await find(context), config = scope(request, property.operacion);
    const version = await db.transaction(async tx => {
      await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id, property.id)).for('update');
      await assertWritable(tx, property.id);
      const current = await readMinute(property.id, tx, property.operacion, config.kind);
      if (current.version !== body.version) throw new InputError('Otra persona guardó cambios. Copia tu texto y compara con la versión actual antes de recargar.', 409);
      await documentImages(data, property, config.category, false, tx);
      const [inserted] = await tx.insert(inmTimeline).values({ inmuebleId: property.id, evento: config.event, observacion: JSON.stringify(data), usuarioId: auth.user.id });
      await tx.insert(securityAudit).values(auditValues(auth.user.id, 'minute.save', `property:${property.id}:${config.category}`));
      return inserted.insertId;
    });
    return NextResponse.json({ version }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion'); if (auth.response) return auth.response;
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined; let lock = '';
  try {
    const body = await bodyFor(request), property = await find(context), config = scope(request, property.operacion);
    if (body.action === 'download-word') {
      let data: MinuteDocument;
      try { data = minuteInput(body.data); } catch (error) { throw new InputError((error as Error).message); }
      if (!data.text.trim()) throw new InputError('Escribe el contenido del documento.');
      const images = await documentImages(data, property, config.category, true);
      const intermediation = config.kind === 'intermediation-structure';
      const source = intermediation ? intermediationStructureBase(property.operacion) : null;
      const originalModel = source && !data.images?.length && !data.highlights?.length
        && data.text === source.text && data.layout === source.layout
        && JSON.stringify(data.formats) === JSON.stringify(source.formats)
        && JSON.stringify(data.paragraphs) === JSON.stringify(source.paragraphs);
      const bytes = originalModel
        ? await readFile(`assets/intermediacion/estructura-${property.operacion}.docx`)
        : await minuteDocx(data, property.codigo, images, intermediation);
      return new NextResponse(new Uint8Array(bytes), { headers: {
        ...privateHeaders,
        'Content-Type': WORD_MIME,
        'Content-Disposition': `attachment; filename="${config.filename}.docx"`,
        'X-Content-Type-Options': 'nosniff',
      } });
    }
    if (body.action === 'extract') {
      if (!Number.isSafeInteger(body.fileId) || body.fileId < 1) throw new InputError('Selecciona un archivo.');
      const [file] = await db.select().from(inmArchivos).where(and(eq(inmArchivos.id, body.fileId), eq(inmArchivos.inmuebleId, property.id), eq(inmArchivos.tipoDocumento, config.category), eq(inmArchivos.almacenamiento, 'hosting'))).limit(1);
      if (!file?.rutaAlmacenamiento) throw new InputError('El archivo no está disponible en este apartado.', 404);
      const max = 12 * 1024 * 1024;
      if (Number(file.tamanoBytes) > max) throw new InputError('La extracción admite archivos Word de hasta 12 MB.');
      const response = await hostingRequest('GET', file.rutaAlmacenamiento);
      const reader = response.body?.getReader(); if (!reader) throw Error('Sin contenido');
      const chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw new InputError('El archivo supera 12 MB.'); } chunks.push(value); } } finally { reader.releaseLock(); }
      try { return NextResponse.json(await extractMinuteWord(Buffer.concat(chunks)), { headers: privateHeaders }); }
      catch (error) { throw new InputError(error instanceof Error ? error.message : 'No se pudo extraer el Word.', 422); }
    }
    if (!['preview', 'generate'].includes(body.action) || !Number.isSafeInteger(body.version) || body.version < 1) throw new InputError('Guarda el texto antes de generar el PDF.');
    const saved = await readMinute(property.id, db, property.operacion, config.kind);
    if (saved.version !== body.version) throw new InputError('La versión cambió. Guarda y revisa el texto antes de generar.', 409);
    if (!saved.data.text.trim()) throw new InputError('Escribe, incorpora la estructura base o extrae el contenido del documento.');
    const bytes = await minutePdf(saved.data, { kind: config.kind, propertyCode: property.codigo, images: await documentImages(saved.data, property, config.category, true) });
    if (body.action === 'preview') return new NextResponse(new Uint8Array(bytes), { headers: { ...privateHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${config.filename}.pdf"`, 'X-Content-Type-Options': 'nosniff' } });
    connection = await pool.getConnection(); lock = `minute:${property.id}:${config.category}`;
    const [locks] = await connection.query('SELECT GET_LOCK(?,0) acquired', [lock]);
    if (!(locks as { acquired: number }[])[0]?.acquired) { lock = ''; throw new InputError('Ya se está generando el PDF. Espera unos segundos.', 409); }
    await assertWritable(db, property.id);
    const fingerprint = createHash('sha256').update(MINUTE_PDF_DESIGN).update(JSON.stringify({ data: saved.data, propertyCode: property.codigo, operation: property.operacion, category: config.category })).digest('hex').slice(0, 20);
    const filename = `${config.filename}-${fingerprint}.pdf`;
    const [existing] = await db.select({ id: inmArchivos.id }).from(inmArchivos).where(and(eq(inmArchivos.inmuebleId, property.id), eq(inmArchivos.tipoDocumento, config.category), eq(inmArchivos.nombreOriginal, filename), eq(inmArchivos.almacenamiento, 'hosting'))).limit(1);
    if (existing) return NextResponse.json({ id: existing.id, existing: true });
    const form = new FormData();
    form.set('archivo', new File([new Uint8Array(bytes)], filename, { type: 'application/pdf' }));
    form.set('tipoDocumento', config.category); form.set('nombre', saved.data.title);
    form.set('observacion', `Generado desde documento editable. Versión ${saved.version}.`);
    const headers = new Headers(request.headers); headers.delete('content-type'); headers.delete('content-length');
    return await uploadDocument(new Request(request.url, { method: 'POST', headers, body: form }), context);
  } catch (error) { return errorResponse(error); }
  finally { if (connection) { try { if (lock) await connection.query('SELECT RELEASE_LOCK(?)', [lock]); } finally { connection.release(); } } }
}
