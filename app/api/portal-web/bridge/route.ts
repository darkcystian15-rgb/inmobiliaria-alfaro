import {NextResponse} from 'next/server';
import type {RowDataPacket} from 'mysql2/promise';
import {pool} from '@/lib/db';
import {bridgeAuthorized,readPortalValue} from '@/lib/portal-web';
import {hostingRequest} from '@/lib/document-hosting';
import type {WebBanner,WebPublication} from '@/lib/portal-web-types';
export const runtime='nodejs';
export async function GET(request:Request){
 if(!bridgeAuthorized(request))return new NextResponse(null,{status:401});
 try{
  const query=new URL(request.url).searchParams;let path='',mime='';
  if(query.get('kind')==='photo'){
   const property=Number(query.get('property')),id=Number(query.get('id'));if(!Number.isSafeInteger(property)||!Number.isSafeInteger(id))return new NextResponse(null,{status:404});
   const live=await readPortalValue<WebPublication>(`live:${property}`);
   if(live?.payload.status!=='published'||!live.payload.snapshot.photos.some(photo=>photo.id===id))return new NextResponse(null,{status:404});
   const [rows]=await pool.query<RowDataPacket[]>("SELECT a.ruta_almacenamiento,a.tipo_mime FROM inm_archivos a JOIN inm_inmuebles i ON i.id=a.inmueble_id WHERE a.id=? AND i.id=? AND i.estado='activo' AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime IN ('image/jpeg','image/png','image/webp')",[id,property]);
   if(!rows[0])return new NextResponse(null,{status:404});path=rows[0].ruta_almacenamiento;mime=rows[0].tipo_mime;
  }else if(query.get('kind')==='banner'){
   const id=query.get('id')||'';if(!/^[a-f0-9-]{36}$/.test(id))return new NextResponse(null,{status:404});
   const live=await readPortalValue<{items:WebBanner[]}>('banners:live');if(!live?.payload.items.some(row=>row.enabled&&row.imageId===id))return new NextResponse(null,{status:404});
   const asset=await readPortalValue<{path:string;mime:string}>(`asset:${id}`);if(!asset)return new NextResponse(null,{status:404});path=asset.payload.path;mime=asset.payload.mime;
  }
  if(!path)return new NextResponse(null,{status:404});const image=await hostingRequest('GET',path);
  return new NextResponse(image.body,{headers:{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new NextResponse(null,{status:503});}
}
