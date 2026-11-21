'use client';

import { useEffect, useRef, useState } from 'react';
import { requestJson } from '@/lib/client-request';
import { propertyAddress } from '@/lib/property-address.mjs';
import { referencePlanPrompt } from '@/lib/reference-plan.mjs';
import { intermediationIntranetPrompt } from '@/lib/intermediation-intranet-prompt.mjs';

type Item = { tipo: string; direccion: string | null; numeroDireccion?: string | null; contacto: string | null; zona: string | null; numero: number | null };

const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
const button = 'aa-button aa-button-secondary';

export default function ReferencePlanPrompt({ propertyId, operation, kind = 'plano', onClose, onPending }: {
  propertyId: number; operation: string; kind?: 'plano' | 'intermediacion';
  onClose: () => void; onPending: (value: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const dirty = editedPrompt !== null;
  const intermediation = kind === 'intermediacion';
  const url = `/api/inmuebles/${propertyId}/intermediacion?operacion=${encodeURIComponent(operation)}&uso=${kind}`;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => { onPending(dirty); }, [dirty, onPending]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { item } = await requestJson<{ item: Item }>(url, { signal: controller.signal });
        if (!controller.signal.aborted) setItem({ ...item, direccion: propertyAddress(item, '') });
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [url]);

  function close() {
    if (!dirty || window.confirm('¿Cerrar y descartar los cambios del prompt?')) onClose();
  }
  const prompt = editedPrompt ?? (item ? (intermediation ? intermediationIntranetPrompt(item, password, operation) : referencePlanPrompt(item, password)) : '');
  async function copy() {
    if (!prompt.trim()) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setNotice('Prompt copiado.');
    } catch {
      setNotice('Selecciona el texto generado para copiarlo.');
    }
  }
  return <dialog ref={dialog} aria-labelledby="intranet-prompt-title" onCancel={event => { event.preventDefault(); close(); }}
    className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1rem)] max-w-3xl overflow-auto rounded-xl border bg-white shadow-xl backdrop:bg-slate-950/50">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-4">
      <h2 id="intranet-prompt-title" className="font-bold">{intermediation ? 'Prompt para contrato de intermediación' : 'Prompt para plano de ubicación referencial'}</h2>
      <button type="button" className={button} onClick={close}>Cerrar</button>
    </header>
    <div className="space-y-4 p-4 sm:p-6">
      {busy && <p role="status">Cargando datos del inmueble…</p>}
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {item && <section className="space-y-3 text-sm">
        <label className="block">Contraseña de la intranet para incluir en el prompt
          <input type="password" autoComplete="off" className={input} value={password} disabled={editedPrompt !== null}
            onChange={event => { setPassword(event.target.value); setNotice(''); }} />
        </label>
        <label className="block">Prompt generado<textarea className={input} value={prompt} rows={12} disabled={busy}
          onChange={event => { setEditedPrompt(event.target.value); setNotice(''); }} /></label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="aa-button aa-button-primary" disabled={busy || !prompt.trim()} onClick={() => void copy()}>Copiar prompt</button>
          {editedPrompt !== null && <button type="button" className={button} disabled={busy}
            onClick={() => { setEditedPrompt(null); setNotice(''); }}>Restaurar texto automático</button>}
        </div>
        {notice && <p role="status">{notice}</p>}
      </section>}
    </div>
  </dialog>;
}
