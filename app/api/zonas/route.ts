import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { authorizeApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { inmZonas, inmPosiciones, inmAsignacionesPosicion, inmInmuebles } from "@/db/schema";
import { zoneKey } from "@/lib/zone-plan.mjs";

export async function GET() {
  const auth = await authorizeApi(); if (auth.response) return auth.response;
  try {
    const zonas = await db.select({ id: inmZonas.id, nombre: inmZonas.nombre, capacidad: inmZonas.capacidad,
      ocupados: sql<number>`(SELECT COUNT(*) FROM ${inmAsignacionesPosicion} a JOIN ${inmPosiciones} p ON p.id=a.posicion_id WHERE p.zona_id=${inmZonas}.id AND a.activa=1)`,
      historicos: sql<number>`(SELECT COUNT(*) FROM ${inmInmuebles} i WHERE i.zona_id=${inmZonas}.id AND i.estado<>'activo')`,
    }).from(inmZonas).where(eq(inmZonas.activo, true)).orderBy(inmZonas.id);
    return NextResponse.json({ zonas: zonas.map(z => ({ ...z, ocupados: Number(z.ocupados), historicos: Number(z.historicos), disponibles: z.capacidad-Number(z.ocupados) })) });
  } catch (error) { console.error("Consulta de zonas",(error as {cause?:{code?:string}}).cause?.code || "ERROR"); return NextResponse.json({ error: "No se pudieron consultar las zonas." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const auth = await authorizeApi(request); if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g," ") : "";
    if (!nombre || nombre.length>100 || nombre==='*') return NextResponse.json({error:"Indica un nombre de zona de hasta 100 caracteres."},{status:400});
    await db.transaction(async tx => {
      const [existing] = await tx.select().from(inmZonas).where(eq(inmZonas.clave,zoneKey(nombre))).limit(1);
      if(existing) throw new Error("La zona ya existe.");
      const [zone] = await tx.insert(inmZonas).values({nombre,clave:zoneKey(nombre),capacidad:10}).$returningId();
      await tx.insert(inmPosiciones).values(Array.from({length:10},(_,i)=>({zonaId:zone.id,numero:i+1,activo:true})));
    });
    return NextResponse.json({ok:true},{status:201});
  } catch { return NextResponse.json({error:"No se pudo crear la zona. Comprueba que el nombre no esté repetido."},{status:409}); }
}
