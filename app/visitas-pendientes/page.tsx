"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type VisitaPendiente = {
  id: number; codigo: string; posicion: string; nombre: string; ubicacion: string; dias: number; tipo: string; propietario: string;
};

export default function Page() {
  const [items, setItems] = useState<VisitaPendiente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/visitas", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudieron cargar las visitas.");
        return body;
      })
      .then((body) => setItems(body.visitas ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las visitas."))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    return items.filter((item) => {
      const coincideTexto = !texto || item.codigo.toLowerCase().includes(texto) || item.nombre.toLowerCase().includes(texto) || item.ubicacion.toLowerCase().includes(texto) || item.posicion.includes(texto) || item.propietario.toLowerCase().includes(texto);
      const coincideFiltro = filtro === "Todas" || (filtro === "Hoy" && item.dias === 0) || (filtro === "1-2 días" && item.dias >= 1 && item.dias <= 2) || (filtro === "Más de 2 días" && item.dias > 2);
      return coincideTexto && coincideFiltro;
    });
  }, [busqueda, filtro, items]);

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">◷</span><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Fase 1 · Seguimiento</p></div><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Visitas pendientes</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Bandeja conectada a la base de datos. Cada inmueble permanece aquí hasta que la visita sea realmente realizada y registrada.</p></div>
          <Link href="/registrar-visitas" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Registrar visita realizada →</Link>
        </header>

        {error && <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}
        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pendientes</p><p className="mt-2 text-3xl font-bold text-amber-950">{items.length}</p><p className="mt-1 text-xs text-amber-800/70">procesos reales</p></div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Requieren atención</p><p className="mt-2 text-3xl font-bold text-rose-950">{items.filter((x) => x.dias > 2).length}</p><p className="mt-1 text-xs text-rose-800/70">más de 2 días</p></div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Al completar</p><p className="mt-2 text-lg font-bold text-violet-950">Tasación pendiente</p><p className="mt-1 text-xs text-violet-700/80">transición automática</p></div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-bold text-slate-900">Procesos pendientes</h2><p className="mt-1 text-xs text-slate-500">{filtrados.length} resultado{filtrados.length === 1 ? "" : "s"}</p></div><div className="flex flex-col gap-2 sm:flex-row"><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar inmueble, DNI, posición..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400 focus:bg-white sm:w-64" /><select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"><option>Todas</option><option>Hoy</option><option>1-2 días</option><option>Más de 2 días</option></select></div></div>
          {cargando ? <div className="p-12 text-center text-sm text-slate-500">Cargando visitas reales...</div> : filtrados.length > 0 ? <div className="divide-y divide-slate-100">{filtrados.map((item) => <div key={item.id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 hover:border-slate-300/70 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">{item.posicion}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{item.nombre}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item.tipo}</span></div><p className="mt-1 text-xs text-slate-500">{item.codigo} · {item.ubicacion} · Propietario: {item.propietario}</p><p className={item.dias > 2 ? "mt-2 text-xs font-semibold text-rose-600" : "mt-2 text-xs font-semibold text-amber-600"}>{item.dias === 0 ? "Registrado hoy" : "Pendiente desde hace " + item.dias + " día" + (item.dias === 1 ? "" : "s")}</p></div><Link href="/registrar-visitas" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Registrar visita</Link></div>)}</div> : <div className="px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</div><p className="mt-3 font-semibold text-slate-900">No hay visitas pendientes</p><p className="mt-1 text-sm text-slate-500">La bandeja está sincronizada con la base de datos.</p></div>}
        </section>
      </div>
    </main>
  );
}
