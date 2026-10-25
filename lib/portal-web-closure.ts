import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { WebPublication } from '@/lib/portal-web-types';

type Executor = Pick<typeof db, 'execute'>;
type StoredRow = { clave: string; contenido: string | WebPublication; version: number };
const decode = (value: StoredRow['contenido']): WebPublication => typeof value === 'string' ? JSON.parse(value) : value;

export async function closureWebListings(executor: Executor) {
  const [rows] = await executor.execute(sql`SELECT clave, contenido, version FROM inm_portal_web WHERE clave LIKE 'live:%'`) as unknown as [StoredRow[], unknown];
  return new Set(rows.filter(row => {const value=decode(row.contenido);return value.status !== 'withdrawn' || value.syncState !== 'synced';}).map(row => Number(row.clave.slice(5))));
}

// Persist the requested remote state in the SAME transaction as the internal
// closure. Delivery happens after commit; its failure never loses the request.
export async function prepareClosureWithdrawal(executor: Executor, propertyId: number, userId: number, reason: string) {
  const key = `live:${propertyId}`;
  const [rows] = await executor.execute(sql`SELECT clave, contenido, version FROM inm_portal_web WHERE clave=${key} FOR UPDATE`) as unknown as [StoredRow[], unknown];
  if (!rows[0]) return null;
  const current = decode(rows[0].contenido);
  if (current.status === 'withdrawn' && current.syncState === 'synced') return null;
  const payload: WebPublication = { ...current, status: 'withdrawn', approvedBy: userId, approvedAt: new Date().toISOString(), syncState: 'pending', error: '' };
  const version = Number(rows[0].version) + 1;
  await executor.execute(sql`UPDATE inm_portal_web SET contenido=${JSON.stringify(payload)},version=${version},usuario_id=${userId} WHERE clave=${key}`);
  await executor.execute(sql`INSERT INTO inm_portal_web_eventos(clave,accion,usuario_id,version,motivo) VALUES(${key},'withdraw',${userId},${version},${reason.slice(0,500)})`);
  return { key, version, body: { kind: 'property', sourceId: propertyId, revision: version, status: payload.status, snapshot: payload.snapshot } };
}
