import { propertyIdentifierCondition } from "@/lib/property-identity";
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { hostingRequest } from '@/lib/document-hosting';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmArchivos, inmInmuebles } from '@/db/schema';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string; archivoId: string }> }) {
  try {
    const auth = await authorizeApi(undefined, 'informacion');
    if (auth.response) return auth.response;
    const { id, archivoId } = await context.params;
    const fileId = Number(archivoId);
    if (!Number.isSafeInteger(fileId) || fileId < 1) return NextResponse.json({ error: 'Documento no válido.' }, { status: 400 });
    const [row] = await db.select({ file: inmArchivos }).from(inmArchivos).innerJoin(inmInmuebles, eq(inmInmuebles.id, inmArchivos.inmuebleId)).where(and(eq(inmArchivos.id, fileId), propertyIdentifierCondition(id))).limit(1);
    if (!row || row.file.almacenamiento !== 'hosting' || !row.file.rutaAlmacenamiento) return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
    const result = await hostingRequest('GET', row.file.rutaAlmacenamiento);
    const original = (row.file.nombreOriginal || row.file.nombre).replace(/[\r\n]/g, '');
    const filename = row.file.tipoMime === 'image/webp' ? original.replace(/\.[^.]+$/, '') + '.webp' : original;
    const encoded = encodeURIComponent(filename).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    const disposition = new URL(request.url).searchParams.get('download') === '1' || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(row.file.tipoMime || '') ? 'attachment' : 'inline';
    return new NextResponse(result.body, { headers: {
      'Content-Type': row.file.tipoMime || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch { return NextResponse.json({ error: 'No se pudo abrir el documento.' }, { status: 500 }); }
}
