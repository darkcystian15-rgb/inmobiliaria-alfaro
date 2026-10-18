import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmConfigAlertas, securityAudit } from '@/db/schema';
import { auditValues } from '@/lib/security-audit';
import { activities } from '@/lib/operational-input.mjs';
export async function PUT(request:Request){
 const auth=await authorizeApi(request);if(auth.response)return auth.response;
 let body;try{body=await request.json();if(!activities.includes(body.actividad)||!Number.isInteger(body.dias)||body.dias<1||body.dias>365)throw new Error();}catch{return NextResponse.json({error:'Selecciona una actividad y un plazo entre 1 y 365 días.'},{status:400});}
 try{await db.transaction(async tx=>{await tx.update(inmConfigAlertas).set({dias:body.dias,activo:true,usuarioActualizacionId:auth.user.id}).where(eq(inmConfigAlertas.tipo,body.actividad));await tx.insert(securityAudit).values(auditValues(auth.user.id,'deadline.update',`activity:${body.actividad}`));});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'No se pudo guardar el plazo.'},{status:500});}
}

export async function GET(){
 const auth=await authorizeApi();if(auth.response)return auth.response;
 try{return NextResponse.json({items:await db.select({actividad:inmConfigAlertas.tipo,dias:inmConfigAlertas.dias}).from(inmConfigAlertas).where(eq(inmConfigAlertas.activo,true))});}
 catch{return NextResponse.json({error:'No se pudieron consultar los plazos.'},{status:500});}
}
