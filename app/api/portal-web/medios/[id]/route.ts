import {NextResponse} from 'next/server';
import {authorizeApi} from '@/lib/auth';
import {readPortalValue} from '@/lib/portal-web';
import {hostingRequest} from '@/lib/document-hosting';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 const auth=await authorizeApi(undefined,'portal');if(auth.response)return auth.response;
 try{const id=(await context.params).id;if(!/^[a-f0-9-]{36}$/.test(id))return new NextResponse(null,{status:404});const asset=await readPortalValue<{path:string;mime:string}>(`asset:${id}`);if(!asset)return new NextResponse(null,{status:404});const image=await hostingRequest('GET',asset.payload.path);return new NextResponse(image.body,{headers:{'Content-Type':asset.payload.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return new NextResponse(null,{status:404});}
}
