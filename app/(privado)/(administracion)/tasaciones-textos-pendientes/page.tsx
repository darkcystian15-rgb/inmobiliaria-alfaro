"use client";
import {Suspense,useCallback,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {requestJson} from '@/lib/client-request';
import {filterTaskProperties} from '@/lib/property-task-list.mjs';
import {ALL_ZONES,inZone} from '@/lib/property-zones';
import {ContextLink as Link,ReturnLink} from '@/app/components/NavigationReturn';
import PageHeading from '@/app/components/PageHeading';
import PropertyTaskSearch from '@/app/components/PropertyTaskSearch';
import PropertyListIdentity from '@/app/components/PropertyListIdentity';
import PublicationChecklist,{type Checklist} from '@/app/components/PublicationChecklist';
import PropertyPublicationEditor,{type PublicationWorkflow} from '@/app/components/PropertyPublicationEditor';
import SalePriceEditor,{type PropertyPrices} from '@/app/components/SalePriceEditor';
import {Feedback,LoadingCards} from '@/app/components/InterfaceFeedback';


type Item=PropertyPrices&PublicationWorkflow&{operacion:string;id:number|null;inmuebleId:number;codigo:string;zona:string;posicion:string;nombre:string;propietario:string;tipo:string;direccion:string|null;texto:string;etapa:string;expediente?:Checklist};
type Pending={inmuebleId:number;codigo:string;zona:string;posicion:string;nombre:string;propietario:string;operacion:string;tipo:string;direccion:string|null};
export default function Page(){return <Suspense fallback={<LoadingCards label="Cargando texto y difusión…"/>}><Inbox/></Suspense>;}
function Inbox(){
 const params=useSearchParams();const zone=params.get('zona')||(params.get('inmueble')?ALL_ZONES:null);const selected=params.get('inmueble');
 const[items,setItems]=useState<Item[]>([]);const[pending,setPending]=useState<Pending[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[search,setSearch]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{try{const[publications,valuations]=await Promise.all([requestJson<{todas:Item[]}>(`/api/publicaciones${zone?`?zona=${encodeURIComponent(zone)}`:''}`,{signal}),requestJson<{pendientes:Pending[]}>(`/api/tasaciones${zone?`?zona=${encodeURIComponent(zone)}`:''}`,{signal})]);if(!signal?.aborted){setItems(publications.todas);setPending(valuations.pendientes);setError('');}}catch(failure){if(!signal?.aborted)setError(failure instanceof Error?failure.message:'No se pudo cargar la bandeja.');}finally{if(!signal?.aborted)setLoading(false);}},[zone]);
 useEffect(()=>{const controller=new AbortController();const timer=window.setTimeout(()=>void load(controller.signal),0);return()=>{window.clearTimeout(timer);controller.abort();};},[load]);
 const reload=useCallback(()=>load(),[load]);
 const visible=useMemo(()=>filterTaskProperties(items.filter(item=>(!zone||zone===ALL_ZONES||inZone(item,zone))&&(!selected||String(item.inmuebleId)===selected)),search),[items,zone,selected,search]);
 const pendingVisible=useMemo(()=>filterTaskProperties(pending.filter(item=>(!zone||zone===ALL_ZONES||inZone(item,zone))&&(!selected||String(item.inmuebleId)===selected)),search),[pending,zone,selected,search]);
 const groups=Array.from(new Set([...items,...pending].map(item=>item.zona))).sort();
 const sections=[{id:'material',title:'Texto pendiente',state:'texto_pendiente'},{id:'difusion',title:'Difusión pendiente',state:'difusion_pendiente'},{id:'publicados',title:'Difusión completada',state:'completada'}];
 return <main className="min-h-screen bg-background p-5 lg:p-8"><div className="mx-auto max-w-6xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><PageHeading href="/tasaciones-textos-pendientes"/><ReturnLink/></div><p className="text-sm text-slate-600">Registra el texto, elige cartel físico, redes sociales o ambos y confirma las acciones realizadas.</p>
 {error&&<Feedback tone="error">{error}<button className="aa-button aa-button-secondary ml-3" onClick={()=>void load()}>Reintentar</button></Feedback>}
 {loading?<LoadingCards label="Cargando bandeja…"/>:!zone?<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{groups.map(name=><Link key={name} className="aa-card p-5" href={`/tasaciones-textos-pendientes?zona=${encodeURIComponent(name)}`}><span className="font-bold">{name}</span><span className="mt-2 block text-sm text-slate-500">{items.filter(item=>inZone(item,name)).length+pending.filter(item=>inZone(item,name)).length} inmuebles →</span></Link>)}<Link className="aa-button aa-button-secondary" href="/tasaciones-textos-pendientes?zona=*">Ver todas las zonas</Link></section>:<>
 <div className="flex flex-wrap items-center justify-between gap-3"><Link className="aa-button aa-button-secondary" href="/tasaciones-textos-pendientes">← Volver a zonas</Link><p className="font-bold">{zone===ALL_ZONES?'Todas las zonas':zone}</p></div>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><a href="#tasaciones" className="aa-card p-4"><p className="text-xs font-semibold">Tasación pendiente</p><p className="mt-2 text-2xl font-bold">{pendingVisible.length}</p></a>{sections.map(section=><a key={section.id} href={`#${section.id}`} className="aa-card p-4"><p className="text-xs font-semibold">{section.title}</p><p className="mt-2 text-2xl font-bold">{visible.filter(item=>item.etapa===section.state).length}</p></a>)}</div>
 <div className="aa-card p-4"><PropertyTaskSearch value={search} onChange={setSearch} count={visible.length+pendingVisible.length} total={items.length+pending.length}/></div>
 <section id="tasaciones" className="aa-card scroll-mt-6 p-5"><h2 className="text-lg font-bold">Tasaciones pendientes</h2>{!pendingVisible.length?<p className="mt-3 text-sm text-slate-500">No hay tasaciones pendientes en esta selección.</p>:pendingVisible.map(item=><article key={item.inmuebleId} className="mt-4 rounded-xl border border-slate-200 p-4"><PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold"/><Link className="aa-button aa-button-primary mt-4" href={`/registrar-tasaciones?zona=${encodeURIComponent(item.zona)}&inmueble=${item.inmuebleId}`}>Registrar tasación</Link></article>)}</section>
 {sections.map(section=><section key={section.id} id={section.id} className="aa-card scroll-mt-6 p-5"><h2 className="text-lg font-bold">{section.title}</h2>{!visible.some(item=>item.etapa===section.state)?<p className="mt-3 text-sm text-slate-500">No hay inmuebles en esta etapa para la selección actual.</p>:visible.filter(item=>item.etapa===section.state).map(item=><article key={item.inmuebleId} className="mt-5 space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5"><PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold"/><PropertyPublicationEditor propertyId={item.inmuebleId} text={item.texto} exists={Boolean(item.id)} publication={item} onSaved={reload}/><details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Valores de tasación</summary><SalePriceEditor item={item} onSaved={reload}/></details><details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Requisitos para el portal (independientes de la difusión)</summary><PublicationChecklist data={item.expediente} code={item.codigo}/></details><Link className="inline-flex text-sm font-semibold text-red-700" href={`/datos-inmuebles?zona=${encodeURIComponent(item.zona)}&codigo=${item.inmuebleId}&carpeta=publicacion`}>Abrir ficha del inmueble →</Link></article>)}</section>)}
 </>}
 </div></main>;
}
