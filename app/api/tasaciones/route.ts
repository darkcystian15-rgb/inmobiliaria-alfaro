import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { inmAsignacionesPosicion, inmInmuebles, inmPosiciones, inmPropietarios, inmPublicaciones, inmTasaciones, inmTimeline, inmUsuarios } from "@/db/schema";

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function toMoney(value: unknown) { const raw=clean(value).replace(/,/g,""); if(!raw) return null; const n=Number(raw); return Number.isFinite(n)&&n>=0?raw:null; }
const SITUACIONES=new Set(["pendiente_aprobacion","en_negociacion","aprobado","rechazado"]);

async function getSystemUser(tx:any){
  const email="sistema@inmobiliaria-alfaro.local";
  let [user]=await tx.select().from(inmUsuarios).where(eq(inmUsuarios.email,email)).limit(1);
  if(!user){const [created]=await tx.insert(inmUsuarios).values({nombre:"Usuario actual",email,rol:"usuario",activo:true}).$returningId();[user]=await tx.select().from(inmUsuarios).where(eq(inmUsuarios.id,created.id)).limit(1);}
  if(!user) throw new Error("No fue posible registrar el usuario de trazabilidad.");
  return user;
}
function etapaDe(s:string){return s==="aprobado"?"texto_pendiente":s==="en_negociacion"?"en_negociacion":s==="rechazado"?"tasacion_rechazada":"pendiente_aprobacion";}
function mapRow(r:any){return {id:r.tasacionId??null,inmuebleId:r.inmuebleId,codigo:r.codigo,posicion:r.posicion?String(r.posicion).padStart(2,"0"):"—",nombre:r.referencia,ubicacion:[r.distrito,r.provincia,r.departamento,r.direccion].filter(Boolean).join(", ")||"Sin ubicación registrada",tipo:r.tipo,propietario:[r.propietarioNombres,r.propietarioApellidos].filter(Boolean).join(" ")||"Sin propietario",dni:r.dni,fechaTasacion:r.fechaTasacion,valorReferencia:r.valorReferencia,precioObjetivo:r.precioObjetivo,situacion:r.situacion,observacion:r.observacion};}

export async function GET(){
  try{
    const pendientes=await db.select({inmuebleId:inmInmuebles.id,codigo:inmInmuebles.codigo,tipo:inmInmuebles.tipo,referencia:inmInmuebles.referencia,direccion:inmInmuebles.direccion,distrito:inmInmuebles.distrito,provincia:inmInmuebles.provincia,departamento:inmInmuebles.departamento,propietarioNombres:inmPropietarios.nombres,propietarioApellidos:inmPropietarios.apellidos,dni:inmPropietarios.dni,posicion:inmPosiciones.numero}).from(inmInmuebles).innerJoin(inmPropietarios,eq(inmPropietarios.id,inmInmuebles.propietarioId)).leftJoin(inmAsignacionesPosicion,and(eq(inmAsignacionesPosicion.inmuebleId,inmInmuebles.id),eq(inmAsignacionesPosicion.activa,true))).leftJoin(inmPosiciones,eq(inmPosiciones.id,inmAsignacionesPosicion.posicionId)).where(and(eq(inmInmuebles.estado,"activo"),eq(inmInmuebles.etapa,"tasacion_pendiente"))).orderBy(desc(inmInmuebles.fechaRegistro));
    const aprobadas=await db.select({tasacionId:inmTasaciones.id,inmuebleId:inmInmuebles.id,codigo:inmInmuebles.codigo,tipo:inmInmuebles.tipo,referencia:inmInmuebles.referencia,direccion:inmInmuebles.direccion,distrito:inmInmuebles.distrito,provincia:inmInmuebles.provincia,departamento:inmInmuebles.departamento,propietarioNombres:inmPropietarios.nombres,propietarioApellidos:inmPropietarios.apellidos,dni:inmPropietarios.dni,posicion:inmPosiciones.numero,fechaTasacion:inmTasaciones.fechaTasacion,valorReferencia:inmTasaciones.valorReferencia,precioObjetivo:inmTasaciones.precioObjetivo,situacion:inmTasaciones.situacion,observacion:inmTasaciones.observacion}).from(inmTasaciones).innerJoin(inmInmuebles,eq(inmInmuebles.id,inmTasaciones.inmuebleId)).innerJoin(inmPropietarios,eq(inmPropietarios.id,inmInmuebles.propietarioId)).leftJoin(inmAsignacionesPosicion,and(eq(inmAsignacionesPosicion.inmuebleId,inmInmuebles.id),eq(inmAsignacionesPosicion.activa,true))).leftJoin(inmPosiciones,eq(inmPosiciones.id,inmAsignacionesPosicion.posicionId)).where(and(eq(inmInmuebles.estado,"activo"),eq(inmTasaciones.situacion,"aprobado"))).orderBy(desc(inmTasaciones.fechaActualizacion));
    return NextResponse.json({ok:true,pendientes:pendientes.map(mapRow),aprobadas:aprobadas.map(mapRow)});
  }catch(error){console.error("Error al consultar tasaciones:",error);return NextResponse.json({ok:false,error:"No se pudieron consultar las tasaciones."},{status:500});}
}
export async function POST(request:Request){
  try{
    const body=await request.json(), inmuebleId=Number(body.inmuebleId), fechaTasacion=clean(body.fechaTasacion), situacion=clean(body.situacion), valorReferencia=toMoney(body.valorReferencia), precioObjetivo=toMoney(body.precioObjetivo), observacion=clean(body.observacion);
    if(!Number.isInteger(inmuebleId)||inmuebleId<=0)return NextResponse.json({ok:false,error:"Inmueble no válido."},{status:400});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fechaTasacion))return NextResponse.json({ok:false,error:"La fecha de tasación no es válida."},{status:400});
    const fecha=new Date(fechaTasacion+"T00:00:00"); if(Number.isNaN(fecha.getTime())||fecha.getTime()>new Date().setHours(23,59,59,999))return NextResponse.json({ok:false,error:"La fecha de tasación no puede ser futura."},{status:400});
    if(!SITUACIONES.has(situacion))return NextResponse.json({ok:false,error:"La situación seleccionada no es válida."},{status:400});
    const result=await db.transaction(async tx=>{
      const [property]=await tx.select().from(inmInmuebles).where(eq(inmInmuebles.id,inmuebleId)).limit(1); if(!property)throw new Error("El inmueble no existe."); if(property.estado!=="activo"||property.etapa!=="tasacion_pendiente")throw new Error("El inmueble ya no está pendiente de tasación.");
      const [existing]=await tx.select({id:inmTasaciones.id}).from(inmTasaciones).where(eq(inmTasaciones.inmuebleId,inmuebleId)).limit(1); if(existing)throw new Error("El inmueble ya tiene una tasación vigente registrada.");
      const user=await getSystemUser(tx);
      await tx.insert(inmTasaciones).values({inmuebleId,fechaTasacion:fecha,valorReferencia,precioObjetivo,situacion,observacion:observacion||null,usuarioId:user.id});
      const etapa=etapaDe(situacion); await tx.update(inmInmuebles).set({etapa}).where(eq(inmInmuebles.id,inmuebleId)); await tx.insert(inmTimeline).values({inmuebleId,evento:"tasacion_realizada",observacion:observacion||`Tasación registrada. Situación: ${situacion}.`,usuarioId:user.id}); return {codigo:property.codigo,etapa};
    });
    return NextResponse.json({ok:true,...result},{status:201});
  }catch(error){const message=error instanceof Error?error.message:"No fue posible registrar la tasación.";return NextResponse.json({ok:false,error:message},{status:/no existe|ya no está|ya tiene/i.test(message)?409:500});}
}
export async function PUT(request:Request){
  try{
    const body=await request.json(), inmuebleId=Number(body.inmuebleId), situacion=clean(body.situacion);
    if(!Number.isInteger(inmuebleId)||inmuebleId<=0||!SITUACIONES.has(situacion))return NextResponse.json({ok:false,error:"Datos de actualización no válidos."},{status:400});
    const result=await db.transaction(async tx=>{const [tasacion]=await tx.select().from(inmTasaciones).where(eq(inmTasaciones.inmuebleId,inmuebleId)).limit(1);if(!tasacion)throw new Error("El inmueble no tiene una tasación registrada.");const user=await getSystemUser(tx);await tx.update(inmTasaciones).set({situacion}).where(eq(inmTasaciones.inmuebleId,inmuebleId));const etapa=etapaDe(situacion);await tx.update(inmInmuebles).set({etapa}).where(eq(inmInmuebles.id,inmuebleId));await tx.insert(inmTimeline).values({inmuebleId,evento:"tasacion_actualizada",observacion:`Situación actualizada a: ${situacion}.`,usuarioId:user.id});return {etapa};});return NextResponse.json({ok:true,...result});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"No fue posible actualizar la tasación."},{status:500});}
}