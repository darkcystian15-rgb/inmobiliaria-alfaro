import { propertyIdentifierCondition } from "@/lib/property-identity";
import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { authorizeApi } from '@/lib/auth';
import { inmConfigAlertas, inmInmuebles, inmSeguimiento, inmTimeline, inmUsuarios } from '@/db/schema';
import { trackingInput, activities } from '@/lib/operational-input.mjs';

async function property(key: string) {
  const [row] = await db.select({id:inmInmuebles.id,estado:inmInmuebles.estado}).from(inmInmuebles).where(propertyIdentifierCondition(key)).limit(1);
  return row;
}
export async function GET(_request:Request, context:{params:Promise<{id:string}>}) {
  const auth=await authorizeApi(undefined,'informacion');if(auth.response)return auth.response;
  try {
    const row=await property((await context.params).id);if(!row)return NextResponse.json({error:'Inmueble no encontrado.'},{status:404});
    const [items,usuarios,plazos]=await Promise.all([
      db.select({actividad:inmSeguimiento.actividad,responsableId:inmSeguimiento.responsableId,responsable:inmUsuarios.nombre,fechaLimite:inmSeguimiento.fechaLimite,observacion:inmSeguimiento.observacion}).from(inmSeguimiento).leftJoin(inmUsuarios,eq(inmUsuarios.id,inmSeguimiento.responsableId)).where(eq(inmSeguimiento.inmuebleId,row.id)),
      auth.user.rol==='administrador' ? db.select({id:inmUsuarios.id,nombre:inmUsuarios.nombre}).from(inmUsuarios).where(and(eq(inmUsuarios.activo,true),eq(inmUsuarios.rol,'administrador'))).orderBy(asc(inmUsuarios.nombre)) : Promise.resolve([]),
      db.select({actividad:inmConfigAlertas.tipo,dias:inmConfigAlertas.dias}).from(inmConfigAlertas).where(eq(inmConfigAlertas.activo,true)),
    ]);
    return NextResponse.json({items,usuarios,plazos:plazos.filter(p=>activities.includes(p.actividad))});
  } catch {return NextResponse.json({error:'No se pudo consultar el seguimiento.'},{status:500});}
}
export async function PUT(request:Request,context:{params:Promise<{id:string}>}) {
  const auth=await authorizeApi(request);if(auth.response)return auth.response;
  let values;try{values=trackingInput(await request.json());}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Datos no válidos.'},{status:400});}
  try{
    const row=await property((await context.params).id);if(!row)return NextResponse.json({error:'Inmueble no encontrado.'},{status:404});
    await db.transaction(async tx=>{
      const [current]=await tx.select().from(inmInmuebles).where(eq(inmInmuebles.id,row.id)).limit(1).for('update');
      if(current.estado!=='activo')throw new Error('El inmueble es histórico.');
      if(values.responsableId!==null){const [user]=await tx.select({id:inmUsuarios.id}).from(inmUsuarios).where(and(eq(inmUsuarios.id,values.responsableId),eq(inmUsuarios.activo,true),eq(inmUsuarios.rol,'administrador'))).limit(1).for('update');if(!user)throw new Error('Selecciona un administrador activo para esta actividad.');}
      const [previous]=await tx.select().from(inmSeguimiento).where(and(eq(inmSeguimiento.inmuebleId,row.id),eq(inmSeguimiento.actividad,values.actividad)));
      await tx.insert(inmSeguimiento).values({...values,inmuebleId:row.id}).onDuplicateKeyUpdate({set:values});
      await tx.insert(inmTimeline).values({inmuebleId:row.id,evento:'seguimiento_actualizado',usuarioId:auth.user.id,observacion:JSON.stringify({anterior:previous?{actividad:previous.actividad,responsableId:previous.responsableId,fechaLimite:previous.fechaLimite,observacion:previous.observacion}:null,nuevo:values})});
    });return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error&&/histórico|administrador activo/.test(error.message)?error.message:'No se pudo guardar el seguimiento.'},{status:409});}
}
