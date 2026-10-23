import {normalizePublicSettings,publicSettingsProblems,snapshotPublicSettings} from './portal-web-settings.mjs';
export const WEB_TYPES = ['Casa', 'Departamento', 'Terreno', 'Oficina', 'Local Comercial', 'Terreno Comercial', 'Hotel'];
export const WEB_STATES = ['published', 'suspended', 'withdrawn'];
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const amount = value => value === '' || value == null ? null : Number(value);
const validAmount = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) < 1e12;

export function initialWebDraft(source) {
  const type = WEB_TYPES.find(item => item.toLowerCase() === String(source.type).toLowerCase()) || '';
  return { ...normalizePublicSettings({}),title: '', description: source.baseText || '', type,listingMode:'',existingPortalId:'',
    priceMode: 'amount', price: source.price == null ? '' : String(source.price), currency: source.currency ?? '',
    priceBasis: source.operation === 'alquiler' ? 'mensual' : 'total',
    publicLocation: '', district: source.district || '',
    landArea: source.landArea == null ? '' : String(source.landArea),
    builtArea: source.builtArea == null ? '' : String(source.builtArea),
    bedrooms: source.bedrooms == null ? '' : String(source.bedrooms),
    bathrooms: source.bathrooms == null ? '' : String(source.bathrooms),
    garages: '', rentalTerms: '', photos: [], coverPhotoId: null,
    featured: false, dataAuthorized: false, photosAuthorized: false };
}

export function normalizeWebDraft(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ficha web no válida.');
  const draft = Object.fromEntries([
    ['title',100],['description',8000],['type',50],['listingMode',15],['existingPortalId',15],['priceMode',15],['price',30],['currency',5],
    ['priceBasis',20],['publicLocation',250],['district',25],['landArea',30],['builtArea',30],
    ['bedrooms',10],['bathrooms',10],['garages',10],['rentalTerms',2000],
  ].map(([key,max]) => [key,clean(input[key],max)]));
  draft.photos = Array.isArray(input.photos) ? input.photos.slice(0,100).map(photo => ({id:Number(photo?.id),caption:clean(photo?.caption,100)})) : [];
  draft.coverPhotoId = input.coverPhotoId == null ? null : Number(input.coverPhotoId);
  for (const key of ['featured','dataAuthorized','photosAuthorized']) draft[key] = input[key] === true;
  Object.assign(draft,normalizePublicSettings(input));
  return draft;
}

export function webPublicationChecklist(source, draft, sourceUnchanged = true) {
  const selected = draft.photos || [];
  const eligible = new Set(source.photos.map(photo => photo.id));
  const add = (key,label,complete,section='datos') => ({key,label,complete:Boolean(complete),section});
  let items = [
    add('active','Inmueble activo',source.state === 'activo','intranet'),
    add('valuation','Tasación aprobada',source.valuationApproved,'intranet'),
    add('identity','Documento de identidad del propietario',source.identityDocument,'expediente'),
    add('valuationFile','Archivo de tasación',source.valuationFile,'expediente'),
    add('visitPhotos','Fotos de una visita completada',source.completedVisitPhotos,'fotos'),
    add('baseText','Texto preparado en la intranet',String(source.baseText || '').trim(),'intranet'),
    add('operation','Operación venta o alquiler', ['venta','alquiler'].includes(source.operation)),
    add('existingListing','Indicar si es nuevo o vincular su anuncio web existente',draft.listingMode==='new'||(draft.listingMode==='existing'&&Number.isSafeInteger(Number(draft.existingPortalId))&&Number(draft.existingPortalId)>0)),
    add('type','Tipo compatible con el catálogo web',WEB_TYPES.includes(draft.type)),
    add('title','Título comercial (mínimo 10 caracteres)',draft.title.trim().length >= 10),
    add('description','Descripción pública (40 a 8000 caracteres)',draft.description.trim().length >= 40 && draft.description.length<=8000 && draft.description.replace(/[&<>"']/g,'&quot;').replace(/\r?\n/g,'<br>').length<=10000),
    add('location','Ubicación pública y distrito',draft.publicLocation.trim() && draft.district.trim()),
    add('price','Precio positivo con moneda, o «Consultar precio»',draft.priceMode === 'consult' || (draft.priceMode === 'amount' && validAmount(draft.price) && ['PEN','USD'].includes(draft.currency))),
    add('priceBasis','Modalidad del precio coherente con la operación',draft.priceMode === 'consult' || (source.operation === 'alquiler' ? draft.priceBasis === 'mensual' : ['total','por_unidad'].includes(draft.priceBasis))),
    add('area','Superficie aplicable confirmada', /Terreno/.test(draft.type) ? validAmount(draft.landArea) : draft.type === 'Departamento' ? validAmount(draft.builtArea) : validAmount(draft.landArea) || validAmount(draft.builtArea)),
    add('measurements','Superficies y cantidades sin valores inválidos', ['landArea','builtArea'].every(key => draft[key] === '' || validAmount(draft[key])) && ['bedrooms','bathrooms','garages'].every(key => draft[key] === '' || (Number.isSafeInteger(amount(draft[key])) && amount(draft[key]) >= 0 && amount(draft[key]) <= 1000))),
    add('photos','Al menos una foto pública válida y sin duplicados',selected.length > 0 && selected.every(photo => eligible.has(photo.id)) && new Set(selected.map(photo => photo.id)).size === selected.length,'fotos'),
    add('cover','Portada elegida entre las fotos públicas',selected.some(photo => photo.id === draft.coverPhotoId),'fotos'),
    add('dataPermission','Autorización de datos y ubicación pública',draft.dataAuthorized,'revision'),
    add('photoPermission','Autorización de las fotografías seleccionadas',draft.photosAuthorized,'revision'),
    add('sourceVersion','Datos de origen revisados en su versión actual',sourceUnchanged,'revision'),
  ];
  if(source.origin==='portal'){
    const omitted=new Set(['active','valuation','identity','valuationFile','visitPhotos','baseText','existingListing','area']);
    items=items.filter(item=>!omitted.has(item.key)).map(item=>item.key==='type'?{...item,complete:!draft.type||WEB_TYPES.includes(draft.type),label:'Clasificación actual o tipo compatible'}:item.key==='title'?{...item,complete:Boolean(draft.title.trim()),label:'Título comercial'}:item.key==='description'?{...item,complete:Boolean(draft.description.trim())&&draft.description.length<=8000&&draft.description.replace(/[&<>"']/g,'&quot;').replace(/\r?\n/g,'<br>').length<=10000,label:'Descripción pública'}:item);
  }
  for(const [index,label] of publicSettingsProblems(draft).entries())items.push(add(`publicSettings${index}`,label,false,label.includes('mapa')?'mapa':'adicional'));
  return {items,complete:items.every(item=>item.complete),missing:items.filter(item=>!item.complete),completed:items.filter(item=>item.complete).length,total:items.length};
}

// Lista explícita. Nunca copiar la fila interna, documentos ni observaciones.
export function publicWebSnapshot(source,draft) {
  return { ...snapshotPublicSettings(draft),sourceId:source.id, existingPortalId:draft.listingMode==='existing'?Number(draft.existingPortalId):null,title:draft.title, description:draft.description,
    operation:source.operation, type:draft.type, location:draft.publicLocation,district:draft.district,
    price:draft.priceMode === 'consult' ? null : Number(draft.price),
    currency:draft.priceMode === 'consult' ? null : draft.currency, priceBasis:draft.priceBasis,
    landArea:amount(draft.landArea),builtArea:amount(draft.builtArea),bedrooms:amount(draft.bedrooms),bathrooms:amount(draft.bathrooms),garages:amount(draft.garages),
    rentalTerms:source.operation === 'alquiler' ? draft.rentalTerms : '',
    photos:draft.photos.map(photo=>({id:photo.id,caption:photo.caption})),coverPhotoId:draft.coverPhotoId,featured:draft.featured };
}

export function normalizeBanners(input) {
  if (!Array.isArray(input) || input.length > 10) throw new Error('Puedes preparar hasta diez imágenes de portada.');
  const banners=input.map((row,index)=>({id:clean(row.id,80) || `banner-${index+1}`,imageId:clean(row.imageId,80),title:clean(row.title,120),subtitle:clean(row.subtitle,250),buttonLabel:clean(row.buttonLabel,40),href:clean(row.href,300),position:['center','top','bottom','left','right'].includes(row.position)?row.position:'center',enabled:row.enabled===true,authorized:row.authorized===true}));
  if(new Set(banners.map(row=>row.id)).size!==banners.length)throw new Error('Los identificadores de las imágenes deben ser únicos.');
  return banners;
}
export function bannerChecklist(banners,availableIds) {
  const active=banners.filter(row=>row.enabled);
  const missing=[];
  if(!active.length)missing.push('Activa al menos una imagen.');
  for(const [index,row] of active.entries()) {
    const prefix=`Imagen ${index+1}: `;
    if(!availableIds.includes(row.imageId))missing.push(prefix+'sube una imagen válida.');
    if(!row.title)missing.push(prefix+'escribe un título.');
    if(!row.authorized)missing.push(prefix+'confirma el permiso de uso.');
    if((row.href || row.buttonLabel) && (!row.buttonLabel || !/^\/(?:propiedades(?:\/resumen\/[1-9]\d*)?|contacto|vende-o-alquila)?(?:\?[^\\\s#]*)?$/.test(row.href) || /[\\\r\n]/.test(row.href)))missing.push(prefix+'revisa el botón y su enlace interno al portal.');
  }
  return {complete:missing.length===0,missing};
}
