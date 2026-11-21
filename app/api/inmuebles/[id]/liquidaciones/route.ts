import { NextResponse } from 'next/server';
import { and, desc, eq, like } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db, pool } from '@/lib/db';
import { inmTimeline, inmInmuebles, inmTasaciones, inmArchivos, securityAudit } from '@/db/schema';
import { authorizeApi } from '@/lib/auth';
import { assertWritable } from '@/lib/data-integrity-service';
import { propertyIdentifierCondition } from '@/lib/property-identity';
import { auditValues } from '@/lib/security-audit';
import { readDossier } from '@/lib/dossier-record';
import { liquidationInput, generationMissing, liquidationCategory, type LiquidationData } from '@/lib/liquidation';
import { liquidationFile } from '@/lib/liquidation-export';
import { storageConfigured } from '@/lib/document-files.mjs';
import { POST as uploadDocument } from '../archivos/route';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
import { liquidationEvent as event, readLiquidations as read } from '@/lib/liquidation-record';
async function find(context: Context) { return (await db.select().from(inmInmuebles).where(propertyIdentifierCondition((await context.params).id)).limit(1))[0]; }
export async function GET(_request: Request, context: Context) {
  const auth = await authorizeApi(undefined, 'informacion'); if (auth.response) return auth.response;
  try {
    const property = await find(context); if (!property) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    const [record, dossier, valuation, contracts, history] = await Promise.all([
      read(property.id), readDossier(property.id), db.select().from(inmTasaciones).where(eq(inmTasaciones.inmuebleId, property.id)).limit(1),
      db.select({ observacion: inmTimeline.observacion }).from(inmTimeline).where(and(eq(inmTimeline.inmuebleId, property.id), like(inmTimeline.evento, 'contrato_ia_%'))).orderBy(desc(inmTimeline.id)).limit(8),
      db.select({ id: inmTimeline.id, date: inmTimeline.fechaEvento }).from(inmTimeline).where(and(eq(inmTimeline.inmuebleId, property.id), eq(inmTimeline.evento, event))).orderBy(desc(inmTimeline.id)).limit(15),
    ]);
    const suggestions: Record<string,string> = {};
    for (const c of contracts) { try { const values = JSON.parse(c.observacion || '{}').values || {}; for (const key of ['propietario','contraparte']) if (!suggestions[key] && typeof values[key] === 'string') suggestions[key] = values[key]; } catch { /* An older unrelated event is not a source. */ } }
    if (!record.version) { record.data.common.address = property.direccion || property.referencia; record.data.common.owner = suggestions.propietario || ''; record.data.common.counterparty = suggestions.contraparte || ''; record.data.common.price = valuation[0]?.precioObjetivo || ''; record.data.common.currency = (valuation[0]?.precioObjetivoMoneda || property.moneda) === 'PEN' ? 'PEN' : 'USD'; record.data.common.taxStatus = dossier.config.renta as LiquidationData['common']['taxStatus']; record.data.common.taxNote = dossier.config.rentaObservacion; }
    const version = new URL(_request.url).searchParams.get('version');
    let historical = null;
    if (version && (!Number.isSafeInteger(Number(version)) || Number(version)<1)) return NextResponse.json({error:'Versión no válida.'},{status:400});
    if (version) { const [row] = await db.select().from(inmTimeline).where(and(eq(inmTimeline.inmuebleId, property.id), eq(inmTimeline.evento,event), eq(inmTimeline.id, Number(version)))).limit(1); if (!row?.observacion) return NextResponse.json({ error: 'Versión no disponible.' }, { status: 404 }); historical = JSON.parse(row.observacion); }
    return NextResponse.json({ ...record, historical, history, property: { id: property.id, code: property.codigo, operation: property.operacion, contact: property.nombreContacto, active: property.estado === 'activo' }, personTypes: { owner: property.operacion === 'alquiler' ? dossier.config.arrendadorTipo : dossier.config.vendedorTipo, counterparty: property.operacion === 'alquiler' ? dossier.config.arrendatarioTipo : dossier.config.compradorTipo }, uploadReady: storageConfigured() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudieron consultar las liquidaciones.' }, { status: 500 }); }
}
export async function PUT(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion'); if (auth.response) return auth.response;
  let data: LiquidationData, version: number;
  try { const body = await request.json(); data = liquidationInput(body.data); version = body.version; if (!Number.isSafeInteger(version) || version < 0) throw Error('Versión no válida.'); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Datos no válidos.' }, { status: 400 }); }
  try {
    const property = await find(context); if (!property) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    const result = await db.transaction(async tx => {
      await tx.select({ id: inmInmuebles.id }).from(inmInmuebles).where(eq(inmInmuebles.id,property.id)).for('update'); await assertWritable(tx,property.id);
      const current = await read(property.id, tx); if (version !== current.version) return null;
      if (property.operacion === 'alquiler' && data.documents.some(d => d.sections.some(s => s.rows.some(r => ['renta','alcabala'].includes(r.kind))))) throw Error('En alquiler utiliza importes o porcentajes propios de la operación.');
      const serialized = JSON.stringify(data); if (Buffer.byteLength(serialized) > 60000) throw Error('Reduce el contenido de las liquidaciones antes de guardar.');
      const [inserted] = await tx.insert(inmTimeline).values({ inmuebleId: property.id, evento: event, observacion: serialized, usuarioId: auth.user.id });
      await tx.insert(securityAudit).values(auditValues(auth.user.id, 'liquidation.save', `property:${property.id}`)); return inserted.insertId;
    });
    if (result === null) return NextResponse.json({ error: 'Otra persona guardó cambios. Conserva esta pantalla y abre el expediente en otra pestaña para comparar antes de recargar.' }, { status: 409 });
    return NextResponse.json({ version: result });
  } catch (e) { return NextResponse.json({ error: e instanceof Error && /cerrado|eliminación|Reduce|alquiler/.test(e.message) ? e.message : 'No se pudo guardar. Tus datos permanecen en pantalla.' }, { status: 409 }); }
}
export async function POST(request: Request, context: Context) {
  const auth = await authorizeApi(request, 'informacion'); if (auth.response) return auth.response;
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined; let lock = '';
  try {
    const body = await request.json();
    if (!['xlsx', 'pdf', 'docx'].includes(body.format) || typeof body.documentId !== 'string') {
      return NextResponse.json({ error: 'Formato o documento no válido.' }, { status: 400 });
    }
    const property = await find(context);
    if (!property) return NextResponse.json({ error: 'Inmueble no encontrado.' }, { status: 404 });
    if (body.action === 'download') {
      let data: LiquidationData;
      try {
        data = liquidationInput(body.data);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Datos no válidos.' }, { status: 400 });
      }
      const document = data.documents.find(item => item.id === body.documentId);
      if (!document) return NextResponse.json({ error: 'Documento no disponible.' }, { status: 404 });
      const bytes = await liquidationFile(document, data.common, property.codigo, body.format, property.operacion);
      return new Response(new Uint8Array(bytes), { headers: {
        'Content-Type': body.format === 'pdf' ? 'application/pdf' : body.format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="liquidacion-${document.side}.${body.format}"`,
        'Cache-Control': 'private, no-store',
      } });
    }
    if (!Number.isSafeInteger(body.version)) return NextResponse.json({ error: 'Versión no válida.' }, { status: 400 });
    connection = await pool.getConnection(); lock = `liquidation:${property.id}`; const [locks] = await connection.query('SELECT GET_LOCK(?,0) acquired', [lock]);
    if (!(locks as { acquired: number }[])[0]?.acquired) { lock = ''; return NextResponse.json({ error: 'Ya se está generando una liquidación. Espera unos segundos y vuelve a intentarlo.' }, { status: 409 }); }
    const record = await read(property.id); if (body.version !== record.version) return NextResponse.json({ error: 'Guarda los cambios y revisa la versión actual antes de generar.' }, { status: 409 });
    const document = record.data.documents.find(d => d.id === body.documentId); if (!document) return NextResponse.json({ error: 'Documento no disponible.' }, { status: 404 });
    const missing = generationMissing(document, record.data.common); if (missing.length) return NextResponse.json({ error: `Completa: ${missing.join(', ')}.` }, { status: 400 });
    const fingerprint = createHash('sha256').update(JSON.stringify({ common: record.data.common, document })).digest('hex').slice(0,20);
    const filename = `liquidacion-${document.side}-${document.id}-${fingerprint}.${body.format}`;
    const [existing] = await db.select({ id: inmArchivos.id }).from(inmArchivos).where(and(eq(inmArchivos.inmuebleId,property.id), eq(inmArchivos.nombreOriginal,filename),eq(inmArchivos.almacenamiento,'hosting'))).limit(1);
    if (existing) return NextResponse.json({ id: existing.id, existing: true });
    const bytes = await liquidationFile(document, record.data.common, property.codigo, body.format, property.operacion);
    const form = new FormData(); form.set('archivo', new File([new Uint8Array(bytes)], filename, { type: body.format === 'pdf' ? 'application/pdf' : body.format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); form.set('nombre', `${document.title} · ${document.date} · ${fingerprint.slice(0,6)}`); form.set('tipoDocumento', liquidationCategory(property.operacion,document.side)); form.set('observacion', `Generado en intranet. Versión de datos ${record.version}.`);
    const headers = new Headers(request.headers); headers.delete('content-type'); headers.delete('content-length');
    return await uploadDocument(new Request(request.url, { method: 'POST', headers, body: form }), context);
  } catch { return NextResponse.json({ error: 'No se pudo generar o adjuntar. El borrador está guardado; puedes reintentar.' }, { status: 500 }); }
  finally { if (connection) { try { if (lock) await connection.query('SELECT RELEASE_LOCK(?)',[lock]); } finally { connection.release(); } } }
}
