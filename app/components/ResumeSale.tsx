'use client';
import { useState } from 'react';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { requestJson } from '@/lib/client-request';

type Position = { id: number; zonaId: number; numero: number; disponible: boolean };
export default function ResumeSale({ propertyId, zoneId, zone, contact, positions, onSaved }: {
  propertyId: number; zoneId: number; zone: string; contact: string;
  positions: Position[]; onSaved: () => Promise<void>;
}) {
  const [position, setPosition] = useState('');
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function resume() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await requestJson(`/api/liberaciones/retomar?zona=${encodeURIComponent(zone)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inmuebleId: propertyId, posicionId: Number(position), confirmacion: 'RETOMAR' }) });
      setConfirming(false);
      await onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo retomar la venta.'); }
    finally { setBusy(false); }
  }
  const available = positions.filter(p => p.zonaId === zoneId && p.disponible);
  return <section className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label="Retomar venta suspendida">
    <h4 className="font-semibold text-slate-900">Venta suspendida por el propietario</h4>
    <p className="text-sm text-slate-600">Conserva su ficha y antecedentes. Selecciona una posición disponible en {zone} para volver a cartera activa. Revisa precios y condiciones antes de publicar.</p>
    <label className="block text-sm font-semibold">Nueva posición disponible<select disabled={busy} value={position} onChange={event => setPosition(event.target.value)} className="aa-input mt-2 w-full"><option value="">Seleccionar posición</option>{available.map(p => <option key={p.id} value={p.id}>Posición {String(p.numero).padStart(3, '0')}</option>)}</select></label>
    {!available.length && <p className="text-sm">No hay posiciones disponibles en esta zona.</p>}
    <button type="button" disabled={busy || !position} onClick={() => { setError(''); setConfirming(true); }} className="aa-button aa-button-primary">Retomar en cartera</button>
    {error && !confirming && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {confirming && <ConfirmDialog title="Retomar venta en cartera activa" confirmLabel="Confirmar retorno a cartera" busy={busy} onCancel={() => { setConfirming(false); setError(''); }} onConfirm={() => void resume()}><p className="font-semibold">{contact}</p><p>Se reactivará la misma ficha en {zone}, posición {available.find(p => String(p.id) === position)?.numero}. Se conservarán documentos, fotos, precios e historial. Los plazos existentes se conservan; revisa su vigencia al retomar.</p>{error && <p role="alert" className="text-red-700">{error}</p>}</ConfirmDialog>}
  </section>;
}
