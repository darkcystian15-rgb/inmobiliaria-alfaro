"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Tasacion = {
  id: number;
  inmuebleId: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  tipo: string;
  propietario: string;
  dni: string;
  fechaTasacion?: string | null;
  valorReferencia?: string | null;
  precioObjetivo?: string | null;
  situacion?: string | null;
  observacion?: string | null;
};

const situacionesOpciones = [
  { value: "pendiente_aprobacion", label: "Pendiente de aprobación" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "aprobado", label: "Aprobado" },
  { value: "rechazado", label: "Rechazado" },
];

export default function Page() {
  const [items, setItems] = useState<Tasacion[]>([]);
  const [aprobadas, setAprobadas] = useState<Tasacion[]>([]);
  const [fechas, setFechas] = useState<Record<number, string>>({});
  const [valores, setValores] = useState<Record<number, string>>({});
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [situaciones, setSituaciones] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);

  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const cargar = async () => {
    try {
      setCargando(true);
      setError("");
      const response = await fetch("/api/tasaciones", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron cargar las tasaciones.");
      setItems(data.pendientes ?? []);
      setAprobadas(data.aprobadas ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las tasaciones.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const registrar = async (item: Tasacion) => {
    setError("");
    setMensaje("");
    const fecha = fechas[item.inmuebleId];
    const situacion = situaciones[item.inmuebleId];
    if (!fecha) return setError(`Registra la fecha de la tasación de “${item.nombre}”.`);
    if (!situacion) return setError(`Selecciona la situación frente al propietario para “${item.nombre}”.`);

    try {
      setGuardando(item.inmuebleId);
      const response = await fetch("/api/tasaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inmuebleId: item.inmuebleId,
          fechaTasacion: fecha,
          valorReferencia: valores[item.inmuebleId] || null,
          precioObjetivo: precios[item.inmuebleId] || null,
          situacion,
          observacion: observaciones[item.inmuebleId] || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible registrar la tasación.");
      setMensaje(`Tasación de “${item.nombre}” registrada correctamente.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la tasación.");
    } finally {
      setGuardando(null);
    }
  };

  const actualizarSituacion = async (item: Tasacion, situacion: string) => {
    try {
      setGuardando(item.inmuebleId);
      const response = await fetch("/api/tasaciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inmuebleId: item.inmuebleId, situacion }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible actualizar la situación.");
      setMensaje(`Situación de “${item.nombre}” actualizada.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la situación.");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-orange-500">Fase 1 · Gestión comercial</p>
            <div className="mt-2 flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">ₛ</span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">Registrar tasaciones realizadas</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Registra la tasación vigente y la situación frente al propietario. La tasación se guarda en la base de datos y permanece como única tasación vigente del inmueble.</p>
              </div>
            </div>
          </div>
          <Link href="/tasaciones-textos-pendientes" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300">Ver seguimiento →</Link>
        </div>

        {mensaje && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)]"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Por registrar</p><p className="mt-2 text-3xl font-bold text-slate-950">{items.length}</p><p className="mt-1 text-xs text-slate-500">inmuebles con visita realizada</p></div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Tasación vigente</p><p className="mt-2 text-3xl font-bold text-slate-950">{aprobadas.length}</p><p className="mt-1 text-xs text-orange-700/80">aprobadas actualmente</p></div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Fuente</p><p className="mt-2 text-lg font-bold text-cyan-950">Base de datos</p><p className="mt-1 text-xs text-cyan-700/80">sin datos ficticios</p></div>
        </section>

        <section className="mt-7">
          <div className="mb-3"><h2 className="font-bold text-slate-900">Tasaciones por registrar</h2><p className="mt-1 text-sm text-slate-500">Estos inmuebles ya tienen visita realizada y están en etapa de tasación pendiente.</p></div>
          {cargando ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Cargando...</div> : items.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div><h3 className="mt-4 font-bold text-emerald-950">No hay tasaciones pendientes</h3><p className="mt-1 text-sm text-emerald-800/80">Las visitas realizadas ya tienen tasación registrada o no existen inmuebles pendientes.</p></div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.inmuebleId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-base font-bold text-orange-700">{item.posicion}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{item.nombre}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item.tipo}</span></div><p className="mt-1 text-xs text-slate-500">{item.ubicacion} · {item.codigo}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario} · DNI {item.dni}</p></div></div>
                        <span className="self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Tasación pendiente</span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600">Fecha de tasación *<input type="date" max={hoy} value={fechas[item.inmuebleId] ?? ""} onChange={(e) => setFechas(a => ({...a,[item.inmuebleId]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                        <label className="text-xs font-semibold text-slate-600">Valor referencial<input type="number" min="0" step="0.01" value={valores[item.inmuebleId] ?? ""} onChange={(e) => setValores(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder="320000" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                        <label className="text-xs font-semibold text-slate-600">Precio objetivo<input type="number" min="0" step="0.01" value={precios[item.inmuebleId] ?? ""} onChange={(e) => setPrecios(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder="315000" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                        <label className="text-xs font-semibold text-slate-600">Situación *<select value={situaciones[item.inmuebleId] ?? ""} onChange={(e) => setSituaciones(a => ({...a,[item.inmuebleId]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="">Seleccionar</option>{situacionesOpciones.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
                      </div>
                      <label className="text-xs font-semibold text-slate-600">Observación<textarea rows={3} value={observaciones[item.inmuebleId] ?? ""} onChange={(e) => setObservaciones(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder="Precio conversado, ajustes, comentarios del propietario..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /></label>
                      <div className="flex flex-col gap-3 rounded-xl bg-[#f5f7fa] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Al guardar, el inmueble avanza automáticamente según la situación registrada.</p><button disabled={guardando === item.inmuebleId} onClick={() => registrar(item)} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{guardando === item.inmuebleId ? "Guardando..." : "Registrar tasación"}</button></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Tasaciones registradas y situación actual</h2><p className="mt-1 text-xs text-slate-500">Aquí se puede actualizar la situación sin crear otra tasación.</p></div>
          <div className="divide-y divide-slate-100">
            {aprobadas.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Todavía no hay tasaciones aprobadas.</div> : aprobadas.map(item => (
              <div key={item.inmuebleId} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-semibold text-slate-900">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">{item.codigo} · posición {item.posicion} · {item.ubicacion}</p><p className="mt-1 text-xs text-slate-500">Tasación: {item.valorReferencia ? `S/ ${item.valorReferencia}` : "sin valor"}{item.precioObjetivo ? ` · objetivo S/ ${item.precioObjetivo}` : ""}</p></div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><select value={item.situacion ?? "aprobado"} disabled={guardando === item.inmuebleId} onChange={e => actualizarSituacion(item,e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="pendiente_aprobacion">Pendiente de aprobación</option><option value="en_negociacion">En negociación</option><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option></select>{item.situacion === "aprobado" && <Link href="/tasaciones-textos-pendientes" className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white">Preparar texto →</Link>}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
