import 'server-only';
import {validCoordinates} from './portal-web-settings.mjs';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool} from './db';
import {PortalError,readPortalValue,writeValue,event,transaction,deliver} from './portal-web';
import {initialWebDraft,normalizeWebDraft,webPublicationChecklist,publicWebSnapshot,WEB_TYPES} from './portal-web-rules.mjs';
import type {WebSource,WebDraft,WebRecord,WebPublication} from './portal-web-types';
type Legacy={latitude:string|null;longitude:string|null;mapMode:string|null;additionalInfo:{title:string;content:string}[];id:number;title:string;description:string;distribution:string;address:string;location:string;status:string;publication_status:WebPublication['status'];price:string|null;price_on_request:boolean;moneda:string;currency_code:string|null;price_basis:string|null;type:string|null;area:string|null;area_c:string|null;bedrooms:number|null;bathrooms:number|null;cocheras:number|null;destacado:boolean;sourceRevision:string;photos:{id:number;image:string;caption:string}[]};
export async function legacyCatalog(id?:number):Promise<Legacy[]>{
 const endpoint=new URL(process.env.PORTAL_WEB_SYNC_URL!);const local=['localhost','127.0.0.1'].includes(endpoint.hostname)&&['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname);
 if(endpoint.protocol!=='https:'&&!local)throw new PortalError('Conexión al portal no válida.',503);
 endpoint.searchParams.set('admin','existing');if(id)endpoint.searchParams.set('id',String(id));
 const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${process.env.PORTAL_WEB_SYNC_TOKEN}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new PortalError('No se pudieron consultar los anuncios existentes del portal. Reintenta la carga.',503);
 const data=await response.json();if(!Array.isArray(data.items))throw new PortalError('Respuesta del portal no válida.',503);return data.items;
}
export const plain=(text:string)=>String(text||'').replace(/<br\s*\/?\s*>|<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(#\d+|#x[\da-f]+|amp|lt|gt|quot|apos|nbsp|aacute|eacute|iacute|oacute|uacute|ntilde);/gi,(match,entity:string)=>{const map:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',aacute:'á',eacute:'é',iacute:'í',oacute:'ó',uacute:'ú',ntilde:'ñ'};if(entity.startsWith('#')){const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):match;}return map[entity.toLowerCase()]||match;}).trim();
function original(row:Legacy){
 const source:WebSource={origin:'portal',id:row.id,code:`WEB-${row.id}`,zone:'Portal web',position:null,type:row.type||'Clasificación actual',operation:row.status==='Alquiler'?'alquiler':'venta',state:'activo',district:row.location,landArea:row.area,builtArea:row.area_c,bedrooms:row.bedrooms,bathrooms:row.bathrooms,price:row.price,baseText:'',valuationApproved:false,identityDocument:false,valuationFile:false,completedVisitPhotos:false,revision:row.sourceRevision,photos:row.photos.map(p=>({id:p.id,name:p.caption,cover:p.id===0,url:`/api/portal-web/existentes/${row.id}/foto?foto=${p.id}`}))};
 const draft:WebDraft={...initialWebDraft(source),additionalInfoMode:'preserve',additionalInfo:(row.additionalInfo||[]).map(b=>({title:b.title,content:plain(b.content)})),map:{mode:row.mapMode==='none'?'none':validCoordinates(row.latitude,row.longitude)?row.mapMode==='approximate'?'approximate':'exact':'preserve',latitude:row.latitude==null?'':String(row.latitude),longitude:row.longitude==null?'':String(row.longitude)},listingMode:'existing',existingPortalId:String(row.id),title:row.title,description:plain(row.description),type:WEB_TYPES.includes(row.type||'')?row.type!:'',publicLocation:row.address||row.location,district:row.location,priceMode:row.price_on_request||!Number(row.price)?'consult':'amount',currency:row.currency_code||(/US|\$/.test(row.moneda)?'USD':'PEN'),priceBasis:source.operation==='alquiler'?'mensual':row.price_basis==='per_unit'||/c\/u/.test(row.moneda)?'por_unidad':'total',rentalTerms:plain(row.distribution),garages:row.cocheras==null?'':String(row.cocheras),landArea:Number(row.area)>0?String(row.area):'',builtArea:Number(row.area_c)>0?String(row.area_c):'',photos:row.photos.map(p=>({id:p.id,caption:p.caption})),coverPhotoId:row.photos[0]?.id??null,featured:Boolean(row.destacado),dataAuthorized:true,photosAuthorized:true};
 return {source,draft};
}
type Saved={draft:WebDraft;sourceRevision:string};
type Delivery=WebPublication&{body:unknown};
function assemble(row:Legacy,saved:{payload:Saved;version:number}|null,live:{payload:Delivery;version:number}|null):WebRecord{
 const base=original(row),settled=live?.payload.syncState==='synced';
 const useSaved=saved&&(!settled||saved.version!==live?.payload.draftVersion||saved.payload.sourceRevision===row.sourceRevision);
 const draft=useSaved?{...base.draft,...saved.payload.draft}:base.draft,revision=useSaved?saved.payload.sourceRevision:row.sourceRevision;
 const actual:WebPublication={status:row.publication_status,snapshot:publicWebSnapshot(base.source,base.draft),draftVersion:saved?.version||0,sourceRevision:row.sourceRevision,approvedBy:0,approvedAt:'',syncState:'synced',portalId:row.id,portalUrl:`${process.env.PORTAL_WEB_ORIGIN}/propiedades/resumen/${row.id}`};
 return {source:base.source,draft,version:saved?.version||0,savedSourceRevision:revision,checklist:webPublicationChecklist(base.source,draft,revision===row.sourceRevision),publication:live&&!settled?live.payload:actual,pendingChanges:Boolean(useSaved&&saved.version!==(live?.payload.draftVersion||0))};
}
export async function listLegacyRecords(native:WebRecord[]){
 const [rows,[values]]=await Promise.all([legacyCatalog(),pool.query<RowDataPacket[]>("SELECT clave,contenido,version FROM inm_portal_web WHERE clave LIKE 'legacy-draft:%' OR clave LIKE 'legacy-live:%'")]);
 const linked=new Set(native.flatMap(r=>r.publication?.portalId?[r.publication.portalId]:[]));
 const get=<T>(key:string)=>{const value=values.find(v=>v.clave===key);return value?{payload:(typeof value.contenido==='string'?JSON.parse(value.contenido):value.contenido) as T,version:Number(value.version)}:null;};
 return rows.filter(r=>!linked.has(r.id)).map(row=>assemble(row,get<Saved>(`legacy-draft:${row.id}`),get<Delivery>(`legacy-live:${row.id}`)));
}
async function lock(db:PoolConnection,id:number,user:number){await db.query("INSERT IGNORE INTO inm_portal_web(clave,contenido,version,usuario_id) VALUES(?,'{}',1,?)",[`legacy-lock:${id}`,user]);await db.query('SELECT clave FROM inm_portal_web WHERE clave=? FOR UPDATE',[`legacy-lock:${id}`]);}
export async function legacyRecord(id:number){const [row]=await legacyCatalog(id);if(!row)throw new PortalError('Anuncio existente no encontrado o ya vinculado.',404);return assemble(row,await readPortalValue<Saved>(`legacy-draft:${id}`),await readPortalValue<Delivery>(`legacy-live:${id}`));}
export async function saveLegacyDraft(id:number,input:unknown,version:number,sourceRevision:string,user:number){
 const record=await legacyRecord(id);if(record.source.revision!==sourceRevision)throw new PortalError('El anuncio cambió en el portal. Recarga para revisar su versión actual.',409);
 const draft=normalizeWebDraft(input) as unknown as WebDraft;
 await transaction(async db=>{await lock(db,id,user);const old=await readPortalValue(`legacy-draft:${id}`,db,true);if((old?.version||0)!==version)throw new PortalError('Otro usuario modificó el borrador. Recarga.',409);await writeValue(db,`legacy-draft:${id}`,{draft,sourceRevision},version+1,user);await event(db,`legacy-draft:${id}`,'draft.saved',user,version+1,'Edición de anuncio existente');});return legacyRecord(id);
}
export async function changeLegacy(id:number,action:string,version:number,user:number,reason:string,sourceRevision:string){
 if(!['publish','suspend','withdraw','retry'].includes(action)||!reason.trim())throw new PortalError('Indica una acción y un motivo válidos.');
 const record=await legacyRecord(id);
 if(action!=='retry'&&sourceRevision!==record.source.revision)throw new PortalError('El anuncio cambió. Recarga antes de continuar.',409);
 const delivery=await transaction(async db=>{
  await lock(db,id,user);const current=await readPortalValue<Delivery>(`legacy-live:${id}`,db,true);
  if(action==='retry'){if(!current||current.payload.syncState==='synced')throw new PortalError('No hay envíos pendientes.',409);return {version:current.version,body:current.payload.body};}
  const saved=await readPortalValue<Saved>(`legacy-draft:${id}`,db,true);
  if(action==='publish'&&(saved?.version||0)!==version)throw new PortalError('Guarda el borrador antes de publicar.',409);
  const draft=action==='publish'?(saved?.payload.draft||record.draft):record.draft;
  if(action==='publish'&&!webPublicationChecklist(record.source,draft,(!saved||saved.payload.sourceRevision===record.source.revision)).complete)throw new PortalError('Completa las condiciones de la ficha pública.',409);
  const revision=(current?.version||0)+1,status=action==='publish'?'published':action==='suspend'?'suspended':'withdrawn';
  const snapshot=action==='publish'?publicWebSnapshot(record.source,draft):record.publication!.snapshot,body={kind:'legacy',portalId:id,revision,expectedSourceRevision:record.source.revision,status,snapshot};
  const payload:Delivery={status,snapshot,draftVersion:action==='publish'?(saved?.version||0):(current?.payload.draftVersion||0),sourceRevision:record.source.revision,approvedBy:user,approvedAt:new Date().toISOString(),syncState:'pending',portalId:id,portalUrl:record.publication!.portalUrl,body};
  await writeValue(db,`legacy-live:${id}`,payload,revision,user);await event(db,`legacy-live:${id}`,action,user,revision,reason);return {version:revision,body};
 });return deliver(`legacy-live:${id}`,delivery.version,delivery.body);
}
