"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Visita = {
  id: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  tipo: string;
  propietario: string;
  dni: string;
  dias: number;
};

export default function Page() {
  const [items, setItems] = useState<Visita[]>([]);
  const [fechas, setFechas] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [enlacesDrive, setEnlacesDrive] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const response = await fetch("/api/visitas", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar las visitas pendientes.");
      setItems(body.visitas ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las visitas pendientes.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function marcarRealizada(item: Visita) {
    setError(null);
    setMensaje(null);
    if (!fechas[item.id]) {
      setError(`Registra la fecha en que se realizó la visita de “${item.nombre}”.`);
      return;
    }

    setProcesando(item.id);
    try {
      const response = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inmuebleId: item.id,
          fechaVisita: fechas[item.id],
          observaciones: observaciones[item.id] ?? "",
          driveLink: enlacesDrive[item.id] ?? "",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No fue posible registrar la visita.");
      setItems((actuales) => actuales.filter((actual) => actual.id !== item.id));
      setMensaje(`Visita de “${item.nombre}” registrada correctamente. El inmueble pasa a Tasación pendiente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la visita.");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">✓</span><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Fase 1 · Registro de actividad</p></div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Registrar visitas realizadas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Registra la visita cuando realmente haya ocurrido. Cada registro actualiza la cartera y pasa el inmueble a Tasación pendiente.</p>
          </div>
          <Link href="/visitas-pendientes" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300">← Ver visitas pendientes</Link>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Acción principal</p><p className="mt-1 text-sm font-semibold">Confirma la fecha real de la visita y deja la evidencia o notas.</p></div><span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-bold text-violet-200">Siguiente: Tasación</span></div></section>

        {mensaje && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
        {error && <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)]"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Por registrar</p><p className="mt-2 text-3xl font-bold text-slate-950">{items.length}</p><p className="mt-1 text-xs text-slate-500">procesos reales en BD</p></div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Al completar</p><p className="mt-2 text-lg font-bold text-violet-950">Tasación pendiente</p><p className="mt-1 text-xs text-violet-700/80">transición guardada en BD</p></div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Trazabilidad</p><p className="mt-2 text-lg font-bold text-cyan-950">Automática</p><p className="mt-1 text-xs text-cyan-700/80">usuario, fecha y evento</p></div>
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between"><div><h2 className="font-bold text-slate-900">Visitas por confirmar</h2><p className="mt-1 text-xs text-slate-500">La lista proviene directamente de los inmuebles en visita_pendiente.</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{items.length} pendientes</span></div>
          {cargando ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Cargando visitas pendientes...</div> : items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-base font-bold text-violet-700">{item.posicion}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{item.nombre}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item.tipo}</span></div><p className="mt-1 text-xs text-slate-500">{item.ubicacion} · {item.codigo}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario} · DNI {item.dni}</p></div></div>
                        <span className="self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Visita pendiente</span>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div><label htmlFor={`fecha-${item.id}`} className="text-xs font-semibold text-slate-600">Fecha de visita realizada *</label><input id={`fecha-${item.id}`} type="date" max={hoy} value={fechas[item.id] ?? ""} onChange={(e) => setFechas((a) => ({ ...a, [item.id]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></div>
                        <div><label htmlFor={`drive-${item.id}`} className="text-xs font-semibold text-slate-600">Evidencia / fotografías en Google Drive (opcional)</label><input id={`drive-${item.id}`} type="url" value={enlacesDrive[item.id] ?? ""} onChange={(e) => setEnlacesDrive((a) => ({ ...a, [item.id]: e.target.value }))} placeholder="https://drive.google.com/..." className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /><p className="mt-1 text-[11px] text-slate-400">Se guarda el enlace, no el archivo.</p></div>
                      </div>
                      <div><label htmlFor={`obs-${item.id}`} className="text-xs font-semibold text-slate-600">Observación de la visita (opcional)</label><textarea id={`obs-${item.id}`} rows={3} value={observaciones[item.id] ?? ""} onChange={(e) => setObservaciones((a) => ({ ...a, [item.id]: e.target.value }))} placeholder="Ej.: se realizó visita, se tomaron medidas y fotografías..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></div>
                      <div className="flex flex-col gap-3 rounded-xl bg-[#f5f7fa] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-slate-700">Al registrar</p><p className="mt-1 text-xs text-slate-500">La visita queda guardada y el inmueble pasa a <strong>Tasación pendiente</strong>.</p></div><button type="button" disabled={procesando === item.id} onClick={() => marcarRealizada(item)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{procesando === item.id ? "Guardando..." : "Registrar visita realizada"}</button></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div><h3 className="mt-4 font-bold text-emerald-950">No hay visitas pendientes</h3><p className="mt-1 text-sm text-emerald-800/80">La bandeja está sincronizada con la base de datos.</p><Link href="/tasaciones-textos-pendientes" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Ver siguiente etapa</Link></div>
          )}
        </section>
      </div>
    </main>
  );
}
