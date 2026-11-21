import { NextResponse } from 'next/server';
import { and, eq, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmBorradores } from '@/db/schema';
import { authorizeApi } from '@/lib/auth';
import { emptyLiquidations, liquidationInput } from '@/lib/liquidation';
export async function GET() {
  const auth = await authorizeApi(undefined,'informacion'); if (auth.response) return auth.response;
  try { const rows = await db.select({ key: inmBorradores.clave, content: inmBorradores.contenido }).from(inmBorradores).where(and(eq(inmBorradores.usuarioId,auth.user.id),like(inmBorradores.clave,'liquidacion-plantilla:%'))); return NextResponse.json({ templates: rows.map(r => ({ key: r.key, ...JSON.parse(r.content) })) },{headers:{'Cache-Control':'private, no-store'}}); }
  catch { return NextResponse.json({error:'No se pudieron consultar tus plantillas.'},{status:500}); }
}
export async function POST(request: Request) {
  const auth = await authorizeApi(request,'informacion'); if (auth.response) return auth.response;
  try { const body = await request.json(); if (!['venta','alquiler'].includes(body.operation) || typeof body.name !== 'string' || !body.name.trim() || body.name.length>80) throw Error('Indica un nombre de plantilla de hasta 80 caracteres.'); const data = emptyLiquidations(); data.documents=[body.document]; const document = liquidationInput(data).documents[0];
    if (body.operation === 'alquiler' && document.sections.some(s => s.rows.some(r => ['renta','alcabala'].includes(r.kind)))) throw Error('La plantilla no corresponde a alquiler.');
    document.person='';document.identity='';document.representative='';document.notes='';
    for(const s of document.sections) for(const r of s.rows) {r.amount='';r.base='';r.paid=false;r.note='';}
    const key=`liquidacion-plantilla:${body.operation}:${document.side}`;
    const content=JSON.stringify({ name:body.name.trim(),operation:body.operation,document });
    try { await db.insert(inmBorradores).values({usuarioId:auth.user.id,clave:key,contenido:content}).onDuplicateKeyUpdate({set:{contenido:content,actualizado:new Date()}}); } catch { return NextResponse.json({error:'No se pudo guardar la plantilla. Intenta nuevamente.'},{status:500}); }
    return NextResponse.json({ok:true});
  } catch(e) {return NextResponse.json({error:e instanceof Error?e.message:'No se pudo guardar la plantilla.'},{status:400});}
}
