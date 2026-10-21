import 'server-only';
import {validCoordinates} from './portal-web-settings.mjs';
import type {WebRecord} from './portal-web-types';
const text=(value:unknown)=>String(value||'').replace(/<br\s*\/?\s*>|<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();
export async function enrichWebExtras(record:WebRecord):Promise<WebRecord>{
 const id=record.publication?.portalId||(record.draft.listingMode==='existing'?Number(record.draft.existingPortalId):null);
 if(!id||((record.draft.additionalInfoMode||'preserve')!=='preserve'&&(record.draft.map?.mode||'preserve')!=='preserve'))return record;
 try{
  const url=new URL(process.env.PORTAL_WEB_SYNC_URL!);if(url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)))throw Error();url.searchParams.set('admin','extras');url.searchParams.set('id',String(id));
  const result=await fetch(url,{headers:{Authorization:`Bearer ${process.env.PORTAL_WEB_SYNC_TOKEN}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});if(!result.ok)throw Error();
  const [row]=(await result.json()).items;if(!row)throw Error();
  const draft={...record.draft};
  if((draft.additionalInfoMode||'preserve')==='preserve')draft.additionalInfo=(row.additionalInfo||[]).map((b:{title:string;content:string})=>({title:b.title,content:text(b.content)}));
  if((draft.map?.mode||'preserve')==='preserve')draft.map={mode:'preserve',latitude:validCoordinates(row.latitude,row.longitude)?String(row.latitude):'',longitude:validCoordinates(row.latitude,row.longitude)?String(row.longitude):''};
  return {...record,draft,extrasError:''};
 }catch{return {...record,extrasError:'No se pudieron consultar los bloques y el mapa actuales del portal. Recarga antes de editarlos; los datos existentes se conservarán.'};}
}
