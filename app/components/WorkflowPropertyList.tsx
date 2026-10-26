import { ContextLink as Link } from './NavigationReturn';
import FolderIcon from './FolderIcon';
import { operationLabel } from '@/lib/operation.mjs';
import { workflowPropertyHref } from '@/lib/publication-workflow.mjs';

type Item = { inmuebleId: number; codigo: string; posicion: string; propietario: string; operacion: string; tipo: string; direccion: string | null; ubicacion?: string; etapa: string; texto?: string };
export default function WorkflowPropertyList({ items, stage, title, register, action, registered }: {
  items: Item[]; stage: string; title: string; register: string; action: string; registered: boolean;
}) {
  const theme = stage === 'tasacion'
    ? { card: 'border-orange-200 bg-orange-50/40 hover:border-orange-300', tab: 'border-orange-200 bg-orange-100', position: 'bg-orange-100 text-orange-900', icon: 'text-orange-600', badge: 'bg-orange-50 text-orange-800' }
    : stage === 'texto'
      ? { card: 'border-violet-200 bg-violet-50/40 hover:border-violet-300', tab: 'border-violet-200 bg-violet-100', position: 'bg-violet-100 text-violet-900', icon: 'text-violet-600', badge: 'bg-violet-50 text-violet-800' }
      : { card: 'border-sky-200 bg-sky-50/40 hover:border-sky-300', tab: 'border-sky-200 bg-sky-100', position: 'bg-sky-100 text-sky-900', icon: 'text-sky-600', badge: 'bg-sky-50 text-sky-800' };
  return <section aria-label={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <ul className="grid gap-x-4 gap-y-8 px-4 pt-8 pb-4 sm:px-5 lg:grid-cols-2">{items.map(item => {
      const complete = item.etapa === 'completada' || (stage === 'texto' && registered);
      const label = stage === 'tasacion' ? 'Tasación pendiente' : stage === 'texto' && registered ? 'Texto realizado' : complete ? 'Publicación registrada' : item.etapa === 'difusion_pendiente' ? 'Publicación pendiente' : item.texto?.trim() ? 'Texto en borrador' : 'Texto pendiente';
      const location = item.ubicacion || item.direccion || 'Dirección por completar';
      return <li key={item.inmuebleId} className={`cartera-folder relative grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-b-2xl rounded-tr-2xl border px-3 py-3 shadow-sm transition sm:px-4 ${theme.card}`}>
        <span aria-hidden="true" className={`cartera-folder-tab absolute -top-4 -left-px h-4 w-24 rounded-t-lg border border-b-0 ${theme.tab}`} />
        <span aria-label={`Posición ${item.posicion}`} className={`row-span-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${theme.position}`}>{item.posicion || '—'}</span>
        <div className="min-w-0"><h3 className="break-words text-sm font-semibold leading-5 text-slate-900">{item.propietario || 'Sin contacto'}</h3><p title={location} className="mt-0.5 truncate text-xs leading-5 text-slate-500">{location}</p><p className="text-xs leading-5 text-slate-500">{operationLabel(item.operacion)} · {item.tipo}</p></div>
        <span className={`col-start-2 w-fit rounded-full px-2 py-1 text-xs font-semibold ${complete ? 'bg-emerald-50 text-emerald-800' : theme.badge}`}><FolderIcon className={`mr-1 inline-block h-4 w-4 ${theme.icon}`} />{label}</span>
        <Link href={workflowPropertyHref(register, item)} className="aa-button aa-button-secondary col-start-2 mt-1 w-fit max-w-full text-xs text-red-800">{registered ? stage === 'texto' ? 'Editar texto' : 'Ver publicación' : action}<span aria-hidden="true">→</span></Link>
      </li>;
    })}</ul>
  </section>;
}
