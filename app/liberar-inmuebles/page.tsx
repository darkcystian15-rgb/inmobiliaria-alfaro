"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  inmuebleId: number; codigo: string; posicion: string; nombre: string; ubicacion: string;
  tipo: string; propietario: string; dni: string; etapa: string;
};

const motivos = [
  { value: "vendido", label: "Vendido" },
  { value: "cancelacion_propietario", label: "Cancelación del propietario" },
  { value: "cancelacion_externa", label: "Cancelación externa" },
  { value: "otro", label: "Otro" },
];

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [selecciones, setSelecciones] = useState<Record<number, string>>({});
  const [detalles, setDetalles] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      setCargando(true); setError("");
      const response = await fetch("/api/liberaciones", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron cargar los inmuebles.");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los inmuebles.");
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => [x.codigo, x.nombre, x.ubicacion, x.propietario, x.dni, x.posicion].join(" ").toLowerCase().includes(q));
  }, [items, busqueda]);

  const liberar = async (item: Item) => {
    setError(""); setMensaje("");
    const motivo = selecciones[item.inmuebleId] ?? "";
    const detalleOtro = detalles[item.inmuebleId]?.trim() ?? "";
    if (!motivo) return setError(`Selecciona el motivo para “${item.nombre}”.`);
    if (motivo === "otro" && !detalleOtro) return setError(`Indica el detalle del motivo para “${item.nombre}”.`);
    if (!window.confirm(`¿Confirmar la liberación de “${item.nombre}” (posición ${item.posicion})?\n\nSaldrá de la cartera activa y conservará su registro histórico.`)) return;

    try {
      setGuardando(item.inmuebleId);
      const response = await fetch("/api/liberaciones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inmuebleId: item.inmuebleId, motivo, detalleOtro }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible liberar el inmueble.");
      setMensaje(`“${item.nombre}” fue liberado correctamente. La posición ${item.posicion} queda disponible.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible liberar el inmueble.");
    } finally { setGuardando(null); }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-rose-500">Fase 1 · Gestión de cartera</p>
            <div className="mt-2 flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">↗</span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">Liberar inmueble</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Registra la salida de un inmueble de la cartera activa. Se conserva el histórico y se libera su posición.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"><span className="font-semibold text-slate-900">{items.length}</span><span className="ml-1 text-slate-500">inmuebles activos</span></div>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Acción principal</p>
              <p className="mt-1 text-sm font-semibold">Selecciona el motivo de salida y confirma. La posición quedará disponible y el histórico se conservará.</p>
            </div>
            <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5 text-xs font-bold text-rose-200">Salida → posición libre</span>
          </div>
        </section>

        {mensaje && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar inmueble
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Código, nombre, propietario, DNI, ubicación o posición..." className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400" />
          </label>
        </section>

        <section className="mt-6">
          {cargando ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Cargando cartera activa...</div> :
          filtrados.length === 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div><h2 className="mt-4 font-bold text-emerald-950">{items.length === 0 ? "No hay inmuebles activos" : "No hay coincidencias"}</h2><p className="mt-1 text-sm text-emerald-800/80">{items.length === 0 ? "Cuando existan inmuebles activos aparecerán aquí para registrar su salida." : "Prueba con otro término de búsqueda."}</p></div> :
          <div className="space-y-4">{filtrados.map((item) => {
            const motivo = selecciones[item.inmuebleId] ?? "";
            return <article key={item.inmuebleId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5 lg:p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-base font-bold text-rose-700">{item.posicion}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{item.nombre}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item.tipo}</span></div><p className="mt-1 text-xs text-slate-500">{item.ubicacion} · {item.codigo}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario} · DNI {item.dni}</p></div></div>
                    <span className="self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Activo</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                    <label className="text-xs font-semibold text-slate-600">Motivo de liberación *
                      <select value={motivo} onChange={(e) => setSelecciones((c) => ({ ...c, [item.inmuebleId]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="">Seleccionar motivo</option>{motivos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                    </label>
                    {motivo === "otro" ? <label className="text-xs font-semibold text-slate-600">Detalle *
                      <input value={detalles[item.inmuebleId] ?? ""} onChange={(e) => setDetalles((c) => ({ ...c, [item.inmuebleId]: e.target.value }))} placeholder="Describe brevemente el motivo..." className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" />
                    </label> : <div className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">La liberación quedará registrada con fecha, motivo y trazabilidad del usuario.</div>}
                  </div>
                  <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Al confirmar, sale de activos y su posición deja de estar ocupada.</p><button disabled={guardando === item.inmuebleId} onClick={() => liberar(item)} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">{guardando === item.inmuebleId ? "Liberando..." : "Confirmar liberación"}</button></div>
                </div>
              </div>
            </article>;
          })}</div>}
        </section>
      </div>
    </main>
  );
}