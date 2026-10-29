"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { dossierDefaults, dossierClosureStatus, dossierStatus, dossierDocumentType, isSectionExtraDocument, validateExtraDocumentDescription } from '@/lib/transaction-dossier.mjs';
import { documentByteLimit, MAX_DOCUMENT_BYTES } from '@/lib/document-limits.mjs';
import { requestJson } from '@/lib/client-request';
import { compressImage, isImageFile } from '@/lib/client-images';
import { readUploadFile } from '@/lib/client-upload-file.mjs';
import FileViewer from './FileViewer';
import ConfirmDialog from './ConfirmDialog';
import WorkspaceFileIcon from './WorkspaceFileIcon';
import FileDropZone from './FileDropZone';

export type DossierFile = { id: number; nombre: string; tipoDocumento: string; almacenamiento: string; enlace: string; tipoMime: string | null; nombreOriginal: string | null; observacion: string | null; tamanoBytes: number | null };
type Config = ReturnType<typeof dossierDefaults>;
type RecordData = { config: Config; version: number };
type View = 'estado' | 'vendedor' | 'comprador' | 'inmueble' | 'carpeta';
const field = 'mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm';
const action = 'aa-button border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const conditionAction = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const conditionSave = 'min-h-11 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50';
const saveAction = 'aa-button bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50';
const stateLabels = { completo: 'Completo', pendiente: 'Pendiente obligatorio', opcional: 'Opcional', no_aplica: 'No aplica' };


export default function TransactionDossier({ propertyId, operation, view, section, showHeading = true, readOnly = false, files, uploadReady, administrator, onChanged, onBusyChange, onDirtyChange }: {
  readOnly?: boolean; propertyId: number; operation: string; view: View; section?: string; showHeading?: boolean; files: DossierFile[]; uploadReady: boolean; administrator: boolean;
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
  const [editObservation, setEditObservation] = useState('');
  const [selected, setSelected] = useState<{ file: File; name: string; description: string }[]>([]);
  const [category, setCategory] = useState('');
  const [observation, setObservation] = useState('');
  const dirty = !!record && JSON.stringify(config) !== JSON.stringify(record.config);
  const pending = dirty || selected.length > 0 || editing !== null;
  useLayoutEffect(() => { onDirtyChange(pending); }, [pending, onDirtyChange]);
  const status = dossierStatus(config, files, operation);
  const closing = dossierClosureStatus(config, files, operation);
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
        if (category === 'COPIA_LITERAL_CRI' && file.size > MAX_DOCUMENT_BYTES) {
          const endpoint = `${fileUrl}/copia-literal`;
          const authorization = await requestJson<{token: string; uploadUrl: string}>(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prepare', filename: file.name, size: file.size, nombre: entry.name.trim(), observacion: observation }) });
          try {
            const response = await fetch(authorization.uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${authorization.token}`, 'Content-Type': 'application/octet-stream' }, body: file, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(25 * 60000) });
            if (!response.ok && response.status !== 409) throw Error('No se pudo subir la copia literal al hosting.');
            await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', token: authorization.token }) });
            uploaded++;
          } catch (error) {
            await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', token: authorization.token }) }).catch(() => undefined);
            if (error instanceof TypeError) throw Error('No se pudo conectar con el servidor de documentos. Comprueba tu conexión y que este dominio esté autorizado para subir copias literales de más de 4 MB.');
            throw error;
          }
          continue;
        }
        const body = new FormData();
        body.set('archivo', file); body.set('nombre', entry.name.trim()); body.set('tipoDocumento', category); body.set('observacion', isSectionExtraDocument(category) ? entry.description.trim() : observation);
        await requestJson(fileUrl, { method: 'POST', body }); uploaded++;
      }
      setObservation(''); setMessage(`${uploaded} archivo${uploaded === 1 ? '' : 's'} guardado${uploaded === 1 ? '' : 's'}.`);
    } catch (e) { setError(`${e instanceof TypeError ? 'No se pudo enviar el archivo desde este navegador. Comprueba la conexión y vuelve a seleccionar el PDF desde Descargas de tu celular.' : e instanceof Error ? e.message : 'No se pudo subir.'}${uploaded ? ` ${uploaded} archivo(s) ya se guardaron; solo quedan los pendientes.` : ''}`); }
    finally {
      setSelected(previous => previous.slice(uploaded));
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
      validateExtraDocumentDescription(editType, editObservation);
      await requestJson(fileUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivoId: editing.id, nombre: editName, tipoDocumento: editType, observacion: editObservation }) });
      setEditing(null); await onChanged(); setMessage('Documento actualizado.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    finally { working(false); }
  }
  function renderFile(file: DossierFile) {
    return <article key={file.id} className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex min-w-0 flex-1 items-start gap-2"><WorkspaceFileIcon name={file.nombreOriginal || file.nombre} /><div className="min-w-0"><p className="break-words text-sm font-semibold">{file.nombre}</p><p className="mt-1 break-words text-xs text-slate-500">{file.nombreOriginal}{file.tamanoBytes ? ` · ${Math.ceil(file.tamanoBytes / 1024)} KB` : ''}</p>{file.observacion && <p className="mt-1 whitespace-pre-wrap break-words text-xs">{file.observacion}</p>}{file.almacenamiento !== 'hosting' && <p className="mt-1 text-xs text-amber-800">Enlace anterior: sube el archivo para completar este requisito.</p>}</div></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setViewer(file)} className={action}>Ver archivo</button>{file.almacenamiento === 'hosting' && <a href={`${file.enlace}?download=1`} className={action}>Descargar</a>}<button type="button" disabled={readOnly || busy} onClick={() => { setEditing(file); setEditName(file.nombre); setEditObservation(file.observacion || ''); setEditType(status.items.find(item => item.key === file.tipoDocumento)?.applies ? file.tipoDocumento : ''); }} className={action}>Editar nombre / categoría</button>{administrator && !readOnly && <button type="button" disabled={busy} onClick={() => setDeleting(file)} className="aa-button aa-button-secondary text-red-700">Eliminar</button>}</div>
    </article>;
  }
  function renderRentaConditions() {
    return <fieldset disabled={readOnly || busy || selected.length > 0 || editing !== null} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-2 text-sm font-bold">Condiciones del vendedor</legend>
      <label className="block text-sm font-semibold">Impuesto a la renta<select value={config.renta} onChange={event => changeConfig(old => ({ ...old, renta: event.target.value }))} className={field}><option value="pendiente">Seleccionar</option><option value="afecto">Paga</option><option value="exonerado">No paga</option></select></label>
      {config.renta === 'afecto' && <label className="block text-sm font-semibold">Observación: ¿por qué paga impuesto a la renta?<textarea required rows={3} maxLength={2000} value={config.rentaObservacion} onChange={event => changeConfig(old => ({ ...old, rentaObservacion: event.target.value }))} className={field} /><span className="mt-1 block text-xs font-normal text-slate-600">Obligatoria para guardar esta condición. Explica el motivo por el que corresponde pagar.</span></label>}
      {config.renta === 'exonerado' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Adjunta por separado el documento de exoneración y la búsqueda nacional dentro de este apartado. Una nota escrita no sustituye los archivos. Si la búsqueda nacional ya está cargada, se utiliza el mismo archivo.</p>}
      {config.renta === 'pendiente' && <p className="text-sm text-slate-600">Selecciona si paga o no paga para completar el sustento correspondiente.</p>}
    </fieldset>;
  }
  function renderDocumentItem(item: ReturnType<typeof dossierStatus>['items'][number]) {
    return <div key={item.key} data-document-type={item.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h5 className="font-semibold">{item.label}{item.party !== 'inmueble' && <span className="ml-2 text-sm font-normal capitalize text-slate-500">· {item.party}</span>}</h5><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.state === 'pendiente' ? 'bg-amber-100 text-amber-900' : item.state === 'completo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{isSectionExtraDocument(item.key) ? 'Opcional' : item.key === 'VENDEDOR_EXONERACION_RENTA' ? config.renta === 'afecto' ? 'Paga' : config.renta === 'exonerado' ? 'No paga' : 'Por definir' : stateLabels[item.state as keyof typeof stateLabels]}</span></div>{item.key === 'VENDEDOR_EXONERACION_RENTA' && renderRentaConditions()}{item.key === 'VENDEDOR_BUSQUEDA_NACIONAL' && config.renta === 'exonerado' && <p className="mt-2 text-xs text-slate-600">Documento sustentatorio de que el vendedor no paga impuesto a la renta.</p>}{isSectionExtraDocument(item.key) && <p className="mt-2 text-sm text-slate-600">Carga opcional para documentos especiales de esta carpeta. Puedes agregar varios archivos, cada uno con su nombre y una breve descripción. No afecta los requisitos de cierre.</p>}{item.key === 'COPIA_LITERAL_CRI' && <p className="mt-2 text-xs text-slate-600">Basta con uno de los dos documentos.</p>}{!item.applies && item.party === 'vendedor' && item.section === 'identificacion' && <p className="mt-2 text-xs text-slate-600">Carga bloqueada para las condiciones seleccionadas. Los archivos existentes se conservan.</p>}{item.note && <p className="mt-2 whitespace-pre-wrap text-sm">Nota: {item.note}</p>}{item.documents.map(file => renderFile(file as DossierFile))}{!readOnly && item.applies && <div className="mt-3 space-y-3">{item.key === 'VENDEDOR_EXONERACION_RENTA' && <p className="text-sm font-semibold">Documento de exoneración · {stateLabels[item.state as keyof typeof stateLabels]}</p>}
        {!uploadReady && <p role="status" className="text-sm text-amber-800">La subida no está disponible. Consulta al administrador.</p>}
        <FileDropZone subdued label={`Archivos: ${item.party === 'inmueble' ? '' : item.party + ' · '}${item.label}`} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" help={`PDF, Word, Excel, JPG, PNG o WebP. Hasta ${documentByteLimit(item.key) / 1048576} MB por archivo; las imágenes se comprimen.`}
          inputRef={{ current: null }} disabled={busy || dirty || !uploadReady || (selected.length > 0 && category !== item.key) || editing !== null}
          onFiles={files => { setError(''); setMessage(''); setCategory(item.key); setSelected(files.map(file => ({ file, name: file.name.replace(/\.[^.]+$/, '').slice(0, 255), description: '' }))); }} onRejected={setError} />
        {category === item.key && selected.length > 0 && <form aria-label={`Subir archivos: ${item.party === 'inmueble' ? '' : item.party + ' · '}${item.label}`} onSubmit={event => void upload(event)} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h6 className="text-sm font-bold">Confirmar archivos de {item.label.toLowerCase()}</h6>
          <fieldset disabled={readOnly || busy || dirty || !uploadReady} className="space-y-3">
            {selected.map((entry, index) => <div key={`${entry.file.name}-${index}`} className="space-y-3">
              <label className="block text-sm font-semibold">Nombre del archivo {index + 1}<input required maxLength={255} value={entry.name} onChange={event => setSelected(old => old.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} className={field} /><span className="mt-1 block break-words text-xs font-normal">{entry.file.name}</span></label>
              {isSectionExtraDocument(item.key) && <label className="block text-sm font-semibold">Descripción breve del archivo {index + 1}<textarea required rows={2} maxLength={500} value={entry.description} onChange={event => setSelected(old => old.map((value, i) => i === index ? { ...value, description: event.target.value } : value))} className={field} /><span className="mt-1 block text-xs font-normal text-slate-600">Describe para qué se adjunta este documento. Máximo 500 caracteres.</span></label>}
            </div>)}
            {!isSectionExtraDocument(item.key) && <label className="block text-sm font-semibold">Observación opcional<textarea maxLength={500} value={observation} onChange={event => setObservation(event.target.value)} className={field} /></label>}
            <div className="flex flex-wrap gap-2"><button type="submit" className={saveAction}>{busy ? 'Subiendo…' : 'Subir archivos'}</button><button type="button" onClick={() => { setSelected([]); setCategory(''); setObservation(''); }} className={action}>Quitar selección</button></div>
          </fieldset>
        </form>}
      </div>}{item.key === 'VENDEDOR_EXONERACION_RENTA' && config.renta === 'exonerado' && <div className="mt-4">{status.items.filter(child => child.key === 'VENDEDOR_BUSQUEDA_NACIONAL').map(renderDocumentItem)}</div>}</div>;
  }
  const rental = operation === 'alquiler';
  const naturalSeller = !rental && config.vendedorTipo === 'natural';
  function renderSellerIdentification() {
    const locked = readOnly || busy || selected.length > 0 || editing !== null;
    const documents = (...keys: string[]) => status.items.filter(item => keys.includes(item.key)).map(renderDocumentItem);
    const save = dirty && <button type="button" disabled={locked} onClick={() => void saveConfig()} className={conditionSave}>Guardar condiciones para adjuntar archivos</button>;
    return <section aria-label="Identificación del vendedor persona natural" className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <label className="block text-sm font-semibold">1. Propietarios<select disabled={locked} value={config.vendedorPropietarios} onChange={event => changeConfig(old => ({ ...old, vendedorPropietarios: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="uno">Un solo propietario</option><option value="matrimonio">Matrimonio</option><option value="varios">Varios copropietarios</option></select></label>
        {save}
        <p className="text-sm text-slate-600">Puedes adjuntar los DNI de todos los propietarios en un solo PDF o en varios archivos. La cantidad de archivos no determina el número de propietarios.</p>
        {documents('VENDEDOR_DNI')}
        {(config.vendedorPropietarios === 'matrimonio' || status.items.some(item => item.key === 'VENDEDOR_PARTIDA_MATRIMONIAL' && item.documents.length)) && documents('VENDEDOR_PARTIDA_MATRIMONIAL')}
        {config.vendedorPropietarios === 'matrimonio' && <label className="block text-sm font-semibold">Régimen patrimonial<select disabled={locked} value={config.vendedorRegimen} onChange={event => changeConfig(old => ({ ...old, vendedorRegimen: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="comunes">Bienes comunes</option><option value="separados">Separación de patrimonios</option></select></label>}
        {config.vendedorPropietarios === 'matrimonio' && save}
        {documents('VENDEDOR_SEPARACION_PATRIMONIAL')}
      </section>
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <label className="block text-sm font-semibold">2. ¿Algún propietario firma mediante representante?<select disabled={locked} value={config.vendedorRepresentante} onChange={event => changeConfig(old => ({ ...old, vendedorRepresentante: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="si">Sí</option><option value="no">No, todos firman personalmente</option></select></label>
        {save}
        {config.vendedorRepresentante === 'si' && <p className="text-sm text-slate-600">Indica en el nombre o la observación del archivo a qué propietario representa.</p>}
        {documents('VENDEDOR_PODER', 'VENDEDOR_VIGENCIA_PODER')}
      </section>
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <h4 className="font-semibold">3. Búsqueda nacional</h4>
        {config.renta === 'exonerado' ? <p className="text-sm text-slate-600">Adjunta la búsqueda nacional en la carpeta 4. Impuestos y constancias como sustento de que no paga impuesto a la renta. Requiere archivo.</p> : <>
          <label className="block text-sm font-semibold">Nota si no adjuntas la búsqueda nacional<textarea disabled={locked} rows={3} maxLength={2000} value={config.vendedorBusquedaNota} onChange={event => changeConfig(old => ({ ...old, vendedorBusquedaNota: event.target.value }))} className={field} /><span className="mt-1 block text-xs font-normal text-slate-600">Obligatoria cuando no hay archivo de búsqueda nacional.</span></label>
          {save}{documents('VENDEDOR_BUSQUEDA_NACIONAL')}
        </>}
      </section>
      {status.items.filter(item => item.party === 'vendedor' && item.section === 'identificacion' && item.person === 'juridica' && item.documents.length > 0).map(renderDocumentItem)}
    </section>;
  }
  const party = view === 'vendedor' ? rental ? 'arrendador' : 'vendedor' : view === 'comprador' ? rental ? 'arrendatario' : 'comprador' : null;
  const visible = status.items.filter(item => view === 'carpeta' ? item.section === section : view === 'estado' || (view === 'inmueble' ? item.party === 'inmueble' : item.party === party));
  const unknown = files.filter(file => !status.items.some(def => def.key === dossierDocumentType(file.tipoDocumento, operation)));
  if (loading) return <p role="status" className="p-4">Consultando expediente…</p>;
  if (!record) return <div role="alert"><p>{error}</p><button type="button" onClick={() => void load()} className="aa-button aa-button-secondary mt-3">Reintentar</button></div>;
  return <div className="space-y-5">{readOnly && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">Expediente cerrado y protegido. Puedes consultar y descargar sus documentos; sus archivos y condiciones se conservan.</p>}
    <div>{showHeading && <h3 className="text-lg font-bold">{view === 'carpeta' ? status.sections.find(item => item.key === section)?.label || 'Otros archivos conservados' : view === 'estado' ? 'Estado del expediente' : party ? `Documentación del ${party}` : 'Documentación del inmueble'}</h3>}<p className="mt-2 text-sm text-slate-600">{rental ? 'Expediente de alquiler: arrendador, arrendatario, inmueble, contratos, servicios y tasaciones.' : 'Expediente de venta: vendedor, comprador, inmueble, contratos e impuestos.'} Los pendientes se muestran en el seguimiento de esta operación.</p></div>
    {error && !dirty && <p role="alert" className="whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

    {view === 'estado' && <>
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm">{closing.complete ? 'Todos los documentos obligatorios aplicables están cargados para el cierre.' : `Para cerrar, completa los documentos obligatorios y sus condiciones. Pendiente: ${closing.missing.join('; ')}. Las notas admitidas durante la preparación no sustituyen los archivos requeridos para cerrar.`}</p>
      <div className={`rounded-2xl border p-5 ${status.complete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="text-lg font-bold">{status.complete ? 'Expediente completo' : 'Expediente con pendientes'}</p><p className="mt-2 text-sm">{status.completed} de {status.total} requisitos documentales aplicables completos · {status.percent}%</p><progress aria-label="Avance documental" value={status.completed} max={status.total || 1} className="mt-3 h-3 w-full accent-red-700" />{dirty && <p className="mt-2 text-xs">Vista previa de condiciones sin guardar.</p>}{status.alerts.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{status.alerts.map(alert => <li key={alert}>{alert}</li>)}</ul>}</div>
      <div className="grid gap-3 sm:grid-cols-2">{status.sections.map(section => <div key={section.key} className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold">{section.label}</h4><p className="mt-2 text-sm">{section.total ? `${section.completed} de ${section.total} completos · ${section.pending} pendientes` : 'Sin requisitos obligatorios aplicables'}</p></div>)}</div>
      <section><h4 className="font-bold">Documentos obligatorios pendientes</h4><ul className="mt-3 space-y-2">{status.items.filter(item => item.state === 'pendiente').map(item => <li key={item.key} className="rounded-lg bg-amber-50 p-3 text-sm"><span className="font-semibold capitalize">{item.party}</span> · {item.label}</li>)}</ul>{!status.items.some(item => item.state === 'pendiente') && <p className="mt-2 text-sm">No hay archivos obligatorios pendientes para las condiciones seleccionadas.</p>}</section>
    </>}
    {rental && (view === 'estado' || (view === 'carpeta' && section === 'identificacion') || view === 'vendedor' || view === 'comprador') && <fieldset disabled={readOnly || busy || selected.length > 0 || editing !== null} className="space-y-4 rounded-2xl border border-slate-200 p-4">
      <legend className="px-2 font-bold">Condiciones de las partes del alquiler</legend>
      <p className="text-sm text-slate-600">Selecciona el tipo de persona de cada parte de forma independiente. El arrendador y el arrendatario pueden ser de tipos distintos.</p>
      {(['arrendador', 'arrendatario'] as const).map(party => <section key={party} aria-label={`Condiciones del ${party}`} className="space-y-4 rounded-xl bg-slate-50 p-4">
        <h4 className="font-bold capitalize">{party}</h4>
        <label className="block text-sm font-semibold">Tipo de persona del {party}<select value={config[`${party}Tipo`]} onChange={event => changeConfig(old => ({ ...old, [`${party}Tipo`]: event.target.value }))} className={field}><option value="">Seleccionar</option><option value="natural">Persona natural</option><option value="juridica">Persona jurídica</option></select></label>
        {config[`${party}Tipo`] === 'natural' && <label className="block text-sm font-semibold">¿El {party} firma mediante representante?<select value={config[`${party}Representante`]} onChange={event => changeConfig(old => ({ ...old, [`${party}Representante`]: event.target.value }))} className={field}><option value="pendiente">Por verificar</option><option value="no">No, firma personalmente</option><option value="si">Sí, mediante representante</option></select></label>}
        {config[`${party}Tipo`] === 'natural' && <p className="text-xs text-slate-600">Adjunta el DNI. Si firma mediante representante, adjunta también el poder y su vigencia.</p>}
        {config[`${party}Tipo`] === 'juridica' && <p className="text-xs text-slate-600">Adjunta la ficha RUC, el DNI del gerente y la vigencia de poder del gerente.</p>}
      </section>)}
      <p className="text-xs text-slate-600">Los archivos anteriores se conservan aunque cambies el tipo de persona.</p>
      {dirty && <button type="button" onClick={() => void saveConfig()} className={conditionSave}>Guardar condiciones para adjuntar archivos</button>}
    </fieldset>}
    {!rental && view === 'carpeta' && status.items.some(item => item.section === section && item.party === 'comprador') && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">{record.config.compradorAsignado !== config.compradorAsignado || record.config.compradorTipo !== config.compradorTipo ? 'Guarda las condiciones en la carpeta 1. DNI y poderes para aplicar la asignación y el tipo de persona del comprador. Después podrás subir sus documentos en las carpetas correspondientes.' : record.config.compradorAsignado ? 'Comprador asignado. Sus documentos están habilitados según el tipo de persona guardado en la carpeta 1. DNI y poderes.' : 'Para habilitar los documentos del comprador en esta carpeta, primero asígnalo en la carpeta 1. DNI y poderes, selecciona su tipo de persona y pulsa Guardar condiciones.'}</p>}
    {!rental && (party ? [party] : view === 'carpeta' && section === 'identificacion' ? ['vendedor', 'comprador'] : []).map(party => <fieldset key={party} disabled={readOnly || busy || selected.length > 0 || editing !== null} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-2 font-bold">Condiciones del {party}</legend>
      {party === 'comprador' && section !== 'impuestos' && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={config.compradorAsignado} onChange={event => changeConfig(old => ({ ...old, compradorAsignado: event.target.checked }))} className="mt-1 h-4 w-4" /><span>Asignar comprador para preparar el cierre.<span className="mt-1 block text-xs text-slate-600">Activa su expediente y adjunta sus documentos. Solo se registra un comprador.</span></span></label>}
      {section !== 'impuestos' && (party === 'vendedor' || config.compradorAsignado) && <label className="block text-sm font-semibold">Tipo de persona<select value={party === 'vendedor' ? config.vendedorTipo : config.compradorTipo} onChange={event => changeConfig(old => ({ ...old, [`${party}Tipo`]: event.target.value }))} className={field}><option value="">Seleccionar</option><option value="natural">Persona natural</option><option value="juridica">Persona jurídica</option></select></label>}
      {section !== 'impuestos' && party !== 'vendedor' && config[`${party}Tipo` as keyof Config] === 'natural' && (party === 'vendedor' || config.compradorAsignado) && <label className="block text-sm font-semibold">Nota si no adjuntas la búsqueda nacional<textarea rows={3} maxLength={2000} value={party === 'vendedor' ? config.vendedorBusquedaNota : config.compradorBusquedaNota} onChange={event => changeConfig(old => ({ ...old, [`${party}BusquedaNota`]: event.target.value }))} className={field} /><span className="mt-1 block text-xs font-normal text-slate-600">Obligatoria cuando no hay archivo de búsqueda nacional.</span></label>}
      {party === 'vendedor' && !naturalSeller && section !== 'impuestos' && config.renta === 'exonerado' && <p className="text-sm text-slate-600">La búsqueda nacional del vendedor se adjunta en la carpeta 4. Impuestos y constancias, como sustento de que no paga impuesto a la renta.</p>}
    </fieldset>)}
    {(view === 'inmueble' || (view === 'carpeta' && section === 'cargas')) && !rental && <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" disabled={busy || selected.length > 0 || editing !== null} checked={config.cargas} onChange={event => changeConfig(old => ({ ...old, cargas: event.target.checked }))} className="mt-1 h-4 w-4" /><span>Incluir levantamiento de cargas<span className="mt-1 block text-xs text-slate-600">Sección opcional. Al activarla puedes subir varios archivos con nombres individuales.</span></span></label>}
    {view !== 'estado' && status.sections.map(({key: section, label}) => {
      const extras = visible.filter(item => item.section === section && isSectionExtraDocument(item.key));
      const items = visible.filter(item => !isSectionExtraDocument(item.key) && item.section === section && (item.applies || item.documents.length || (section === 'impuestos' && item.party === 'vendedor')) && !(section === 'impuestos' && item.key === 'VENDEDOR_BUSQUEDA_NACIONAL'));
      if (!items.length && !extras.length) return null;
      return <section key={section} className="space-y-4">{view !== 'carpeta' && <h4 className="font-bold">{label}</h4>}{section === 'impuestos' ? ['vendedor','comprador'].map(party => {
        const partyItems = items.filter(item => item.party === party);
        if (!partyItems.length) return null;
        return <section key={party} aria-label={`Impuestos y constancias del ${party}`} className="space-y-3"><h4 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase text-slate-700">Impuestos y constancias del {party}</h4>{partyItems.map(renderDocumentItem)}</section>;
      }) : section === 'identificacion' && naturalSeller && items.some(item => item.party === 'vendedor') ? <>{renderSellerIdentification()}{items.filter(item => item.party !== 'vendedor').map(renderDocumentItem)}</> : items.map(renderDocumentItem)}{extras.map(renderDocumentItem)}</section>;
    })}
    {(view === 'estado' || view === 'inmueble' || (view === 'carpeta' && section === 'otros')) && unknown.length > 0 && <section className="rounded-xl border border-amber-200 p-4"><h4 className="font-bold">Otros archivos conservados</h4><p className="mt-2 text-sm">Estos archivos no pertenecen a los requisitos actuales de esta operación. Puedes consultarlos y, si corresponde, asignarles una categoría vigente.</p>{unknown.map(renderFile)}</section>}
    {view === 'carpeta' && section === 'otros' && unknown.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay otros archivos por clasificar.</p>}
    {view === 'carpeta' && section === 'cargas' && !config.cargas && <p className="text-sm text-slate-600">Esta carpeta no tiene requisitos obligatorios mientras no se declaren cargas. Puedes adjuntar otros documentos opcionales. Los archivos existentes se conservan.</p>}
    {dirty && <div aria-label="Cambios de condiciones" className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-md">
      <p role={error ? "alert" : "status"} className={`text-xs leading-5 ${error ? "text-red-800" : "text-slate-600"}`}>{error || "Condiciones sin guardar. Guarda para habilitar la subida de archivos."}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { setConfig(record.config); setError(''); }} className={conditionAction}>Descartar</button><button type="button" disabled={busy} onClick={() => void saveConfig()} className={conditionSave}>{busy ? 'Guardando…' : 'Guardar condiciones'}</button></div>
    </div>}
    {viewer && <FileViewer file={viewer} onClose={() => setViewer(null)} />}
    {deleting && <ConfirmDialog title="Eliminar archivo" confirmLabel="Eliminar" busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void remove()}><p>Se eliminará «{deleting.nombre}». Esta acción no se puede deshacer y el requisito volverá a figurar pendiente si no hay otro archivo.</p>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}</ConfirmDialog>}
    {editing && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><form onSubmit={event => void rename(event)} className="space-y-3"><h4 className="font-bold">Editar documento: {editing.nombre}</h4><label className="block text-sm">Nombre<input required maxLength={255} value={editName} disabled={busy} onChange={event => setEditName(event.target.value)} className={field} /></label><label className="block text-sm">Categoría<select required disabled={busy || dirty} value={editType} onChange={event => setEditType(event.target.value)} className={field}><option value="">Seleccionar</option>{status.items.filter(item => item.applies && (!editing.tamanoBytes || editing.tamanoBytes <= documentByteLimit(item.key))).map(item => <option key={item.key} value={item.key}>{status.sections.find(section => section.key === item.section)?.label} · {item.party} · {item.label}</option>)}</select></label><label className="block text-sm">{isSectionExtraDocument(editType) ? 'Descripción breve' : 'Observación opcional'}<textarea required={isSectionExtraDocument(editType)} rows={2} maxLength={500} value={editObservation} disabled={busy} onChange={event => setEditObservation(event.target.value)} className={field} /></label><button disabled={busy || dirty} className={saveAction}>Guardar documento</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="aa-button aa-button-secondary ml-2">Cancelar edición</button></form></div>}
  </div>;
}
