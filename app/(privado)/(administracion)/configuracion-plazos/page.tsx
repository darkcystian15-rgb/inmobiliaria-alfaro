"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { requestJson } from '@/lib/client-request';
import { deadlineStages } from '@/lib/deadline-stages';

export default function DeadlineSettings() {
  const [items, setItems] = useState<{ actividad: string; dias: number }[]>([]);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ items: typeof items }>('/api/plazos', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setItems(data.items.filter(item => deadlineStages[item.actividad])); })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudieron consultar los plazos.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <header className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Administración · Todos los inmuebles</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Plazos generales</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">Define cuántos días tiene cada etapa. Estos valores se aplican a todos los inmuebles que no tengan una fecha particular.</p>
    </header>
    <aside className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
      <p className="font-bold">¿Cómo se cuentan los plazos?</p>
      <p className="mt-1">Cada plazo se cuenta desde que se activa su etapa; no todos empiezan al registrar el inmueble. Cambiar un valor recalcula las alertas de los pendientes que usan el plazo general.</p>
      <p className="mt-2">Las fechas particulares y las fechas de actividades ya realizadas se conservan. Para una excepción, abre la ficha del inmueble en <Link href="/datos-inmuebles" className="font-semibold underline underline-offset-2">Seguimiento e historial</Link>.</p>
    </aside>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <section aria-label="Plazos por etapa" aria-busy={loading} className="mt-7">
      <div className="mb-4"><h2 className="text-lg font-bold text-slate-900">Etapas y tiempos de atención</h2><p className="mt-1 text-sm text-slate-500">Días calendario · De 1 a 365 días por etapa · Guarda cada cambio por separado.</p></div>
      {loading && <p className="py-6 text-sm text-slate-500">Cargando plazos…</p>}
      <div className="space-y-3">{items.map(item => <form key={item.actividad} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError(''); setMessage('');
        try {
          await requestJson('/api/plazos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
          setMessage(`Plazo general actualizado: ${deadlineStages[item.actividad].label}, ${item.dias} días.`);
        } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo guardar.'); }
        finally { setBusy(false); }
      }}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1"><h3 className="font-bold text-slate-900">{deadlineStages[item.actividad].label}</h3><p id={`stage-${item.actividad}`} className="mt-1 text-sm leading-6 text-slate-500">{deadlineStages[item.actividad].description}</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-600">{deadlineStages[item.actividad].label} · días<input aria-describedby={`stage-${item.actividad}`} type="number" required min={1} max={365} value={item.dias} disabled={busy} onChange={e => setItems(previous => previous.map(value => value.actividad === item.actividad ? { ...value, dias: Number(e.target.value) } : value))} className="aa-input mt-2 block w-28" /></label>
            <button disabled={busy} className="aa-button aa-button-primary">Guardar plazo</button>
          </div>
        </div>
      </form>)}</div>
    </section>
  </main>;
}
