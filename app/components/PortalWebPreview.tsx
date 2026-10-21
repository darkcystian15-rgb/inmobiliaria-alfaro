/* eslint-disable @next/next/no-img-element */
import type {WebSnapshot} from '@/lib/portal-web-types';
export default function PortalWebPreview({snapshot}:{snapshot:WebSnapshot}){
 const cover=snapshot.photos.find(photo=>photo.id===snapshot.coverPhotoId);
 const image=(id:number)=>`/api/inmuebles/${snapshot.sourceId}/archivos/${id}`;
 const price=snapshot.price==null?'Precio a consultar':`${snapshot.currency==='USD'?'US$':'S/'} ${new Intl.NumberFormat('es-PE').format(snapshot.price)}${snapshot.priceBasis==='mensual'?' / mes':snapshot.priceBasis==='por_unidad'?' c/u':''}`;
 return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
  {cover?<img src={image(cover.id)} alt={cover.caption||snapshot.title} className="aspect-[16/9] w-full object-cover"/>:<div className="flex aspect-[16/9] items-center justify-center bg-slate-100 text-sm text-slate-500">Selecciona una foto de portada</div>}
  <div className="space-y-4 p-5 sm:p-7"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">{snapshot.operation==='alquiler'?'Alquiler':'Venta'}</span>{snapshot.featured&&<span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Destacado</span>}</div>
   <h3 className="break-words text-2xl font-bold text-slate-900">{snapshot.title||'Título del anuncio'}</h3><p className="text-sm text-slate-500">{[snapshot.location,snapshot.district].filter(Boolean).join(' · ')||'Ubicación pública por completar'}</p><p className="text-xl font-bold text-red-700">{price}</p>
   <div className="flex flex-wrap gap-3 text-sm text-slate-700">{[[snapshot.landArea,'m² de terreno'],[snapshot.builtArea,'m² construidos'],[snapshot.bedrooms,'dormitorios'],[snapshot.bathrooms,'baños'],[snapshot.garages,'cocheras']].map(([value,label])=>value!=null&&<span key={String(label)} className="rounded-lg bg-slate-50 px-3 py-2">{value} {label}</span>)}</div>
   <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{snapshot.description||'La descripción pública aparecerá aquí.'}</p>{snapshot.rentalTerms&&<p className="whitespace-pre-wrap text-sm text-slate-600"><strong>Condiciones de alquiler: </strong>{snapshot.rentalTerms}</p>}
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{snapshot.photos.map(photo=><figure key={photo.id}><img src={image(photo.id)} alt={photo.caption||snapshot.title} className="aspect-[4/3] w-full rounded-xl object-cover"/>{photo.caption&&<figcaption className="mt-1 text-xs text-slate-500">{photo.caption}</figcaption>}</figure>)}</div>
  </div>
 </div>;
}
