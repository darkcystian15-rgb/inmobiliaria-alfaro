import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import JSZip from 'jszip';
import { inmBorradores } from '@/db/schema';
import { db } from '@/lib/db';

type Operation = 'alquiler' | 'venta';

const prefix = (operation: Operation) => `intermediacion-modelo:${operation}:`;
const draftPrefix = (operation: Operation, propertyId: number) =>
  `intermediacion-borrador:${operation}:${propertyId}:`;
const draftKey = (operation: Operation, propertyId: number, modelId: string) =>
  draftPrefix(operation, propertyId) + modelId;

function owned(userId: number, key: string) {
  return and(eq(inmBorradores.usuarioId, userId), eq(inmBorradores.clave, key));
}

export async function listIntermediationModels(userId: number, operation: Operation, propertyId: number) {
  const start = prefix(operation);
  const drafts = draftPrefix(operation, propertyId);
  const rows = await db.select({
    key: inmBorradores.clave,
    name: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${inmBorradores.contenido}, '$.name'))`,
  }).from(inmBorradores).where(and(eq(inmBorradores.usuarioId, userId),
    or(like(inmBorradores.clave, start + '%'), like(inmBorradores.clave, drafts + '%'))))
    .orderBy(asc(inmBorradores.actualizado), asc(inmBorradores.clave));

  const models = rows.filter(row => row.key.startsWith(start))
    .map(row => ({ id: row.key.slice(start.length), name: row.name }));
  const available = new Set(['base', ...models.map(model => model.id)]);
  const savedDrafts = rows.filter(row => row.key.startsWith(drafts))
    .map(row => ({ id: row.key.slice(drafts.length), name: row.name, draftOnly: true }))
    .filter(draft => !available.has(draft.id));
  return [...models, ...savedDrafts];
}

export async function deleteIntermediationModel(userId: number, operation: Operation, modelId: string) {
  await db.delete(inmBorradores).where(owned(userId, prefix(operation) + modelId));
}

export function modelIdentifier(value: string | null) {
  return value === 'base' || Boolean(value && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value));
}

export async function readIntermediationModel(
  userId: number, operation: Operation, modelId: string, propertyId?: number,
) {
  const key = propertyId === undefined ? prefix(operation) + modelId : draftKey(operation, propertyId, modelId);
  const [row] = await db.select({ content: inmBorradores.contenido }).from(inmBorradores)
    .where(owned(userId, key)).limit(1);
  if (!row) return null;
  const { name, data } = JSON.parse(row.content) as { name: string; data: string };
  return { name, bytes: Buffer.from(data, 'base64') };
}

export async function saveIntermediationModel(
  request: Request, userId: number, operation: Operation,
  draft?: { propertyId: number; modelId: string },
) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('archivo');
  const name = file instanceof File ? file.name.replace(/\.docx$/i, '').replace(/[\x00-\x1f]/g, '').trim() : '';
  if (!(file instanceof File) || !/\.docx$/i.test(file.name) || !name || name.length > 250 || !file.size || file.size > 3 * 1024 * 1024) {
    return null;
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const zip = await JSZip.loadAsync(bytes).catch(() => null);
  if (!zip?.file('[Content_Types].xml') || !zip.file('word/document.xml') || zip.file('word/vbaProject.bin')) return null;

  const id = draft?.modelId ?? randomUUID();
  const clave = draft ? draftKey(operation, draft.propertyId, id) : prefix(operation) + id;
  const contenido = JSON.stringify({ name, data: bytes.toString('base64') });
  const insert = db.insert(inmBorradores).values({ usuarioId: userId, clave, contenido });
  if (draft) await insert.onDuplicateKeyUpdate({ set: { contenido } });
  else await insert;
  return { id, name };
}
