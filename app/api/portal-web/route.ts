import {NextResponse} from 'next/server';
import {listLegacyRecords} from '@/lib/portal-web-legacy';
import {authorizeApi} from '@/lib/auth';
import {listWebRecords,bridgeConfigured} from '@/lib/portal-web';
export async function GET(request:Request){
 const auth=await authorizeApi(undefined,'portal');if(auth.response)return auth.response;
 try{
  const query=new URL(request.url).searchParams;
  // Leer todos los vínculos para no mostrar dos veces un anuncio vinculado en otra zona.
  const all=await listWebRecords();let existingRecords=[] as Awaited<ReturnType<typeof listLegacyRecords>>,catalogError='';
  if(query.get('includeCatalog')==='1'){try{existingRecords=await listLegacyRecords(all);}catch{catalogError='No se pudieron cargar los anuncios existentes del portal. Reintenta la consulta.';}}
  const zone=query.get('zona');const records=all.filter(row=>!zone||zone==='*'||row.source.zone===zone);
  return NextResponse.json({records,connected:bridgeConfigured(),existingRecords,catalogError},{headers:{'Cache-Control':'private, no-store'}});
 }
 catch{return NextResponse.json({error:'No se pudo cargar el apartado web. Comprueba que su instalación esté completa.'},{status:503});}
}
