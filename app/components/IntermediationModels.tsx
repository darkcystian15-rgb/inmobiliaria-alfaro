"use client";

import { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

type Model = { id: string; name: string; draftOnly?: boolean };

export async function saveIntermediationWord(url: string, file: File): Promise<Model> {
  if (!/\.docx$/i.test(file.name) || file.size > 3 * 1024 * 1024) {
    throw Error('Selecciona un archivo Word .docx de hasta 3 MB.');
  }
  const form = new FormData();
  form.append('archivo', file);
  const response = await fetch(url, { method: 'PUT', body: form });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.id) throw Error(result?.error || 'No se pudo guardar el archivo Word.');
  return result;
}

export default function IntermediationModels({ propertyId, operation, disabled, onEdit, onBusy }: {
  propertyId: number;
  operation: 'venta' | 'alquiler';
  disabled: boolean;
  onEdit: (source: { url: string; name: string }) => void;
  onBusy: (busy: boolean) => void;
}) {
  const base: Model = { id: 'base', name: `Modelo base de ${operation}` };
  const url = `/api/inmuebles/${propertyId}/intermediacion?operacion=${operation}`;
  const [models, setModels] = useState<Model[]>([]);
  const [modelId, setModelId] = useState('base');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Model | null>(null);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [listFailed, setListFailed] = useState(false);
  const selected = models.find(model => model.id === modelId) ?? base;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(url + '&uso=modelos', { signal: controller.signal });
        if (!response.ok) throw Error();
        const result = await response.json();
        if (!controller.signal.aborted) {
          setModels(result.models);
          setListFailed(false);
        }
      } catch {
        if (!controller.signal.aborted) setListFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [url, revision]);

  async function upload(file: File) {
    onBusy(true);
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const model = await saveIntermediationWord(url + '&uso=modelos', file);
      setModels(previous => [...previous.filter(item => item.id !== model.id), model]);
      setModelId(model.id);
      setUploadOpen(false);
      setRevision(previous => previous + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el modelo.');
    } finally {
      setUploading(false);
      onBusy(false);
    }
  }

  async function remove(model: Model) {
    onBusy(true);
    setRemoving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${url}&modelo=${model.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw Error(result?.error || 'No se pudo eliminar el modelo.');
      }
      setModels(previous => previous.filter(item => item.id !== model.id));
      setModelId('base');
      setDeleting(null);
      setNotice('Modelo eliminado.');
      setRevision(previous => previous + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el modelo.');
    } finally {
      setRemoving(false);
      onBusy(false);
    }
  }

  return <div className="my-3 space-y-2">
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 text-sm font-semibold">Modelo de contrato
        <select className="mt-1 block max-w-full rounded-lg border border-slate-300 bg-white p-2 font-normal"
          disabled={disabled || uploading} value={uploadOpen ? 'nuevo' : selected.id} onChange={event => {
            const value = event.target.value;
            setError('');
            setNotice('');
            setUploadOpen(value === 'nuevo');
            if (value !== 'nuevo') setModelId(value);
          }}>
          {[base, ...models].map(model => <option key={model.id} value={model.id}>{model.draftOnly ? `Borrador: ${model.name}` : model.name}</option>)}
          <option value="nuevo">Cargar nuevo modelo…</option>
        </select>
      </label>
      {!uploadOpen && <>
        <button type="button" className="aa-button aa-button-primary" disabled={disabled}
          onClick={() => onEdit({ url: `${url}&uso=borrador&modelo=${selected.id}`, name: selected.name })}>{selected.draftOnly ? 'Editar borrador' : 'Editar modelo'}</button>
        <a className="aa-button aa-button-secondary" href={`${url}&uso=${selected.draftOnly ? 'borrador' : 'modelo'}&modelo=${selected.id}`} download>
          {selected.draftOnly ? 'Descargar borrador' : 'Descargar modelo'}
        </a>
        {selected.id !== 'base' && !selected.draftOnly && <button type="button"
          className="aa-button aa-button-secondary text-red-700" disabled={disabled}
          onClick={() => { setError(''); setDeleting(selected); }}>Eliminar modelo</button>}
      </>}
    </div>
    {uploadOpen && <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 text-sm font-semibold">Archivo Word (.docx)
        <input type="file" accept=".docx" className="mt-1 block max-w-full text-sm font-normal" disabled={disabled || uploading}
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void upload(file);
          }} />
      </label>
      <button type="button" className="aa-button aa-button-secondary" disabled={uploading}
        onClick={() => { setUploadOpen(false); setError(''); }}>Cancelar</button>
    </div>}
    {uploading && <p role="status" className="text-sm">Guardando modelo…</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {!deleting && error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {deleting && <ConfirmDialog title="Eliminar modelo" confirmLabel="Eliminar modelo" busy={removing}
      onCancel={() => { setDeleting(null); setError(''); }} onConfirm={() => void remove(deleting)}>
      <p>Se eliminará «{deleting.name}» de tu lista de modelos. Los borradores guardados seguirán disponibles en sus fichas.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </ConfirmDialog>}
    {listFailed && <p role="status" className="text-sm">
      No se pudo cargar la lista de modelos.{' '}
      <button type="button" className="underline" onClick={() => setRevision(previous => previous + 1)}>Reintentar</button>
    </p>}
  </div>;
}
