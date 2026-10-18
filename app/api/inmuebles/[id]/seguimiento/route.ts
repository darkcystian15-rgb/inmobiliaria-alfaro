import { propertyIdentifierCondition } from "@/lib/property-identity";
import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { authorizeApi } from '@/lib/auth';
import { inmInmuebles, inmSeguimiento, inmTimeline } from '@/db/schema';
import { trackingInput } from '@/lib/operational-input.mjs';

import { workflowTasks } from '@/lib/workflow-tasks';

async function property(key: string) {
  const [row] = await db.select({id:inmInmuebles.id,estado:inmInmuebles.estado}).from(inmInmuebles).where(propertyIdentifierCondition(key)).limit(1);
  return row;
}
export async function GET(_request:Request, context:{params:Promise<{id:string}>}) {
  const auth=await authorizeApi();if(auth.response)return auth.response;
  try {
    const row=await property((await context.params).id);if(!row)return NextResponse.json({error:'Inmueble no encontrado.'},{status:404});
    const [items,current] = await Promise.all([
      db.select({actividad:inmSeguimiento.actividad,fechaLimite:inmSeguimiento.fechaLimite,observacion:inmSeguimiento.observacion}).from(inmSeguimiento).where(eq(inmSeguimiento.inmuebleId,row.id)),
      workflowTasks(sql`${inmInmuebles.id}=${row.id}`),
    ]);
    return NextResponse.json({items,vigente:current[0]??null});
  } catch {return NextResponse.json({error:'No se pudo consultar el seguimiento.'},{status:500});}
}
export async function PUT(request:Request,context:{params:Promise<{id:string}>}) {
  const auth=await authorizeApi(request);if(auth.response)return auth.response;
  let values;try{const body=await request.json(); const {responsableId: _legacy, ...input}=trackingInput({...body,responsableId:null}); void _legacy; values=input;}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Datos no válidos.'},{status:400});}
  try{
    const row=await property((await context.params).id);if(!row)return NextResponse.json({error:'Inmueble no encontrado.'},{status:404});
    await db.transaction(async tx=>{
      const [current]=await tx.select().from(inmInmuebles).where(eq(inmInmuebles.id,row.id)).limit(1).for('update');
      if(current.estado!=='activo')throw new Error('El inmueble es histórico.');
      const [previous]=await tx.select().from(inmSeguimiento).where(and(eq(inmSeguimiento.inmuebleId,row.id),eq(inmSeguimiento.actividad,values.actividad)));
      await tx.insert(inmSeguimiento).values({...values,inmuebleId:row.id}).onDuplicateKeyUpdate({set:values});
      await tx.insert(inmTimeline).values({inmuebleId:row.id,evento:'seguimiento_actualizado',usuarioId:auth.user.id,observacion:JSON.stringify({anterior:previous?{actividad:previous.actividad,fechaLimite:previous.fechaLimite,observacion:previous.observacion}:null,nuevo:values})});
    });return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error&&/histórico|administrador activo/.test(error.message)?error.message:'No se pudo guardar el seguimiento.'},{status:409});}
}
