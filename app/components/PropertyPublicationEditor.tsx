"use client";
import { useEffect, useState } from 'react';
import { requestJson } from '@/lib/client-request';

export default function PropertyPublicationEditor({ propertyId, text, exists, onSaved, onBusyChange, onDirtyChange }: {
  propertyId: number; text: string; exists: boolean; onSaved: () => Promise<void>;
  onBusyChange: (value: boolean) => void; onDirtyChange: (value: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { onDirtyChange(editing); return () => onDirtyChange(false); }, [editing, onDirtyChange]);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy || !draft.trim()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await requestJson('/api/publicaciones', { method: exists ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inmuebleId: propertyId, texto: draft.trim() }) });
      await onSaved(); setEditing(false); setMessage('Texto guardado con historial.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar el texto.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {editing ? <form onSubmit={event => void save(event)} className="space-y-3 rounded-xl border border-slate-200 p-4"><label className="block text-sm font-semibold">Texto de publicación<textarea required rows={8} value={draft} disabled={busy} onChange={event => setDraft(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm" /></label><p className="text-xs text-slate-600">El envío a la web se gestiona desde Portal web.</p><div className="flex flex-wrap gap-3"><button disabled={busy} className="aa-button aa-button-primary">{busy ? 'Guardando…' : 'Guardar texto'}</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setError(''); }} className="aa-button aa-button-secondary">Cancelar</button></div></form> : <button type="button" onClick={() => { setDraft(text); setEditing(true); setError(''); setMessage(''); }} className="aa-button aa-button-secondary">{exists ? 'Editar texto de publicación' : 'Preparar texto de publicación'}</button>}
  </div>;
}
