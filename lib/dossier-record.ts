import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmExpedientes } from '@/db/schema';
import { dossierDefaults } from '@/lib/transaction-dossier.mjs';

export async function readDossier(propertyId: number, executor: Pick<typeof db, 'select'> = db) {
  const [row] = await executor.select().from(inmExpedientes).where(eq(inmExpedientes.inmuebleId, propertyId)).limit(1);
  return { config: row ? { ...dossierDefaults(), ...JSON.parse(row.configuracion) } as ReturnType<typeof dossierDefaults> : dossierDefaults(), version: row?.version ?? 0 };
}
