"use client";

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { ContextLink as Link } from './NavigationReturn';
import PortfolioPropertyEditor from './PortfolioPropertyEditor';
import PortfolioDocumentChecklist from './PortfolioDocumentChecklist';
import ResumeSale from './ResumeSale';
import ConfirmDialog from './ConfirmDialog';
import WorkflowNavigationGuard from './WorkflowNavigationGuard';
import PropertySummary from './PropertySummary';
import StatusBadge from './StatusBadge';
import FolderIcon from './FolderIcon';
import { formatPrice } from '@/lib/prices.mjs';
import { referenceLabel, targetLabel, priceLabel } from '@/lib/operation.mjs';
import { propertyPanelContactId } from '@/lib/property-panel-id.mjs';

type Property = {
  inmuebleId: number; id: string; posicion?: number; zona?: string; zonaId: number;
  propietario: string; direccion: string | null; tipo: string; operacion: string; estado: string;
  tipoHistorico?: string | null; puedeRetomar?: boolean; tieneFotos: boolean;
  visitaPendiente: boolean; tasacionPendiente: boolean; textoRealizado?: boolean;
  valorReferencia?: string | null; valorReferenciaMoneda?: string;
  precioObjetivo?: string | null; precioObjetivoMoneda?: string;
  precioVenta: string | null; precioVentaMoneda?: string;
  fechaActualizacionTasacion?: string | Date | null;
  actividades: { visita: { estado: string; realizada: boolean }; tasacion: { situacion: string | null; estado: string }; publicacion: { tieneTexto: boolean; publicado: boolean } };
};
export default function PortfolioDetailPanel({ property: p, positions, onClose, onSaved, onPhotos }: {
  property: Property; positions: ComponentProps<typeof ResumeSale>['positions'];
  onClose: () => void; onSaved: () => Promise<void>; onPhotos: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const active = p.estado === 'Activo', valued = p.actividades.tasacion.situacion === 'aprobado';
  const done = p.actividades.publicacion.publicado;
  const updated = p.fechaActualizacionTasacion ? new Date(p.fechaActualizacionTasacion) : null;
  const updatedLabel = updated && Number.isFinite(updated.getTime()) ? new Intl.DateTimeFormat('es-PE', {timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'}).format(updated) : null;
  const information = (folder: string, edit?: string) => `/datos-inmuebles?${new URLSearchParams({ codigo: p.id, ...(p.zona ? { zona: p.zona } : {}), ...(folder ? { carpeta: folder } : {}), ...(edit ? { editar: edit } : {}) })}`;
  const register = (path: string) => `${path}?${new URLSearchParams({ inmueble: String(p.inmuebleId), ...(p.zona ? { zona: p.zona } : {}) })}`;
  function close() { if (busy) return; if (dirty) setConfirmClose(true); else onClose(); }
  return <dialog ref={dialog} aria-labelledby="portfolio-detail-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 m-auto w-[calc(100%_-_1rem)] max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40 sm:w-[calc(100%_-_3rem)]">
    <WorkflowNavigationGuard dirty={dirty} busy={busy} message="Guarda los datos del inmueble antes de salir para conservar los cambios del formulario." /><div className="flex max-h-[92dvh] min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono font-bold">{p.posicion ? `Posición ${String(p.posicion).padStart(2, '0')}` : 'Sin posición activa'}</span><StatusBadge tone={active ? 'complete' : 'neutral'}>{p.tipoHistorico || p.estado}</StatusBadge>{p.zona && <span className="flex min-w-0 items-center gap-1 font-semibold text-slate-600"><FolderIcon className="h-4 w-4 shrink-0 text-amber-500" />{p.zona}</span>}</div>
          <h2 id="portfolio-detail-title" className="mt-2 break-words text-xl font-bold text-slate-950">{p.propietario || 'Sin contacto'}</h2><p className="mt-1 break-words text-sm text-slate-500"><PropertySummary operation={p.operacion} type={p.tipo} location={p.direccion} /></p><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">ID completo</summary><p className="mt-1 break-words font-mono">{propertyPanelContactId(p)}</p></details>
        </div><button autoFocus type="button" disabled={busy} aria-label="Cerrar detalle del inmueble" onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-500 disabled:opacity-50">×</button>
      </header>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <h3 className="text-base font-extrabold tracking-wide text-slate-800">FASE 1</h3>
        <section aria-label="Visitas" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"><div><h4 className="text-sm font-bold">Visitas</h4><p className="mt-1 text-xs leading-5 text-slate-500">Consulta la visita y las fotografías registradas.</p></div><div className="flex flex-wrap items-center gap-3"><StatusBadge tone={p.actividades.visita.realizada ? 'complete' : 'pending'}>{p.actividades.visita.realizada ? 'Visita realizada' : 'Visita pendiente'}</StatusBadge><Link href={active && p.visitaPendiente ? register('/registrar-visitas') : information('visitas')} className="aa-button aa-button-secondary">{active && p.visitaPendiente ? 'Registrar visita' : 'Ver visitas y fotos'} →</Link></div></section>
        <section aria-label="Tasaciones" className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-base font-bold text-slate-900">Tasaciones</h4><p className="mt-1 text-xs leading-5 text-slate-500">{p.operacion === 'alquiler' ? 'Revisa los valores acordados y ajusta la renta mensual cuando corresponda.' : 'Revisa los valores acordados y ajusta el precio de salida del inmueble.'}</p></div><StatusBadge tone={valued ? 'complete' : 'pending'}>{valued ? 'Tasación registrada' : 'Tasación pendiente'}</StatusBadge></div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">{[
            [referenceLabel(p.operacion), p.valorReferencia, p.valorReferenciaMoneda],
            [targetLabel(p.operacion), p.precioObjetivo, p.precioObjetivoMoneda],
            [priceLabel(p.operacion), p.precioVenta, p.precioVentaMoneda],
          ].map(([label, value, currency], index) => <div key={label} className={`min-w-0 rounded-xl border p-3 ${index === 2 ? 'border-red-100 bg-white' : 'border-slate-100 bg-white/80'}`}><dt className="text-xs leading-5 text-slate-500">{label}</dt><dd className={`mt-1 break-words text-lg font-bold ${index === 2 ? 'text-red-800' : 'text-slate-800'}`}>{formatPrice(value, currency || "PEN")}</dd></div>)}</dl>
          {updatedLabel && <p className="mt-2 text-xs text-slate-500">Última actualización: {updatedLabel}</p>}
          {active && <div className="mt-4 flex flex-wrap items-center gap-3">{valued ? <Link href={information('precios', 'precios')} className="aa-button aa-button-primary">Actualizar valores →</Link> : p.visitaPendiente ? <p className="text-xs text-slate-500">Registra primero la visita para continuar con la tasación.</p> : <Link href={register('/registrar-tasaciones')} className="aa-button aa-button-primary">Registrar tasación →</Link>}<p className="text-xs leading-5 text-slate-500">Los cambios conservan el texto y las confirmaciones de publicación.</p></div>}
        </section>
        <div className="grid gap-3 sm:grid-cols-2">
          <section aria-label="Texto" className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">Texto</h4><StatusBadge tone={p.textoRealizado ? 'complete' : 'pending'}>{p.textoRealizado ? 'Texto realizado' : p.actividades.publicacion.tieneTexto ? 'Borrador' : 'Texto pendiente'}</StatusBadge></div><p className="mt-2 text-xs leading-5 text-slate-500">Prepara o actualiza el texto comercial del inmueble.</p>{active && valued ? <Link href={information('textos', 'texto')} className="aa-button aa-button-secondary mt-3">{p.actividades.publicacion.tieneTexto ? 'Editar texto' : 'Registrar texto'} →</Link> : <Link href={information('textos')} className="aa-button aa-button-secondary mt-3">Consultar texto →</Link>}</section>
          <section aria-label="Publicaciones" className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">Publicaciones</h4><StatusBadge tone={done ? 'complete' : 'pending'}>{done ? 'Publicación registrada' : p.textoRealizado ? 'Publicación pendiente' : 'Texto por completar'}</StatusBadge></div><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-slate-500">Confirma cartel y redes después de completar el texto. Portal web conserva su autorización propia.</p><Link href={active && p.textoRealizado ? register('/registrar-publicaciones') : information('publicaciones')} className="aa-button aa-button-secondary">{active && p.textoRealizado && !done ? 'Registrar publicación' : 'Consultar publicación'} →</Link></div></section>
        </div>
        <PortfolioPropertyEditor propertyId={p.inmuebleId} onSaved={onSaved} onDirtyChange={setDirty} onBusyChange={setBusy} />
        <section aria-label="Documentos y expediente"><h3 className="text-base font-extrabold tracking-wide text-slate-800">FASE 2</h3><PortfolioDocumentChecklist propertyId={p.inmuebleId} operation={p.operacion} zone={p.zona} /></section>
        <section aria-label="Fotos, seguimiento y ficha" className="grid gap-2 sm:grid-cols-3"><button type="button" onClick={onPhotos} disabled={!p.tieneFotos || busy} className="aa-button aa-button-secondary">{p.tieneFotos ? 'Ver fotos del inmueble' : 'Fotos pendientes'}</button><Link href={information('seguimiento')} className="aa-button aa-button-secondary">Seguimiento e historial →</Link><Link href={information('')} className="aa-button aa-button-secondary">Ver ficha →</Link></section>
        {p.puedeRetomar && <ResumeSale propertyId={p.inmuebleId} zoneId={p.zonaId} zone={p.zona || ''} contact={p.propietario} positions={positions} onSaved={onSaved} />}
        {active && p.zona && <section aria-label="Liberar este inmueble" className="rounded-2xl border border-red-100 bg-red-50/40 p-4"><h4 className="text-sm font-bold text-slate-900">Liberar este inmueble</h4><p className="mt-2 text-xs leading-5 text-slate-600">{p.operacion === 'venta' ? 'Cerrar la operación, suspender la venta o eliminar la ficha.' : 'Cerrar el alquiler o eliminar la ficha.'} Revisa la acción y confirma en el siguiente paso.</p><Link href={register('/liberar-inmuebles')} className="aa-button aa-button-secondary mt-3">Liberar este inmueble →</Link></section>}
      </div>
      <footer className="flex shrink-0 justify-end border-t border-slate-100 bg-white px-4 py-3 sm:px-6"><button type="button" disabled={busy} onClick={close} className="aa-button aa-button-secondary">Cerrar</button></footer>
    </div>
    {confirmClose && <ConfirmDialog title="Cambios sin guardar" confirmLabel="Cerrar sin guardar" busy={busy} onCancel={() => setConfirmClose(false)} onConfirm={onClose}>Guarda los cambios de los datos del inmueble antes de cerrar para conservarlos.</ConfirmDialog>}
  </dialog>;
}
