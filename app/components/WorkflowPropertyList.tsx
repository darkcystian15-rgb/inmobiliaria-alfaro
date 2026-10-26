import PropertyTaskRow from './PropertyTaskRow';
import { ContextLink as Link } from './NavigationReturn';
import { workflowPropertyHref } from '@/lib/publication-workflow.mjs';

type Item = { inmuebleId: number; codigo: string; posicion: string; propietario: string; operacion: string; tipo: string; direccion: string | null; ubicacion?: string; etapa: string; texto?: string };
export default function WorkflowPropertyList({ items, stage, title, register, action, registered }: {
  items: Item[]; stage: string; title: string; register: string; action: string; registered: boolean;
}) {
  const folderColor = stage === 'tasacion' ? 'orange' : stage === 'texto' ? 'violet' : 'sky';

  return <section aria-label={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <ul className="divide-y divide-slate-100">{items.map(item => {
      const complete = item.etapa === 'completada' || (stage === 'texto' && registered);
      const label = stage === 'tasacion' ? 'Tasación pendiente' : stage === 'texto' && registered ? 'Texto realizado' : complete ? 'Publicación registrada' : item.etapa === 'difusion_pendiente' ? 'Publicación pendiente' : item.texto?.trim() ? 'Texto en borrador' : 'Texto pendiente';
      return <li key={item.inmuebleId}>
        <PropertyTaskRow position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.ubicacion || item.direccion}
          color={folderColor} label={label} complete={complete}
          actions={<Link href={workflowPropertyHref(register, item)} className="aa-button aa-button-secondary text-xs">{registered ? stage === 'texto' ? 'Editar texto' : 'Ver publicación' : action}<span aria-hidden="true">→</span></Link>} />
      </li>;
    })}</ul>
  </section>;
}
