import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth';
import { pool } from '@/lib/db';
import { selectedZone } from '@/lib/zone-scope';
import { hostingRequest } from '@/lib/document-hosting';
import { deletionInput, prepareDeletion, commitDeletion, finishDeletion } from '@/lib/property-deletion.mjs';
import { propertyPanelContactId } from '@/lib/property-panel-id.mjs';
export const maxDuration = 60;
const jobId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);
async function operate(request: Request, mode: 'prepare' | 'delete' | 'retry') {
  const auth = await authorizeApi(request);
  if (auth.response) return auth.response;
  const zone = selectedZone(request);
  if (!zone) return NextResponse.json({ error: 'Selecciona una zona para eliminar un inmueble.' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
  if (mode !== 'prepare' && (!jobId(body?.eliminacionId) || (mode === 'delete' && body.confirmacion !== 'ELIMINAR'))) return NextResponse.json({ error: 'Falta la segunda confirmación de eliminación.' }, { status: 400 });
  let input;
  try { if (mode === 'prepare') input = deletionInput(body); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Motivo no válido.' }, { status: 400 }); }
  const connection = await pool.getConnection();
  try {
    if (mode === 'prepare') {
      const result = await prepareDeletion(connection, auth.user.id, zone, input!);
      return NextResponse.json({ eliminacionId: result.eliminacionId, inmueble: propertyPanelContactId(result.property), archivos: result.archivos }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (mode === 'delete') await commitDeletion(connection, auth.user.id, zone, body.eliminacionId);
    const complete = await finishDeletion(connection, zone, body.eliminacionId, async (path: string) => { await hostingRequest('DELETE', path); });
    return NextResponse.json({ ok: true, completo: complete, eliminacionId: complete ? undefined : body.eliminacionId,
      mensaje: complete ? 'Inmueble, documentos, fotos e historial eliminados. La posición está disponible.' : 'El inmueble ya fue eliminado de la base de datos. Falta completar el borrado de archivos; puedes reintentarlo desde esta pantalla.' }, { status: complete ? 200 : 202, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const expected = /confirm|cambió|ya no está|no existe/i.test(message);
    return NextResponse.json({ error: expected ? message : 'No se pudo completar la eliminación. Revisa el estado y vuelve a intentarlo.' }, { status: expected ? 409 : 500 });
  } finally { connection.release(); }
}
export async function POST(request: Request) { return operate(request, 'prepare'); }
export async function DELETE(request: Request) { return operate(request, 'delete'); }
export async function PATCH(request: Request) { return operate(request, 'retry'); }
