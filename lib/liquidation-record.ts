import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmTimeline } from '@/db/schema';
import { emptyLiquidations, type LiquidationData } from '@/lib/liquidation';
export const liquidationEvent = 'liquidaciones_guardadas';
export async function readLiquidations(propertyId: number, executor: Pick<typeof db, 'select'> = db) {
  const [row] = await executor.select().from(inmTimeline).where(and(eq(inmTimeline.inmuebleId, propertyId), eq(inmTimeline.evento, liquidationEvent))).orderBy(desc(inmTimeline.id)).limit(1);
  return { data: row?.observacion ? JSON.parse(row.observacion) as LiquidationData : emptyLiquidations(), version: row?.id ?? 0 };
}
