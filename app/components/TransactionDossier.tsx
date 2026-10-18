"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { dossierDefaults, dossierDocuments, dossierSections, dossierStatus, legacyDossierTypes } from '@/lib/transaction-dossier.mjs';
import { requestJson } from '@/lib/client-request';
import { compressImage, isImageFile } from '@/lib/client-images';
import FileViewer from './FileViewer';
import ConfirmDialog from './ConfirmDialog';
import WorkspaceFileIcon from './WorkspaceFileIcon';

export type DossierFile = { id: number; nombre: string; tipoDocumento: string; almacenamiento: string; enlace: string; tipoMime: string | null; nombreOriginal: string | null; observacion: string | null; tamanoBytes: number | null };
type Config = ReturnType<typeof dossierDefaults>;
type RecordData = { config: Config; version: number };
type View = 'estado' | 'vendedor' | 'comprador' | 'inmueble';
const field = 'mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm';
const stateLabels = { completo: 'Completo', pendiente: 'Pendiente obligatorio', opcional: 'Opcional', no_aplica: 'No aplica' };


export default function TransactionDossier({ propertyId, view, files, uploadReady, administrator, onChanged, onBusyChange, onDirtyChange }: {
  propertyId: number; view: View; files: DossierFile[]; uploadReady: boolean; administrator: boolean;
  onChanged: () => Promise<void>; onBusyChange: (value: boolean) => void; onDirtyChange: (value: boolean) => void;
}) {
  const [record, setRecord] = useState<RecordData | null>(null);
  const [config, setConfig] = useState<Config>(dossierDefaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewer, setViewer] = useState<DossierFile | null>(null);
  const [deleting, setDeleting] = useState<DossierFile | null>(null);
  const [editing, setEditing] = useState<DossierFile | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [selected, setSelected] = useState<{ file: File; name: string }[]>([]);
  const [category, setCategory] = useState('');
  const [observation, setObservation] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const dirty = !!record && JSON.stringify(config) !== JSON.stringify(record.config);
  const pending = dirty || selected.length > 0 || editing !== null;
  useEffect(() => { onDirtyChange(pending); }, [pending, onDirtyChange]);
  const status = dossierStatus(config, files);
  const url = `/api/inmuebles/${propertyId}/expediente`;
  const fileUrl = `/api/inmuebles/${propertyId}/archivos`;
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await requestJson<RecordData>(url, { signal });
      if (!signal?.aborted) { setRecord(data); setConfig(data.config); setError(''); }
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No se pudo cargar el expediente.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [url]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load]);
  function working(value: boolean) { setBusy(value); onBusyChange(value); }
  async function saveConfig() {
    if (!record || busy) return;
    working(true); setError(''); setMessage('');
    try {
      const data = await requestJson<{ version: number }>(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, version: record.version }) });
      setRecord({ config: { ...config }, version: data.version });
      await onChanged(); setMessage('Condiciones del expediente guardadas.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { working(false); }
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (busy || dirty || !category || !selected.length || !record) return;
    working(true); setError(''); setMessage('');
    let uploaded = 0;
    try {
      for (const entry of selected) {
        const file = isImageFile(entry.file) ? await compressImage(entry.file) : entry.file;
        if (file.size > 4 * 1024 * 1024) throw Error(`${entry.name}: el archivo supera 4 MB.`);
        const body = new FormData();
        body.set('archivo', file); body.set('nombre', entry.name.trim()); body.set('tipoDocumento', category); body.set('observacion', observation);
        await requestJson(fileUrl, { method: 'POST', body }); uploaded++;
      }
      setObservation(''); setMessage(`${uploaded} archivo${uploaded === 1 ? '' : 's'} guardado${uploaded === 1 ? '' : 's'}.`);
    } catch (e) { setError(`${e instanceof Error ? e.message : 'No se pudo subir.'}${uploaded ? ` ${uploaded} archivo(s) ya se guardaron; solo quedan los pendientes.` : ''}`); }
    finally {
      setSelected(previous => previous.slice(uploaded));
      if (input.current) input.current.value = '';
      if (uploaded) await onChanged();
      working(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    working(true); setError(''); setMessage('');
    try { await requestJson(`${fileUrl}?archivoId=${deleting.id}`, { method: 'DELETE' }); await onChanged(); setDeleting(null); setMessage('Archivo eliminado. Estado del expediente actualizado.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar.'); }
    finally { working(false); }
  }
  async function rename(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    working(true); setError(''); setMessage('');
    try {
      await requestJson(fileUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivoId: editing.id, nombre: editName, tipoDocumento: editType, observacion: editing.observacion || '' }) });
      setEditing(null); await onChanged(); setMessage('Nombre y categoría actualizados.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    finally { working(false); }
  }
  function renderFile(file: DossierFile) {
    return <article key={file.id} className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex min-w-0 flex-1 items-start gap-2"><WorkspaceFileIcon name={file.nombreOriginal || file.nombre} /><div className="min-w-0"><p className="break-words text-sm font-semibold">{file.nombre}</p><p className="mt-1 break-words text-xs text-slate-500">{file.nombreOriginal}{file.tamanoBytes ? ` · ${Math.ceil(file.tamanoBytes / 1024)} KB` : ''}</p>{file.observacion && <p className="mt-1 whitespace-pre-wrap break-words text-xs">{file.observacion}</p>}{file.almacenamiento !== 'hosting' && <p className="mt-1 text-xs text-amber-800">Enlace anterior: sube el archivo para completar este requisito.</p>}</div></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setViewer(file)} className="aa-button aa-button-secondary">Ver archivo</button>{file.almacenamiento === 'hosting' && <a href={`${file.enlace}?download=1`} className="aa-button aa-button-secondary">Descargar</a>}<button type="button" disabled={busy} onClick={() => { setEditing(file); setEditName(file.nombre); setEditType(status.items.find(item => item.key === file.tipoDocumento)?.applies ? file.tipoDocumento : ''); }} className="aa-button aa-button-secondary">Editar nombre / categoría</button>{administrator && <button type="button" disabled={busy} onClick={() => setDeleting(file)} className="aa-button aa-button-secondary text-red-700">Eliminar</button>}</div>
    </article>;
  }
  const party = view === 'vendedor' || view === 'comprador' ? view : null;
  const visible = status.items.filter(item => view === 'estado' || (view === 'inmueble' ? item.party === 'inmueble' : item.party === party));
  const applicable = visible.filter(item => item.applies);
  const unknown = files.filter(file => !dossierDocuments.some(def => def.key === (legacyDossierTypes[file.tipoDocumento as keyof typeof legacyDossierTypes] ?? file.tipoDocumento)));
  const available = applicable.filter(item => item.applies);
  if (loading) return <p role="status" className="p-4">Consultando expediente…</p>;
  if (!record) return <div role="alert"><p>{error}</p><button type="button" onClick={() => void load()} className="aa-button aa-button-secondary mt-3">Reintentar</button></div>;
  return <div className="space-y-5">
    <div><h3 className="text-lg font-bold">{view === 'estado' ? 'Estado del expediente' : party ? `Documentación del ${party}` : 'Documentación del inmueble'}</h3><p className="mt-2 text-sm text-slate-600">Un vendedor y un comprador por inmueble. Los pendientes generan alertas para el seguimiento de la operación.</p></div>
    {error && <p role="alert" className="whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {dirty && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>Condiciones sin guardar. Guarda antes de subir o reclasificar archivos.</p><button type="button" disabled={busy} onClick={() => void saveConfig()} className="aa-button aa-button-primary mt-3">{busy ? 'Guardando…' : 'Guardar condiciones'}</button><button type="button" disabled={busy} onClick={() => setConfig(record.config)} className="aa-button aa-button-secondary ml-2 mt-3">Descartar cambios</button></div>}
    {view === 'estado' && <>
      <div className={`rounded-2xl border p-5 ${status.complete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="text-lg font-bold">{status.complete ? 'Expediente completo' : 'Expediente con pendientes'}</p><p className="mt-2 text-sm">{status.completed} de {status.total} requisitos documentales aplicables completos · {status.percent}%</p><progress aria-label="Avance documental" value={status.completed} max={status.total || 1} className="mt-3 h-3 w-full accent-red-700" />{dirty && <p className="mt-2 text-xs">Vista previa de condiciones sin guardar.</p>}{status.alerts.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{status.alerts.map(alert => <li key={alert}>{alert}</li>)}</ul>}</div>
      <div className="grid gap-3 sm:grid-cols-2">{status.sections.map(section => <div key={section.key} className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold">{section.label}</h4><p className="mt-2 text-sm">{section.total ? `${section.completed} de ${section.total} completos · ${section.pending} pendientes` : 'Sin requisitos obligatorios aplicables'}</p></div>)}</div>
      <section><h4 className="font-bold">Documentos obligatorios pendientes</h4><ul className="mt-3 space-y-2">{status.items.filter(item => item.state === 'pendiente').map(item => <li key={item.key} className="rounded-lg bg-amber-50 p-3 text-sm"><span className="font-semibold capitalize">{item.party}</span> · {item.label}</li>)}</ul>{!status.items.some(item => item.state === 'pendiente') && <p className="mt-2 text-sm">No hay archivos obligatorios pendientes para las condiciones seleccionadas.</p>}</section>
    </>}
    {party && <fieldset disabled={busy} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-2 font-bold">Condiciones del {party}</legend>
      {party === 'comprador' && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={config.compradorAsignado} onChange={event => setConfig(old => ({ ...old, compradorAsignado: event.target.checked }))} className="mt-1 h-4 w-4" /><span>Asignar comprador: la operación ya está cerrada.<span className="mt-1 block text-xs text-slate-600">Activa su expediente y adjunta sus documentos. Solo se registra un comprador.</span></span></label>}
      {(party === 'vendedor' || config.compradorAsignado) && <label className="block text-sm font-semibold">Tipo de persona<select value={party === 'vendedor' ? config.vendedorTipo : config.compradorTipo} onChange={event => setConfig(old => ({ ...old, [`${party}Tipo`]: event.target.value }))} className={field}><option value="">Seleccionar</option><option value="natural">Persona natural</option><option value="juridica">Persona jurídica</option></select></label>}
      {config[`${party}Tipo` as keyof Config] === 'natural' && (party === 'vendedor' || config.compradorAsignado) && <label className="block text-sm font-semibold">Nota si no adjuntas la búsqueda nacional<textarea rows={3} maxLength={2000} value={party === 'vendedor' ? config.vendedorBusquedaNota : config.compradorBusquedaNota} onChange={event => setConfig(old => ({ ...old, [`${party}BusquedaNota`]: event.target.value }))} className={field} /><span className="mt-1 block text-xs font-normal text-slate-600">Obligatoria cuando no hay archivo de búsqueda nacional.</span></label>}
      {party === 'vendedor' && <label className="block text-sm font-semibold">Impuesto a la renta<select value={config.renta} onChange={event => setConfig(old => ({ ...old, renta: event.target.value }))} className={field}><option value="pendiente">Pendiente de definir</option><option value="afecto">Corresponde pagar</option><option value="exonerado">Exonerado del pago</option></select></label>}
      <button type="button" disabled={busy || !dirty} onClick={() => void saveConfig()} className="aa-button aa-button-primary">{busy ? 'Guardando…' : 'Guardar condiciones'}</button>
    </fieldset>}
    {view === 'inmueble' && <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" disabled={busy} checked={config.cargas} onChange={event => setConfig(old => ({ ...old, cargas: event.target.checked }))} className="mt-1 h-4 w-4" /><span>Incluir levantamiento de cargas<span className="mt-1 block text-xs text-slate-600">Sección opcional. Al activarla puedes subir varios archivos con nombres individuales.</span></span></label>}
    {view !== 'estado' && dossierSections.map(([section, label]) => {
      const items = visible.filter(item => item.section === section && (item.applies || item.documents.length));
      if (!items.length) return null;
      return <section key={section} className="space-y-3"><h4 className="font-bold">{label}</h4>{items.map(item => <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h5 className="font-semibold">{item.label}</h5><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.state === 'pendiente' ? 'bg-amber-100 text-amber-900' : item.state === 'completo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{stateLabels[item.state as keyof typeof stateLabels]}</span></div>{item.key === 'COPIA_LITERAL_CRI' && <p className="mt-2 text-xs text-slate-600">Basta con uno de los dos documentos.</p>}{item.note && <p className="mt-2 whitespace-pre-wrap text-sm">Nota: {item.note}</p>}{item.documents.map(file => renderFile(file as DossierFile))}{item.applies && <button type="button" disabled={busy || dirty} onClick={() => { setCategory(item.key); document.getElementById(`dossier-upload-${propertyId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="aa-button aa-button-secondary mt-3">Agregar archivo</button>}</div>)}</section>;
    })}
    {view !== 'estado' && available.length > 0 && <form id={`dossier-upload-${propertyId}`} onSubmit={event => void upload(event)} className="space-y-4 rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:p-5">
      <h4 className="font-bold">Subir archivos al expediente</h4><p className="text-xs text-slate-600">PDF, Word, Excel, JPG, PNG o WebP. Hasta 4 MB por archivo; las imágenes se comprimen. Puedes seleccionar varios y dar un nombre a cada uno.</p>
      {!uploadReady && <p role="status" className="text-sm text-amber-800">La subida no está disponible. Consulta al administrador.</p>}
      <fieldset disabled={busy || dirty || !uploadReady} className="space-y-4">
        <label className="block text-sm font-semibold">Categoría del archivo<select required value={available.some(item => item.key === category) ? category : ''} onChange={event => setCategory(event.target.value)} className={field}><option value="">Seleccionar categoría</option>{available.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <label className="block text-sm font-semibold">Archivos<input ref={input} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={event => setSelected(Array.from(event.target.files || []).map(file => ({ file, name: file.name.replace(/\.[^.]+$/, '').slice(0, 255) })))} className={field} /></label>
        {selected.map((entry, index) => <label key={`${entry.file.name}-${index}`} className="block text-sm font-semibold">Nombre del archivo {index + 1}<input required maxLength={255} value={entry.name} onChange={event => setSelected(old => old.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} className={field} /><span className="mt-1 block break-words text-xs font-normal">{entry.file.name}</span></label>)}
        <label className="block text-sm font-semibold">Observación opcional<textarea maxLength={500} value={observation} onChange={event => setObservation(event.target.value)} className={field} /></label>
        <button type="submit" disabled={!selected.length || !available.some(item => item.key === category)} className="aa-button aa-button-primary">{busy ? 'Subiendo…' : 'Subir archivos'}</button>{selected.length > 0 && <button type="button" onClick={() => { setSelected([]); if (input.current) input.current.value = ''; }} className="aa-button aa-button-secondary ml-2">Quitar selección</button>}
      </fieldset>
    </form>}
    {view === 'estado' && unknown.length > 0 && <section className="rounded-xl border border-amber-200 p-4"><h4 className="font-bold">Archivos anteriores por clasificar</h4><p className="mt-2 text-sm">Se conservaron los archivos cuya categoría anterior no permite identificar el documento con certeza. Asígnales su categoría.</p>{unknown.map(renderFile)}</section>}
    {viewer && <FileViewer file={viewer} onClose={() => setViewer(null)} />}
    {deleting && <ConfirmDialog title="Eliminar archivo" confirmLabel="Eliminar" busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void remove()}><p>Se eliminará «{deleting.nombre}». Esta acción no se puede deshacer y el requisito volverá a figurar pendiente si no hay otro archivo.</p>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}</ConfirmDialog>}
    {editing && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><form onSubmit={event => void rename(event)} className="space-y-3"><h4 className="font-bold">Editar documento: {editing.nombre}</h4><label className="block text-sm">Nombre<input required maxLength={255} value={editName} disabled={busy} onChange={event => setEditName(event.target.value)} className={field} /></label><label className="block text-sm">Categoría<select required disabled={busy || dirty} value={editType} onChange={event => setEditType(event.target.value)} className={field}><option value="">Seleccionar</option>{status.items.filter(item => item.applies).map(item => <option key={item.key} value={item.key}>{item.party} · {item.label}</option>)}</select></label><button disabled={busy || dirty} className="aa-button aa-button-primary">Guardar documento</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="aa-button aa-button-secondary ml-2">Cancelar edición</button></form></div>}
  </div>;
}
