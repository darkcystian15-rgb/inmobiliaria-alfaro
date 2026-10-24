import { ContextLink as Link } from './NavigationReturn';
import { operationLabel } from '@/lib/operation.mjs';
import { workflowPropertyHref } from '@/lib/publication-workflow.mjs';

type Item = { inmuebleId: number; codigo: string; posicion: string; propietario: string; operacion: string; tipo: string; direccion: string | null; ubicacion?: string; etapa: string; texto?: string };
export default function WorkflowPropertyList({ items, stage, title, register, action, registered }: {
  items: Item[]; stage: string; title: string; register: string; action: string; registered: boolean;
}) {
  const columns = 'md:grid-cols-[3rem_minmax(0,1fr)_10rem_11rem]';
  return <section aria-label={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div aria-hidden="true" className={`hidden gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 md:grid ${columns}`}><span>Posición</span><span>Inmueble y ubicación</span><span>Estado</span><span>Acción</span></div>
    <ul className="divide-y divide-slate-100">{items.map(item => {
      const complete = item.etapa === 'completada' || (stage === 'texto' && registered);
      const label = stage === 'tasacion' ? 'Tasación pendiente' : stage === 'texto' && registered ? 'Texto realizado' : complete ? 'Publicación registrada' : item.etapa === 'difusion_pendiente' ? 'Publicación pendiente' : item.texto?.trim() ? 'Texto en borrador' : 'Texto pendiente';
      const location = item.ubicacion || item.direccion || 'Dirección por completar';
      return <li key={item.inmuebleId} className={`grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-3 py-3 transition hover:bg-slate-50/70 sm:px-4 md:gap-4 ${columns}`}>
        <span aria-label={`Posición ${item.posicion}`} className="row-span-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 font-mono text-xs font-bold text-slate-700 md:row-auto">{item.posicion || '—'}</span>
        <div className="min-w-0"><h3 className="break-words text-sm font-semibold leading-5 text-slate-900">{item.propietario || 'Sin contacto'}</h3><p title={location} className="mt-0.5 truncate text-xs leading-5 text-slate-500">{location}</p><p className="text-xs leading-5 text-slate-500">{operationLabel(item.operacion)} · {item.tipo}</p></div>
        <span className={`col-start-2 w-fit rounded-full px-2 py-1 text-xs font-semibold md:col-auto ${complete ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{label}</span>
        <Link href={workflowPropertyHref(register, item)} className="aa-button aa-button-secondary col-start-2 w-fit max-w-full text-xs text-red-800 md:col-auto md:w-full">{registered ? stage === 'texto' ? 'Editar texto' : 'Ver publicación' : action}<span aria-hidden="true">→</span></Link>
      </li>;
    })}</ul>
  </section>;
}
