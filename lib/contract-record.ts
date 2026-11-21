import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { inmTimeline, securityAudit } from '@/db/schema';
import { auditValues } from '@/lib/security-audit';

export type ContractSource = { id: number; name: string; fingerprint: string; text: string; page: number; role: 'documento' | 'infocorp' };
export type ContractRecord = { values: Record<string, string>; sources: ContractSource[]; text: string; status: 'preparacion' | 'borrador' | 'revisado'; inputHash: string; model: string; generatedAt: string | null };
export const emptyContract = (): ContractRecord => ({ values: {}, sources: [], text: '', status: 'preparacion', inputHash: '', model: '', generatedAt: null });
export const contractEvent = (kind: string) => `contrato_ia_${kind}`;
export function contractInputHash(values: Record<string, string>, sources: ContractSource[]) {
  return createHash('sha256').update(JSON.stringify({ values: Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b))), sources })).digest('hex');
}
export async function readContract(propertyId: number, kind: string, executor: Pick<typeof db, 'select'> = db) {
  const [row] = await executor.select().from(inmTimeline).where(and(eq(inmTimeline.inmuebleId, propertyId), eq(inmTimeline.evento, contractEvent(kind)))).orderBy(desc(inmTimeline.id)).limit(1);
  const record = row?.observacion ? JSON.parse(row.observacion) as ContractRecord : emptyContract();
  return { version: row?.id ?? 0, record, outdated: Boolean(record.generatedAt && contractInputHash(record.values, record.sources) !== record.inputHash) };
}
// Caller holds the property FOR UPDATE lock. Immutable snapshots retain every version.
export async function appendContract(executor: Pick<typeof db, 'insert'>, propertyId: number, kind: string, record: ContractRecord, userId: number) {
  const serialized = JSON.stringify(record);
  if (Buffer.byteLength(serialized) > 60000) throw Error('El documento supera el límite de guardado. Resume el contenido.');
  const [result] = await executor.insert(inmTimeline).values({ inmuebleId: propertyId, evento: contractEvent(kind), observacion: serialized, usuarioId: userId });
  await executor.insert(securityAudit).values(auditValues(userId, 'contract.save', `property:${propertyId}:${kind}`));
  return { version: result.insertId, record, outdated: Boolean(record.generatedAt && contractInputHash(record.values, record.sources) !== record.inputHash) };
}
