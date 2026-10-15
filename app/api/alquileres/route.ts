import { nextPropertyOrder } from "@/lib/property-identity";
import { propertyCode } from "@/lib/property-code.mjs";
import {NextResponse} from 'next/server';
import {and,eq,sql} from 'drizzle-orm';
import {db} from '@/lib/db';
import {authorizeApi} from '@/lib/auth';
import {inmInmuebles,inmLiberaciones,inmPosiciones,inmAsignacionesPosicion,inmTimeline} from '@/db/schema';
import {validCalendarDate} from '@/lib/report-period.mjs';
import {todayInPeru} from '@/lib/calendar.mjs';
import {assignedPropertyType} from '@/lib/property-types';
export async function GET(){
 const auth=await authorizeApi();if(auth.response)return auth.response;
 try{
 const items=await db.select({id:inmLiberaciones.id,inmuebleId:inmInmuebles.id,codigo:inmInmuebles.codigo,nombre:inmInmuebles.referencia,inicio:inmLiberaciones.fechaInicioAlquiler,fin:inmLiberaciones.fechaFinAlquiler,renta:inmLiberaciones.rentaMensual,reingresoId:sql<number|null>`(SELECT i.id FROM inm_inmuebles i WHERE i.inmueble_origen_id=${inmInmuebles.id} ORDER BY i.id DESC LIMIT 1)`}).from(inmLiberaciones).innerJoin(inmInmuebles,eq(inmInmuebles.id,inmLiberaciones.inmuebleId)).where(and(eq(inmLiberaciones.motivo,'alquilado'),eq(inmLiberaciones.confirmado,true),eq(inmLiberaciones.anulada,false))).orderBy(inmLiberaciones.fechaFinAlquiler,inmLiberaciones.id);
 return NextResponse.json({items:items.map(item=>({...item,estado:!item.fin?'Sin fecha de fin':item.fin<todayInPeru()?'Vencido':item.fin<=new Date(Date.now()+30*86400000).toISOString().slice(0,10)?'Vence en 30 días':'Vigente'}))});
 }catch{return NextResponse.json({error:'No se pudieron consultar los contratos.'},{status:500});}
}
export async function PATCH(request:Request){
 const auth=await authorizeApi(request);if(auth.response)return auth.response;
 try{const body=await request.json();if(!Number.isSafeInteger(body.id)||!validCalendarDate(body.fin))return NextResponse.json({error:'Selecciona contrato y nueva fecha de fin válida.'},{status:400});
 await db.transaction(async tx=>{const [closure]=await tx.select().from(inmLiberaciones).where(eq(inmLiberaciones.id,body.id)).limit(1).for('update');if(!closure||closure.motivo!=='alquilado'||!closure.confirmado||closure.anulada)throw new Error('Contrato no disponible.');
 const [property]=await tx.select().from(inmInmuebles).where(eq(inmInmuebles.id,closure.inmuebleId)).limit(1).for('update');
 const [reentry]=await tx.select({id:inmInmuebles.id}).from(inmInmuebles).where(eq(inmInmuebles.inmuebleOrigenId,property.id)).limit(1);if(reentry)throw new Error('El inmueble ya reingresó; no se puede renovar el contrato anterior.');
 if(body.fin<todayInPeru()||body.fin<=(closure.fechaFinAlquiler||closure.fechaInicioAlquiler||closure.fechaAlquiler||''))throw new Error('La renovación debe extender el contrato a una fecha no pasada.');
 await tx.update(inmLiberaciones).set({fechaFinAlquiler:body.fin}).where(eq(inmLiberaciones.id,closure.id));await tx.insert(inmTimeline).values({inmuebleId:property.id,usuarioId:auth.user.id,evento:'alquiler_renovado',observacion:`Fin anterior: ${closure.fechaFinAlquiler||'sin fecha'}; nuevo fin: ${body.fin}. Renta mensual conservada.`});});return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'No se pudo renovar.'},{status:400});}
}
export async function POST(request:Request){
 const auth=await authorizeApi(request);if(auth.response)return auth.response;
 try{const body=await request.json();if(!Number.isSafeInteger(body.id)||!Number.isInteger(body.posicion)||body.posicion<1||body.posicion>90)return NextResponse.json({error:'Selecciona contrato y posición de 1 a 90.'},{status:400});
 const id=await db.transaction(async tx=>{
 const [closure]=await tx.select().from(inmLiberaciones).where(eq(inmLiberaciones.id,body.id)).limit(1).for('update');if(!closure||closure.motivo!=='alquilado'||!closure.confirmado||closure.anulada)throw new Error('Contrato no disponible.');
 const [original]=await tx.select().from(inmInmuebles).where(eq(inmInmuebles.id,closure.inmuebleId)).limit(1).for('update');if(!original||original.estado==='activo')throw new Error('La ficha original debe ser histórica.');
 if(!closure.fechaFinAlquiler||closure.fechaFinAlquiler>=todayInPeru())throw new Error('El contrato debe estar vencido antes de reingresar a cartera.');
 const [prior]=await tx.select({id:inmInmuebles.id}).from(inmInmuebles).where(eq(inmInmuebles.inmuebleOrigenId,original.id)).limit(1);if(prior)throw new Error('Este contrato ya tiene un reingreso registrado.');
 const type=await assignedPropertyType(tx,original.tipo);
 const [position]=await tx.select().from(inmPosiciones).where(eq(inmPosiciones.numero,body.posicion)).limit(1).for('update');if(!position?.activo)throw new Error('Posición no disponible.');const [used]=await tx.select({id:inmAsignacionesPosicion.id}).from(inmAsignacionesPosicion).where(and(eq(inmAsignacionesPosicion.posicionId,position.id),eq(inmAsignacionesPosicion.activa,true))).limit(1).for('update');if(used)throw new Error('La posición está ocupada.');
 const numeroOrden=await nextPropertyOrder(tx);
 const [created]=await tx.insert(inmInmuebles).values({codigo:propertyCode(numeroOrden,type,original.referencia),numeroOrden,inmuebleOrigenId:original.id,tipo:type,operacion:'alquiler',referencia:original.referencia,nombreContacto:original.nombreContacto,direccion:original.direccion,distrito:original.distrito,provincia:original.provincia,departamento:original.departamento,latitud:original.latitud,longitud:original.longitud,areaTerreno:original.areaTerreno,areaConstruida:original.areaConstruida,habitaciones:original.habitaciones,banos:original.banos,caracteristicas:original.caracteristicas,observaciones:original.observaciones,estado:'activo',etapa:'visita_pendiente'}).$returningId();
 await tx.insert(inmAsignacionesPosicion).values({inmuebleId:created.id,posicionId:position.id,activa:true});await tx.insert(inmTimeline).values([{inmuebleId:created.id,usuarioId:auth.user.id,evento:'inmueble_registrado',observacion:`Nueva captación desde ficha histórica ${original.codigo}. Visita y precios deben registrarse nuevamente.`},{inmuebleId:original.id,usuarioId:auth.user.id,evento:'alquiler_reingresado',observacion:`Nueva captación ${created.id}, posición ${body.posicion}. El contrato y los documentos anteriores se conservan.`}]);return created.id;
 });return NextResponse.json({ok:true,id},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'No se pudo reingresar.'},{status:409});}
}
