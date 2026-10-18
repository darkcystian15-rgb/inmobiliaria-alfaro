import Link from 'next/link';

export type Checklist = {
  complete: boolean;
  items: { key: string; label: string; complete: boolean }[];
};

const destinations: Record<string, { tab: string; query: string; help: string }> = {
  documentoDni: {
    tab: 'Vendedor',
    query: 'vendedor',
    help: 'Identificación del contacto guardada en su ficha.',
  },
  archivoTasacion: {
    tab: 'Inmueble',
    query: 'inmueble',
    help: 'Archivo de tasación guardado en la documentación del inmueble.',
  },
  fotosVisita: {
    tab: 'Visitas',
    query: 'visitas',
    help: 'Fotos vinculadas a una visita completada.',
  },
  texto: {
    tab: 'Publicación',
    query: 'publicacion',
    help: 'Texto preparado para presentar el inmueble.',
  },
};

export default function PublicationChecklist({
  data,
  code,
  onSelect,
}: {
  data?: Checklist;
  code?: string;
  onSelect?: (tab: string) => void;
}) {
  if (!data) return null;

  const total = data.items.length;
  const completed = data.items.filter((item) => item.complete).length;
  const allComplete = total > 0 && completed === total;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <section
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-label="Preparación para publicar"
    >
      <div className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Antes de publicar
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              Preparación para publicar
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Reúne la identificación, la tasación, las fotos y el texto del anuncio.
            </p>
          </div>
          <span
            role="status"
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              allComplete
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {allComplete ? 'Material completo' : `Faltan ${total - completed} de ${total}`}
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-slate-500">
            <span>{completed} de {total} requisitos</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Requisitos de publicación completados"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
          >
            <div
              className={`h-full rounded-full transition-[width] ${allComplete ? 'bg-emerald-600' : 'bg-[#c80000]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {data.items.map((item, index) => {
          const destination = destinations[item.key];
          const tab = destination?.tab ?? 'Inmueble';
          const query = destination?.query ?? 'inmueble';
          const actionLabel = item.complete ? 'Ver registro' : 'Completar';
          const href = code
            ? `/datos-inmuebles?codigo=${encodeURIComponent(code)}&pestana=${query}`
            : undefined;

          return (
            <li
              key={item.key}
              className={`flex min-h-32 flex-col rounded-xl border p-4 ${
                item.complete
                  ? 'border-slate-200 bg-white'
                  : 'border-amber-200 bg-amber-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    item.complete
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-white text-amber-800 ring-1 ring-amber-200'
                  }`}
                >
                  {item.complete ? '✓' : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-5 text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {destination?.help ?? 'Información requerida para preparar la publicación.'}
                  </p>
                </div>
              </div>

              {(onSelect || href) && (
                <div className="mt-auto pt-3">
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(tab)}
                      className={`inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold transition ${
                        item.complete
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'bg-white text-[#a40000] ring-1 ring-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {actionLabel} <span aria-hidden="true" className="ml-1">→</span>
                    </button>
                  ) : (
                    <Link
                      href={href!}
                      className={`inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold transition ${
                        item.complete
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'bg-white text-[#a40000] ring-1 ring-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {actionLabel} <span aria-hidden="true" className="ml-1">→</span>
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">
        {allComplete
          ? 'El material está listo. El estado “Publicado” se registra por separado.'
          : 'Completar estos requisitos prepara el material; no publica el anuncio automáticamente.'}
      </p>

      {code && !onSelect && (
        <div className="px-4 pb-4 sm:px-5">
          <Link
            href={`/datos-inmuebles?codigo=${encodeURIComponent(code)}&pestana=inmueble`}
            className="inline-flex min-h-11 items-center text-xs font-semibold text-[#c80000] underline-offset-4 hover:underline"
          >
            Abrir ficha del inmueble para organizar archivos →
          </Link>
        </div>
      )}
    </section>
  );
}
