"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { requestJson } from '@/lib/client-request';
import { applyReviewedToDraft, documentConflicts, reviewedArea } from '@/lib/document-review.mjs';

type DocumentFile = { id: number; name: string; mime: string | null; size: number | null };
type Areas = { areaTerreno: string | null; areaConstruida: string | null };
type Proposal = { field: string; label: string; value: string; page: number; evidence: string; method?: string; confidence?: number | null; warnings?: string[]; sheet?: string; cell?: string };
type Candidate = Proposal & { key: string; sourceId: number; sourceName: string; fingerprint: string };
type Result = { proposals: Proposal[]; warnings?: string[]; nextPage?: number | null; totalPages?: number; source: { id: number; name: string; fingerprint: string } };
type Inventory = { files: DocumentFile[]; areas?: Areas; supportedMimes?: string[]; maxBytes?: number };
const supportedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'];

export default function PublicationDocumentProposals({ propertyId, draft, onChange, busy, onBusyChange }: { propertyId: number; draft: string; onChange: (value: string) => void; busy: boolean; onBusyChange: (value: boolean) => void }) {
  const sectionId = useId();
  const [open, setOpen] = useState(false);
  const [fileSelection, setFileSelection] = useState<number[]>([]);
  const [fileStates, setFileStates] = useState<Record<number, string>>({});
  const [forceOcr, setForceOcr] = useState(false);
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [areas, setAreas] = useState<Areas | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; controller.current?.abort(); }, []);
  const chosen = candidates.filter(candidate => selected.includes(candidate.key));
  const areaChoices = chosen.filter(candidate => ['areaTerreno', 'areaConstruida'].includes(candidate.field));
  const conflicts = documentConflicts(candidates);
  const groups = [...new Set(candidates.map(candidate => candidate.field))];
  const input = 'mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';

  async function prepare() {
    setOpen(true); setLoadingFiles(true); onBusyChange(true); setError('');
    try {
      const inventory = await requestJson<Inventory>(`/api/inmuebles/${propertyId}/texto-documentos`);
      setDocuments(inventory.files); setAreas(inventory.areas || null);
      setFileSelection(inventory.files.filter(file => supportedMimes.includes(file.mime || '') && Number(file.size) <= 12 * 1024 * 1024).map(file => file.id));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudieron consultar los archivos.'); }
    finally { setLoadingFiles(false); onBusyChange(false); }
  }

  async function analyze(onlyFileId?: number) {
    if (busy || running) return;
    const abort = new AbortController(); controller.current = abort; stop.current = false;
    setOpen(true); setRunning(true); onBusyChange(true); setCandidates(current => current.filter(candidate => onlyFileId !== undefined ? candidate.sourceId !== onlyFileId : !fileSelection.includes(candidate.sourceId))); setSelected([]); setNotices([]); setReviewed(false); setError(''); setMessage('');
    try {
      const inventory = await requestJson<Inventory>(`/api/inmuebles/${propertyId}/texto-documentos`, { signal: abort.signal });
      setDocuments(inventory.files);
      setAreas(inventory.areas || null);
      if (!inventory.files.length) { setMessage('No hay copias literales, CRI, HR/PU o tasaciones subidas para analizar.'); return; }
      const files = onlyFileId === undefined ? inventory.files.filter(file => fileSelection.includes(file.id)) : inventory.files.filter(file => file.id === onlyFileId);
      if (!files.length) { setMessage('El documento seleccionado ya no está disponible. Revisa los archivos del inmueble.'); return; }
      const accepted = inventory.supportedMimes || supportedMimes;
      const seen = new Set<string>();
      for (const [index, file] of files.entries()) {
        if (stop.current) break;
        setFileStates(current => ({ ...current, [file.id]: 'Leyendo…' }));
        if (!accepted.includes(file.mime || '') || Number(file.size) > (inventory.maxBytes || 12 * 1024 * 1024)) {
          setFileStates(current => ({ ...current, [file.id]: 'Formato o tamaño no compatible' }));
          setNotices(current => [...current, `${file.name}: formato no compatible o tamaño superior al límite de lectura.`]); continue;
        }
        let nextPage: number | null = 1, fingerprint: string | undefined;
        try {
          while (nextPage !== null && !stop.current) {
            const page: number = nextPage;
            setProgress(`Documento ${index + 1} de ${files.length}: ${file.name} · desde página ${page}`);
            const result: Result = await requestJson<Result>(`/api/inmuebles/${propertyId}/texto-documentos`, { method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: file.id, startPage: page, fingerprint, forceOcr }) });
            fingerprint = result.source.fingerprint;
            const additions = result.proposals.flatMap((proposal, proposalIndex) => {
              const key = `${file.id}:${proposal.page}:${proposal.sheet || ''}:${proposal.cell || ''}:${proposal.field}:${proposal.value}`;
              if (seen.has(key)) return []; seen.add(key);
              return [{ ...proposal, key: `${key}:${proposalIndex}`, sourceId: file.id, sourceName: result.source.name, fingerprint: result.source.fingerprint }];
            });
            setCandidates(current => [...current, ...additions]);
            const batchWarnings = (result.warnings || []).map(warning => `${file.name}: ${warning}`);
            setNotices(current => [...new Set([...current, ...batchWarnings])]);
            nextPage = result.nextPage ?? null;
            if (nextPage !== null && (!Number.isSafeInteger(nextPage) || nextPage <= page || nextPage > 150)) throw new Error('La lectura no pudo continuar con la página siguiente.');
          }
          setFileStates(current => ({ ...current, [file.id]: stop.current ? 'Lectura detenida' : 'Lectura terminada' }));
        } catch (failure) {
          if (abort.signal.aborted) throw failure;
          setFileStates(current => ({ ...current, [file.id]: 'No se pudo leer. Abre el original.' }));
          setNotices(current => [...current, `${file.name}: ${failure instanceof Error ? failure.message : 'no se pudo analizar'}. Los demás documentos continúan.`]);
        }
      }
      setMessage(stop.current ? 'Análisis detenido. Los documentos siguen disponibles para abrirlos.' : seen.size ? 'Análisis terminado. Selecciona los datos que hayas cotejado con los originales.' : 'Análisis terminado sin propuestas para seleccionar. Puedes abrir los documentos y comprobar la información directamente en el original.');
    } catch (failure) {
      if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'No se pudieron analizar los documentos.');
    } finally { setFilesExpanded(false); setProgress(''); setRunning(false); onBusyChange(false); }
  }

  function applyToDraft() {
    setError('');
    try {
      const result = applyReviewedToDraft(draft, chosen, { replaceExisting });
      onChange(result.text);
      setMessage(result.applied ? `${result.applied} campo(s) incorporados al borrador. Guarda el texto para conservarlos.` : 'No hay campos pendientes compatibles. Los datos ya escritos se conservan; puedes editar el texto manualmente.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudieron incorporar las propuestas.'); }
  }

  async function saveAreas() {
    if (busy || !reviewed || !areas || !areaChoices.length) return;
    onBusyChange(true); setError('');
    try {
      if (areaChoices.some(choice => !reviewedArea(choice.value))) throw new Error('Revisa las áreas: usa hasta dos decimales y evita separadores ambiguos.');
      const updated = applyReviewedToDraft(draft, areaChoices, { replaceExisting });
      const result = await requestJson<{ areas: Areas }>(`/api/inmuebles/${propertyId}/texto-documentos`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewed: true, expected: areas, selected: areaChoices.map(choice => ({ field: choice.field, value: choice.value, sourceId: choice.sourceId, page: choice.page, sheet: choice.sheet, cell: choice.cell, fingerprint: choice.fingerprint })) }) });
      setAreas(result.areas); setReviewed(false);
      onChange(updated.text);
      setMessage('Áreas revisadas guardadas en la ficha con su origen. Los campos pendientes del borrador se completaron cuando correspondía; guarda el texto para conservarlo.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudieron guardar las áreas.'); }
    finally { onBusyChange(false); }
  }

  let preview = { text: draft, applied: 0 };
  try { preview = applyReviewedToDraft(draft, chosen.filter(choice => !['superficie', 'areaParcial'].includes(choice.field)), { replaceExisting }); } catch { /* Invalid selections are explained on apply. */ }
  const unclassified = chosen.some(choice => ['superficie', 'areaParcial'].includes(choice.field));
  const activeStep = running || !candidates.length ? 1 : chosen.length ? 3 : 2;
  return <section aria-label="Asistente de datos de documentos" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <header className="flex flex-wrap items-start justify-between gap-4 bg-slate-50 px-4 py-5 sm:px-5">
      <div className="min-w-0"><h4 className="text-base font-bold text-slate-900">Completar texto con documentos</h4><p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Busca datos en los archivos del inmueble, revísalos y elige qué usar.</p></div>
      <button type="button" disabled={busy || loadingFiles} aria-expanded={open} aria-controls={sectionId} onClick={() => { if (!open && !documents.length) void prepare(); else setOpen(!open); }} className="aa-button aa-button-secondary">{loadingFiles ? 'Consultando archivos…' : open ? 'Ocultar asistente' : documents.length ? 'Ver documentos y resultados' : 'Elegir documentos'}</button>
    </header>
    {open && <div id={sectionId} className="space-y-5 p-4 sm:p-5">
      <ol aria-label="Pasos para completar el texto" className="grid grid-cols-3 gap-2 text-xs sm:text-sm">{['Documentos', 'Revisar datos', 'Incorporar'].map((label,index) => <li key={label} aria-current={activeStep === index + 1 ? 'step' : undefined} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${activeStep === index + 1 ? 'border-blue-200 bg-blue-50 font-semibold text-blue-900' : 'border-slate-200 text-slate-500'}`}><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">{index + 1}</span>{label}</li>)}</ol>
      {running && <div role="status" aria-live="polite" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Buscando datos en los documentos…</p><p className="mt-1 break-words">{progress || 'Consultando documentos…'}</p><button type="button" className="mt-3 min-h-11 underline" onClick={() => { stop.current = true; }}>Detener al terminar el bloque actual</button></div>}
      <section aria-label="Documentos del inmueble" className="rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4"><div><h5 className="text-sm font-bold">1. Documentos del inmueble</h5><details className="mt-1 text-xs text-slate-500"><summary className="cursor-pointer underline">Formatos admitidos</summary><p className="mt-1">PDF, Excel XLSX, JPG o PNG.</p></details></div>{documents.length > 0 && <button type="button" aria-expanded={filesExpanded} className="min-h-11 text-sm font-semibold text-blue-800 underline" onClick={() => setFilesExpanded(!filesExpanded)}>{filesExpanded ? 'Contraer documentos' : `Ver documentos (${documents.length})`}</button>}</div>
        {loadingFiles && <p role="status" className="px-4 pb-4 text-sm">Consultando archivos del inmueble…</p>}
        {!loadingFiles && !documents.length && <p className="px-4 pb-4 text-sm text-slate-600">No hay copias literales, CRI, HR/PU o tasaciones disponibles. Añade los archivos en la ficha del inmueble o continúa escribiendo el texto.</p>}
        {filesExpanded && documents.length > 0 && <div className="space-y-4 border-t border-slate-100 p-4"><ul className="divide-y divide-slate-100">{documents.map(file => {
          const compatible = supportedMimes.includes(file.mime || '') && Number(file.size) <= 12 * 1024 * 1024;
          return <li key={file.id} className="min-w-0 py-3 first:pt-0"><div className="flex items-start gap-3"><input type="checkbox" aria-label={`Analizar ${file.name}`} className="mt-1 h-4 w-4 shrink-0" disabled={busy || !compatible} checked={fileSelection.includes(file.id)} onChange={event => setFileSelection(current => event.target.checked ? [...current, file.id] : current.filter(id => id !== file.id))}/><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-slate-500">{file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ` : ''}{compatible ? fileStates[file.id] || 'Listo para analizar' : 'Disponible para abrir; no compatible con el análisis'}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><a className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-800 underline" target="_blank" rel="noopener noreferrer" aria-label={`${file.mime === 'application/pdf' ? 'Abrir PDF' : 'Abrir o descargar'}: ${file.name}`} href={`/api/inmuebles/${propertyId}/archivos/${file.id}`}>{file.mime === 'application/pdf' ? 'Abrir PDF' : 'Abrir o descargar'}</a><button type="button" className="min-h-11 text-sm text-slate-600 underline" aria-label={`Analizar este documento: ${file.name}`} disabled={busy || !compatible} onClick={() => void analyze(file.id)}>Analizar solo este archivo</button></div></div></div></li>;
        })}</ul><label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" className="mt-1" disabled={busy} checked={forceOcr} onChange={event => setForceOcr(event.target.checked)}/><span>Leer también las imágenes de los PDF<span className="mt-1 block text-xs leading-5 text-slate-500">Úsalo si hay tablas o páginas escaneadas que no aparecen en los resultados. Puede tardar más.</span></span></label><button type="button" disabled={busy || !fileSelection.length} className="aa-button aa-button-primary" onClick={() => void analyze()}>Analizar documentos seleccionados ({fileSelection.length})</button></div>}
      </section>
      {notices.length > 0 && <details className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><summary className="cursor-pointer font-semibold">Observaciones de lectura ({notices.length})</summary><ul className="mt-2 list-disc space-y-2 pl-5">{notices.map((notice,index) => <li key={index} className="break-words">{notice}</li>)}</ul></details>}
      {candidates.length > 0 && <section aria-label="Revisar datos encontrados" className="space-y-4"><div><h5 className="font-bold">2. Revisa los datos encontrados</h5><p className="mt-1 text-sm leading-6 text-slate-600">Elige un valor por apartado. Abre la fuente para comprobar que corresponde a este inmueble.</p></div>
      {groups.map(field => <fieldset key={field} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-bold">{candidates.find(candidate => candidate.field === field)?.label}</legend>{conflicts.includes(field) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay valores diferentes. Comprueba documento, parcela, planta y fecha antes de elegir.</p>}{candidates.filter(candidate => candidate.field === field).map(candidate => <div key={candidate.key} className={`min-w-0 rounded-xl border p-3 ${selected.includes(candidate.key) ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-semibold"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" disabled={busy} checked={selected.includes(candidate.key)} onChange={event => { setSelected(current => event.target.checked ? [...current.filter(key => candidates.find(c => c.key === key)?.field !== candidate.field),candidate.key] : current.filter(key => key !== candidate.key)); setReviewed(false); }}/><span className="break-words">Seleccionar {candidate.label}: <span className="font-bold">{candidate.value}</span></span></label>
        <p className="mt-1 break-words text-xs leading-6 text-slate-600"><a className="font-semibold text-blue-800 underline" target="_blank" rel="noopener noreferrer" href={`/api/inmuebles/${propertyId}/archivos/${candidate.sourceId}${candidate.page ? `#page=${candidate.page}` : ''}`}>{candidate.sourceName}</a> · {candidate.sheet ? `${candidate.sheet} · ${candidate.cell}` : `página ${candidate.page}`}</p>
        {candidate.method === 'ocr' && <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${candidate.confidence == null || candidate.confidence < 75 ? 'bg-amber-50 font-semibold text-amber-900' : 'bg-slate-50 text-slate-600'}`}>{candidate.confidence == null || candidate.confidence < 75 ? 'Lectura de baja confianza' : 'Dato leído de un escaneo'} · coteja cifras y unidades con el original.</p>}
        {['superficie','areaParcial'].includes(candidate.field) && <p className="mt-2 text-xs font-semibold text-amber-900">Área sin clasificar: verifica si es total, por piso, matriz o comparable.</p>}
        <details className="mt-2 text-xs"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-slate-600 underline">Ver evidencia y observaciones</summary><blockquote className="whitespace-pre-wrap break-words border-l-2 border-slate-300 pl-3 leading-6">{candidate.evidence}</blockquote>{candidate.warnings?.map((warning,index) => <p key={index} className="mt-2 leading-5 text-amber-900">{warning}</p>)}</details>
        {selected.includes(candidate.key) && <><label className="mt-2 block text-xs font-semibold">Valor revisado<textarea rows={2} maxLength={2000} className={input} value={candidate.value} disabled={busy} onChange={event => { setCandidates(current => current.map(item => item.key === candidate.key ? {...item,value:event.target.value} : item)); setReviewed(false); }}/></label>{['superficie','areaParcial'].includes(candidate.field) && <label className="mt-3 block text-xs font-semibold">¿A qué área total de esta ficha corresponde?<select className={input} disabled={busy} value="" onChange={event => { if (!event.target.value) return; const destination = event.target.value; setSelected(current => current.filter(key => key === candidate.key || candidates.find(c => c.key === key)?.field !== destination)); setCandidates(current => current.map(item => item.key === candidate.key ? {...item,field:destination,label:destination === 'areaTerreno' ? 'Área de terreno' : 'Área construida'} : item)); setReviewed(false); }}><option value="">Seleccionar después de cotejar el total</option><option value="areaTerreno">Área de terreno</option><option value="areaConstruida">Área construida</option></select></label>}</>}
      </div>)}</fieldset>)}</section>}
      {chosen.length > 0 && <section aria-label="Incorporar datos revisados" className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4"><div><h5 className="font-bold">3. Incorpora los datos revisados</h5><p className="mt-1 text-sm text-slate-600">{chosen.length} dato(s) seleccionado(s). Elige dónde aplicarlos.</p></div>
        {unclassified && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Clasifica las superficies seleccionadas antes de incorporarlas.</p>}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" disabled={busy} checked={replaceExisting} onChange={event => {setReplaceExisting(event.target.checked);setReviewed(false);}}/><span>Reemplazar también los valores ya escritos<span className="mt-1 block text-xs leading-5 text-slate-500">Por defecto solo se completan datos pendientes. Activa esta opción para corregir áreas u otros valores y revisa la vista previa.</span></span></label>
        <details className="rounded-lg border border-slate-200 bg-white p-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Vista previa del texto · {preview.applied} campo(s) por actualizar</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-6">{preview.text}</pre></details>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><h6 className="text-sm font-bold">Solo el borrador del texto</h6><p className="mt-1 text-xs leading-6 text-slate-600">Incorpora los datos al editor. Después usa Guardar borrador o Guardar texto para conservarlos.</p><button type="button" disabled={busy || unclassified || !preview.applied} className="aa-button aa-button-primary mt-3" onClick={applyToDraft}>Incorporar seleccionados al borrador</button></div>
        {areas && areaChoices.length > 0 && <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><h6 className="text-sm font-bold">También las áreas de la ficha</h6><dl className="space-y-2 text-sm">{areaChoices.map(choice => <div key={choice.field} className="rounded-lg bg-slate-50 p-3"><dt className="font-semibold">{choice.label}</dt><dd className="mt-1 break-words text-slate-600">{areas[choice.field as keyof Areas] ?? 'Sin registrar'} m² → <strong className="text-slate-900">{choice.value}</strong></dd></div>)}</dl><p className="text-xs leading-6 text-slate-600">Guarda las áreas en la ficha y aplica al borrador los cambios de la vista previa que correspondan. El texto se guarda por separado.</p><label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)}/><span>He cotejado las cifras con los documentos y comprobado que corresponden al inmueble, parcela y tipo de área correctos.</span></label><button type="button" className="aa-button aa-button-secondary" disabled={busy || unclassified || !reviewed} onClick={() => void saveAreas()}>Guardar áreas revisadas y completar borrador</button></div>}
      </section>}
      {error && <p role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{message}</p>}
    </div>}
  </section>;
}
