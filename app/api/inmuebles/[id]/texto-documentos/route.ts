import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { zoneCondition } from '@/lib/zone-scope';
import { inmArchivos, inmInmuebles, inmTimeline, securityAudit } from '@/db/schema';
import { assertWritable } from '@/lib/data-integrity-service';
import { auditValues } from '@/lib/security-audit';
import { reviewedArea } from '@/lib/document-review.mjs';
import { analyzeDocument, MAX_DOCUMENT_BYTES, SUPPORTED_DOCUMENT_MIMES } from '@/lib/document-analysis.mjs';
import { hostingRequest } from '@/lib/document-hosting';
import { COMMERCIAL_DOCUMENT_TYPES } from '@/lib/publication-document-extraction.mjs';

export const runtime = 'nodejs';
export const maxDuration = 300;
const MAX_BYTES = MAX_DOCUMENT_BYTES;
type Context = { params: Promise<{ id: string }> };
async function property(id: string, request: Request) {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return null;
  const [row] = await db.select({ id: inmInmuebles.id, areaTerreno: inmInmuebles.areaTerreno, areaConstruida: inmInmuebles.areaConstruida }).from(inmInmuebles).where(and(eq(inmInmuebles.id, numericId), eq(inmInmuebles.estado, 'activo'), zoneCondition(request))).limit(1);
  return row;
}
async function readDocument(path: string) {
  const response = await hostingRequest('GET', path);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Sin documento');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('El archivo supera el límite de lectura de 12 MB.'); }
    chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function GET(request: Request, context: Context) {
  const auth = await authorizeApi(); if (auth.response) return auth.response;
  try {
    const item = await property((await context.params).id, request);
    if (!item) return NextResponse.json({ error: 'Inmueble no disponible.' }, { status: 404 });
    const files = await db.select({ id: inmArchivos.id, name: inmArchivos.nombre, mime: inmArchivos.tipoMime, size: inmArchivos.tamanoBytes, type: inmArchivos.tipoDocumento }).from(inmArchivos).where(and(eq(inmArchivos.inmuebleId, item.id), eq(inmArchivos.almacenamiento, 'hosting'), inArray(inmArchivos.tipoDocumento, COMMERCIAL_DOCUMENT_TYPES)));
    return NextResponse.json({ files, areas: { areaTerreno: item.areaTerreno, areaConstruida: item.areaConstruida }, supportedMimes: SUPPORTED_DOCUMENT_MIMES, maxBytes: MAX_BYTES }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudieron consultar los documentos. Puedes continuar manualmente.' }, { status: 500 }); }
}
export async function POST(request: Request, context: Context) {
  const auth = await authorizeApi(request); if (auth.response) return auth.response;
  try {
    const item = await property((await context.params).id, request);
    if (!item) return NextResponse.json({ error: 'Inmueble no disponible.' }, { status: 404 });
    const body = await request.json().catch(() => null);
    const fileId = Number(body?.fileId);
    if (!Number.isSafeInteger(fileId) || fileId < 1) return NextResponse.json({ error: 'Selecciona un documento.' }, { status: 400 });
    const [file] = await db.select().from(inmArchivos).where(and(eq(inmArchivos.id, fileId), eq(inmArchivos.inmuebleId, item.id), eq(inmArchivos.almacenamiento, 'hosting'), inArray(inmArchivos.tipoDocumento, COMMERCIAL_DOCUMENT_TYPES))).limit(1);
    if (!file?.rutaAlmacenamiento) return NextResponse.json({ error: 'Documento no disponible.' }, { status: 404 });
    if (!SUPPORTED_DOCUMENT_MIMES.includes(file.tipoMime || '')) return NextResponse.json({ error: 'Formato no compatible: admite PDF, Excel XLSX, JPG y PNG.' }, { status: 422 });
    if (body?.forceOcr !== undefined && typeof body.forceOcr !== 'boolean') return NextResponse.json({ error: 'Modo de lectura no válido.' }, { status: 400 });
    const startPage = body?.startPage ?? 1;
    if (!Number.isSafeInteger(startPage) || startPage < 1 || startPage > 150) return NextResponse.json({ error: 'Página no válida.' }, { status: 400 });
    if (Number(file.tamanoBytes) > MAX_BYTES) return NextResponse.json({ error: 'La lectura opcional admite hasta 12 MB por archivo. Puedes continuar manualmente.' }, { status: 422 });
    const bytes = await readDocument(file.rutaAlmacenamiento);
    const fingerprint = createHash('sha256').update(bytes).digest('hex');
    if (body.fingerprint && body.fingerprint !== fingerprint) return NextResponse.json({ error: 'El documento cambió durante el análisis. Vuelve a analizarlo.' }, { status: 409 });
    const result = await analyzeDocument(bytes, file.tipoMime!, startPage, { forceOcr: body?.forceOcr === true });
    return NextResponse.json({ ...result, source: { id: file.id, name: file.nombre, fingerprint }, message: result.proposals.length ? 'Revisa las propuestas y su evidencia antes de incorporarlas.' : 'No se identificaron datos con suficiente claridad en estas páginas. Revisa el original.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo analizar el archivo. Puede estar protegido, dañado o no ser legible. Tu texto se conserva y puedes continuar manualmente.' }, { status: 422 }); }
}

// Explicitly reviewed areas only; a partial update with optimistic concurrency.
export async function PATCH(request: Request, context: Context) {
  const auth = await authorizeApi(request); if (auth.response) return auth.response;
  try {
    const item = await property((await context.params).id, request);
    if (!item) return NextResponse.json({ error: 'Inmueble no disponible.' }, { status: 404 });
    const body = await request.json().catch(() => null);
    const selected = body?.selected;
    if (body?.reviewed !== true || !Array.isArray(selected) || selected.length < 1 || selected.length > 2 || !body.expected) return NextResponse.json({ error: 'Revisa y selecciona las áreas que deseas guardar.' }, { status: 400 });
    const changes: { areaTerreno?: string; areaConstruida?: string } = {};
    const sources: { field: string; fileId: number; page: number | null; sheet: string | null; cell: string | null; fingerprint: string | null }[] = [];
    for (const choice of selected) {
      if (!['areaTerreno', 'areaConstruida'].includes(choice.field) || choice.field in changes) return NextResponse.json({ error: 'Selecciona un solo valor para cada área.' }, { status: 400 });
      const field = choice.field as keyof typeof changes;
      const value = reviewedArea(choice.value);
      if (!value || !Number.isSafeInteger(choice.sourceId) || !Object.hasOwn(body.expected, field)) return NextResponse.json({ error: 'Área o documento no válido. Usa un valor sin separador de miles y con hasta dos decimales.' }, { status: 400 });
      const [file] = await db.select({ id: inmArchivos.id, rutaAlmacenamiento: inmArchivos.rutaAlmacenamiento }).from(inmArchivos).where(and(eq(inmArchivos.id, choice.sourceId), eq(inmArchivos.inmuebleId, item.id), eq(inmArchivos.almacenamiento, 'hosting'), inArray(inmArchivos.tipoDocumento, COMMERCIAL_DOCUMENT_TYPES))).limit(1);
      if (!file) return NextResponse.json({ error: 'El documento de origen ya no está disponible.' }, { status: 409 });
      if (choice.fingerprint !== undefined) {
        if (typeof choice.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(choice.fingerprint)) return NextResponse.json({ error: 'Versión del documento no válida. Analízalo nuevamente.' }, { status: 400 });
        if (!file.rutaAlmacenamiento || createHash('sha256').update(await readDocument(file.rutaAlmacenamiento)).digest('hex') !== choice.fingerprint) return NextResponse.json({ error: 'El documento cambió. Analízalo y revisa las áreas nuevamente.' }, { status: 409 });
      }
      changes[field] = value;
      sources.push({ field, fileId: file.id, fingerprint: choice.fingerprint ?? null, page: Number.isSafeInteger(choice.page) && choice.page > 0 && choice.page <= 150 ? choice.page : null, sheet: typeof choice.sheet === 'string' ? choice.sheet.slice(0, 255) : null, cell: typeof choice.cell === 'string' ? choice.cell.slice(0, 20) : null });
    }
    const updatedAreas = await db.transaction(async tx => {
      const [current] = await tx.select().from(inmInmuebles).where(and(eq(inmInmuebles.id, item.id), eq(inmInmuebles.estado, 'activo'), zoneCondition(request))).limit(1).for('update');
      if (!current) throw new Error('CONCURRENT_CHANGE');
      await assertWritable(tx, item.id);
      for (const field of Object.keys(changes) as (keyof typeof changes)[]) {
        if (String(current[field] ?? '') !== String(body.expected[field] ?? '')) throw new Error('CONCURRENT_CHANGE');
      }
      // Lock and recheck sources together with the property update.
      for (const source of sources) {
        const [file] = await tx.select({ id: inmArchivos.id }).from(inmArchivos).where(and(eq(inmArchivos.id, source.fileId), eq(inmArchivos.inmuebleId, item.id), eq(inmArchivos.almacenamiento, 'hosting'), inArray(inmArchivos.tipoDocumento, COMMERCIAL_DOCUMENT_TYPES))).limit(1).for('update');
        if (!file) throw new Error('CONCURRENT_CHANGE');
      }
      await tx.update(inmInmuebles).set(changes).where(eq(inmInmuebles.id, item.id));
      await tx.insert(inmTimeline).values({ inmuebleId: item.id, evento: 'areas_documentales_revisadas', usuarioId: auth.user.id, observacion: JSON.stringify({ anterior: { areaTerreno: current.areaTerreno, areaConstruida: current.areaConstruida }, nuevo: changes, fuentes: sources, revisionManual: true }) });
      await tx.insert(securityAudit).values(auditValues(auth.user.id, 'property.document_areas', `property:${item.id}`));
      return { areaTerreno: changes.areaTerreno ?? current.areaTerreno, areaConstruida: changes.areaConstruida ?? current.areaConstruida };
    });
    return NextResponse.json({ ok: true, areas: updatedAreas }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const conflict = error instanceof Error && /CONCURRENT_CHANGE|expediente está cerrado|eliminación en curso/.test(error.message);
    return NextResponse.json({ error: conflict ? 'La ficha cambió o ya no admite edición. Actualízala y revisa nuevamente las áreas.' : 'No se pudieron guardar las áreas revisadas.' }, { status: conflict ? 409 : 500 });
  }
}
