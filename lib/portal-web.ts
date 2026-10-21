import 'server-only';
import {createHash,timingSafeEqual} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool} from '@/lib/db';
import {initialWebDraft,normalizeWebDraft,webPublicationChecklist,publicWebSnapshot,normalizeBanners,bannerChecklist} from './portal-web-rules.mjs';
import type {WebSource,WebDraft,WebRecord,WebPublication,WebBanner} from './portal-web-types';

export class PortalError extends Error { constructor(message:string,public status=400){super(message);} }
type Executor=Pick<PoolConnection,'query'>;
type Stored<T>={payload:T;version:number};
const decode=<T>(value:unknown):T=>(typeof value==='string'?JSON.parse(value):value) as T;
export async function readPortalValue<T>(key:string,db:Executor=pool,lock=false):Promise<Stored<T>|null>{
 const [rows]=await db.query<RowDataPacket[]>(`SELECT contenido,version FROM inm_portal_web WHERE clave=?${lock?' FOR UPDATE':''}`,[key]);
 return rows[0]?{payload:decode<T>(rows[0].contenido),version:Number(rows[0].version)}:null;
}
export async function writeValue(db:Executor,key:string,payload:unknown,version:number,userId:number){
 await db.query('INSERT INTO inm_portal_web(clave,contenido,version,usuario_id) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE contenido=VALUES(contenido),version=VALUES(version),usuario_id=VALUES(usuario_id)',[key,JSON.stringify(payload),version,userId]);
}
export async function event(db:Executor,key:string,action:string,user:number,version:number,reason:string){await db.query('INSERT INTO inm_portal_web_eventos(clave,accion,usuario_id,version,motivo) VALUES(?,?,?,?,?)',[key,action,user,version,reason.slice(0,500)]);}
export async function transaction<T>(action:(db:PoolConnection)=>Promise<T>){const db=await pool.getConnection();try{await db.beginTransaction();const result=await action(db);await db.commit();return result;}catch(error){await db.rollback();throw error;}finally{db.release();}}
export function bridgeConfigured(){return Boolean(process.env.PORTAL_WEB_SYNC_URL&&process.env.PORTAL_WEB_SYNC_TOKEN&&process.env.PORTAL_WEB_ORIGIN);}
export function bridgeAuthorized(request:Request){const secret=process.env.PORTAL_WEB_SYNC_TOKEN;if(!secret||secret.length<32)return false;const supplied=Buffer.from(request.headers.get('authorization')||'');const expected=Buffer.from(`Bearer ${secret}`);return supplied.length===expected.length&&timingSafeEqual(supplied,expected);}

export async function webSources(id?:number,db:Executor=pool,lock=false):Promise<WebSource[]>{
 if(lock&&id)await db.query('SELECT id FROM inm_inmuebles WHERE id=? FOR UPDATE',[id]);
 const [rows]=await db.query<RowDataPacket[]>(`SELECT i.id,i.codigo,i.tipo,i.operacion,i.estado,i.distrito,i.area_terreno,i.area_construida,i.habitaciones,i.banos,
 z.nombre zona,(SELECT p.numero FROM inm_asignaciones_zona a JOIN inm_posiciones_zona p ON p.id=a.posicion_id WHERE a.inmueble_id=i.id AND a.activa=1 LIMIT 1) posicion,
 t.precio_venta,t.situacion tasacion_situacion,COALESCE(pub.texto,'') texto,
 EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=i.id AND a.almacenamiento='hosting' AND (a.tipo_documento IN ('DNI_PROPIETARIO','VENDEDOR_DNI','VENDEDOR_DNI_GERENTE') OR (i.operacion='alquiler' AND a.tipo_documento='ARRENDADOR_DNI'))) identity_document,
 EXISTS(SELECT 1 FROM inm_archivos a WHERE a.inmueble_id=i.id AND a.almacenamiento='hosting' AND a.tipo_documento IN ('TASACION','TASACION_EXPRESS')) valuation_file,
 EXISTS(SELECT 1 FROM inm_archivos a JOIN inm_visitas v ON v.id=a.visita_id AND v.inmueble_id=i.id AND v.completada=1 WHERE a.inmueble_id=i.id AND a.tipo_documento='FOTO_INMUEBLE' AND a.almacenamiento='hosting' AND a.tipo_mime LIKE 'image/%') completed_visit_photos
 FROM inm_inmuebles i LEFT JOIN inm_zonas z ON z.id=i.zona_id LEFT JOIN inm_tasaciones t ON t.inmueble_id=i.id LEFT JOIN inm_publicaciones pub ON pub.inmueble_id=i.id ${id?'WHERE i.id=?':''} ORDER BY z.nombre,i.id`,id?[id]:[]);
 if(!rows.length)return [];
 const ids=rows.map(row=>Number(row.id));
 const [photos]=await db.query<RowDataPacket[]>("SELECT id,inmueble_id,nombre,es_portada,ruta_almacenamiento,fecha_registro,observacion FROM inm_archivos WHERE inmueble_id IN (?) AND tipo_documento='FOTO_INMUEBLE' AND almacenamiento='hosting' AND tipo_mime IN ('image/jpeg','image/png','image/webp') ORDER BY es_portada DESC,id",[ids]);
 return rows.map(row=>{
  const selected=photos.filter(photo=>Number(photo.inmueble_id)===Number(row.id));
  const source:WebSource={id:Number(row.id),code:row.codigo,zone:row.zona||'Sin zona',position:row.posicion==null?null:Number(row.posicion),type:row.tipo,operation:row.operacion,state:row.estado,district:row.distrito,landArea:row.area_terreno,builtArea:row.area_construida,bedrooms:row.habitaciones,bathrooms:row.banos,price:row.precio_venta,baseText:row.texto,valuationApproved:row.tasacion_situacion==='aprobado',identityDocument:Boolean(row.identity_document),valuationFile:Boolean(row.valuation_file),completedVisitPhotos:Boolean(row.completed_visit_photos),photos:selected.map(photo=>({id:Number(photo.id),name:photo.nombre,cover:Boolean(photo.es_portada),url:`/api/inmuebles/${row.id}/archivos/${photo.id}`})),revision:''};
  source.revision=createHash('sha256').update(JSON.stringify({...source,photos:selected})).digest('hex');return source;
 });
}
export async function webRecord(source:WebSource,db:Executor=pool):Promise<WebRecord>{
 const saved=await readPortalValue<{draft:WebDraft;sourceRevision:string}>(`draft:${source.id}`,db);
 const live=await readPortalValue<WebPublication>(`live:${source.id}`,db);
 return assembleWebRecord(source,saved,live);
}
function assembleWebRecord(source:WebSource,saved:Stored<{draft:WebDraft;sourceRevision:string}>|null,live:Stored<WebPublication>|null):WebRecord{
 const draft=saved?.payload.draft||(initialWebDraft(source) as WebDraft);
 const unchanged=!saved||saved.payload.sourceRevision===source.revision;
 return {source,draft,version:saved?.version||0,savedSourceRevision:saved?.payload.sourceRevision||source.revision,checklist:webPublicationChecklist(source,draft,unchanged),publication:live?.payload||null,pendingChanges:Boolean(live&&(live.payload.draftVersion!==(saved?.version||0)||live.payload.sourceRevision!==source.revision))};
}
export async function listWebRecords(zone?:string|null){
 const [sources,[rows]]=await Promise.all([webSources(),pool.query<RowDataPacket[]>("SELECT clave,contenido,version FROM inm_portal_web WHERE clave LIKE 'draft:%' OR clave LIKE 'live:%'")]);
 const values=new Map(rows.map(row=>[String(row.clave),{payload:decode(row.contenido),version:Number(row.version)}]));
 return sources.filter(source=>!zone||zone==='*'||source.zone===zone).map(source=>assembleWebRecord(source,values.get(`draft:${source.id}`) as Stored<{draft:WebDraft;sourceRevision:string}>||null,values.get(`live:${source.id}`) as Stored<WebPublication>||null));
}
export async function saveWebDraft(id:number,input:unknown,expected:number,sourceRevision:string,user:number){
 const draft=normalizeWebDraft(input) as unknown as WebDraft;
 return transaction(async db=>{
  const [source]=await webSources(id,db,true);if(!source)throw new PortalError('Inmueble no encontrado.',404);
  if(source.state!=='activo')throw new PortalError('El inmueble ya no está activo.',409);
  if(source.revision!==sourceRevision)throw new PortalError('La ficha de origen cambió. Recarga y revisa los datos antes de guardar.',409);
  const old=await readPortalValue(`draft:${id}`,db,true);if((old?.version||0)!==expected)throw new PortalError('Otro usuario modificó este borrador. Recarga antes de guardar.',409);
  await writeValue(db,`draft:${id}`,{draft,sourceRevision},expected+1,user);await event(db,`draft:${id}`,'draft.saved',user,expected+1,'Borrador web guardado');
  return webRecord(source,db);
 });
}

// La revisión de entrega es monotónica. Si falla la red se conserva para reintentar.
export async function deliver(key:string,version:number,body:unknown){
 let response:{portalId?:number;portalUrl?:string}={};let error='';
 try{
  if(!bridgeConfigured())throw new Error('connection');
  const endpoint=new URL(process.env.PORTAL_WEB_SYNC_URL!);const localTest=['127.0.0.1','localhost'].includes(endpoint.hostname)&&['127.0.0.1','localhost'].includes(new URL(process.env.DATABASE_URL!).hostname);if(endpoint.protocol!=='https:'&&!localTest)throw new Error('protocol');
  const result=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.PORTAL_WEB_SYNC_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!result.ok)throw new Error('remote');response=await result.json();
  if(['property','legacy'].includes((body as {kind:string}).kind)){
   if(!Number.isSafeInteger(response.portalId)||!response.portalUrl||new URL(response.portalUrl).origin!==new URL(process.env.PORTAL_WEB_ORIGIN!).origin)throw new Error('confirmation');
  }else if(!(response as {ok?:boolean}).ok)throw new Error('confirmation');
 }catch{error='El portal no confirmó el cambio. Reintenta la sincronización.';}
 await transaction(async db=>{const value=await readPortalValue<Record<string,unknown>>(key,db,true);if(!value||value.version!==version)return;
  await writeValue(db,key,{...value.payload,...response,syncState:error?'error':'synced',error},version,Number(value.payload.approvedBy));
 });
 return {synced:!error,error,...response};
}
export async function changeWebPublication(id:number,action:string,expected:number,user:number,reason:string){
 if(!['publish','suspend','withdraw','retry'].includes(action))throw new PortalError('Acción no válida.');
 if(!reason.trim())throw new PortalError('Indica el motivo del cambio.');
 const delivery=await transaction(async db=>{
  const [source]=await webSources(id,db,true);if(!source)throw new PortalError('Inmueble no encontrado.',404);
  const saved=await readPortalValue<{draft:WebDraft;sourceRevision:string}>(`draft:${id}`,db,true);
  const current=await readPortalValue<WebPublication>(`live:${id}`,db,true);
  if(action==='retry'){
   if(!current||current.payload.syncState==='synced')throw new PortalError('No hay un envío pendiente.',409);
   if(current.payload.status==='published'&&(!saved||!webPublicationChecklist(source,saved.payload.draft,saved.payload.sourceRevision===source.revision).complete||saved.version!==current.payload.draftVersion))throw new PortalError('Revisa los cambios y las condiciones antes de volver a publicar.',409);
   return {payload:current.payload,version:current.version};
  }
  if(action==='publish'){
   if(!saved||saved.version!==expected)throw new PortalError('Guarda la versión actual antes de publicar.',409);
   const checklist=webPublicationChecklist(source,saved.payload.draft,saved.payload.sourceRevision===source.revision);
   if(!checklist.complete)throw new PortalError('Falta: '+checklist.missing.map(item=>item.label).join('; '),409);
  }else if(!current)throw new PortalError('El inmueble todavía no tiene publicación web.',409);
  const payload:WebPublication=action==='publish'?{status:'published',snapshot:publicWebSnapshot(source,saved!.payload.draft),draftVersion:saved!.version,sourceRevision:source.revision,approvedBy:user,approvedAt:new Date().toISOString(),syncState:'pending'}:{...current!.payload,status:action==='suspend'?'suspended':'withdrawn',approvedBy:user,syncState:'pending',error:''};
  const version=(current?.version||0)+1;await writeValue(db,`live:${id}`,payload,version,user);await event(db,`live:${id}`,action,user,version,reason);return {payload,version};
 });
 return deliver(`live:${id}`,delivery.version,{kind:'property',sourceId:id,revision:delivery.version,status:delivery.payload.status,snapshot:delivery.payload.snapshot});
}

export async function bannerData(){
 const draft=await readPortalValue<{items:WebBanner[]}>('banners:draft');
 const live=await readPortalValue<{items:WebBanner[];syncState:string;error?:string;approvedBy:number}>('banners:live');
 const [assets]=await pool.query<RowDataPacket[]>("SELECT clave,contenido FROM inm_portal_web WHERE clave LIKE 'asset:%' ORDER BY actualizado DESC");
 const media=assets.map(row=>{const data=decode<{name:string}>(row.contenido);return {id:row.clave.slice(6),name:data.name,url:`/api/portal-web/medios/${row.clave.slice(6)}`};});
 const items=draft?.payload.items||[];return {items,version:draft?.version||0,live:live?.payload||null,media,checklist:bannerChecklist(items,media.map(item=>item.id))};
}
export async function saveBanners(input:unknown,expected:number,user:number){
 const items=normalizeBanners(input) as WebBanner[];
 await transaction(async db=>{
  await db.query("INSERT IGNORE INTO inm_portal_web(clave,contenido,version,usuario_id) VALUES('banners:lock','{}',1,?)",[user]);
  await db.query("SELECT clave FROM inm_portal_web WHERE clave='banners:lock' FOR UPDATE");
  const current=await readPortalValue('banners:draft',db,true);if((current?.version||0)!==expected)throw new PortalError('La portada cambió. Recarga antes de guardar.',409);
  await writeValue(db,'banners:draft',{items},expected+1,user);await event(db,'banners:draft','banners.saved',user,expected+1,'Portada preparada');
 });return bannerData();
}
export async function publishBanners(expected:number,user:number){
 const delivery=await transaction(async db=>{
  await db.query("INSERT IGNORE INTO inm_portal_web(clave,contenido,version,usuario_id) VALUES('banners:lock','{}',1,?)",[user]);
  await db.query("SELECT clave FROM inm_portal_web WHERE clave='banners:lock' FOR UPDATE");
  const draft=await readPortalValue<{items:WebBanner[]}>('banners:draft',db,true);if(!draft||draft.version!==expected)throw new PortalError('Guarda y revisa la versión actual de la portada.',409);
  const [assets]=await db.query<RowDataPacket[]>("SELECT clave FROM inm_portal_web WHERE clave LIKE 'asset:%'");
  const checklist=bannerChecklist(draft.payload.items,assets.map(row=>row.clave.slice(6)));if(!checklist.complete)throw new PortalError(checklist.missing.join(' '),409);
  const old=await readPortalValue('banners:live',db,true);const version=(old?.version||0)+1;
  const payload={items:draft.payload.items.filter(row=>row.enabled),syncState:'pending',approvedBy:user,draftVersion:draft.version};
  await writeValue(db,'banners:live',payload,version,user);await event(db,'banners:live','banners.publish',user,version,'Portada autorizada');return {payload,version};
 });return deliver('banners:live',delivery.version,{kind:'banners',revision:delivery.version,items:delivery.payload.items});
}
export async function registerBannerAsset(id:string,payload:unknown,user:number){await transaction(async db=>{await writeValue(db,`asset:${id}`,payload,1,user);await event(db,`asset:${id}`,'asset.upload',user,1,'Imagen de portada cargada');});}
