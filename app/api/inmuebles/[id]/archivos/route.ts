import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inmArchivos, inmInmuebles, inmUsuarios } from "@/db/schema";

const TIPOS = new Set(["DNI_PROPIETARIO","DOCUMENTO_PROPIEDAD","COPIA_LITERAL","CONTRATO","TASACION","TEXTO_PUBLICACION","FOTO_INMUEBLE","VIDEO_INMUEBLE","PLANO","RECIBO_SERVICIO","OTRO"]);

async function findInmueble(key: string) {
  const [row] = await db.select({ id: inmInmuebles.id }).from(inmInmuebles)
    .where(key.match(/^\d+$/) ? eq(inmInmuebles.id, Number(key)) : eq(inmInmuebles.codigo, key)).limit(1);
  return row;
}

async function getSystemUser() {
  const email = "sistema@inmobiliaria-alfaro.local";
  let [user] = await db.select().from(inmUsuarios).where(eq(inmUsuarios.email, email)).limit(1);
  if (!user) {
    const [created] = await db.insert(inmUsuarios).values({ nombre:"Usuario actual", email, rol:"usuario", activo:true }).$returningId();
    [user] = await db.select().from(inmUsuarios).where(eq(inmUsuarios.id, created.id)).limit(1);
  }
  return user;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const inmueble = await findInmueble((await context.params).id);
    if (!inmueble) return NextResponse.json({ error:"Inmueble no encontrado." }, {status:404});
    const archivos = await db.select().from(inmArchivos).where(eq(inmArchivos.inmuebleId,inmueble.id)).orderBy(asc(inmArchivos.tipoDocumento),asc(inmArchivos.fechaRegistro));
    return NextResponse.json({ archivos });
  } catch { return NextResponse.json({error:"No se pudieron consultar los archivos."},{status:500}); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const inmueble = await findInmueble((await context.params).id);
    if (!inmueble) return NextResponse.json({error:"Inmueble no encontrado."},{status:404});
    const body=await request.json();
    const tipoDocumento=String(body.tipoDocumento??"").trim(), nombre=String(body.nombre??"").trim(), enlace=String(body.enlace??"").trim(), observacion=String(body.observacion??"").trim();
    if(!TIPOS.has(tipoDocumento)) return NextResponse.json({error:"Tipo de documento no válido."},{status:400});
    if(!nombre||!enlace) return NextResponse.json({error:"El nombre y el enlace de Drive son obligatorios."},{status:400});
    if(!/^https?:\/\//i.test(enlace)) return NextResponse.json({error:"El enlace debe comenzar con http:// o https://."},{status:400});
    const user=await getSystemUser();
    if(!user) return NextResponse.json({error:"No se pudo establecer el usuario de trazabilidad."},{status:500});
    const [created]=await db.insert(inmArchivos).values({inmuebleId:inmueble.id,tipoDocumento,nombre,enlace,observacion:observacion||null,usuarioId:user.id}).$returningId();
    return NextResponse.json({ok:true,id:created.id},{status:201});
  } catch { return NextResponse.json({error:"No se pudo registrar el archivo."},{status:500}); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const inmueble=await findInmueble((await context.params).id);
    if(!inmueble) return NextResponse.json({error:"Inmueble no encontrado."},{status:404});
    const fileId=Number(new URL(request.url).searchParams.get("archivoId"));
    if(!Number.isInteger(fileId)) return NextResponse.json({error:"Archivo no válido."},{status:400});
    await db.delete(inmArchivos).where(and(eq(inmArchivos.id,fileId),eq(inmArchivos.inmuebleId,inmueble.id)));
    return NextResponse.json({ok:true});
  } catch { return NextResponse.json({error:"No se pudo eliminar el enlace."},{status:500}); }
}
