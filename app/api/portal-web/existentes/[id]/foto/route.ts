import {authorizeApi} from '@/lib/auth';
import {legacyCatalog} from '@/lib/portal-web-legacy';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const auth=await authorizeApi();if(auth.response)return auth.response;
 try{
  const id=Number((await context.params).id),photo=Number(new URL(request.url).searchParams.get('foto'));
  if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(photo)||photo<0)return new Response(null,{status:404});
  const [row]=await legacyCatalog(id),selected=row?.photos.find(p=>p.id===photo);if(!selected)return new Response(null,{status:404});
  const url=new URL(selected.image,process.env.PORTAL_WEB_ORIGIN),local=['localhost','127.0.0.1'].includes(url.hostname)&&['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname);
  const allowed=['media.inmobiliariaalbertoalfaro.com.pe','raw.githubusercontent.com',new URL(process.env.PORTAL_WEB_ORIGIN!).hostname];
  if(!local&&(url.protocol!=='https:'||!allowed.includes(url.hostname)))return new Response(null,{status:404});
  const image=await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)}),mime=image.headers.get('content-type')?.split(';')[0];
  if(!image.ok||!mime||!['image/jpeg','image/png','image/webp'].includes(mime))return new Response(null,{status:404});
  const bytes=await image.arrayBuffer();if(bytes.byteLength>4*1024*1024)return new Response(null,{status:413});
  return new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}
}
