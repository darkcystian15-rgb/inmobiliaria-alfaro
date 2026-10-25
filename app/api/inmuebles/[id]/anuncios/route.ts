import { synchronizePropertyCurrency } from '@/lib/property-currency-service';
import { selectedPropertyCurrency } from '@/lib/property-currency.mjs';
import { propertyIdentifierCondition } from "@/lib/property-identity";
import { NextResponse } from 'next/server';
import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { authorizeApi } from '@/lib/auth';
import { inmAnuncios, inmInmuebles, inmTasaciones, inmTimeline } from '@/db/schema';
import { announcementInput } from '@/lib/operational-input.mjs';

async function property(key:string){const [row]=await db.select({id:inmInmuebles.id}).from(inmInmuebles).where(propertyIdentifierCondition(key)).limit(1);return row;}
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 const auth=await authorizeApi(undefined,'informacion');if(auth.response)return auth.response;
 try{const row=await property((await context.params).id);if(!row)return NextResponse.json({error:'Inmueble no encontrado.'},{status:404});
 const items=await db.select({id:inmAnuncios.id,canal:inmAnuncios.canal,enlace:inmAnuncios.enlace,fechaPublicacion:inmAnuncios.fechaPublicacion,precioPublicado:inmAnuncios.precioPublicado,precioPublicadoMoneda:inmAnuncios.precioPublicadoMoneda,precioVentaMoneda:inmTasaciones.precioVentaMoneda,actualizado:inmAnuncios.actualizado,precioVenta:inmTasaciones.precioVenta,revisionTexto:inmAnuncios.revisionTexto}).from(inmAnuncios).leftJoin(inmTasaciones,eq(inmTasaciones.inmuebleId,inmAnuncios.inmuebleId)).where(eq(inmAnuncios.inmuebleId,row.id));
 return NextResponse.json({items:items.map(item=>({...item,pendiente:false}))});
 }catch{return NextResponse.json({error:'No se pudieron consultar los anuncios.'},{status:500});}
}
async function save(request:Request,context:{params:Promise<{id:string}>}){
 const auth=await authorizeApi(request);if(auth.response)return auth.response;
 let body,values;try{body=await request.json();values=announcementInput(body);if(request.method==='PUT'&&(!Number.isSafeInteger(body.id)||body.id<1))throw new Error('Anuncio no válido.');}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Datos no válidos.'},{status:400});}
 try{const row=await property((await context.params).id);if(!row)return NextResponse.json({error:'Inmueble no encontrado.'},{status:404});
 await db.transaction(async tx=>{
  const [current]=await tx.select().from(inmInmuebles).where(eq(inmInmuebles.id,row.id)).limit(1).for('update');if(current.estado!=='activo')throw new Error('El inmueble es histórico.');
  const [appraisal]=await tx.select().from(inmTasaciones).where(eq(inmTasaciones.inmuebleId,row.id)).limit(1);
  const currency=selectedPropertyCurrency({moneda:body.moneda ?? body.precioPublicadoMoneda},current,appraisal);
  await synchronizePropertyCurrency(tx,row.id,currency,auth.user.id);
  const [lastText]=await tx.select({id:inmTimeline.id}).from(inmTimeline).where(and(eq(inmTimeline.inmuebleId,row.id),eq(inmTimeline.evento,"publicacion_actualizada"))).orderBy(desc(inmTimeline.id)).limit(1);
  const stored={...values,precioPublicadoMoneda:currency,revisionTexto:lastText?.id??0};
  let previous=null;
  if(request.method==='PUT'){const [old]=await tx.select().from(inmAnuncios).where(and(eq(inmAnuncios.id,body.id),eq(inmAnuncios.inmuebleId,row.id))).limit(1);if(!old)throw new Error('Anuncio no encontrado.');previous=old;await tx.update(inmAnuncios).set({...stored,actualizado:sql`CURRENT_TIMESTAMP`}).where(eq(inmAnuncios.id,old.id));}
  else await tx.insert(inmAnuncios).values({...stored,inmuebleId:row.id});
  await tx.insert(inmTimeline).values({inmuebleId:row.id,evento:'anuncio_actualizado',usuarioId:auth.user.id,observacion:JSON.stringify({anterior:previous,nuevo:values})});
 });return NextResponse.json({ok:true},{status:request.method==='POST'?201:200});
 }catch(error){return NextResponse.json({error:error instanceof Error&&/histórico|no encontrado/.test(error.message)?error.message:'No se pudo guardar el anuncio.'},{status:409});}
}
export const POST=save;
export const PUT=save;
