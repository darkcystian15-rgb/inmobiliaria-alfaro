import { and, eq, inArray } from 'drizzle-orm';
import { inmArchivos, inmInmuebles } from '@/db/schema';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertWritable } from '@/lib/data-integrity-service';
import { propertyIdentifierCondition } from '@/lib/property-identity';
import { propertyLastPosition } from '@/lib/property-position';
import { propertyZoneName } from '@/lib/zone-scope';
import { hostingRequest } from '@/lib/document-hosting';
import { analyzeDocument, MAX_DOCUMENT_BYTES } from '@/lib/document-analysis.mjs';
import { contractFilename, intermediationProposals, INTERMEDIATION_MIMES, sourceTypes } from '@/lib/intermediation.mjs';
import { INTERMEDIATION_WORD_MIME, intermediationWord } from '@/lib/intermediation-word';
import { registrySourceTypes } from '@/lib/reference-plan.mjs';
import sharp from 'sharp';
import { deleteIntermediationModel, listIntermediationModels, modelIdentifier, readIntermediationModel, saveIntermediationModel } from '@/lib/intermediation-models';

export const runtime = 'nodejs';
export const maxDuration = 180;
const headers = { 'Cache-Control': 'private, no-store' };
type Context = { params: Promise<{ id: string }> };

function promptUsage(request: Request) {
  const usage = new URL(request.url).searchParams.get('uso');
  return usage === 'plano' || usage === 'intermediacion' ? usage : null;
}

async function property(context: Context, request: Request) {
  const operation = new URL(request.url).searchParams.get('operacion');
  if (operation !== 'venta' && operation !== 'alquiler') return null;
  const [item] = await db.select({
    id: inmInmuebles.id, tipo: inmInmuebles.tipo, direccion: inmInmuebles.direccion,
    contacto: inmInmuebles.nombreContacto, zona: propertyZoneName, numero: propertyLastPosition,
    moneda: inmInmuebles.moneda, distrito: inmInmuebles.distrito,
    ...(promptUsage(request) ? { numeroDireccion: inmInmuebles.numeroDireccion } : {}),
  }).from(inmInmuebles).where(and(propertyIdentifierCondition((await context.params).id), eq(inmInmuebles.operacion, operation), eq(inmInmuebles.estado, 'activo'))).limit(1);
  return item ? { ...item, operation } as const : null;
}
function sources(id: number) {
  return and(eq(inmArchivos.inmuebleId, id), eq(inmArchivos.almacenamiento, 'hosting'), inArray(inmArchivos.tipoDocumento, sourceTypes));
}
function failure(error: string, status: number) {
  return Response.json({ error }, { status, headers });
}

async function readSource(path: string) {
  const response = await hostingRequest('GET', path);
  const reader = response.body?.getReader();
  if (!reader) throw Error('No hay contenido.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_DOCUMENT_BYTES) {
        await reader.cancel();
        throw Error('El archivo supera 12 MB.');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}

function wordAttachment(bytes: Uint8Array, name: string) {
  return new Response(new Uint8Array(bytes), { headers: {
    ...headers, 'Content-Type': INTERMEDIATION_WORD_MIME,
    'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(name + '.docx').replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16)),
  } });
}

export async function GET(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion');
  if (auth.response) return auth.response;
  try {
    const item = await property(context, request);
    if (!item) return failure('El inmueble activo no está disponible para esta operación.', 404);
    const query = new URL(request.url).searchParams;
    const usage = query.get('uso');
    if (usage === 'modelos') {
      return Response.json({ models: await listIntermediationModels(auth.user.id, item.operation, item.id) }, { headers });
    }
    if (usage === 'modelo' || usage === 'borrador') {
      const modelId = query.get('modelo') ?? 'base';
      if (!modelIdentifier(modelId)) return failure('Modelo no válido.', 400);
      if (usage === 'borrador') {
        const draft = await readIntermediationModel(auth.user.id, item.operation, modelId, item.id);
        if (draft) return wordAttachment(draft.bytes, draft.name);
      }
      if (modelId === 'base') {
        const bytes = await intermediationWord({}, item.operation);
        return wordAttachment(bytes, `Modelo de contrato de intermediación de ${item.operation}`);
      }
      const model = await readIntermediationModel(auth.user.id, item.operation, modelId);
      return model ? wordAttachment(model.bytes, model.name) : failure('No se encontró el modelo.', 404);
    }
    if (promptUsage(request)) {
      const { tipo, direccion, numeroDireccion, contacto, zona, numero } = item;
      return Response.json({ item: { tipo, direccion, numeroDireccion, contacto, zona, numero } }, { headers });
    }
    const files = await db.select({ id: inmArchivos.id, nombre: inmArchivos.nombre, mime: inmArchivos.tipoMime, size: inmArchivos.tamanoBytes, type: inmArchivos.tipoDocumento })
      .from(inmArchivos).where(sources(item.id));
    return Response.json({ item, files, maxBytes: MAX_DOCUMENT_BYTES }, { headers });
  } catch {
    return failure('No se pudo cargar el inmueble y sus documentos.', 500);
  }
}

export async function PUT(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion');
  if (auth.response) return auth.response;
  const query = new URL(request.url).searchParams;
  const usage = query.get('uso');
  const modelId = query.get('modelo') ?? 'base';
  if (usage !== 'modelos' && (usage !== 'borrador' || !modelIdentifier(modelId))) {
    return failure('Acción no válida.', 400);
  }
  try {
    const item = await property(context, request);
    if (!item) return failure('El inmueble activo no está disponible para esta operación.', 404);
    if (usage === 'borrador') await assertWritable(db, item.id);
    if (usage === 'borrador' && modelId !== 'base'
      && !await readIntermediationModel(auth.user.id, item.operation, modelId)
      && !await readIntermediationModel(auth.user.id, item.operation, modelId, item.id)) {
      return failure('No se encontró el modelo.', 404);
    }
    const document = await saveIntermediationModel(request, auth.user.id, item.operation,
      usage === 'borrador' ? { propertyId: item.id, modelId } : undefined);
    return document ? Response.json(document, { headers }) : failure('Selecciona un archivo Word .docx válido de hasta 3 MB.', 400);
  } catch (error) {
    if (error instanceof Error && /cerrado|eliminación/.test(error.message)) return failure(error.message, 409);
    return failure('No se pudo guardar el documento. Intenta nuevamente.', 500);
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion');
  if (auth.response) return auth.response;
  const modelId = new URL(request.url).searchParams.get('modelo');
  if (!modelId || modelId === 'base' || !modelIdentifier(modelId)) return failure('Selecciona un modelo cargado.', 400);
  try {
    const item = await property(context, request);
    if (!item) return failure('El inmueble activo no está disponible para esta operación.', 404);
    await deleteIntermediationModel(auth.user.id, item.operation, modelId);
    return new Response(null, { status: 204, headers });
  } catch {
    return failure('No se pudo eliminar el modelo. Intenta nuevamente.', 500);
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion');
  if (auth.response) return auth.response;
  const usage = promptUsage(request);
  if (usage) return failure(usage === 'plano' ? 'El prompt del plano se obtiene con GET.' : 'El prompt de intermediación se obtiene con GET.', 405);
  const body = await request.json().catch(() => null);
  if (!body || !['read', 'word', 'model'].includes(body.action)) return failure('Acción no válida.', 400);
  try {
    const item = await property(context, request);
    if (!item) return failure('El inmueble activo no está disponible para esta operación.', 404);
    if (body.action !== 'read') {
      const bytes = await intermediationWord(body.action === 'model' ? {} : body.draft, item.operation);
      const name = body.action === 'model' ? `Modelo de intermediación de ${item.operation}` : contractFilename(item);
      return wordAttachment(bytes, name);
    }
    const page = body.page ?? 1;
    if (!Number.isSafeInteger(body.fileId) || body.fileId < 1 || !Number.isSafeInteger(page) || page < 1 || page > 150) return failure('Selecciona un archivo y una página válidos.', 400);
    const [file] = await db.select().from(inmArchivos).where(and(sources(item.id), eq(inmArchivos.id, body.fileId))).limit(1);
    if (!file?.rutaAlmacenamiento) return failure('El archivo no está disponible en este expediente.', 404);
    const mime = file.tipoMime || '';
    if (!INTERMEDIATION_MIMES.includes(mime) || Number(file.tamanoBytes) > MAX_DOCUMENT_BYTES) return failure('Se pueden leer PDF e imágenes JPG, PNG o WebP de hasta 12 MB.', 422);
    const source = await readSource(file.rutaAlmacenamiento);
    const bytes = mime === 'image/webp'
      ? await sharp(source, { limitInputPixels: 25000000 }).rotate().resize({ width: 2500, withoutEnlargement: true }).png().toBuffer()
      : source;
    const result = await analyzeDocument(bytes, mime === 'image/webp' ? 'image/png' : mime, page, {
      includeText: true,
      refineRegistryHeader: registrySourceTypes.includes(file.tipoDocumento),
    });
    const pages = result.pages.map(entry => ({
      page: entry.page, method: entry.method, text: 'text' in entry ? entry.text || '' : mime !== 'application/pdf' && 'text' in result ? result.text || '' : '',
    }));
    const registryNumbers = new Set<string>();
    const proposals = pages.flatMap(entry => intermediationProposals(file.tipoDocumento, entry.text, item.operation)
      .filter(proposal => {
        if (proposal.key !== 'partida') return true;
        if (registryNumbers.has(proposal.value)) return false;
        registryNumbers.add(proposal.value);
        return true;
      }).map(proposal => ({ ...proposal, page: entry.page })));
    return Response.json({ source: { id: file.id, nombre: file.nombre }, pages, proposals, nextPage: result.nextPage }, { headers });
  } catch {
    return failure(body.action === 'read' ? 'No se pudo leer el archivo. Abre el original o completa los campos manualmente.' : 'No se pudo generar el archivo Word.', body.action === 'read' ? 422 : 500);
  }
}
