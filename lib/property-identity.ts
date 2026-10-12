import { eq, or, sql } from 'drizzle-orm';
import { inmInmuebles } from '@/db/schema';
import type { db } from '@/lib/db';

export function propertyIdentifierCondition(key: string) {
  if (/^\d+$/.test(key)) return eq(inmInmuebles.id, Number(key));
  return or(eq(inmInmuebles.codigo, key), sql`EXISTS (
    SELECT 1 FROM inm_codigos_anteriores c
    WHERE c.codigo=${key} AND c.inmueble_id=${inmInmuebles.id}
  )`)!;
}

export async function nextPropertyOrder(tx: Pick<typeof db, 'execute'>) {
  const [rows] = await tx.execute(sql`SELECT valor FROM inm_secuencias WHERE nombre='inmueble' FOR UPDATE`);
  const current = Number((rows as unknown as { valor: number }[])[0]?.valor);
  if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(current + 1)) {
    throw new Error('No se pudo asignar el número del inmueble.');
  }
  await tx.execute(sql`UPDATE inm_secuencias SET valor=${current + 1} WHERE nombre='inmueble'`);
  return current + 1;
}
