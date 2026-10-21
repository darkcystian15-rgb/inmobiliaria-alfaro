import {NextResponse} from 'next/server';
import {authorizeApi} from '@/lib/auth';
import {PortalError} from '@/lib/portal-web';
import {legacyRecord,saveLegacyDraft,changeLegacy} from '@/lib/portal-web-legacy';
export const maxDuration=60;
type Context={params:Promise<{id:string}>};
const key=async(context:Context)=>{const id=Number((await context.params).id);if(!Number.isSafeInteger(id)||id<1)throw new PortalError('Inmueble no válido.');return id;};
const fail=(error:unknown)=>NextResponse.json({error:error instanceof PortalError?error.message:'No se pudo completar la operación web.'},{status:error instanceof PortalError?error.status:500});
export async function GET(_request:Request,context:Context){const auth=await authorizeApi();if(auth.response)return auth.response;try{return NextResponse.json(await legacyRecord(await key(context)),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return fail(error);}}
export async function PUT(request:Request,context:Context){const auth=await authorizeApi(request);if(auth.response)return auth.response;try{
 if(Number(request.headers.get('content-length'))>100000)throw new PortalError('El borrador es demasiado grande.',413);
 const body=await request.json();if(!Number.isSafeInteger(body.version)||body.version<0||typeof body.sourceRevision!=='string')throw new PortalError('Versión no válida.');
 return NextResponse.json(await saveLegacyDraft(await key(context),body.draft,body.version,body.sourceRevision,auth.user.id));
}catch(error){return fail(error);}}
export async function POST(request:Request,context:Context){const auth=await authorizeApi(request);if(auth.response)return auth.response;try{
 const body=await request.json();if(!Number.isSafeInteger(body.version)||body.version<0||typeof body.reason!=='string'||body.reason.length>500)throw new PortalError('Revisa la versión y el motivo.');
 const result=await changeLegacy(await key(context),String(body.action),body.version,auth.user.id,body.reason,String(body.sourceRevision||''));return NextResponse.json(result,{status:result.synced?200:202});
}catch(error){return fail(error);}}
