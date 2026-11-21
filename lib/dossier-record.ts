import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmExpedientes } from '@/db/schema';
import { dossierDefaults } from '@/lib/transaction-dossier.mjs';

export async function readDossier(propertyId: number, executor: Pick<typeof db, 'select'> = db) {
  const [row] = await executor.select().from(inmExpedientes).where(eq(inmExpedientes.inmuebleId, propertyId)).limit(1);
  return { config: row ? { ...dossierDefaults(), ...JSON.parse(row.configuracion) } as ReturnType<typeof dossierDefaults> : dossierDefaults(), version: row?.version ?? 0 };
}

// Call only within a transaction holding the property's FOR UPDATE lock.
export async function writeSaneamiento(propertyId: number, record: Awaited<ReturnType<typeof readDossier>>, saneamiento: ReturnType<typeof dossierDefaults>['saneamiento'], executor: Pick<typeof db, 'insert' | 'update'>) {
  const config = { ...record.config, saneamiento }, version = record.version + 1;
  if (record.version) await executor.update(inmExpedientes).set({ configuracion: JSON.stringify(config), version }).where(eq(inmExpedientes.inmuebleId, propertyId));
  else await executor.insert(inmExpedientes).values({ inmuebleId: propertyId, configuracion: JSON.stringify(config), version });
  return { config, version };
}
