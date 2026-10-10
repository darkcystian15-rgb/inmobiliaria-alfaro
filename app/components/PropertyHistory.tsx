"use client";
import { useEffect, useRef } from "react";
type Event={id:number;evento:string;observacion:string|null;fecha:string;usuario:string|null};
const names:Record<string,string>={ficha_organizada:"Ficha actualizada",alquiler_renovado:"Renovación del alquiler",alquiler_reingresado:"Nueva captación del alquiler",renta_mensual_actualizada:'Cambio de renta mensual',inmueble_registrado:'Registro del inmueble',visita_realizada:'Visita realizada',tasacion_realizada:'Precios acordados',precio_venta_actualizado:'Cambio de precio de venta',publicacion_registrada:'Preparación de publicación',publicado:'Publicación confirmada',publicacion_actualizada:'Cambio de texto',ficha_actualizada:'Edición de ficha',propietario_vinculado:'Cambio de propietario',propietario_actualizado:'Datos del propietario',seguimiento_actualizado:'Responsable o plazo actualizado',anuncio_actualizado:'Anuncio externo actualizado',inmueble_liberado:'Liberación de posición'};
const fields:Record<string,string>={anterior:'Antes',nuevo:'Después',actividad:'Actividad',responsableId:'Responsable (referencia)',fechaLimite:'Fecha límite',observacion:'Observación',precioVenta:'Precio de venta',precioPublicado:'Precio publicado',fechaPublicacion:'Fecha de publicación',canal:'Canal',enlace:'Anuncio',nombres:'Nombres',apellidos:'Apellidos',referencia:'Nombre del inmueble',direccion:'Dirección',distrito:'Distrito',provincia:'Provincia',departamento:'Departamento',latitud:'Latitud',longitud:'Longitud',areaTerreno:'Área de terreno',areaConstruida:'Área construida',habitaciones:'Habitaciones',banos:'Baños',caracteristicas:'Características',observaciones:'Observaciones',campos:'Campos corregidos',datosPrueba:'Clasificación de prueba',anuncioExternoPendiente:'Actualización externa pendiente',anteriorId:'Propietario anterior (referencia)',nuevoId:'Propietario nuevo (referencia)'};
function describe(value:unknown,depth=0):string{
 if(value===null||value===undefined)return 'Sin registrar';
 if(typeof value==='boolean')return value?'Sí':'No';
 if(Array.isArray(value))return value.map(item=>fields[String(item)]??String(item)).join(', ');
 if(typeof value==='object')return Object.entries(value).filter(([key])=>!['id','inmuebleId','actualizado'].includes(key)).map(([key,item])=>`${'  '.repeat(depth)}${fields[key]??key}: ${typeof item==='object'&&item!==null?'\n'+describe(item,depth+1):describe(item,depth+1)}`).join('\n');
 return String(value);
}
function details(text:string|null){if(!text)return 'Sin observación.';try{return describe(JSON.parse(text));}catch{return text;}}
export default function PropertyHistory({events}:{events:Event[]}){
 const history = useRef<HTMLDetailsElement>(null);
 useEffect(() => {
   if (window.location.hash !== '#historial' || !history.current) return;
   history.current.open = true;
   history.current.scrollIntoView({ block: 'start', behavior: 'instant' });
 }, [events]);
 return <details id="historial" ref={history} className="mt-4 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer text-sm font-bold">Historial del inmueble · {events.length} movimientos</summary><ol className="mt-4 space-y-4">{events.map(event=><li key={event.id} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold">{names[event.evento]??event.evento.replaceAll('_',' ')}</p><p className="mt-1 text-xs text-slate-600">{event.usuario??'Usuario anterior'} · {new Date(event.fecha).toLocaleString('es-PE',{timeZone:'America/Lima'})} · Hora de Perú</p><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-xs leading-5 text-slate-700">{details(event.observacion)}</pre></li>)}</ol>{!events.length&&<p className="mt-3 text-sm text-slate-600">Sin movimientos registrados.</p>}</details>;
}
