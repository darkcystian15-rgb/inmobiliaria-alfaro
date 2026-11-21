'use client';

import { useEffect, useRef, useState } from 'react';
import { requestJson } from '@/lib/client-request';
import { zoneUrl } from '@/lib/zone-url';
import { minuteRuns, minuteParagraphs } from '@/lib/minute-format.mjs';
import { emptyMinute, updateMinuteText, type MinuteDocument } from '@/lib/minute-document';
import { applyMinuteBase, type MinuteProperty } from '@/lib/minute-template';
import { documentEditorConfig, type DocumentEditorKind } from '@/lib/document-editor';
import MinuteContentEditor from './MinuteContentEditor';
import MinuteImages from './MinuteImages';
import { compressImage } from '@/lib/client-images';
import type { DossierFile } from './TransactionDossier';

const input = 'mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900';
type Snapshot = { data: MinuteDocument; version: number; propertyCode?: string; property: MinuteProperty };
type Extraction = { text: string; header: string; footer: string; warnings: string[] };
export default function MinuteTextEditor({ propertyId, kind = 'minute', operation = 'venta', files, readOnly, uploadReady, onClose, onChanged, onPending, onBusy }: {
  kind?: DocumentEditorKind; operation?: string; propertyId: number; files: DossierFile[]; readOnly: boolean; uploadReady: boolean; onClose: () => void; onChanged: () => Promise<void>; onPending: (value: boolean) => void; onBusy: (value: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const endpoint = `/api/inmuebles/${propertyId}/minuta-texto${kind === 'minute' ? '' : `?document=${kind}`}`;
  const [saved, setSaved] = useState<Snapshot | null>(null);
  const config = documentEditorConfig(kind, saved?.property?.operation ?? operation);
  const [data, setData] = useState<MinuteDocument>(emptyMinute);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [fileId, setFileId] = useState('');
  const [startOpen, setStartOpen] = useState(false), [presentationOpen, setPresentationOpen] = useState(false), [showWord, setShowWord] = useState(false);
  const [baseChoice, setBaseChoice] = useState<'choose' | 'replace' | null>(null);
  const [baseUndo, setBaseUndo] = useState<MinuteDocument | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [preview, setPreview] = useState(false);
  const [pdfId, setPdfId] = useState<number | null>(null);
  const dirty = !!saved && JSON.stringify(data) !== JSON.stringify(saved.data);
  useEffect(() => { const element = dialog.current; const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; element?.showModal(); return () => { element?.close(); document.body.style.overflow = old; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    void requestJson<Snapshot>(endpoint, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) { const next = { ...result.data, footerReference: result.data.footerReference ?? (result.propertyCode ? `Inmueble: ${result.propertyCode}` : ''), footerPagination: result.data.footerPagination ?? 'Página {pagina} de {total}' }; setSaved({ ...result, data: next }); setData(next); setStartOpen(!result.data.text.trim()); } }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [endpoint]);
  useEffect(() => { onPending(dirty); return () => onPending(false); }, [dirty, onPending]);
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function change(next: MinuteDocument) { setData(next); setPdfId(null); setNotice(''); }
  async function run(task: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await task(); } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo completar la operación.'); } finally { setBusy(false); } }
  async function persist() {
    if (!saved) throw Error('Espera a que cargue el texto guardado.');
    if (!dirty && saved.version) return saved.version;
    const result = await requestJson<{ version: number }>(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, version: saved.version }) });
    setSaved({ ...saved, data, version: result.version }); return result.version;
  }
  function openFile() {
    const tab = window.open('', '_blank');
    if (!tab) { setError('El navegador bloqueó la pestaña. Permite abrir pestañas para ver el archivo.'); return; }
    tab.opener = null;
    void run(async () => {
      try {
        const version = readOnly ? saved!.version : await persist();
        tab.location.replace(zoneUrl(`${endpoint}${endpoint.includes('?') ? '&' : '?'}format=pdf&version=${version}`));
        setNotice('Archivo abierto en otra pestaña.');
      } catch (error) { tab.close(); throw error; }
    });
  }
  async function downloadWord() {
    const response = await fetch(zoneUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'download-word', data }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw Error(result?.error || 'No se pudo descargar el Word.');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.filename}.docx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyText() {
    try {
      await navigator.clipboard.writeText(data.text);
    } catch {
      throw Error('No se pudo copiar el texto. Puedes seleccionarlo y copiarlo desde el editor.');
    }
    setNotice('Texto copiado.');
  }
  async function generate() {
    const version = await persist();
    const result = await requestJson<{ id: number }>(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', version }) });
    setPdfId(result.id); setNotice('PDF generado y adjuntado.');
    try { await onChanged(); } catch { setNotice('El PDF se guardó. Actualiza el listado para verlo.'); }
  }
  async function addImage(file: File) {
    const prepared = await compressImage(file), form = new FormData();
    form.set('archivo', prepared); form.set('tipoDocumento', config.category);
    form.set('nombre', file.name.slice(0, 255));
    const result = await requestJson<{ id: number }>(`/api/inmuebles/${propertyId}/archivos`, { method: 'POST', body: form });
    change({ ...data, images: [...(data.images || []), { fileId: result.id, after: data.text.length, width: 100, align: 'center', caption: '' }] });
    setNotice('Imagen incorporada al final. Puedes cambiar su ubicación.');
    try { await onChanged(); } catch { setNotice('Imagen incorporada. Actualiza el listado para ver su archivo.'); }
  }
  function incorporateBase(mode: 'replace' | 'append') {
    if (!saved?.property) return;
    try {
      const next = applyMinuteBase(data, saved.property, mode, kind);
      setBaseUndo(data); change(next); setBaseChoice(null); setStartOpen(false); setError('');
      setNotice('Estructura base incorporada.');
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo incorporar la estructura.'); }
  }
  const rental = saved?.property?.operation === 'alquiler';
  const editorName = config.label;
  const plain = kind === 'intermediation-structure';
  const wordFiles = files.filter(file => file.tipoDocumento === config.category && file.almacenamiento === 'hosting' && (/\.docx?$/i.test(file.nombreOriginal || file.nombre) || ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.tipoMime || '')));
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy && !dirty) onClose(); else setError('Guarda o descarta los cambios antes de cerrar.'); }} aria-label={`Editor de ${editorName}`} className="fixed inset-0 m-auto h-[94dvh] max-h-[94dvh] w-[calc(100%_-_1rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-0 shadow-xl backdrop:bg-slate-950/60">
    <div className="flex h-full min-h-0 flex-col">
      <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0"><h2 className="text-base font-bold leading-tight sm:text-lg">{editorName}</h2>{saved?.propertyCode && <p className="mt-0.5 text-xs text-slate-500">{saved.propertyCode} · {rental ? 'Alquiler' : 'Venta'}</p>}</div>
        <div className="flex shrink-0 items-center gap-2">
          {!readOnly && (dirty || baseUndo) && <details className="relative"><summary aria-label="Más opciones del documento" className="flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Más</summary><div className="absolute right-0 top-full mt-2 w-64 max-w-[75vw] space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            {baseUndo && <button type="button" disabled={busy} className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50" onClick={event => { change(baseUndo); setBaseUndo(null); setBaseChoice(null); setNotice('Contenido anterior restaurado.'); event.currentTarget.closest('details')?.removeAttribute('open'); }}>Deshacer incorporación de estructura</button>}
            {dirty && <button type="button" disabled={busy} className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-red-800 hover:bg-red-50 disabled:opacity-50" onClick={event => { change(saved!.data); setBaseChoice(null); setBaseUndo(null); setError(''); event.currentTarget.closest('details')?.removeAttribute('open'); }}>Descartar cambios sin guardar</button>}
          </div></details>}
          <button type="button" aria-label="Cerrar editor" className="aa-button aa-button-secondary" disabled={busy || dirty} onClick={onClose}>Cerrar</button>
        </div>
      </header>
      <div data-minute-scroll className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {(notice || busy) && <p role="status" aria-live="polite" className="mb-3 text-xs text-slate-600">{busy ? 'Procesando…' : notice}</p>}
        {!saved ? <p className="py-8 text-sm text-slate-500">{error ? 'Cierra y vuelve a abrir para reintentar.' : 'Cargando documento…'}</p> : <>
          {!readOnly && <details open={startOpen} onToggle={event => setStartOpen(event.currentTarget.open)} className="mb-3 rounded-xl border border-slate-200 bg-white">
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold" onClick={event => { if (busy) event.preventDefault(); }}>{data.text.trim() ? 'Cambiar punto de partida' : 'Empezar documento'}</summary>
            <div className="space-y-3 border-t border-slate-100 p-4">
              <div className="flex flex-wrap gap-2">{kind !== 'promise-contract' && <button type="button" className="aa-button aa-button-primary" disabled={busy || !saved.property || baseChoice !== null} onClick={() => { if (data.text.trim()) setBaseChoice('choose'); else incorporateBase('replace'); }}>Usar estructura base</button>}<button type="button" aria-expanded={showWord} aria-controls="minute-word-source" className="aa-button aa-button-secondary" disabled={busy} onClick={() => setShowWord(value => !value)}>Usar un Word</button></div>
              {baseChoice && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3" role="group" aria-label="Incorporar estructura sobre texto existente"><p className="text-sm">{baseChoice === 'replace' ? 'Se reemplazarán el texto, su formato y las imágenes del contenido. El título personalizado, encabezado y pie se conservan.' : 'Ya hay contenido. Puedes añadir la base o reemplazarlo.'}</p><div className="flex flex-wrap gap-2">{baseChoice === 'choose' ? <><button type="button" disabled={busy} className="aa-button aa-button-secondary" onClick={() => incorporateBase('append')}>Añadir al final</button><button type="button" disabled={busy} className="aa-button aa-button-secondary" onClick={() => setBaseChoice('replace')}>Reemplazar contenido…</button></> : <button type="button" disabled={busy} className="aa-button aa-button-primary" onClick={() => incorporateBase('replace')}>Confirmar reemplazo del contenido</button>}<button type="button" disabled={busy} className="aa-button aa-button-secondary" onClick={() => setBaseChoice(null)}>Cancelar incorporación</button></div></div>}
              {showWord && <section id="minute-word-source" aria-label="Documento Word de apoyo" className="space-y-3 rounded-lg bg-slate-50 p-3"><label className="block text-sm font-semibold">Word del apartado<select aria-label="Extraer de un Word existente" className={input} disabled={busy} value={fileId} onChange={event => { setFileId(event.target.value); setExtraction(null); }}><option value="">Seleccionar archivo…</option>{wordFiles.map(file => <option key={file.id} value={file.id}>{file.nombre}</option>)}</select></label><button type="button" className="aa-button aa-button-secondary" disabled={busy || !fileId} onClick={() => void run(async () => { const result = await requestJson<Extraction>(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extract', fileId: Number(fileId) }) }); setExtraction(result); setNotice('Word leído. Revisa el texto.'); })}>Extraer texto</button>{!wordFiles.length && <p className="text-xs text-slate-500">Sube un DOC o DOCX a este apartado para utilizarlo aquí.</p>}
                {extraction && <div className="space-y-3 border-t border-slate-200 pt-3"><details open><summary className="cursor-pointer text-sm font-semibold">Texto extraído</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-serif text-sm">{extraction.text}</pre></details>{extraction.warnings.length > 0 && <details><summary className="cursor-pointer text-xs text-slate-600">Notas de lectura</summary>{extraction.warnings.map(warning => <p key={warning} className="mt-2 text-xs text-amber-900">{warning}</p>)}</details>}<div className="flex flex-wrap gap-2"><button type="button" className="aa-button aa-button-primary" disabled={busy || data.text.length + extraction.text.length + (data.text ? 2 : 0) > 20000} onClick={() => { change(updateMinuteText(data, data.text ? `${data.text}\n\n${extraction.text}` : extraction.text)); setNotice('Texto incorporado.'); setExtraction(null); setStartOpen(false); }}>Incorporar texto {data.text ? 'al final' : 'al editor'}</button><button type="button" className="aa-button aa-button-secondary" disabled={busy} onClick={() => { change({ ...data, header: extraction.header || data.header, footer: extraction.footer || data.footer }); setPresentationOpen(true); setNotice('Encabezado y pie incorporados.'); }}>Usar encabezado y pie del Word</button></div></div>}
              </section>}
            </div>
          </details>}
          <details hidden={plain} open={presentationOpen} onToggle={event => setPresentationOpen(event.currentTarget.open)} className="mb-4 rounded-xl border border-slate-200 bg-white">
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold" onClick={event => { if (busy) event.preventDefault(); }}>Encabezado y pie</summary>
            <fieldset disabled={busy || readOnly} className="space-y-4 border-t border-slate-100 p-4">
              <label className="block text-sm font-semibold">Título del documento<input className={input} maxLength={160} value={data.title} onChange={event => change({ ...data, title: event.target.value })} /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Encabezado de cada página<textarea className={input} rows={2} maxLength={300} value={data.header} onChange={event => change({ ...data, header: event.target.value })} /></label><label className="block text-sm font-semibold">Pie de cada página<textarea aria-label="Pie de cada página" className={input} rows={2} maxLength={300} value={data.footer} onChange={event => change({ ...data, footer: event.target.value })} /></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Referencia inferior izquierda<input className={input} maxLength={160} value={data.footerReference || ''} onChange={event => change({ ...data, footerReference: event.target.value })} placeholder="Opcional" /></label><label className="block text-sm font-semibold">Numeración o texto inferior derecho<input className={input} maxLength={160} value={data.footerPagination || ''} onChange={event => change({ ...data, footerPagination: event.target.value })} placeholder="Opcional" /></label></div>
              {!rental && <div className="rounded-lg bg-slate-50 p-3">
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={data.watermark?.enabled ?? false} onChange={event => change({ ...data, watermark: { width: 120, opacity: 0.08, ...data.watermark, enabled: event.target.checked } })} />Incluir marca de agua con el logo de la inmobiliaria</label>
                {data.watermark?.enabled && <div className="mt-2 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Tamaño de marca de agua<select className={input} value={data.watermark.width} onChange={event => change({ ...data, watermark: { ...data.watermark!, width: Number(event.target.value) } })}><option value={80}>Pequeño</option><option value={120}>Mediano</option><option value={160}>Grande</option></select></label><label className="text-xs font-semibold">Intensidad de marca de agua<select className={input} value={data.watermark.opacity} onChange={event => change({ ...data, watermark: { ...data.watermark!, opacity: Number(event.target.value) } })}><option value={0.05}>Muy suave</option><option value={0.08}>Suave</option><option value={0.15}>Visible</option></select></label></div>}
                <p className="mt-1 text-xs text-slate-600">Opcional. Se aplica al PDF, centrada en cada página.</p>
              </div>}
              <details><summary className="min-h-8 cursor-pointer text-xs text-slate-500">Ayuda de presentación</summary><p className="mt-2 text-xs text-slate-600">El encabezado incluye el logo. Todos los campos del pie se pueden cambiar o borrar. Usa {'{pagina}'} y {'{total}'} para numerar automáticamente.</p></details>
            </fieldset>
          </details>
          {preview && <MinutePreview data={data} propertyId={propertyId} plain={plain} />}
          <div hidden={preview}>
          <MinuteContentEditor data={data} onChange={change} disabled={busy || readOnly} label={kind === 'minute' ? rental ? 'Contenido de la estructura de alquiler' : 'Contenido de la estructura de minuta' : `Contenido de ${config.label}`} />
          {!rental && <MinuteImages data={data} propertyId={propertyId} disabled={busy || readOnly} uploadReady={uploadReady} onChange={change} onUpload={file => void run(() => addImage(file))} />}
          </div>
        </>}
      </div>
      {saved && <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-3 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">{readOnly ? 'Solo consulta' : dirty ? 'Sin guardar' : pdfId ? 'PDF generado' : saved.version ? 'Guardado' : 'Nuevo documento'}{!uploadReady && ' · Adjuntos no disponibles'}</p>{pdfId && <a className="text-xs font-semibold text-red-800 underline" aria-label="Descargar PDF guardado" href={zoneUrl(`/api/inmuebles/${propertyId}/archivos/${pdfId}?download=1`)}>Descargar PDF</a>}</div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="aa-button aa-button-secondary !px-2 text-xs sm:text-sm" aria-pressed={preview} disabled={!data.text.trim() && !preview}
            onClick={() => {
              setPreview(value => !value);
              if (!preview) requestAnimationFrame(() => dialog.current?.querySelector('#minute-preview')?.scrollIntoView({ block: 'start' }));
            }}>{preview ? 'Volver al editor' : 'Vista previa'}</button>
          <button type="button" className="aa-button aa-button-secondary !px-2 text-xs sm:text-sm" disabled={busy || !data.text.trim()}
            onClick={() => void run(downloadWord)}>Descargar Word</button>
          {plain && <button type="button" className="aa-button aa-button-secondary !px-2 text-xs sm:text-sm" disabled={busy || !data.text.trim()}
            onClick={() => void run(copyText)}>Copiar texto</button>}
          {!readOnly && <button type="button" className="aa-button aa-button-secondary !px-2 !whitespace-nowrap text-xs sm:text-sm" disabled={busy || (!dirty && !!saved.version)} onClick={() => void run(async () => { await persist(); setNotice('Texto guardado.'); })}>Guardar</button>}
          {pdfId ? <a className="aa-button aa-button-secondary !px-2 !whitespace-nowrap text-xs sm:text-sm" aria-label="Ver archivo generado ↗" href={zoneUrl(`/api/inmuebles/${propertyId}/archivos/${pdfId}`)} target="_blank" rel="noopener noreferrer">Ver archivo<span aria-hidden="true" className="hidden sm:inline"> ↗</span></a> : <button type="button" className="aa-button aa-button-secondary !px-2 !whitespace-nowrap text-xs sm:text-sm" aria-label="Ver archivo ↗" title="Abrir PDF en otra pestaña" disabled={busy || !data.text.trim()} onClick={openFile}>Ver archivo<span aria-hidden="true" className="hidden sm:inline"> ↗</span></button>}
          {!readOnly && <button type="button" className="aa-button aa-button-primary !px-2 !whitespace-nowrap text-xs sm:text-sm" title="Generar PDF y adjuntar al expediente" disabled={busy || !data.text.trim() || !uploadReady} onClick={() => void run(generate)}>Generar PDF</button>}
        </div>
      </footer>}
    </div>
  </dialog>;
}

function MinutePreview({ data, propertyId, plain }: { data: MinuteDocument; propertyId: number; plain: boolean }) {
  const images = [...(data.images ?? [])].sort((left, right) => left.after - right.after);
  function runs(start: number, end: number) {
    return minuteRuns(data, start, end).map(part => (
      <span key={part.start} style={{ fontWeight: part.bold ? 700 : 400, fontSize: `${part.size}pt`, textDecoration: part.underline ? 'underline' : undefined }}
        className={part.background === 'highlight' ? 'bg-yellow-200' : part.background === 'shade' ? 'bg-slate-200' : undefined}>
        {part.text}
      </span>
    ));
  }
  function text(start: number, end: number) {
    if (data.layout !== 'word-model') return runs(start, end);
    return minuteParagraphs(data, start, end).map(p => <div key={p.start} style={{ fontFamily: 'Carlito, Calibri, sans-serif', fontSize: '11pt', textAlign: p.align, marginLeft: `${p.indent}pt`, textIndent: `${p.firstLine}pt`, marginTop: `${p.before}pt`, marginBottom: `${p.after}pt`, lineHeight: p.line, minHeight: `${11 * p.line}pt` }}>{runs(p.start, p.end)}</div>);
  }
  return <article id="minute-preview" aria-label="Vista previa del documento"
    className="mx-auto min-w-0 max-w-3xl space-y-5 break-words rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-10">
    {!plain && <header className="flex flex-wrap items-center gap-4 border-b border-red-700 pb-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/logo.png" alt="Inmobiliaria Alberto Alfaro" className="h-auto w-32" />
      <p className="whitespace-pre-wrap text-sm text-slate-600">{data.header}</p>
    </header>}
    {!plain && <h3 style={data.layout === 'word-model' ? { fontFamily: 'Carlito, Calibri, sans-serif', fontSize: '11pt', textAlign: 'left' } : undefined} className="text-center font-serif text-xl font-bold">{data.title}</h3>}
    <div className="whitespace-pre-wrap break-words font-serif leading-relaxed">
      {images.map((image, index) => (
        <div key={`${image.fileId}-${index}`}>
          {text(images[index - 1]?.after ?? 0, image.after)}
          <figure className="my-3" style={{ textAlign: image.align }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoneUrl(`/api/inmuebles/${propertyId}/archivos/${image.fileId}`)} alt={image.caption || 'Imagen del documento'}
              className="inline-block max-w-full object-contain"
              style={{ width: `${image.width / 162 * 100}%`, aspectRatio: image.keepRatio === false && image.height ? image.width / image.height : undefined, objectFit: image.keepRatio === false ? 'fill' : 'contain' }} />
            {image.caption && <figcaption className="text-sm text-slate-600">{image.caption}</figcaption>}
          </figure>
        </div>
      ))}
      {text(images.at(-1)?.after ?? 0, data.text.length)}
    </div>
    {!plain && <footer className="space-y-1 border-t border-red-700 pt-3 text-xs text-slate-600">
      {data.footer && <p className="whitespace-pre-wrap text-center">{data.footer}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        <span>{data.footerReference?.replaceAll('{pagina}', '1').replaceAll('{total}', '1')}</span>
        <span>{data.footerPagination?.replaceAll('{pagina}', '1').replaceAll('{total}', '1')}</span>
      </div>
    </footer>}
  </article>;
}
