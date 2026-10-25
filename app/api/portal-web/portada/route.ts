import {NextResponse} from 'next/server';
import {authorizeApi} from '@/lib/auth';
import {bannerData,saveBanners,publishBanners,PortalError} from '@/lib/portal-web';
export const maxDuration=60;
const fail=(error:unknown)=>NextResponse.json({error:error instanceof PortalError?error.message:'No se pudo completar la operación de portada.'},{status:error instanceof PortalError?error.status:500});
export async function GET(){const auth=await authorizeApi(undefined,'portal');if(auth.response)return auth.response;try{return NextResponse.json(await bannerData(),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return fail(error);}}
export async function PUT(request:Request){const auth=await authorizeApi(request,'portal');if(auth.response)return auth.response;try{const body=await request.json();if(!Number.isSafeInteger(body.version)||body.version<0)throw new PortalError('Versión no válida.');return NextResponse.json(await saveBanners(body.items,body.version,auth.user.id));}catch(error){return fail(error);}}
export async function POST(request:Request){const auth=await authorizeApi(request,'portal');if(auth.response)return auth.response;try{const body=await request.json();if(!Number.isSafeInteger(body.version)||body.version<0)throw new PortalError('Versión no válida.');const result=await publishBanners(body.version,auth.user.id);return NextResponse.json(result,{status:result.synced?200:202});}catch(error){return fail(error);}}
