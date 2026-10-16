import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { authorizeApi } from '@/lib/auth';
import { propertyIdentifierCondition } from '@/lib/property-identity';
import { readDossier } from '@/lib/dossier-record';
import { dossierInput, dossierStatus } from '@/lib/transaction-dossier.mjs';
import { inmArchivos, inmExpedientes, inmInmuebles, inmTimeline, securityAudit } from '@/db/schema';
import { auditValues } from '@/lib/security-audit';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const auth = await authorizeApi(undefined, 'informacion');
  if (auth.response) return auth.response;
  try {
    const [property] = await db.select({ id: inmInmuebles.id }).from(inmInmuebles).where(propertyIdentifierCondition((await context.params).id)).limit(1);
    if (!property) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    const record = await readDossier(property.id);
    const files = await db.select({ tipoDocumento: inmArchivos.tipoDocumento, almacenamiento: inmArchivos.almacenamiento }).from(inmArchivos).where(eq(inmArchivos.inmuebleId, property.id));
    return NextResponse.json({ ...record, status: dossierStatus(record.config, files) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo consultar el expediente.' }, { status: 500 }); }
}
export async function PUT(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion');
  if (auth.response) return auth.response;
  let config: ReturnType<typeof dossierInput>, version: number;
  try {
    const body = await request.json();
    config = dossierInput(body.config);
    version = body.version;
    if (!Number.isSafeInteger(version) || version < 0) throw Error('Versión del expediente no válida.');
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Datos no válidos.' }, { status: 400 }); }
  try {
    const result = await db.transaction(async tx => {
      const [property] = await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(propertyIdentifierCondition((await context.params).id)).limit(1).for('update');
      if (!property) return { error: 'Inmueble no encontrado.', status: 404 };
      const current = await readDossier(property.id, tx);
      if (current.version !== version) return { error: 'Otra persona actualizó el expediente. Recarga antes de guardar.', status: 409 };
      // Never silently hide a buyer or documents when changing person/conditions.
      const nextVersion = version + 1;
      if (version) await tx.update(inmExpedientes).set({ configuracion: JSON.stringify(config), version: nextVersion }).where(eq(inmExpedientes.inmuebleId, property.id));
      else await tx.insert(inmExpedientes).values({ inmuebleId: property.id, configuracion: JSON.stringify(config), version: nextVersion });
      await tx.insert(inmTimeline).values({ inmuebleId: property.id, evento: 'expediente_actualizado', observacion: JSON.stringify({ anterior: current.config, nuevo: config }), usuarioId: auth.user.id });
      await tx.insert(securityAudit).values(auditValues(auth.user.id, 'dossier.update', `property:${property.id}`));
      return { version: nextVersion };
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, ...result });
  } catch { return NextResponse.json({ error: 'No se pudo guardar el expediente.' }, { status: 500 }); }
}
