import type { ReactNode } from 'react';
import FolderIcon from './FolderIcon';
import PropertySummary from './PropertySummary';

const colors = {
  amber: { icon: 'text-amber-500', badge: 'border-amber-200 bg-amber-50 text-amber-900', row: 'border-l-amber-300' },
  orange: { icon: 'text-orange-500', badge: 'border-orange-200 bg-orange-50 text-orange-900', row: 'border-l-orange-300' },
  violet: { icon: 'text-violet-500', badge: 'border-violet-200 bg-violet-50 text-violet-900', row: 'border-l-violet-300' },
  sky: { icon: 'text-sky-500', badge: 'border-sky-200 bg-sky-50 text-sky-900', row: 'border-l-sky-300' },
  emerald: { icon: 'text-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-900', row: 'border-l-emerald-300' },
};

export default function PropertyTaskRow({ position, contact, operation, type, location, label, color, complete = false, actions, children }: {
  position: string; contact: string; operation: string; type: string; location?: string | null;
  label: string; color: keyof typeof colors; complete?: boolean; actions: ReactNode; children?: ReactNode;
}) {
  const tone = colors[color];
  return <div className={`grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-l-2 px-4 py-3 transition hover:bg-slate-50/70 lg:grid-cols-[3.5rem_minmax(0,1fr)_auto] lg:items-center ${tone.row}`}>
    <span className="flex min-h-8 items-center gap-2"><span aria-label={`Posición ${position}`} className="font-mono text-sm font-semibold text-slate-500">{position || '—'}</span><FolderIcon className={`h-5 w-5 shrink-0 ${tone.icon}`} /></span>
    <div className="min-w-0">
      <h3 className="break-words text-sm font-semibold leading-6 text-slate-900">{contact || 'Sin contacto'}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><p className="min-w-0 break-words text-xs leading-5 text-slate-600"><PropertySummary operation={operation} type={type} location={location} /></p><span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${complete ? colors.emerald.badge : tone.badge}`}>{label}</span></div>
      {children}
    </div>
    <div className="col-start-2 flex flex-wrap items-center gap-2 lg:col-start-auto lg:justify-end">{actions}</div>
  </div>;
}
