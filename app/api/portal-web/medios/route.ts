import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {authorizeApi} from '@/lib/auth';
import {prepareImage} from '@/lib/image-files.mjs';
import {hostingRequest} from '@/lib/document-hosting';
import {registerBannerAsset} from '@/lib/portal-web';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const auth=await authorizeApi(request,'portal');if(auth.response)return auth.response;
 try{
  if(Number(request.headers.get('content-length'))>4*1024*1024+65536)return NextResponse.json({error:'La imagen debe pesar como máximo 4 MB.'},{status:413});
  const form=await request.formData(),file=form.get('image');if(!(file instanceof File)||file.size>4*1024*1024)return NextResponse.json({error:'Selecciona una imagen JPG, PNG o WebP de hasta 4 MB.'},{status:400});
  const prepared=await prepareImage(file.name,Buffer.from(await file.arrayBuffer()));
  const id=randomUUID(),path=`portal-web/banners/${id}.webp`;
  await hostingRequest('PUT',path,prepared.bytes);
  try{await registerBannerAsset(id,{path,name:file.name.slice(0,255),mime:prepared.contentType},auth.user.id);}catch(error){await hostingRequest('DELETE',path).catch(()=>{});throw error;}
  return NextResponse.json({id,url:`/api/portal-web/medios/${id}`},{status:201});
 }catch{return NextResponse.json({error:'No se pudo cargar la imagen. Revisa su formato y el almacenamiento.'},{status:400});}
}
