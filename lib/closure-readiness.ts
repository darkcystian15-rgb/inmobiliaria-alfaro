import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmArchivos, inmExpedientes } from '@/db/schema';
import { dossierDefaults, dossierClosureStatus } from '@/lib/transaction-dossier.mjs';

export async function closureReadiness(executor: Pick<typeof db, 'select'>, properties: { inmuebleId: number; operacion: string }[], lock = false) {
  const result = new Map<number, ReturnType<typeof dossierClosureStatus>>();
  if (!properties.length) return result;
  const ids = properties.map(property => property.inmuebleId);
  const recordQuery = executor.select().from(inmExpedientes).where(inArray(inmExpedientes.inmuebleId, ids));
  const records = await (lock ? recordQuery.for('update') : recordQuery);
  const filesQuery = executor.select({ inmuebleId: inmArchivos.inmuebleId, tipoDocumento: inmArchivos.tipoDocumento, almacenamiento: inmArchivos.almacenamiento }).from(inmArchivos).where(inArray(inmArchivos.inmuebleId, ids));
  const files = await (lock ? filesQuery.for('update') : filesQuery);
  for (const property of properties) {
    const record = records.find(row => row.inmuebleId === property.inmuebleId);
    const config = record ? { ...dossierDefaults(), ...JSON.parse(record.configuracion) } : dossierDefaults();
    result.set(property.inmuebleId, dossierClosureStatus(config, files.filter(file => file.inmuebleId === property.inmuebleId), property.operacion));
  }
  return result;
}
