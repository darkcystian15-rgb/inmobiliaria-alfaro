"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { dossierDefaults, dossierClosureStatus, dossierStatus, dossierDocumentType, isSectionExtraDocument, validateExtraDocumentDescription } from '@/lib/transaction-dossier.mjs';
import { documentByteLimit } from '@/lib/document-limits.mjs';
import { requestJson } from '@/lib/client-request';
import { compressImage, isImageFile } from '@/lib/client-images';
import { readUploadFile } from '@/lib/client-upload-file.mjs';
import { isSaneamientoType } from '@/lib/saneamiento-folders.mjs';
import FileViewer from './FileViewer';
import ConfirmDialog from './ConfirmDialog';
import WorkspaceFileIcon from './WorkspaceFileIcon';
import FileDropZone from './FileDropZone';
import LiquidationEditor from './LiquidationEditor';
import { documentEditorConfig, documentEditorForCategory, type DocumentEditorKind } from '@/lib/document-editor';
import MinuteTextEditor from './MinuteTextEditor';
import LetterEditor from './LetterEditor';
import IntermediationModels, { saveIntermediationWord } from './IntermediationModels';
import ReferencePlanPrompt from './ReferencePlanPrompt';
import { planTypes, referencePlanModelUrl } from '@/lib/reference-plan.mjs';
import { INTERMEDIATION_STRUCTURE_TYPE, INTERMEDIATION_TYPE } from '@/lib/intermediation.mjs';

export type DossierFile = { id: number; nombre: string; tipoDocumento: string; almacenamiento: string; enlace: string; tipoMime: string | null; nombreOriginal: string | null; observacion: string | null; tamanoBytes: number | null };
type Config = ReturnType<typeof dossierDefaults>;
type RecordData = { config: Config; version: number };
type View = 'estado' | 'vendedor' | 'comprador' | 'inmueble' | 'carpeta';
const field = 'mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm';
const action = 'aa-button border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const conditionAction = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const conditionSave = 'min-h-11 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50';
const saveAction = 'aa-button bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50';
const contractHeadings: Record<string, string> = {
  [INTERMEDIATION_TYPE]: 'Contrato de Intermediación Inmobiliaria',
  [INTERMEDIATION_STRUCTURE_TYPE]: 'Estructura de Contrato de Intermediación Inmobiliaria',
  ESTRUCTURA_CONTRATO_ALQUILER: 'Estructura de Contrato de Alquiler',
  CONTRATO_ALQUILER: 'Contrato de Alquiler',
};
const identificationPanel = 'space-y-4 rounded-2xl border border-red-200 bg-white p-4 sm:p-5';
const namedFileOnly = (type: string) => [...planTypes, 'CATALOGO_DIAGNOSTICO_FISICO_LEGAL'].includes(type);
const optionalFolders = [
  { section: 'cargas', configKey: 'cargas', label: 'Requiere saneamiento físico legal' },
  { section: 'planos', configKey: 'planos', label: 'Incluir planos' },
  { section: 'catalogo', configKey: 'catalogoDiagnostico', label: 'Incluir catálogo y diagnóstico físico legal' },
] as const;
const stateLabels = { completo: 'Completo', pendiente: 'Pendiente obligatorio', opcional: 'Opcional', no_aplica: 'No aplica' };


export default function TransactionDossier({ propertyId, operation, view, section, showHeading = true, readOnly = false, files, uploadReady, administrator, onChanged, onBusyChange, onDirtyChange }: {
  readOnly?: boolean; propertyId: number; operation: string; view: View; section?: string; showHeading?: boolean; files: DossierFile[]; uploadReady: boolean; administrator: boolean;
  onChanged: () => Promise<void>; onBusyChange: (value: boolean) => void; onDirtyChange: (value: boolean) => void;
}) {
  const [liquidationSide, setLiquidationSide] = useState<'owner' | 'counterparty' | null>(null);
  const [liquidationPending, setLiquidationPending] = useState(false);
  const [minuteOpen, setMinuteOpen] = useState<DocumentEditorKind | null>(null);
  const [minutePending, setMinutePending] = useState(false);
  const [wordSource, setWordSource] = useState<{ url: string; name: string; category: 'CARTA' | typeof INTERMEDIATION_TYPE; draft?: boolean } | null>(null);
  const [wordPending, setWordPending] = useState(false);
  const [promptKind, setPromptKind] = useState<'plano' | 'intermediacion' | null>(null);
  const [promptPending, setPromptPending] = useState(false);
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
  const [editObservation, setEditObservation] = useState('');
  const [selected, setSelected] = useState<{ file: File; name: string; description: string }[]>([]);
  const [category, setCategory] = useState('');
  const [observation, setObservation] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState('LEVANTAMIENTO_CARGAS');
  const [activeFolder, setActiveFolder] = useState('');
  const [folderEdit, setFolderEdit] = useState<{ id: string; nombre: string } | null>(null);
  const folderView = view === 'carpeta' && section === 'cargas';
  const currentFolder = config.saneamiento.folders.find(folder => folder.id === activeFolder);
  const folderId = currentFolder?.id || '';

  const dirty = !!record && JSON.stringify(config) !== JSON.stringify(record.config);
  const pending = promptPending || wordPending || minutePending || liquidationPending || dirty || selected.length > 0 || editing !== null || folderEdit !== null;
  useLayoutEffect(() => { onDirtyChange(pending); }, [pending, onDirtyChange]);
  const status = dossierStatus(config, files, operation);
  const closing = dossierClosureStatus(config, files, operation);
  const url = `/api/inmuebles/${propertyId}/expediente`;
  const fileUrl = `/api/inmuebles/${propertyId}/archivos`;
  const load = useCallback(async (signal?: AbortSignal, preserveFeedback = false) => {
    setLoading(true);
    try {
      const data = await requestJson<RecordData>(url, { signal });
      if (!signal?.aborted) { setRecord(data); setConfig(data.config); if (!preserveFeedback) setError(''); }
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No se pudo cargar el expediente.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [url]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load]);
  function changeConfig(next: React.SetStateAction<Config>) { setConfig(next); setMessage(''); setError(''); }
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
  async function organizeFolder(action: Record<string, unknown>) {
    if (!record || readOnly || busy || dirty || selected.length || editing) return;
    working(true); setError(''); setMessage('');
    try {
      const next = await requestJson<RecordData>(`/api/inmuebles/${propertyId}/saneamiento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...action, version: record.version }) });
      setRecord(next); setConfig(next.config); setFolderEdit(null);
      if (action.action === 'create') {
        const created = next.config.saneamiento.folders.find(folder => !config.saneamiento.folders.some(previous => previous.id === folder.id));
        if (created) setActiveFolder(created.id);
      }
      await onChanged(); setMessage('Organización de saneamiento guardada.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo organizar la carpeta.'); }
    finally { working(false); }
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (busy || dirty || !category || !selected.length || !record) return;
    working(true); setError(''); setMessage('');
    let uploaded = 0;
    try {
      for (const entry of selected) validateExtraDocumentDescription(category, entry.description);
      for (const entry of selected) {
        const limit = documentByteLimit(category);
        if (!isImageFile(entry.file) && entry.file.size > limit) throw Error(`${entry.name}: el archivo supera ${limit / 1048576} MB.`);
        const file = isImageFile(entry.file) ? await compressImage(entry.file) : await readUploadFile(entry.file);
        if (file.size > limit) throw Error(`${entry.name}: el archivo supera ${limit / 1048576} MB.`);
        if (file.size > 4 * 1024 * 1024) {
          const endpoint = `${fileUrl}/copia-literal`;
          const authorization = await requestJson<{token: string; uploadUrl: string}>(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prepare', filename: file.name, size: file.size, nombre: entry.name.trim(), observacion: namedFileOnly(category) ? '' : isSectionExtraDocument(category) || isSaneamientoType(category) ? entry.description.trim() : observation, type: category, subcarpetaId: folderView ? folderId : '' }) });
          try {
            const response = await fetch(authorization.uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${authorization.token}`, 'Content-Type': 'application/octet-stream' }, body: file, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(25 * 60000) });
            if (!response.ok && response.status !== 409) throw Error('No se pudo subir el documento.');
            await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', token: authorization.token }) });
            uploaded++;
          } catch (error) {
            await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', token: authorization.token }) }).catch(() => undefined);
            if (error instanceof TypeError) throw Error('No se pudo conectar con el servidor de documentos. Comprueba tu conexión y que este dominio esté autorizado para subir documentos.');
            throw error;
          }
          continue;
        }
        const body = new FormData();
        body.set('archivo', file); body.set('nombre', entry.name.trim()); body.set('tipoDocumento', category); body.set('observacion', namedFileOnly(category) ? '' : isSectionExtraDocument(category) || isSaneamientoType(category) ? entry.description.trim() : observation);
        if (folderView && folderId) body.set('subcarpetaId', folderId);
        await requestJson(fileUrl, { method: 'POST', body }); uploaded++;
      }
      setObservation(''); setMessage(`${uploaded} archivo${uploaded === 1 ? '' : 's'} guardado${uploaded === 1 ? '' : 's'}.`);
    } catch (e) { setError(`${e instanceof TypeError ? 'No se pudo enviar el archivo desde este navegador. Comprueba la conexión y vuelve a seleccionar el PDF desde Descargas de tu celular.' : e instanceof Error ? e.message : 'No se pudo subir.'}${uploaded ? ` ${uploaded} archivo(s) ya se guardaron; solo quedan los pendientes.` : ''}`); }
    finally {
      setSelected(previous => previous.slice(uploaded));
      if (uploaded) { await onChanged(); if (folderView) await load(undefined, true); }
      working(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    working(true); setError(''); setMessage('');
    try { await requestJson(`${fileUrl}?archivoId=${deleting.id}`, { method: 'DELETE' }); await onChanged(); if (isSaneamientoType(deleting.tipoDocumento)) await load(); setDeleting(null); setMessage('Archivo eliminado. Estado del expediente actualizado.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar.'); }
    finally { working(false); }
  }
  async function rename(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    working(true); setError(''); setMessage('');
    try {
      validateExtraDocumentDescription(editType, editObservation);
      await requestJson(fileUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivoId: editing.id, nombre: editName, tipoDocumento: editType, observacion: namedFileOnly(editType) ? editing.observacion || '' : editObservation }) });
      setEditing(null); await onChanged(); if (isSaneamientoType(editing.tipoDocumento)) await load(); setMessage('Documento actualizado.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    finally { working(false); }
  }
  function renderFile(file: DossierFile) {
    const spacious = view !== 'estado';
    const editLetter = file.tipoDocumento === 'CARTA' && file.almacenamiento === 'hosting' && /\.docx$/i.test(file.nombreOriginal || '');
    const editContract = dossierDocumentType(file.tipoDocumento, operation) === INTERMEDIATION_TYPE
      && file.almacenamiento === 'hosting'
      && (file.tipoMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(file.nombreOriginal || file.nombre));
    const editWord = (category: 'CARTA' | typeof INTERMEDIATION_TYPE) => setWordSource({
      url: `${fileUrl}/${file.id}`, name: `${file.nombre.replace(/\.docx$/i, '')} - copia`, category,
    });
    const secondaryActions = <>{editLetter && !readOnly && <button type="button" className={action} disabled={busy || pending} onClick={() => editWord('CARTA')}>Editar copia en Word</button>}{isSaneamientoType(file.tipoDocumento) && <label className={spacious ? "flex w-full min-w-0 flex-col gap-2 text-xs font-semibold sm:max-w-sm" : "text-xs"}>Mover a<select aria-label={`Ubicación de ${file.nombre}`} value={config.saneamiento.files[String(file.id)] || ''} disabled={readOnly || busy || dirty || selected.length > 0 || editing !== null || folderEdit !== null} onChange={event => void organizeFolder({ action: 'move', fileId: file.id, folderId: event.target.value })} className={spacious ? "w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" : "ml-2 rounded-lg border border-slate-300 bg-white p-2 text-sm"}><option value="">Carpeta principal</option>{config.saneamiento.folders.map(folder => <option key={folder.id} value={folder.id}>{folder.nombre}</option>)}</select></label>}<button type="button" aria-expanded={editing?.id === file.id} aria-controls={`file-edit-${file.id}`} disabled={readOnly || busy || dirty || folderEdit !== null || selected.length > 0 || (editing !== null && editing.id !== file.id)} onClick={() => { if (editing?.id === file.id) { setEditing(null); return; } setEditing(file); setEditName(file.nombre); setEditObservation(file.observacion || (operation !== 'alquiler' && file.tipoDocumento === 'CONTRATO_ALQUILER' ? 'Contrato de alquiler conservado del expediente anterior.' : '')); const normalized = dossierDocumentType(file.tipoDocumento, operation); setEditType(status.items.find(item => item.key === normalized)?.applies ? normalized : ''); }} className={action}>Editar datos del archivo</button>{administrator && !readOnly && <button type="button" disabled={busy || dirty || folderEdit !== null || selected.length > 0 || editing !== null} onClick={() => setDeleting(file)} className="aa-button aa-button-secondary text-red-700">Eliminar</button>}</>;
    return <article key={file.id} className={spacious ? 'mt-4 flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4' : 'mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3'}>
      <div className="flex min-w-0 flex-1 items-start gap-2"><WorkspaceFileIcon name={file.nombreOriginal || file.nombre} /><div className="min-w-0"><p className="break-words text-sm font-semibold">{file.nombre}</p>{spacious && folderView && <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{isSectionExtraDocument(file.tipoDocumento) ? 'Otros documentos' : 'Saneamiento'}</span>}<p className="mt-1 break-words text-xs text-slate-500">{file.nombreOriginal}{file.tamanoBytes ? ` · ${Math.ceil(file.tamanoBytes / 1024)} KB` : ''}</p>{!file.observacion && operation !== 'alquiler' && file.tipoDocumento === 'CONTRATO_ALQUILER' && <p className="mt-1 text-xs">Contrato de alquiler conservado del expediente anterior.</p>}{file.observacion && <p className="mt-1 whitespace-pre-wrap break-words text-xs">{file.observacion}</p>}{file.almacenamiento !== 'hosting' && <p className="mt-1 text-xs text-amber-800">Enlace anterior: sube el archivo para completar este requisito.</p>}</div></div>
      <div className={spacious ? "flex min-w-0 flex-wrap items-end gap-2 [&>button]:max-w-full [&>button]:whitespace-normal" : "flex flex-wrap gap-2"}><button type="button" onClick={() => setViewer(file)} className={action}>Ver archivo</button>{file.almacenamiento === 'hosting' && <a href={`${file.enlace}?download=1`} className={action}>Descargar</a>}{editContract && !readOnly && <button type="button" className={action} disabled={busy || pending} onClick={() => editWord(INTERMEDIATION_TYPE)}>Editar contrato en Word</button>}{spacious && !readOnly ? <details className="min-w-0 basis-full sm:basis-auto"><summary className="cursor-pointer text-sm font-semibold text-slate-600">Más acciones</summary><div className="mt-3 flex min-w-0 flex-wrap items-end gap-3">{secondaryActions}</div></details> : !spacious ? secondaryActions : null}</div>
      {editing?.id === file.id && <div id={`file-edit-${file.id}`} className="basis-full rounded-xl border border-blue-200 bg-blue-50 p-4"><form onSubmit={event => void rename(event)} className="space-y-3"><h4 className="font-bold">Editar datos del archivo: {editing.nombre}</h4><label className="block text-sm">Nombre<input required maxLength={255} value={editName} disabled={busy} onChange={event => setEditName(event.target.value)} className={field} /></label><label className="block text-sm">Categoría<select required disabled={busy || dirty} value={editType} onChange={event => setEditType(event.target.value)} className={field}><option value="">Seleccionar</option>{status.items.filter(item => item.applies && (!editing.tamanoBytes || editing.tamanoBytes <= documentByteLimit(item.key))).map(item => <option key={item.key} value={item.key}>{status.sections.find(section => section.key === item.section)?.label} · {item.party} · {item.label}</option>)}</select></label>{!namedFileOnly(editType || editing.tipoDocumento) && <label className="block text-sm">{isSectionExtraDocument(editType) ? 'Descripción breve' : 'Observación opcional'}<textarea required={isSectionExtraDocument(editType)} rows={2} maxLength={500} value={editObservation} disabled={busy} onChange={event => setEditObservation(event.target.value)} className={field} /></label>}<button disabled={busy || dirty} className={saveAction}>Guardar cambios</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="aa-button aa-button-secondary ml-2">Cancelar edición</button></form></div>}
    </article>;
  }
  function renderRentaConditions() {
    return <fieldset disabled={readOnly || busy || selected.length > 0 || editing !== null || folderEdit !== null} className="space-y-4 rounded-xl border border-red-200 bg-white p-4">
      <legend className="px-2 text-sm font-bold">Condiciones del vendedor</legend>
      {renderSaleConditions('vendedor')}
      <p className="text-xs text-slate-600">El tipo de persona se comparte con 1. DNI y poderes. Al guardar aquí o allí, se actualiza en ambas carpetas.</p>
      <label className="block text-sm font-semibold">Impuesto a la renta<select value={config.renta} onChange={event => changeConfig(old => ({ ...old, renta: event.target.value }))} className={field}><option value="pendiente">Seleccionar</option><option value="afecto">Si paga</option><option value="exonerado">No paga</option></select></label>
      {config.renta === 'afecto' && <label className="block text-sm font-semibold">Observación: ¿por qué paga impuesto a la renta?<textarea required rows={3} maxLength={2000} value={config.rentaObservacion} onChange={event => changeConfig(old => ({ ...old, rentaObservacion: event.target.value }))} className={field} /><span className="mt-1 block text-xs font-normal text-slate-600">Obligatoria para guardar esta condición. Explica el motivo por el que corresponde pagar.</span></label>}
      {config.renta === 'exonerado' && <p className="text-xs text-slate-500">{config.vendedorTipo ? 'Adjunta exoneración y búsqueda nacional por separado.' : 'Selecciona el tipo de persona del vendedor para habilitar Búsqueda nacional.'}</p>}
      {config.renta === 'pendiente' && <p className="text-sm text-slate-600">Selecciona si paga o no paga para completar el sustento correspondiente.</p>}
    </fieldset>;
  }
  function renderUpload(item: ReturnType<typeof dossierStatus>['items'][number]) {
    return <div className="mt-3 space-y-3">
        {['VENDEDOR_LIQUIDACION', 'COMPRADOR_LIQUIDACION', 'ARRENDADOR_LIQUIDACION', 'ARRENDATARIO_LIQUIDACION'].includes(item.key) && <div className="rounded-xl border border-red-100 bg-red-50/40 p-4"><p className="text-sm font-semibold">Prepara la liquidación aquí</p><p className="mt-1 text-xs leading-5 text-slate-600">Reutiliza los datos del expediente, organiza conceptos y genera un Excel o PDF con el logo. El archivo se adjunta automáticamente.</p><button type="button" className="aa-button aa-button-primary mt-3" disabled={busy || dirty || selected.length > 0 || editing !== null} onClick={() => setLiquidationSide(['VENDEDOR_LIQUIDACION', 'ARRENDADOR_LIQUIDACION'].includes(item.key) ? 'owner' : 'counterparty')}>Generar liquidación</button></div>}
        {!uploadReady && <p role="status" className="text-sm text-amber-800">La subida no está disponible. Consulta al administrador.</p>}
        <FileDropZone subdued label={`Archivos: ${item.party === 'inmueble' ? '' : item.party + ' · '}${item.label}`} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" help="PDF, Word, Excel, JPG, PNG o WebP. Las imágenes se comprimen."
          inputRef={{ current: null }} disabled={busy || dirty || !uploadReady || (selected.length > 0 && category !== item.key) || editing !== null || folderEdit !== null}
          onFiles={files => { setError(''); setMessage(''); setCategory(item.key); setSelected(files.map(file => ({ file, name: file.name.replace(/\.[^.]+$/, '').slice(0, 255), description: '' }))); }} onRejected={setError} />
        {category === item.key && selected.length > 0 && <form aria-label={`Subir archivos: ${item.party === 'inmueble' ? '' : item.party + ' · '}${item.label}`} onSubmit={event => void upload(event)} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h6 className="text-sm font-bold">{folderView ? `${selected.length} archivo(s) para ${currentFolder?.nombre || 'Carpeta principal'}` : `Confirmar archivos de ${item.label.toLowerCase()}`}</h6>
          <fieldset disabled={readOnly || busy || dirty || !uploadReady} className="space-y-3">
            {selected.map((entry, index) => <div key={`${entry.file.name}-${index}`} className="space-y-3">
              <label className="block text-sm font-semibold">Nombre del archivo {index + 1}<input required maxLength={255} value={entry.name} onChange={event => setSelected(old => old.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} className={field} /><span className="mt-1 block break-words text-xs font-normal">{entry.file.name}</span></label>
              {(isSectionExtraDocument(item.key) || isSaneamientoType(item.key)) && <details open={isSectionExtraDocument(item.key) || undefined}><summary className="cursor-pointer text-sm font-semibold">{isSectionExtraDocument(item.key) ? 'Descripción obligatoria' : 'Agregar descripción (opcional)'}</summary><label className="mt-2 block text-sm">Descripción del archivo {index + 1}<textarea required={isSectionExtraDocument(item.key)} rows={2} maxLength={500} value={entry.description} onChange={event => setSelected(old => old.map((value, i) => i === index ? { ...value, description: event.target.value } : value))} className={field} /><span className="mt-1 block text-xs font-normal text-slate-600">Máximo 500 caracteres.</span></label></details>}
            </div>)}
            {!namedFileOnly(item.key) && !isSectionExtraDocument(item.key) && !isSaneamientoType(item.key) && <details><summary className="min-h-8 cursor-pointer text-sm text-slate-600">Agregar observación (opcional)</summary><label className="mt-2 block text-sm">Observación del archivo<textarea maxLength={500} value={observation} onChange={event => setObservation(event.target.value)} className={field} /></label></details>}
            <div className="flex flex-wrap gap-2"><button type="submit" className={saveAction}>{busy ? 'Subiendo…' : 'Subir archivos'}</button><button type="button" onClick={() => { setSelected([]); setCategory(''); setObservation(''); }} className={action}>Cancelar selección</button></div>
          </fieldset>
        </form>}
      </div>;
  }
  function renderSearchNote(item: ReturnType<typeof dossierStatus>['items'][number]) {
    if (!item.key.endsWith('_BUSQUEDA_NACIONAL') || !item.applies || readOnly || (item.party === 'vendedor' && config.renta === 'exonerado')) return null;
    const noteKey = item.party === 'vendedor' ? 'vendedorBusquedaNota' : 'compradorBusquedaNota';
    return <details open={config[noteKey] ? true : undefined} className="mt-3"><summary className="min-h-8 cursor-pointer text-sm text-slate-600">Agregar nota si no adjuntas búsqueda nacional</summary><label className="mt-2 block text-sm">Nota de búsqueda nacional del {item.party}<textarea aria-label={`Nota de búsqueda nacional del ${item.party}`} disabled={busy || selected.length > 0 || editing !== null || folderEdit !== null} rows={3} maxLength={2000} value={config[noteKey]} onChange={event => changeConfig(old => ({ ...old, [noteKey]: event.target.value }))} className={field} /><span className="mt-1 block text-xs text-slate-500">Obligatoria cuando no hay archivo durante la preparación. Para cerrar la operación se requiere el documento.</span></label></details>;
  }
  function renderIntermediationModels(operation: 'venta' | 'alquiler') {
    return <IntermediationModels propertyId={propertyId} operation={operation} disabled={busy || pending}
      onBusy={working} onEdit={source => setWordSource({ ...source, category: INTERMEDIATION_TYPE, draft: true })} />;
  }
  function renderDocumentItem(item: ReturnType<typeof dossierStatus>['items'][number]) {
    const groupedPlan = item.section === 'planos' && item.key !== planTypes[0];
    const planNumber = item.key === planTypes[0] ? '8.1 ' : item.key === planTypes[1] ? '8.2 ' : '';
    const editorKind = documentEditorForCategory(item.key, operation);
    const editorConfig = editorKind ? documentEditorConfig(editorKind, operation) : null;
    const heading = contractHeadings[item.key] ?? item.label;
    const showEditorDescription = operation !== 'alquiler' && editorKind !== 'intermediation-structure';
    const minuteEditor = editorKind && editorConfig && (
      <section className="my-4 rounded-xl border border-red-100 bg-red-50/40 p-4">
        {showEditorDescription && <>
          <h6 className="font-semibold">Documento editable</h6>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {editorKind === 'promise-contract' ? 'Edita las cláusulas, incorpora los comprobantes y genera el PDF.' : 'Prepara la estructura y genera el PDF de entrega.'}
          </p>
        </>}
        <button type="button" className={showEditorDescription ? 'aa-button aa-button-primary mt-3' : 'aa-button aa-button-primary'}
          disabled={busy || dirty || selected.length > 0 || editing !== null} onClick={() => setMinuteOpen(editorKind)}>
          {readOnly ? editorKind === 'promise-contract' ? 'Consultar texto del contrato' : 'Consultar texto de la estructura' : editorConfig.open}
        </button>
      </section>
    );
    return <div key={item.key} data-document-type={item.key} className={`min-w-0 transition-colors ${groupedPlan ? 'p-4' : 'rounded-xl border bg-white p-4'} ${selected.length > 0 && category === item.key ? 'border-red-400 ring-1 ring-red-100' : 'border-red-200'}`}><div className="flex flex-wrap items-start justify-between gap-2"><h5 className="font-semibold">{planNumber}{heading}{item.party !== 'inmueble' && <span className="ml-2 text-sm font-normal capitalize text-slate-500">· {item.party}</span>}</h5><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.state === 'pendiente' ? 'bg-amber-100 text-amber-900' : item.state === 'completo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{isSectionExtraDocument(item.key) ? 'Opcional' : stateLabels[item.state as keyof typeof stateLabels]}</span></div>{item.key === 'VENDEDOR_BUSQUEDA_NACIONAL' && config.renta === 'exonerado' && <p className="mt-2 text-xs text-slate-600">Documento sustentatorio de que el vendedor no paga impuesto a la renta.</p>}{isSectionExtraDocument(item.key) && <p className="mt-2 text-sm text-slate-600">Documentos adicionales con nombre y descripción. No completan requisitos de cierre.</p>}{item.key === 'COPIA_LITERAL_CRI' && <p className="mt-2 text-xs text-slate-600">Basta con uno de los dos documentos.</p>}{!item.applies && item.party === 'vendedor' && item.section === 'identificacion' && <p className="mt-2 text-xs text-slate-600">Carga bloqueada para las condiciones seleccionadas. Los archivos existentes se conservan.</p>}{readOnly && ['VENDEDOR_LIQUIDACION','COMPRADOR_LIQUIDACION','ARRENDADOR_LIQUIDACION','ARRENDATARIO_LIQUIDACION'].includes(item.key) && <button className={action} onClick={() => setLiquidationSide(['VENDEDOR_LIQUIDACION','ARRENDADOR_LIQUIDACION'].includes(item.key)?'owner':'counterparty')}>Consultar liquidaciones</button>}{item.note && <p className="mt-2 whitespace-pre-wrap text-sm">Nota: {item.note}</p>}{minuteEditor}{item.key === planTypes[2] && <a className="aa-button aa-button-secondary mt-3" href={referencePlanModelUrl} download>Descargar modelo referencial (PDF)</a>}{item.key === 'CARTA' && !readOnly && <button type="button" className="aa-button aa-button-primary mt-3" disabled={busy || pending} onClick={() => setWordSource({ url: '/api/cartas/modelo', name: 'Carta de propuesta', category: 'CARTA' })}>Crear carta desde modelo</button>}{item.documents.filter(file => !folderView || (config.saneamiento.files[String(file.id)] || '') === folderId).map(file => renderFile(file as DossierFile))}{renderSearchNote(item)}{!readOnly && item.applies && renderUpload(item)}</div>;
  }
  function renderPreviousDocuments(items: ReturnType<typeof dossierStatus>['items']) {
    if (!items.length) return null;
    return <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="min-h-8 cursor-pointer text-sm font-semibold text-slate-600">Documentos anteriores ({items.reduce((total, item) => total + item.documents.length, 0)})</summary>
      <div className="mt-3 space-y-4">{items.map(item => <section key={item.key}><h5 className="text-sm font-semibold">{item.label}</h5>{item.documents.map(file => renderFile(file as DossierFile))}</section>)}</div>
    </details>;
  }
  function documentVisible(item: ReturnType<typeof dossierStatus>['items'][number]) {
    if (!item.applies) return false;
    if (['VENDEDOR_FORMULARIO_RENTA', 'VENDEDOR_VOUCHER_RENTA'].includes(item.key)) return config.renta === 'afecto';
    return true;
  }
  const rental = operation === 'alquiler';
  const naturalSeller = !rental && config.vendedorTipo === 'natural';
  function renderNaturalIdentification(party: 'vendedor' | 'comprador') {
    const seller = party === 'vendedor';
    const prefix = party.toUpperCase();
    const compositionKey = seller ? 'vendedorPropietarios' : 'compradorComposicion';
    const regimeKey = seller ? 'vendedorRegimen' : 'compradorRegimen';
    const representativeKey = seller ? 'vendedorRepresentante' : 'compradorRepresentante';
    const personSelected = config[compositionKey] !== 'pendiente';
    const married = config[compositionKey] === 'matrimonio';
    const locked = readOnly || busy || selected.length > 0 || editing !== null || folderEdit !== null;
    const documents = (...keys: string[]) => status.items.filter(item => keys.includes(item.key) && item.applies).map(renderDocumentItem);
    return <section aria-label={`Identificación del ${party} persona natural`} className="space-y-5">
      <label className="block text-sm font-semibold">2.- Estado civil del {party}<select disabled={locked} value={config[compositionKey]} onChange={event => changeConfig(old => ({ ...old, [compositionKey]: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="uno">Soltero</option><option value="matrimonio">Casado</option>{seller && <><option value="divorciado">Divorciado</option><option value="viudo">Viudo</option></>}<option value="varios">{seller ? 'Varios vendedores' : 'Varios compradores'}</option></select></label>
      {married && <label className="block text-sm font-semibold">3.- Régimen patrimonial del {party}<select disabled={locked} value={config[regimeKey]} onChange={event => changeConfig(old => ({ ...old, [regimeKey]: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="comunes">Sociedad conyugal</option><option value="separados">Separación de bienes</option></select></label>}
      <section aria-label={`Documentos del ${party}`} className="space-y-4 border-t border-slate-100 pt-5">
        <h5 className="font-semibold">4.- Documentos</h5>
        {!personSelected ? <p className="text-sm text-slate-500">Selecciona el estado civil o la agrupación para mostrar los documentos correspondientes.</p> : <>
          {seller && !(married && config.vendedorRegimen === 'separados') && <label className="block text-sm font-semibold">Excepción de firma del cónyuge<select disabled={locked} value={config.vendedorExcepcionConyuge} onChange={event => changeConfig(old => ({ ...old, vendedorExcepcionConyuge: event.target.value }))} className={field}><option value="ninguna">Sin excepción</option><option value="compra_soltero">Adquirió el inmueble antes de casarse</option><option value="herencia">Adquirió el inmueble por sucesión intestada o herencia</option></select></label>}
          <p className="text-xs text-slate-500">Puedes reunir los DNI en un PDF o adjuntarlos por separado.</p>
          {documents(`${prefix}_DNI`, `${prefix}_PARTIDA_MATRIMONIAL`, `${prefix}_SEPARACION_PATRIMONIAL`, ...(seller ? ['VENDEDOR_COMPRA_SOLTERO', 'VENDEDOR_HERENCIA'] : []))}
          <section aria-label={seller ? 'Representación del propietario' : 'Representación del comprador'} className="space-y-4 border-t border-slate-100 pt-5">
            <h6 className="font-semibold">Representación</h6>
            <label className="block text-sm font-semibold">{seller ? '¿Algún propietario firma mediante representante?' : '¿Algún comprador firma mediante representante?'}<select disabled={locked} value={config[representativeKey]} onChange={event => changeConfig(old => ({ ...old, [representativeKey]: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="si">Sí</option><option value="no">No, todos firman personalmente</option></select></label>
            {config[representativeKey] === 'si' && <p className="text-xs text-slate-500">Indica en el archivo a qué {seller ? 'propietario' : 'comprador'} representa.</p>}
            {documents(`${prefix}_PODER`, `${prefix}_VIGENCIA_PODER`)}
          </section>
        </>}
      </section>
    </section>;
  }
  function renderSaleConditions(party: string, numbered = false) {
    return <fieldset disabled={readOnly || busy || selected.length > 0 || editing !== null || folderEdit !== null} className="min-w-0 space-y-4">
      <legend className="sr-only">Condiciones del {party}</legend>
      {party === 'comprador' && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={config.compradorAsignado} onChange={event => changeConfig(old => ({ ...old, compradorAsignado: event.target.checked }))} className="mt-1 h-4 w-4" /><span>Asignar comprador para preparar el cierre.</span></label>}
      {(party === 'vendedor' || config.compradorAsignado) && <label className="block text-sm font-semibold">{numbered ? '1.- ' : ''}Tipo de persona del {party}<select value={party === 'vendedor' ? config.vendedorTipo : config.compradorTipo} onChange={event => changeConfig(old => ({ ...old, [`${party}Tipo`]: event.target.value }))} className={field}><option value="">Seleccionar</option><option value="natural">Persona natural</option><option value="juridica">Persona jurídica</option></select></label>}
    </fieldset>;
  }
  function renderIdentificationParty(party: string) {
    const active = status.items.filter(item => item.section === 'identificacion' && item.party === party && item.applies && !isSectionExtraDocument(item.key));
    const previous = status.items.filter(item => item.section === 'identificacion' && item.party === party && item.documents.length > 0 && (!item.applies || (party === 'vendedor' && naturalSeller && config.vendedorPropietarios === 'pendiente') || (party === 'comprador' && config.compradorTipo === 'natural' && config.compradorComposicion === 'pendiente')));
    return <section key={party} aria-label={`Documentación del ${party}`} className={identificationPanel}>
      <h4 className="font-bold capitalize text-slate-800">{party}</h4>
      {renderSaleConditions(party, true)}
      {party === 'vendedor' && naturalSeller ? renderNaturalIdentification('vendedor') : party === 'comprador' && config.compradorAsignado && config.compradorTipo === 'natural' ? renderNaturalIdentification('comprador') : active.length > 0 ? <section aria-label={`Documentos del ${party}`} className="space-y-4"><h5 className="font-semibold">4.- Documentos</h5>{active.map(renderDocumentItem)}</section> : null}

      {previous.length > 0 && <details className="border-t border-slate-100 pt-3"><summary className="min-h-8 cursor-pointer text-sm text-slate-600">Documentos anteriores ({previous.reduce((total, item) => total + item.documents.length, 0)})</summary><div className="mt-3 space-y-3">{previous.map(item => <section key={item.key}><h5 className="text-sm font-semibold">{item.label}</h5>{item.documents.map(file => renderFile(file as DossierFile))}</section>)}</div></details>}
    </section>;
  }
  const party = view === 'vendedor' ? rental ? 'arrendador' : 'vendedor' : view === 'comprador' ? rental ? 'arrendatario' : 'comprador' : null;
  const visible = status.items.filter(item => view === 'carpeta' ? item.section === section : view === 'estado' || (view === 'inmueble' ? item.party === 'inmueble' : item.party === party));
  const locationFiles = files.filter(file => isSaneamientoType(file.tipoDocumento) && (config.saneamiento.files[String(file.id)] || '') === folderId);
  const unknown = files.filter(file => !status.items.some(def => def.key === dossierDocumentType(file.tipoDocumento, operation)));
  if (loading) return <p role="status" className="p-4">Consultando expediente…</p>;
  if (!record) return <div role="alert"><p>{error}</p><button type="button" onClick={() => void load()} className="aa-button aa-button-secondary mt-3">Reintentar</button></div>;
  return <div className="space-y-5">{readOnly && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">Expediente cerrado y protegido. Puedes consultar y descargar sus documentos; sus archivos y condiciones se conservan.</p>}
    {liquidationSide && <LiquidationEditor propertyId={propertyId} initialSide={liquidationSide} onClose={() => { setLiquidationSide(null); setLiquidationPending(false); }} onChanged={onChanged} onPending={setLiquidationPending} onBusy={onBusyChange} />}
    {promptKind && <ReferencePlanPrompt key={promptKind} kind={promptKind} propertyId={propertyId} operation={operation}
      onPending={setPromptPending} onClose={() => { setPromptKind(null); setPromptPending(false); }} />}
    {wordSource && <LetterEditor source={wordSource.url}
      onSave={wordSource.draft ? async file => { await saveIntermediationWord(wordSource.url, file); } : undefined} name={wordSource.name} contract={wordSource.category === INTERMEDIATION_TYPE} uploadReady={uploadReady} onPending={setWordPending}
      onClose={() => { setWordSource(null); setWordPending(false); }}
      onAttach={file => {
        setCategory(wordSource.category);
        setSelected([{ file, name: file.name.replace(/\.docx$/i, ''), description: '' }]);
        setObservation('');
        setError('');
        setMessage('');
        setWordSource(null);
        setWordPending(false);
      }} />}
    {minuteOpen && <MinuteTextEditor key={minuteOpen} kind={minuteOpen} operation={operation} propertyId={propertyId} files={files} readOnly={readOnly} uploadReady={uploadReady} onClose={() => { setMinuteOpen(null); setMinutePending(false); }} onChanged={onChanged} onPending={setMinutePending} onBusy={onBusyChange} />}
    {(showHeading || view !== 'carpeta') && <div>{showHeading && <h3 className="text-lg font-bold">{view === 'carpeta' ? status.sections.find(item => item.key === section)?.label || 'Otros archivos conservados' : view === 'estado' ? 'Estado del expediente' : party ? `Documentación del ${party}` : 'Documentación del inmueble'}</h3>}<p className="mt-2 text-sm text-slate-600">{rental ? 'Expediente de alquiler: arrendador, arrendatario y documentación de la operación. Las carpetas adicionales son opcionales.' : 'Expediente de venta: vendedor, comprador, inmueble, contratos e impuestos.'} Los pendientes se muestran en el seguimiento de esta operación.</p></div>}
    {error && !dirty && <p role="alert" className="whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

    {rental && view === 'carpeta' && section === 'impuestos' && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Documentación tributaria y constancias de esta operación de alquiler, cuando corresponda. Los adjuntos son opcionales.</p>}
    {view === 'estado' && <>
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm">{closing.complete ? 'Todos los documentos obligatorios aplicables están cargados para el cierre.' : `Para cerrar, completa los documentos obligatorios y sus condiciones. Pendiente: ${closing.missing.join('; ')}. Las notas admitidas durante la preparación no sustituyen los archivos requeridos para cerrar.`}</p>
      <div className={`rounded-2xl border p-5 ${status.complete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="text-lg font-bold">{status.complete ? 'Expediente completo' : 'Expediente con pendientes'}</p><p className="mt-2 text-sm">{status.completed} de {status.total} requisitos documentales aplicables completos · {status.percent}%</p><progress aria-label="Avance documental" value={status.completed} max={status.total || 1} className="mt-3 h-3 w-full accent-red-700" />{dirty && <p className="mt-2 text-xs">Vista previa de condiciones sin guardar.</p>}{status.alerts.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{status.alerts.map(alert => <li key={alert}>{alert}</li>)}</ul>}</div>
      <div className="grid gap-3 sm:grid-cols-2">{status.sections.map(section => <div key={section.key} className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold">{section.label}</h4><p className="mt-2 text-sm">{section.total ? `${section.completed} de ${section.total} completos · ${section.pending} pendientes` : 'Sin requisitos obligatorios aplicables'}</p></div>)}</div>
      <section><h4 className="font-bold">Documentos obligatorios pendientes</h4><ul className="mt-3 space-y-2">{status.items.filter(item => item.state === 'pendiente').map(item => <li key={item.key} className="rounded-lg bg-amber-50 p-3 text-sm"><span className="font-semibold capitalize">{item.party}</span> · {item.label}</li>)}</ul>{!status.items.some(item => item.state === 'pendiente') && <p className="mt-2 text-sm">No hay archivos obligatorios pendientes para las condiciones seleccionadas.</p>}</section>
    </>}
    {rental && (view === 'estado' || (view === 'carpeta' && section === 'identificacion') || view === 'vendedor' || view === 'comprador') && <fieldset disabled={readOnly || busy || selected.length > 0 || editing !== null || folderEdit !== null} className="space-y-4 rounded-2xl border border-slate-200 p-4">
      <legend className="px-2 font-bold">Condiciones de las partes del alquiler</legend>
      <p className="text-sm text-slate-600">Selecciona el tipo de persona de cada parte de forma independiente. El arrendador y el arrendatario pueden ser de tipos distintos.</p>
      {(['arrendador', 'arrendatario'] as const).map(party => <section key={party} aria-label={`Condiciones del ${party}`} className="space-y-4 rounded-xl bg-slate-50 p-4">
        <h4 className="font-bold capitalize">{party}</h4>
        <label className="block text-sm font-semibold">Tipo de persona del {party}<select value={config[`${party}Tipo`]} onChange={event => changeConfig(old => ({ ...old, [`${party}Tipo`]: event.target.value }))} className={field}><option value="">Seleccionar</option><option value="natural">Persona natural</option><option value="juridica">Persona jurídica</option></select></label>
        {config[`${party}Tipo`] === 'natural' && <label className="block text-sm font-semibold">¿El {party} firma mediante representante?<select value={config[`${party}Representante`]} onChange={event => changeConfig(old => ({ ...old, [`${party}Representante`]: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="no">No, firma personalmente</option><option value="si">Sí, mediante representante</option></select></label>}
        {config[`${party}Tipo`] === 'natural' && <p className="text-xs text-slate-600">Adjunta el DNI. Si firma mediante representante, adjunta también el poder y su vigencia.</p>}
        {config[`${party}Tipo`] === 'juridica' && <p className="text-xs text-slate-600">Adjunta la ficha RUC, el DNI del gerente, el poder del gerente y la vigencia de poder del gerente.</p>}
      </section>)}
      <p className="text-xs text-slate-600">Los archivos anteriores se conservan aunque cambies el tipo de persona.</p>
      {dirty && <button type="button" onClick={() => void saveConfig()} className={conditionSave}>Guardar condiciones para adjuntar archivos</button>}
    </fieldset>}
    {!rental && view === 'carpeta' && section !== 'identificacion' && section !== 'impuestos' && !config.compradorAsignado && status.items.some(item => item.section === section && item.party === 'comprador') && <p role="status" className="text-xs text-slate-500">Asigna al comprador en 1. DNI y poderes para habilitar sus documentos.</p>}
    {optionalFolders.filter(item => view === 'inmueble' || (view === 'carpeta' && section === item.section)).map(item => <label key={item.section} className="flex items-start gap-3 rounded-xl border border-red-200 bg-white p-4 text-sm"><input type="checkbox" disabled={readOnly || busy || selected.length > 0 || editing !== null || folderEdit !== null} checked={config[item.configKey]} onChange={event => changeConfig(old => ({ ...old, [item.configKey]: event.target.checked }))} className="mt-1 h-4 w-4" /><span>{rental && item.section === 'cargas' ? 'Incluir saneamiento físico legal' : item.label}<span className="mt-1 block text-xs text-slate-600">{rental ? 'Opcional para alquiler. Guarda los cambios para habilitar la carga.' : 'Guarda los cambios para habilitar la carga.'}</span></span></label>)}
    {folderView && <section aria-label="Explorador de saneamiento" className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Ubicación en saneamiento" className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <button type="button" className="min-h-11 rounded-lg px-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50" disabled={busy || pending} onClick={() => { setActiveFolder(''); setUploadOpen(false); }}>📁 Saneamiento</button>
          {currentFolder && <><span aria-hidden="true">/</span><span className="min-w-0 break-words font-semibold" aria-current="page">{currentFolder.nombre}</span></>}
        </nav>
        {!readOnly && <div className="flex flex-wrap gap-2">
          {!currentFolder && <button type="button" className={action} disabled={busy || pending} onClick={() => { setUploadOpen(false); setFolderEdit({ id: '', nombre: '' }); }}>＋ Nueva subcarpeta</button>}
          <button type="button" className={saveAction} aria-expanded={uploadOpen} disabled={busy || pending || !config.cargas || !uploadReady} onClick={() => setUploadOpen(value => !value)}>↑ Subir archivos</button>
        </div>}
      </div>
      {currentFolder && !readOnly && <details className="text-sm"><summary className="cursor-pointer text-slate-600">Opciones de subcarpeta</summary><div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={action} disabled={busy || pending} onClick={() => { setUploadOpen(false); setFolderEdit({ ...currentFolder }); }}>Renombrar subcarpeta</button>
        <button type="button" className={action} disabled={busy || pending || files.some(file => isSaneamientoType(file.tipoDocumento) && config.saneamiento.files[String(file.id)] === folderId)} onClick={() => void organizeFolder({ action: 'delete', folderId })}>Eliminar subcarpeta vacía</button>
      </div></details>}
      {folderEdit && <form onSubmit={event => { event.preventDefault(); void organizeFolder({ action: folderEdit.id ? 'rename' : 'create', folderId: folderEdit.id, nombre: folderEdit.nombre }); }} className="space-y-3 rounded-xl bg-slate-50 p-4">
        <label className="block text-sm font-semibold">Nombre de la subcarpeta<input autoFocus required maxLength={120} disabled={busy} value={folderEdit.nombre} onChange={event => setFolderEdit(old => old ? { ...old, nombre: event.target.value } : null)} className={field} placeholder="Ej. Independización" /></label>
        <div className="flex flex-wrap gap-2"><button disabled={busy || dirty} className={saveAction}>{folderEdit.id ? 'Guardar nombre' : 'Crear subcarpeta'}</button><button type="button" disabled={busy} onClick={() => setFolderEdit(null)} className={action}>Cancelar</button></div>
      </form>}
      {uploadOpen && !readOnly && config.cargas && <section aria-label="Subir a esta ubicación" className="rounded-xl border border-red-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 break-words text-sm font-semibold">Destino: {currentFolder?.nombre || 'Carpeta principal'}</p><button type="button" className="min-h-11 px-3 text-sm underline disabled:opacity-50" disabled={busy || selected.length > 0} onClick={() => setUploadOpen(false)}>Cerrar carga</button></div>
        <label className="block text-sm font-semibold">Tipo de documento<select value={uploadType} disabled={busy || selected.length > 0} onChange={event => setUploadType(event.target.value)} className={field}><option value="LEVANTAMIENTO_CARGAS">Saneamiento físico legal</option><option value="OTROS_CARGAS">Otros documentos</option></select></label>
        {status.items.filter(item => item.key === uploadType && item.applies).map(item => <div key={item.key}>{renderUpload(item)}</div>)}
      </section>}
      {!currentFolder && config.saneamiento.folders.length > 0 && <div><h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Subcarpetas</h4><div className="grid gap-3 sm:grid-cols-2">{config.saneamiento.folders.map(folder => <button type="button" key={folder.id} disabled={busy || pending} onClick={() => { setActiveFolder(folder.id); setUploadOpen(false); }} className="flex min-w-0 items-center gap-3 rounded-xl border border-red-200 bg-white p-4 text-left transition-colors hover:border-red-300 hover:bg-red-50/30 disabled:opacity-50"><span aria-hidden="true" className="text-3xl">📁</span><span className="min-w-0 flex-1"><span className="block break-words font-semibold">{folder.nombre}</span><span className="mt-1 block text-xs text-slate-500">{files.filter(file => isSaneamientoType(file.tipoDocumento) && config.saneamiento.files[String(file.id)] === folder.id).length} archivo(s)</span></span><span aria-hidden="true">→</span></button>)}</div></div>}
      <div><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Archivos</h4><span className="text-xs text-slate-500">{locationFiles.length} archivo(s)</span></div>
        {config.cargas ? locationFiles.map(renderFile) : locationFiles.length > 0 ? <details className="mt-3 rounded-xl border border-slate-200 p-4"><summary className="min-h-8 cursor-pointer text-sm font-semibold text-slate-600">Documentos anteriores ({locationFiles.length})</summary>{locationFiles.map(renderFile)}</details> : null}
        {locationFiles.length === 0 && <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center"><p className="text-sm text-slate-500">Esta ubicación aún no tiene archivos.</p>{!readOnly && config.cargas && <button type="button" className={`${action} mt-4`} disabled={busy || pending || !uploadReady} onClick={() => setUploadOpen(true)}>Subir primeros archivos</button>}</div>}
      </div>
      <details className="border-t border-slate-100 pt-4 text-xs text-slate-500"><summary className="min-h-8 cursor-pointer">Ayuda para organizar documentos</summary><p className="mt-2 leading-6">Puedes mover archivos desde Más acciones y eliminar carpetas vacías. Las subcarpetas tienen un solo nivel. {rental ? 'Los documentos de esta carpeta son opcionales y no añaden requisitos para cerrar el alquiler.' : 'Los documentos de saneamiento cuentan para el requisito en cualquier ubicación; Otros documentos no lo completa.'}</p></details>
    </section>}
    {view !== 'estado' && !folderView && status.sections.map(({key: section, label}) => {
      const sectionItems = visible.filter(item => item.section === section);
      if (!sectionItems.length) return null;
      if (section === 'planos') return <section key={section} aria-label={label} className="min-w-0 space-y-4">
        {view !== 'carpeta' && <h4 className="font-bold">{label}</h4>}
        {!rental && config.planos && <p className="text-sm text-slate-600">Para cerrar la venta con Planos activado, adjunta un plano de distribución o de ubicación referencial.</p>}
        {sectionItems.filter(item => item.key === planTypes[0]).map(renderDocumentItem)}
        <div className="divide-y divide-red-100 rounded-xl border border-red-200 bg-white">
          {sectionItems.filter(item => item.key !== planTypes[0]).map(renderDocumentItem)}
          <div className="p-4">
            <h6 className="font-semibold">Prompt para plano de ubicación referencial</h6>
            {!readOnly && <button type="button" className="aa-button aa-button-primary mt-3" disabled={busy || pending}
              onClick={() => setPromptKind('plano')}>Preparar prompt de plano referencial</button>}
          </div>
        </div>
      </section>;
      const extras = sectionItems.filter(item => isSectionExtraDocument(item.key) && documentVisible(item));
      const items = sectionItems.filter(item => !isSectionExtraDocument(item.key) && documentVisible(item));
      const previous = sectionItems.filter(item => !documentVisible(item) && item.documents.length > 0);
      return <section key={section} aria-label={label} className="min-w-0 space-y-4">
        {view !== 'carpeta' && <h4 className="font-bold">{label}</h4>}
        {section === 'identificacion' && !rental ? (party ? [party] : ['vendedor', 'comprador']).map(renderIdentificationParty) : <>
          {section === 'impuestos' && !rental ? <>
            {(!party || party === 'vendedor') && renderRentaConditions()}
            {['vendedor', 'comprador'].map(party => {
              const partyItems = items.filter(item => item.party === party);
              const buyerConditions = party === 'comprador' && view === 'carpeta' && section === 'impuestos';
              if (!partyItems.length && !buyerConditions) return null;
              return <section key={party} aria-label={`Impuestos y constancias del ${party}`} className="space-y-4"><h4 className="border-b border-slate-100 pb-2 text-sm font-bold capitalize text-slate-700">{party}</h4>{buyerConditions && <div className="space-y-3 rounded-xl border border-red-200 bg-white p-4">{renderSaleConditions('comprador')}<p className="text-xs leading-5 text-slate-600">La asignación y el tipo de persona se comparten con 1. DNI y poderes. Guarda las condiciones para habilitar la carga; puedes completar su identificación allí después.</p></div>}{partyItems.map(renderDocumentItem)}</section>;
            })}
          </> : section === 'contratos' && (operation === 'venta' || operation === 'alquiler') ? <>
            <section aria-label="3.1 Contrato de Intermediación Inmobiliaria" className="space-y-3">
              <h4 className="font-bold">3.1 Contrato de Intermediación Inmobiliaria</h4>
              {[INTERMEDIATION_TYPE, INTERMEDIATION_STRUCTURE_TYPE].flatMap(key =>
                items.filter(item => item.key === key).map(renderDocumentItem))}
              {!readOnly && <>
                <div className="rounded-xl border border-red-200 bg-white p-4">
                  <h5 className="font-semibold">Modelo de Contrato de Intermediación Inmobiliaria</h5>
                  {renderIntermediationModels(operation)}
                </div>
                <div className="rounded-xl border border-red-200 bg-white p-4">
                  <h5 className="font-semibold">Prompt para Contrato de Intermediación Inmobiliaria</h5>
                  <button type="button" className="aa-button aa-button-primary mt-3" disabled={busy || pending}
                    onClick={() => setPromptKind('intermediacion')}>Preparar prompt para ChatGPT</button>
                </div>
              </>}
            </section>
            {rental ? <section aria-label="3.2 Contrato de Alquiler" className="space-y-3">
              <h4 className="font-bold">3.2 Contrato de Alquiler</h4>
              {['CONTRATO_ALQUILER', 'ESTRUCTURA_CONTRATO_ALQUILER'].flatMap(key =>
                items.filter(item => item.key === key).map(renderDocumentItem))}
              <div className="rounded-xl border border-red-200 bg-white p-4">
                <h5 className="font-semibold">Modelo de Contrato de Alquiler</h5>
                <p className="mt-2 text-sm text-slate-600">Pendiente de incorporar.</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-white p-4">
                <h5 className="font-semibold">Prompt para Contrato de Alquiler</h5>
                <p className="mt-2 text-sm text-slate-600">Pendiente de incorporar.</p>
              </div>
            </section> : items.filter(item => item.key !== INTERMEDIATION_TYPE && item.key !== INTERMEDIATION_STRUCTURE_TYPE).map(renderDocumentItem)}
          </> : items.map(renderDocumentItem)}
          {renderPreviousDocuments(previous)}
        </>}
        {extras.length > 0 && <details className="rounded-xl border border-red-200 bg-white p-4"><summary className="min-h-8 cursor-pointer text-sm font-semibold text-slate-600">Otros documentos (opcional)</summary><div className="mt-3 space-y-3">{extras.map(renderDocumentItem)}</div></details>}
      </section>;
    })}
    {(view === 'estado' || view === 'inmueble' || (view === 'carpeta' && section === 'otros')) && unknown.length > 0 && <section className="rounded-xl border border-amber-200 p-4"><h4 className="font-bold">Otros archivos conservados</h4><p className="mt-2 text-sm">Estos archivos no pertenecen a los requisitos actuales de esta operación. Puedes consultarlos y, si corresponde, asignarles una categoría vigente.</p>{unknown.map(renderFile)}</section>}
    {view === 'carpeta' && section === 'otros' && unknown.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay otros archivos por clasificar.</p>}
    {view === 'carpeta' && optionalFolders.some(item => item.section === section && !config[item.configKey]) && <p className="text-sm text-slate-600">Activa esta carpeta y guarda para adjuntar sus documentos. Los archivos anteriores se conservan.</p>}
    {dirty && <div aria-label="Cambios de condiciones" className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-md">
      <p role={error ? "alert" : "status"} className={`text-xs leading-5 ${error ? "text-red-800" : "text-slate-600"}`}>{error || "Condiciones sin guardar. Guarda para habilitar la subida de archivos."}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { setConfig(record.config); setError(''); }} className={conditionAction}>Descartar</button><button type="button" disabled={busy} onClick={() => void saveConfig()} className={conditionSave}>{busy ? 'Guardando…' : 'Guardar condiciones'}</button></div>
    </div>}
    {viewer && <FileViewer file={viewer} onClose={() => setViewer(null)} />}
    {deleting && <ConfirmDialog title="Eliminar archivo" confirmLabel="Eliminar" busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void remove()}><p>Se eliminará «{deleting.nombre}». Esta acción no se puede deshacer y el requisito volverá a figurar pendiente si no hay otro archivo.</p>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}</ConfirmDialog>}

  </div>;
}
