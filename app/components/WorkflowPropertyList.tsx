import {textNeedsReview} from '@/lib/publication-review.mjs';
import PropertyTaskRow from './PropertyTaskRow';
import { ContextLink as Link } from './NavigationReturn';
import { workflowPropertyHref } from '@/lib/publication-workflow.mjs';

type Item = { inmuebleId: number; codigo: string; posicion: string; propietario: string; operacion: string; tipo: string; direccion: string | null; ubicacion?: string; etapa: string; texto?: string; textoRealizado?: boolean | null; publicado?: boolean | null };
export default function WorkflowPropertyList({ items, stage, title, register, action, registered }: {
  items: Item[]; stage: string; title: string; register: string; action: string; registered: boolean;
}) {
  const folderColor = stage === 'tasacion' ? 'violet' : stage === 'texto' ? 'blue' : 'red';

  return <section aria-label={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <ul className="divide-y divide-slate-100">{items.map(item => {
      const review = textNeedsReview(item);
      const complete = !(review && stage === 'texto') && ( item.etapa === 'completada' || (stage === 'texto' && registered));
      const label = review && stage === 'texto' ? 'Texto por revisar' : stage === 'tasacion' ? 'Tasación pendiente' : stage === 'texto' && registered ? 'Texto realizado' : complete ? 'Publicación registrada' : item.etapa === 'difusion_pendiente' ? 'Publicación pendiente' : item.texto?.trim() ? 'Texto en borrador' : 'Texto pendiente';
      return <li key={item.inmuebleId}>
        <PropertyTaskRow position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.ubicacion || item.direccion}
          color={review && stage === 'texto' ? 'amber' : folderColor} label={label} complete={complete}
          actions={<>{review && stage === 'publicacion' && <Link href={workflowPropertyHref('/registrar-textos',item)} className="aa-button aa-button-secondary text-xs">Revisar texto →</Link>}<Link href={workflowPropertyHref(register, item)} className="aa-button aa-button-secondary text-xs">{review && stage === 'texto' ? 'Revisar texto' : registered ? stage === 'texto' ? 'Editar texto' : 'Ver publicación' : action}<span aria-hidden="true">→</span></Link></>}>{review && stage === 'publicacion' && <p className="mt-2 text-xs font-semibold text-amber-900">Texto por revisar · las confirmaciones de publicación se conservan.</p>}</PropertyTaskRow>
      </li>;
    })}</ul>
  </section>;
}
