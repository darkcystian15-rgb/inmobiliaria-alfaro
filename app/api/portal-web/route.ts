import {NextResponse} from 'next/server';
import {authorizeApi} from '@/lib/auth';
import {listWebRecords,bridgeConfigured} from '@/lib/portal-web';
export async function GET(request:Request){
 const auth=await authorizeApi();if(auth.response)return auth.response;
 try{return NextResponse.json({records:await listWebRecords(new URL(request.url).searchParams.get('zona')),connected:bridgeConfigured()},{headers:{'Cache-Control':'private, no-store'}});}
 catch{return NextResponse.json({error:'No se pudo cargar el apartado web. Comprueba que su instalación esté completa.'},{status:503});}
}
