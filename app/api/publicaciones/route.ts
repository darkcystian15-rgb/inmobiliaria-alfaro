import {propertyZoneName,zoneCondition} from '@/lib/zone-scope';
import {propertyAddress} from '@/lib/property-address.mjs';
import {publicationReadiness} from '@/lib/publication-readiness';
import {authorizeApi} from '@/lib/auth';
import {diffusionInput,diffusionState,readReferences,DiffusionInputError} from '@/lib/diffusion.mjs';
import {NextResponse} from 'next/server';
import {and,asc,eq,or,isNotNull} from 'drizzle-orm';
import {db} from '@/lib/db';
import {inmAsignacionesPosicion,inmInmuebles,inmPosiciones,inmPublicaciones,inmTasaciones,inmTimeline,inmAnuncios} from '@/db/schema';

export async function GET(request:Request){
 const auth=await authorizeApi();if(auth.response)return auth.response;
 try{
  const rows=await db.select({inmuebleId:inmInmuebles.id,codigo:inmInmuebles.codigo,zona:propertyZoneName,zonaId:inmInmuebles.zonaId,distrito:inmInmuebles.distrito,provincia:inmInmuebles.provincia,departamento:inmInmuebles.departamento,direccion:inmInmuebles.direccion,nombre:inmInmuebles.referencia,tipo:inmInmuebles.tipo,operacion:inmInmuebles.operacion,propietario:inmInmuebles.nombreContacto,posicion:inmPosiciones.numero,id:inmPublicaciones.id,texto:inmPublicaciones.texto,textoRealizado:inmPublicaciones.textoRealizado,mediosDifusion:inmPublicaciones.mediosDifusion,cartelColocado:inmPublicaciones.cartelColocado,redesPublicadas:inmPublicaciones.redesPublicadas,referenciasDifusion:inmPublicaciones.referenciasDifusion,publicado:inmPublicaciones.publicado,fechaPublicacion:inmPublicaciones.fechaPublicacion,valorReferencia:inmTasaciones.valorReferencia,valorReferenciaMoneda:inmTasaciones.valorReferenciaMoneda,precioObjetivo:inmTasaciones.precioObjetivo,precioObjetivoMoneda:inmTasaciones.precioObjetivoMoneda,precioVenta:inmTasaciones.precioVenta,precioVentaMoneda:inmTasaciones.precioVentaMoneda,observacion:inmTasaciones.observacion})
  .from(inmInmuebles).leftJoin(inmTasaciones,eq(inmTasaciones.inmuebleId,inmInmuebles.id)).leftJoin(inmPublicaciones,eq(inmPublicaciones.inmuebleId,inmInmuebles.id)).leftJoin(inmAsignacionesPosicion,and(eq(inmAsignacionesPosicion.inmuebleId,inmInmuebles.id),eq(inmAsignacionesPosicion.activa,true))).leftJoin(inmPosiciones,eq(inmPosiciones.id,inmAsignacionesPosicion.posicionId)).where(and(zoneCondition(request),eq(inmInmuebles.estado,'activo'),or(eq(inmTasaciones.situacion,'aprobado'),isNotNull(inmPublicaciones.id)))).orderBy(asc(inmPosiciones.numero),asc(inmInmuebles.id));
  const expedientes=await publicationReadiness(db,rows.map(row=>row.inmuebleId));
  const legacy=await db.select({inmuebleId:inmAnuncios.inmuebleId,canal:inmAnuncios.canal,url:inmAnuncios.enlace}).from(inmAnuncios);
  const todas=rows.map(row=>({...row,posicion:row.posicion==null?'—':String(row.posicion).padStart(3,'0'),texto:row.texto??'',textoRealizado:row.textoRealizado??false,publicado:row.publicado??false,cartelColocado:row.cartelColocado??false,redesPublicadas:row.redesPublicadas??false,ubicacion:propertyAddress(row),referencias:row.referenciasDifusion===null?legacy.filter(a=>a.inmuebleId===row.inmuebleId).map(a=>({canal:a.canal,url:a.url})):readReferences(row.referenciasDifusion),etapa:diffusionState(row),expediente:expedientes.get(row.inmuebleId)}));
  return NextResponse.json({ok:true,todas,pendientes:todas.filter(row=>row.etapa==='texto_pendiente'),listos:todas.filter(row=>row.etapa==='difusion_pendiente'),publicadas:todas.filter(row=>row.etapa==='completada'),incompletos:[]});
 }catch{return NextResponse.json({error:'No se pudo consultar texto y publicación.'},{status:500});}
}

async function save(request:Request){
 const auth=await authorizeApi(request);if(auth.response)return auth.response;
 let body;
 try{body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();}catch{return NextResponse.json({error:'Solicitud no válida.'},{status:400});}
 const inmuebleId=Number(body.inmuebleId);
 if(!Number.isSafeInteger(inmuebleId)||inmuebleId<1)return NextResponse.json({error:'Inmueble no válido.'},{status:400});
 const diffusion=request.method==='PATCH';
 try{
  if(!diffusion&&(typeof body.texto!=='string'||!body.texto.trim()||body.texto.length>20000))throw new DiffusionInputError('Ingresa el texto (hasta 20 000 caracteres).');
  if(body.textoRealizado!==undefined&&typeof body.textoRealizado!=='boolean')throw new DiffusionInputError('Estado del texto no válido.');
  const diffusionValues=diffusion?diffusionInput(body):null;
  const result=await db.transaction(async tx=>{
   const [property]=await tx.select().from(inmInmuebles).where(and(eq(inmInmuebles.id,inmuebleId),zoneCondition(request))).limit(1).for('update');
   if(property?.estado!=='activo')throw new Error('El inmueble no está activo.');
   const [valuation]=await tx.select({id:inmTasaciones.id}).from(inmTasaciones).where(and(eq(inmTasaciones.inmuebleId,inmuebleId),eq(inmTasaciones.situacion,'aprobado'))).limit(1);
   if(!valuation)throw new Error('El inmueble no tiene una tasación registrada.');
   const [previous]=await tx.select().from(inmPublicaciones).where(eq(inmPublicaciones.inmuebleId,inmuebleId)).limit(1).for('update');
   if(diffusion){
    if(!previous?.textoRealizado||!previous.texto.trim())throw new DiffusionInputError('Completa el texto antes de registrar la publicación.');
    const values={...diffusionValues!,fechaPublicacion:diffusionValues!.publicado?(previous.fechaPublicacion??new Date()):previous.fechaPublicacion,usuarioPublicacionId:diffusionValues!.publicado?auth.user.id:previous.usuarioPublicacionId};
    await tx.update(inmPublicaciones).set(values).where(eq(inmPublicaciones.id,previous.id));
    await tx.insert(inmTimeline).values({inmuebleId,evento:'difusion_actualizada',usuarioId:auth.user.id,observacion:JSON.stringify({anterior:{medios:previous.mediosDifusion,cartel:previous.cartelColocado,redes:previous.redesPublicadas,completada:previous.publicado,referencias:readReferences(previous.referenciasDifusion)},nuevo:diffusionValues})});
    return {situacion:values.publicado?'completada':'difusion_pendiente'};
   }
   const texto=body.texto.trim();
   // Existing completed text and diffusion remain completed when edited.
   const textoRealizado=Boolean(previous?.textoRealizado||body.textoRealizado===true);
   const mediosDifusion=body.mediosDifusion===undefined?previous?.mediosDifusion??null:body.mediosDifusion;
   if(mediosDifusion!==null&&!['cartel','redes','ambos'].includes(mediosDifusion))throw new DiffusionInputError('Selecciona medios de publicación válidos.');
   // Media are configured in the diffusion editor for existing texts; text edits never reset confirmations.
   const values={texto,textoRealizado,fechaTextoRealizado:textoRealizado?(previous?.textoRealizado?previous.fechaTextoRealizado:new Date()):null,mediosDifusion:previous?.textoRealizado&&previous.mediosDifusion?previous.mediosDifusion:mediosDifusion};
   if(previous)await tx.update(inmPublicaciones).set(values).where(eq(inmPublicaciones.id,previous.id));
   else await tx.insert(inmPublicaciones).values({...values,inmuebleId,driveLink:'',usuarioRegistroId:auth.user.id,publicado:false});
   await tx.insert(inmTimeline).values({inmuebleId,evento:previous?'publicacion_actualizada':'publicacion_registrada',usuarioId:auth.user.id,observacion:JSON.stringify({anterior:previous?.texto??null,nuevo:texto,textoRealizado})});
   return {situacion:previous?.publicado?'completada':textoRealizado?'difusion_pendiente':'texto_pendiente'};
  });
  return NextResponse.json({ok:true,...result},{status:request.method==='POST'?201:200});
 }catch(error){const message=error instanceof Error?error.message:'';const status=error instanceof DiffusionInputError?400:/no está activo|no tiene una tasación/.test(message)?409:500;return NextResponse.json({error:status===500?'No se pudo guardar texto y publicación.':message},{status});}
}
export const POST=save;
export const PUT=save;
export const PATCH=save;
