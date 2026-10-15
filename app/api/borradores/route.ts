import { stripCoordinates } from "@/lib/retired-coordinates.mjs";
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
function key(request:Request){const value=new URL(request.url).searchParams.get('clave')??'';return /^(ficha|visitas|tasaciones|textos|registro):[a-zA-Z0-9_-]{1,90}$/.test(value)?value:null;}
export async function GET(request:Request){
 const auth=await authorizeApi(undefined,'informacion');if(auth.response)return auth.response;const clave=key(request);if(!clave)return NextResponse.json({error:'Borrador no válido.'},{status:400});
 if(auth.user.rol!=='administrador'&&!clave.startsWith('ficha:'))return NextResponse.json({error:'Acceso restringido.'},{status:403});
 try{const [rows]=await db.execute(sql`SELECT contenido, actualizado FROM inm_borradores WHERE usuario_id=${auth.user.id} AND clave=${clave} AND actualizado >= DATE_SUB(NOW(), INTERVAL 14 DAY)`);const result=(rows as unknown as {contenido:string;actualizado:Date}[])[0];return NextResponse.json({borrador:result?{contenido:stripCoordinates(JSON.parse(result.contenido)),actualizado:result.actualizado}:null});}catch{return NextResponse.json({error:'No se pudo recuperar el borrador.'},{status:500});}
}
export async function PUT(request:Request){
 const auth=await authorizeApi(request,'informacion');if(auth.response)return auth.response;const clave=key(request);if(!clave)return NextResponse.json({error:'Borrador no válido.'},{status:400});
 if(auth.user.rol!=='administrador'&&!clave.startsWith('ficha:'))return NextResponse.json({error:'Acceso restringido.'},{status:403});
 let contenido;try{const text=await request.text();if(text.length>100000)throw new Error();const body=JSON.parse(text);contenido=stripCoordinates(body.contenido);if(contenido!==null&&(typeof contenido!=='object'||Array.isArray(contenido)||JSON.stringify(contenido).length>90000))throw new Error();}catch{return NextResponse.json({error:'Borrador no válido o demasiado grande.'},{status:400});}
 try{
  if(contenido===null)await db.execute(sql`DELETE FROM inm_borradores WHERE usuario_id=${auth.user.id} AND clave=${clave}`);
  else await db.execute(sql`INSERT INTO inm_borradores(usuario_id,clave,contenido) VALUES(${auth.user.id},${clave},${JSON.stringify(contenido)}) ON DUPLICATE KEY UPDATE contenido=VALUES(contenido), actualizado=CURRENT_TIMESTAMP`);
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'No se pudo guardar el borrador.'},{status:500});}
}
