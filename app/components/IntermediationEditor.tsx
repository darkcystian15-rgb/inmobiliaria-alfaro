"use client";

import { useEffect, useRef, useState } from 'react';
import { requestJson } from '@/lib/client-request';
import { blankOwner, blankPlot, contractFilename, intermediationPrompt, INTERMEDIATION_MIMES } from '@/lib/intermediation.mjs';

type Item = { tipo: string; direccion: string | null; contacto: string | null; zona: string | null; numero: number | null; moneda: string | null; distrito: string | null };
type Source = { id: number; nombre: string; type: string; mime: string | null; size: number | string | null };
type Owner = typeof blankOwner;
type Plot = typeof blankPlot;
type Proposal = { key: keyof Owner | keyof Plot; value: string; page: number };
type Reading = { source: Pick<Source, 'id' | 'nombre'>; pages: { page: number; text: string; method: string }[]; proposals: Proposal[]; nextPage: number | null };
const labels = {
  nombre: 'Nombre o razón social', documento: 'DNI o RUC', domicilio: 'Domicilio del propietario', representante: 'Representante',
  representanteDocumento: 'DNI del representante', poder: 'Referencia del poder',
  partida: 'Partida registral', ubicacion: 'Ubicación', area: 'Área', linderos: 'Linderos',
};
const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5';
const button = 'aa-button aa-button-secondary';

export default function IntermediationEditor({ propertyId, operation, uploadReady, onClose, onPending, onAttach }: {
  propertyId: number; operation: 'venta' | 'alquiler'; uploadReady: boolean; onClose: () => void; onPending: (value: boolean) => void; onAttach: (file: File) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [maxBytes, setMaxBytes] = useState(0);
  const [sourceId, setSourceId] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [owners, setOwners] = useState<Owner[]>([{ ...blankOwner }]);
  const [plots, setPlots] = useState<Plot[]>([{ ...blankPlot }]);
  const [ownerIndex, setOwnerIndex] = useState(0);
  const [plotIndex, setPlotIndex] = useState(0);
  const [conditions, setConditions] = useState({ term: '', currency: '', rent: '', commission: '', date: '', city: '' });
  const [reviewed, setReviewed] = useState(false);
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [prompt, setPrompt] = useState('');
  const [word, setWord] = useState<File | null>(null);
  const sale = operation === 'venta';
  const url = `/api/inmuebles/${propertyId}/intermediacion?operacion=${operation}`;
  const draft = { owners, plots, ...conditions };

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => { onPending(changed); }, [onPending, changed]);
  useEffect(() => {
    const controller = new AbortController();
    void requestJson<{ item: Item; files: Source[]; maxBytes: number }>(url, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setItem(data.item);
      setSources(data.files);
      setMaxBytes(data.maxBytes);
      setConditions(previous => ({ ...previous, currency: ['PEN', 'USD'].includes(data.item.moneda || '') ? data.item.moneda! : '' }));
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [url]);
  useEffect(() => {
    const target = preview.current;
    if (!target || !word) return;
    let cancelled = false;
    void import('docx-preview').then(async ({ renderAsync }) => {
      if (!cancelled) await renderAsync(word, target, target, { useBase64URL: true, renderAltChunks: false });
    }).catch(() => {
      if (!cancelled) target.textContent = 'La vista previa no se pudo mostrar. El Word está disponible para descargar.';
    });
    return () => {
      cancelled = true;
      target.replaceChildren();
    };
  }, [word]);

  function change() {
    setChanged(true);
    setReviewed(false);
    setPrompt('');
    setWord(null);
    setNotice('');
  }
  function close() {
    if (!busy && (!changed || window.confirm('¿Cerrar y descartar los datos de esta preparación?'))) onClose();
  }
  async function read(page = 1) {
    if (!sourceId || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await requestJson<Reading>(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', fileId: Number(sourceId), page }),
      });
      setReading(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo leer el documento.');
    } finally {
      setBusy(false);
    }
  }
  function apply(proposal: Proposal) {
    change();
    const { key, value } = proposal;
    if (key in blankOwner) {
      setOwners(previous => previous.map((owner, index) => index === ownerIndex ? { ...owner, [key]: value } : owner));
    } else {
      setPlots(previous => previous.map((plot, index) => index === plotIndex ? {
        ...plot, [key]: key === 'linderos' && plot.linderos ? plot.linderos + '\n' + value : value,
      } : plot));
    }
    setNotice(`Se incorporó ${labels[key]} desde ${reading?.source.nombre}, página ${proposal.page}.`);
  }
  function download(file: File) {
    const href = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = href;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  async function generate(model = false) {
    if (!item || busy || (!model && !reviewed)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: model ? 'model' : 'word', draft: model ? undefined : draft }),
      });
      if (!response.ok) throw Error((await response.json()).error || 'No se pudo generar el Word.');
      const blob = await response.blob();
      const file = new File([blob], (model ? `Modelo de intermediación de ${operation}` : contractFilename(item)) + '.docx', { type: blob.type });
      if (model) download(file);
      else setWord(file);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo generar el Word.');
    } finally {
      setBusy(false);
    }
  }
  async function copyPrompt() {
    if (!item || !reviewed) return;
    const text = intermediationPrompt(draft, item, operation);
    setPrompt(text);
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Prompt copiado. Puedes descargar el modelo Word para adjuntarlo en ChatGPT.');
    } catch {
      setNotice('Selecciona el texto del prompt para copiarlo.');
    }
  }

  const available = sources.filter(file => INTERMEDIATION_MIMES.includes(file.mime || '') && Number(file.size) <= maxBytes);
  return (
    <dialog ref={dialog} aria-labelledby="intermediation-title" onCancel={event => { event.preventDefault(); close(); }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1rem)] max-w-5xl overflow-auto rounded-xl border border-slate-200 bg-slate-50 shadow-xl backdrop:bg-slate-950/50">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white p-4">
        <div>
          <h2 id="intermediation-title" className="font-bold">Contrato de intermediación para {operation}</h2>
          {item && <p className="text-sm text-slate-600">{[item.zona, item.numero && `N.° ${item.numero}`, item.tipo, item.direccion].filter(Boolean).join(' · ')}</p>}
        </div>
        <button type="button" className={button} disabled={busy} onClick={close}>Cerrar</button>
      </header>
      <div className="space-y-5 p-4 sm:p-6">
        {loading && <p role="status">Cargando expediente…</p>}
        {busy && <p role="status">Procesando. La lectura de escaneos puede tardar.</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        {item && <>
          <fieldset disabled={busy} className="space-y-3 rounded-xl border bg-white p-4">
            <legend className="px-2 font-semibold">Leer documentos del expediente</legend>
            {available.length === 0 ? <p className="text-sm text-slate-600">Puedes completar la estructura manualmente o subir DNI, poderes o títulos para leerlos aquí.</p> : <>
              <label className="block text-sm font-medium">Documento fuente
                <select className={input} value={sourceId} onChange={event => { setSourceId(event.target.value); setReading(null); }}>
                  <option value="">Seleccionar archivo</option>
                  {available.map(file => <option key={file.id} value={file.id}>{file.nombre}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={button} disabled={!sourceId} onClick={() => void read()}>Leer documento</button>
                {sourceId && <a className={button} href={`/api/inmuebles/${propertyId}/archivos/${sourceId}`} target="_blank" rel="noreferrer">Abrir original</a>}
                {reading?.nextPage && <button type="button" className={button} onClick={() => void read(reading.nextPage!)}>Continuar desde la página {reading.nextPage}</button>}
              </div>
            </>}
            {available.length < sources.length && <p className="text-xs text-slate-600">La lectura admite PDF, JPG, PNG y WebP de hasta 12 MB. Los demás archivos pueden consultarse en el expediente.</p>}
            {reading && <div className="space-y-3">
              <p className="text-sm font-semibold">{reading.source.nombre} · páginas {reading.pages.map(page => page.page).join(', ')}</p>
              {reading.proposals.length ? <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">Aplicar datos de identidad a
                    <select className={input} value={ownerIndex} onChange={event => setOwnerIndex(Number(event.target.value))}>
                      {owners.map((owner, index) => <option key={index} value={index}>Propietario {index + 1}{owner.nombre ? ` · ${owner.nombre}` : ''}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">Aplicar datos registrales a
                    <select className={input} value={plotIndex} onChange={event => setPlotIndex(Number(event.target.value))}>
                      {plots.map((plot, index) => <option key={index} value={index}>Predio {index + 1}{plot.partida ? ` · ${plot.partida}` : ''}</option>)}
                    </select>
                  </label>
                </div>
                <ul className="divide-y">{reading.proposals.map((proposal, index) =>
                  <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 break-words"><strong>{labels[proposal.key]}</strong> · {proposal.value} · p. {proposal.page}</span>
                    <button type="button" className={button} aria-label={`Incorporar ${labels[proposal.key]}: ${proposal.value}`} onClick={() => apply(proposal)}>Incorporar</button>
                  </li>)}</ul>
              </> : <p className="text-sm">No se detectaron campos claros en estas páginas. Puedes consultar el texto y completar la estructura.</p>}
              <details>
                <summary className="cursor-pointer text-sm font-medium">Ver texto leído por página</summary>
                {reading.pages.map(page => <div key={page.page} className="mt-2">
                  <h3 className="text-xs font-semibold">Página {page.page} · {page.method === 'ocr' ? 'OCR' : page.method === 'error' ? 'No legible' : 'Texto del PDF'}</h3>
                  <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-3 text-xs">{page.text || 'Sin texto disponible.'}</pre>
                </div>)}
              </details>
            </div>}
          </fieldset>
          <fieldset disabled={busy} className="space-y-4 rounded-xl border bg-white p-4">
            <legend className="px-2 font-semibold">Estructura editable</legend>
            <p className="text-sm text-slate-600">Comprueba la titularidad y las facultades con el documento original. Agrega una fila por propietario y por predio.</p>
            {owners.map((owner, index) => <div key={index} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Propietario {index + 1}</h3>
                {owners.length > 1 && <button type="button" className={button} aria-label={`Quitar propietario ${index + 1}`} onClick={() => {
                  change(); setOwners(previous => previous.filter((_, i) => i !== index)); setOwnerIndex(0);
                }}>Quitar</button>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(blankOwner) as (keyof Owner)[]).filter(key => sale || key !== 'domicilio').map(key => <label key={key} className="text-sm">{labels[key]}
                  <input className={input} maxLength={key === 'poder' || key === 'domicilio' ? 350 : key.toLowerCase().includes('documento') ? 35 : 220} value={owner[key]} onChange={event => {
                    change(); setOwners(previous => previous.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry));
                  }} />
                </label>)}
              </div>
            </div>)}
            <button type="button" className={button} disabled={owners.length >= 20} onClick={() => {
              change(); setOwnerIndex(owners.length); setOwners(previous => [...previous, { ...blankOwner }]);
            }}>Agregar propietario</button>
            {plots.map((plot, index) => <div key={index} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Predio {index + 1}</h3>
                {plots.length > 1 && <button type="button" className={button} aria-label={`Quitar predio ${index + 1}`} onClick={() => {
                  change(); setPlots(previous => previous.filter((_, i) => i !== index)); setPlotIndex(0);
                }}>Quitar</button>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(blankPlot) as (keyof Plot)[]).map(key => <label key={key} className="text-sm">{labels[key]}
                  <textarea rows={key === 'linderos' ? 3 : 1} className={input} maxLength={{ linderos: 900, partida: 50, ubicacion: 350, area: 75 }[key]} value={plot[key]} onChange={event => {
                    change(); setPlots(previous => previous.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry));
                  }} />
                </label>)}
              </div>
            </div>)}
            <button type="button" className={button} disabled={plots.length >= 20} onClick={() => {
              change(); setPlotIndex(plots.length); setPlots(previous => [...previous, { ...blankPlot }]);
            }}>Agregar predio</button>
            <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <h3 className="font-semibold sm:col-span-2">Condiciones de intermediación</h3>
              <label className="text-sm">Moneda
                <select className={input} value={conditions.currency} onChange={event => { change(); setConditions(previous => ({ ...previous, currency: event.target.value })); }}>
                  <option value="">Seleccionar</option><option value="PEN">Soles</option><option value="USD">Dólares</option>
                </select>
              </label>
              {([
                ['rent', sale ? 'Primer precio de venta de cierre' : 'Renta mensual mínima', 'number'], ['commission', 'Comisión de éxito (%)', 'number'], ['term', 'Vigencia en meses', 'number'],
                ['date', 'Fecha de firma', 'date'], ['city', 'Ciudad de firma', 'text'],
              ] as const).filter(([key]) => sale || key !== 'commission').map(([key, label, type]) => <label key={key} className="text-sm">{label}
                <input className={input} value={conditions[key]} type={type} min={type === 'number' ? key === 'rent' || key === 'commission' ? 0.01 : 1 : undefined}
                  max={key === 'commission' ? 100 : undefined} step={key === 'rent' || key === 'commission' ? '0.01' : undefined} onChange={event => { change(); setConditions(previous => ({ ...previous, [key]: event.target.value })); }} />
              </label>)}
              <p className="text-sm sm:col-span-2">{sale ? 'Comisión sobre el precio final de venta más IGV, pagadera al firmar la escritura.' : 'Comisión de éxito de una renta mensual más IGV.'} Plazo posterior al vencimiento de cuatro (4) meses.</p>
            </div>
          </fieldset>
          <section className="space-y-3 rounded-xl border bg-white p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />
              <span>Revisé esta estructura. Los datos pendientes aparecerán como XXXXX.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="aa-button aa-button-primary" disabled={busy || !reviewed} onClick={() => void generate()}>Generar Word en la intranet</button>
              <button type="button" className={button} disabled={busy || !reviewed} onClick={() => void copyPrompt()}>Copiar prompt para ChatGPT</button>
              <button type="button" className={button} disabled={busy} onClick={() => void generate(true)}>Descargar modelo para el prompt</button>
            </div>
            {notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}
            {prompt && <label className="block text-sm">Prompt generado<textarea className={input} readOnly rows={10} value={prompt} /></label>}
            {word && <>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={button} disabled={busy || !reviewed} onClick={() => download(word)}>Descargar Word</button>
                <button type="button" className={button} disabled={busy || !reviewed || !uploadReady} onClick={() => onAttach(word)}>Preparar para adjuntar</button>
              </div>
              <div ref={preview} aria-label="Vista previa del Word" className="max-h-[65dvh] overflow-auto border bg-slate-100" />
            </>}
          </section>
        </>}
      </div>
    </dialog>
  );
}
