"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Estado = "Activo" | "Histórico";
type Etapa =
  | "Visita pendiente"
  | "Visita realizada"
  | "Tasación pendiente"
  | "Pendiente de aprobación"
  | "En negociación"
  | "Listo para publicar"
  | "Publicado";

type Inmueble = {
  id: string;
  posicion?: number;
  tipo: "Casa" | "Departamento" | "Terreno" | "Local" | "Oficina" | "Otros";
  nombre: string;
  ubicacion: string;
  estado: Estado;
  etapa?: Etapa;
  propietario: string;
  motivoLiberacion?: string;
};

const activos: Inmueble[] = [];
const historicos: Inmueble[] = [];

const etapaTone: Record<Etapa, string> = {
  "Visita pendiente": "bg-amber-50 text-amber-700",
  "Visita realizada": "bg-violet-50 text-violet-700",
  "Tasación pendiente": "bg-orange-50 text-orange-700",
  "Pendiente de aprobación": "bg-pink-50 text-pink-700",
  "En negociación": "bg-violet-50 text-violet-700",
  "Listo para publicar": "bg-indigo-50 text-indigo-700",
  "Publicado": "bg-emerald-50 text-emerald-700",
};

function Icon({ name }: { name: "home" | "search" | "filter" | "map" | "close" | "arrow" | "history" }) {
  const common = { className: "h-[17px] w-[17px]", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes = {
    home: <path d="m3 10 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />,
    search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    map: <><path d="M4 6.5 9 4l6 3 5-2.5v13L15 20l-6-3-5 2.5v-13Z" /><path d="M9 4v13M15 7v13" /></>,
    close: <><path d="m7 7 10 10M17 7 7 17" /></>,
    arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
  };
  return <svg {...common}>{shapes[name]}</svg>;
}

export default function CarteraPage() {
  const [estado, setEstado] = useState<"Todos" | Estado>("Activo");
  const [etapa, setEtapa] = useState("Todas");
  const [tipo, setTipo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"posiciones" | "lista">("posiciones");
  const [seleccionado, setSeleccionado] = useState<Inmueble | null>(null);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    fetch("/api/cartera")
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar la cartera.");
        return res.json();
      })
      .then((data) => {
        if (activo) setInmuebles(data.inmuebles ?? []);
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : "No se pudo cargar la cartera.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, []);

  const activos = useMemo(() => inmuebles.filter((x) => x.estado === "Activo"), [inmuebles]);
  const historicos = useMemo(() => inmuebles.filter((x) => x.estado === "Histórico"), [inmuebles]);
  const todos = inmuebles;
  const filtrados = useMemo(() => todos.filter((x) => {
    const texto = busqueda.toLowerCase().trim();
    const coincideTexto = !texto || `${x.id} ${x.posicion ?? ""} ${x.nombre} ${x.ubicacion} ${x.propietario}`.toLowerCase().includes(texto);
    return (estado === "Todos" || x.estado === estado)
      && (etapa === "Todas" || x.etapa === etapa)
      && (tipo === "Todos" || x.tipo === tipo)
      && coincideTexto;
  }), [estado, etapa, tipo, busqueda]);

  const activosCount = activos.length;
  const disponibles = 90 - activosCount;
  const visitasPendientes = activos.filter(x => x.etapa === "Visita pendiente").length;
  const tasacionesPendientes = activos.filter(x => x.etapa === "Tasación pendiente").length;
  const negociacion = activos.filter(x => x.etapa === "En negociación").length;
  const listos = activos.filter(x => x.etapa === "Listo para publicar").length;

  const limpiarFiltros = () => {
    setEstado("Activo");
    setEtapa("Todas");
    setTipo("Todos");
    setBusqueda("");
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-slate-400"><span>Fase 1</span><span className="text-slate-300">/</span><span>Cartera</span></div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Cartera de inmuebles</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Control de las 90 posiciones activas y consulta separada del histórico. Una posición identifica una ubicación de cartera, no al inmueble.</p>
          </div>
          <Link href="/registrar-inmueble" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">+ Registrar inmueble</Link>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {([
            ["En cartera", activosCount, "de 90", "bg-blue-50 text-blue-600", "home"],
            ["Disponibles", disponibles, "posiciones reutilizables", "bg-slate-100 text-slate-600", "map"],
            ["Visitas pendientes", visitasPendientes, "por atender", "bg-amber-50 text-amber-600", "filter"],
            ["Tasaciones pendientes", tasacionesPendientes, "por atender", "bg-orange-50 text-orange-600", "filter"],
            ["En negociación", negociacion, "pendientes de aprobación", "bg-violet-50 text-violet-600", "arrow"],
          ] as const).map(([label, value, detail, tone, icon]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon name={icon} /></span></div>
              <div className="mt-3 flex items-end gap-2"><span className="text-2xl font-bold text-slate-950">{value}</span><span className="pb-0.5 text-[11px] text-slate-400">{detail}</span></div>
            </div>
          ))}
        </div>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
        {cargando && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">Cargando cartera desde la base de datos…</div>}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" /></span>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por posición, ID, inmueble, ubicación o propietario..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" />
            </div>
            <select value={estado} onChange={e => setEstado(e.target.value as "Todos" | Estado)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"><option>Activo</option><option>Todos</option><option>Histórico</option></select>
            <select value={etapa} onChange={e => setEtapa(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"><option>Todas</option>{Object.keys(etapaTone).map(x => <option key={x}>{x}</option>)}</select>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"><option>Todos</option><option>Casa</option><option>Departamento</option><option>Terreno</option><option>Local</option><option>Oficina</option><option>Otros</option></select>
            <div className="flex rounded-xl border border-slate-200 p-1"><button onClick={() => setVista("posiciones")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista === "posiciones" ? "bg-slate-900 text-white" : "text-slate-500"}`}>Posiciones</button><button onClick={() => setVista("lista")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista === "lista" ? "bg-slate-900 text-white" : "text-slate-500"}`}>Lista</button></div>
            {(busqueda || estado !== "Activo" || etapa !== "Todas" || tipo !== "Todos") && <button onClick={limpiarFiltros} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Limpiar</button>}
          </div>
        </section>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-900">{estado === "Histórico" ? "Histórico de inmuebles" : "Posiciones de cartera"}</h2><p className="mt-1 text-xs text-slate-500">Mostrando {filtrados.length} registro{filtrados.length === 1 ? "" : "s"} con los filtros actuales.</p></div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />Activo</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-500" />Histórico</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-300" />Disponible</span></div>
        </div>

        {vista === "posiciones" && estado !== "Histórico" ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
            {Array.from({ length: 90 }, (_, i) => i + 1).map(pos => {
              const x = activos.find(item => item.posicion === pos);
              return <button key={pos} onClick={() => x && setSeleccionado(x)} disabled={!x} className={`group min-h-[112px] rounded-2xl border p-3 text-left transition ${x ? "border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" : "border-dashed border-slate-200 bg-slate-50/70"}`}>
                <div className="flex items-start justify-between"><span className={`text-sm font-bold ${x ? "text-slate-800" : "text-slate-300"}`}>{String(pos).padStart(2, "0")}</span>{x ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : <span className="text-lg font-light text-slate-300">+</span>}</div>
                {x ? <><div className="mt-3 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon name="home" /></div><p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-700">{x.nombre}</p><span className={`mt-2 inline-block max-w-full truncate rounded-full px-2 py-1 text-[9px] font-semibold ${etapaTone[x.etapa!]}`}>{x.etapa}</span></> : <p className="mt-5 text-[10px] font-medium text-slate-400">Disponible</p>}
              </button>;
            })}
          </div>
        ) : (
          <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
            <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">ID</th><th className="px-5 py-3">Pos.</th><th className="px-5 py-3">Inmueble</th><th className="px-5 py-3">Ubicación</th><th className="px-5 py-3">Etapa</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Liberación</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{filtrados.map(x => <tr key={x.id} className="hover:bg-slate-50 hover:border-slate-300"><td className="px-5 py-4 text-[11px] font-semibold text-slate-400">{x.id}</td><td className="px-5 py-4 text-sm font-bold text-slate-700">{x.posicion ? String(x.posicion).padStart(2,"0") : "—"}</td><td className="px-5 py-4"><p className="text-sm font-semibold text-slate-800">{x.nombre}</p><p className="mt-1 text-xs text-slate-400">{x.tipo}</p></td><td className="px-5 py-4 text-sm text-slate-600">{x.ubicacion}</td><td className="px-5 py-4">{x.etapa ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${etapaTone[x.etapa]}`}>{x.etapa}</span> : <span className="text-xs text-slate-400">—</span>}</td><td className="px-5 py-4 text-xs font-semibold text-slate-600">{x.estado}</td><td className="px-5 py-4 text-xs text-slate-500">{x.motivoLiberacion ?? "—"}</td><td className="px-5 py-4 text-right"><button onClick={() => setSeleccionado(x)} className="text-xs font-semibold text-slate-600 hover:text-slate-950">Ver detalle →</button></td></tr>)}</tbody></table></div>
          </section>
        )}

        {filtrados.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold text-slate-700">No encontramos inmuebles</p><p className="mt-1 text-sm text-slate-400">Prueba cambiando los filtros o la búsqueda.</p></div>}

        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon name="map" /></span><div><p className="text-sm font-semibold text-slate-800">Capacidad de cartera</p><p className="mt-1 text-xs text-slate-500">{activosCount} de 90 posiciones ocupadas · {disponibles} disponibles y reutilizables tras una liberación confirmada.</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${(activosCount / 90) * 100}%` }} /></div></div>
          <Link href="/liberar-inmuebles" className="flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"><Icon name="history" />Gestionar liberaciones</Link>
        </div>

        {seleccionado && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setSeleccionado(null)}><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">{seleccionado.posicion ? `Posición ${String(seleccionado.posicion).padStart(2,"0")}` : "Sin posición activa"}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${seleccionado.estado === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{seleccionado.estado}</span></div><h3 className="mt-3 text-xl font-bold text-slate-950">{seleccionado.nombre}</h3><p className="mt-1 text-sm text-slate-500">{seleccionado.tipo} · {seleccionado.ubicacion}</p></div><button onClick={() => setSeleccionado(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Icon name="close" /></button></div><div className="mt-6 grid gap-4 rounded-2xl bg-[#f5f7fa] p-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ID del inmueble</p><p className="mt-1 text-sm font-semibold text-slate-700">{seleccionado.id}</p></div>{seleccionado.etapa && <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Etapa actual</p><span className={`mt-2 inline-block rounded-full px-3 py-1.5 text-xs font-semibold ${etapaTone[seleccionado.etapa]}`}>{seleccionado.etapa}</span></div>}<div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Propietario</p><p className="mt-1 text-sm font-medium text-slate-700">{seleccionado.propietario}</p></div>{seleccionado.motivoLiberacion && <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Motivo de liberación</p><p className="mt-1 text-sm font-medium text-slate-700">{seleccionado.motivoLiberacion}</p></div>}</div><div className="mt-5 grid grid-cols-2 gap-2"><Link href="/datos-inmuebles" className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300">Ver ficha</Link><button onClick={() => setSeleccionado(null)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white">Cerrar</button></div></div></div>}
      </div>
    </main>
  );
}
