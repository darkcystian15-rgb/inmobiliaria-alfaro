import PortfolioPropertyCard from './PortfolioPropertyCard';
import { workflowPropertyHref } from '@/lib/publication-workflow.mjs';

type Item = { inmuebleId: number; codigo: string; posicion: string; propietario: string; operacion: string; tipo: string; direccion: string | null; ubicacion?: string; etapa: string; texto?: string };
export default function WorkflowPropertyList({ items, stage, title, register, action, registered }: {
  items: Item[]; stage: string; title: string; register: string; action: string; registered: boolean;
}) {
  const folderColor = stage === 'tasacion' ? 'orange' : stage === 'texto' ? 'violet' : 'sky';
  const badge = stage === 'tasacion' ? 'bg-orange-50 text-orange-800 ring-orange-200' : stage === 'texto' ? 'bg-violet-50 text-violet-800 ring-violet-200' : 'bg-sky-50 text-sky-800 ring-sky-200';
  return <section aria-label={title}>
    <ul className="property-position-grid grid gap-4 pb-4">{items.map(item => {
      const complete = item.etapa === 'completada' || (stage === 'texto' && registered);
      const label = stage === 'tasacion' ? 'Tasación pendiente' : stage === 'texto' && registered ? 'Texto realizado' : complete ? 'Publicación registrada' : item.etapa === 'difusion_pendiente' ? 'Publicación pendiente' : item.texto?.trim() ? 'Texto en borrador' : 'Texto pendiente';
      return <li key={item.inmuebleId} className="min-w-0 pb-4">
        <PortfolioPropertyCard property={{ ...item, nombre: item.propietario, direccion: item.ubicacion || item.direccion, posicion: Number(item.posicion) || null, estado: 'Activo' }}
          href={workflowPropertyHref(register, item)} folderColor={folderColor} showProgress={false} showPrice={false}
          theme={{ label, badge: complete ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : badge, position: badge }}
          actionLabel={registered ? stage === 'texto' ? 'Editar texto' : 'Ver publicación' : action} />
      </li>;
    })}</ul>
  </section>;
}
