export const escapePublicText=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\r?\n/g,'<br>');
export const validCoordinates=(latitude,longitude)=>latitude!==''&&longitude!==''&&latitude!=null&&longitude!=null&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude))&&Math.abs(Number(latitude))<=90&&Math.abs(Number(longitude))<=180&&!(Number(latitude)===0&&Number(longitude)===0);
export function normalizePublicSettings(input){
 const mode=input.map?.mode??'preserve';
 const blocks=input.additionalInfo??[];
 if(!Array.isArray(blocks)||blocks.length>100)throw Error('Información adicional no válida.');
 return {additionalInfoMode:input.additionalInfoMode??'preserve',additionalInfo:blocks.map(b=>({title:typeof b?.title==='string'?b.title.trim():'',content:typeof b?.content==='string'?b.content.trim():''})),map:{mode,latitude:input.map?.latitude==null?'':String(input.map.latitude).trim(),longitude:input.map?.longitude==null?'':String(input.map.longitude).trim()}};
}
export function publicSettingsProblems(settings){
 const issues=[];const mode=settings.additionalInfoMode??'preserve',blocks=settings.additionalInfo??[],map=settings.map??{mode:'preserve'};
 if(!['preserve','replace'].includes(mode)||!Array.isArray(blocks)||(mode==='replace'&&(blocks.length>20||blocks.some(b=>typeof b.title!=='string'||!b.title.trim()||b.title.length>50||typeof b.content!=='string'||!b.content.trim()||escapePublicText(b.content).length>1000))))issues.push('Completa los títulos y contenidos de información adicional (hasta 20 bloques; título de 50 caracteres y contenido de hasta 1000 incluyendo formato).');
 if(!['preserve','none','exact','approximate'].includes(map.mode)||(['exact','approximate'].includes(map.mode)&&(!validCoordinates(map.latitude,map.longitude)||(map.mode==='approximate'&&!validCoordinates(Number(Number(map.latitude).toFixed(2)),Number(Number(map.longitude).toFixed(2)))))))issues.push('Indica coordenadas válidas para mostrar el mapa, o elige «Sin mapa».');
 return issues;
}
export function snapshotPublicSettings(draft){
 const settings=normalizePublicSettings(draft),map=settings.map;
 return {additionalInfoMode:settings.additionalInfoMode,additionalInfo:settings.additionalInfo,map:{mode:map.mode,latitude:map.mode==='none'||map.latitude===''?null:map.mode==='approximate'?Number(Number(map.latitude).toFixed(2)):Number(map.latitude),longitude:map.mode==='none'||map.longitude===''?null:map.mode==='approximate'?Number(Number(map.longitude).toFixed(2)):Number(map.longitude)}};
}
export function coordinatesFromText(value){
 const raw=String(value||'').trim();let text=raw;
 if(/^https?:/i.test(raw)){let url;try{url=new URL(raw);}catch{return null;}if(!['google.com','www.google.com','maps.google.com','google.com.pe','www.google.com.pe','maps.app.goo.gl'].includes(url.hostname))return null;try{text=decodeURIComponent(url.pathname)+' '+url.searchParams.get('q')+' '+url.searchParams.get('query')+' '+url.searchParams.get('ll');}catch{return null;}}
 const match=text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)||text.match(/(?:@|^|\s)(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
 return match&&validCoordinates(match[1],match[2])?{latitude:match[1],longitude:match[2]}:null;
}
