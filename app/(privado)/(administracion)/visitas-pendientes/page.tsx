"use client";

import { propertyDisplayId } from "@/lib/property-display-id";

import ActiveFilters from "@/app/components/ActiveFilters";
import ZoneContext from "@/app/components/ZoneContext";
import FolderIcon from "@/app/components/FolderIcon";
import { ALL_ZONES, inZone, propertyZone } from "@/lib/property-zones";
import { useSearchParams } from "next/navigation";

import PageHeading from "@/app/components/PageHeading";


import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";

type VisitaPendiente = {
  distrito: string | null; vencida?:boolean;responsable?:string|null;fechaLimite?:string|null;dni:string;id: number; codigo: string; posicion: string; nombre: string; ubicacion: string; dias: number; tipo: string; propietario: string;
};

export default function Page() {
  return <Suspense fallback={<LoadingCards label="Cargando visitas pendientes…" />}><VisitInbox /></Suspense>;
}

function VisitInbox() {
  const params = useSearchParams();
  const zona = params.get("zona")?.trim() || null;
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
      .then((body) => setItems(body.items ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las visitas."))
      .finally(() => setCargando(false));
  }, []);

  const itemsZona = useMemo(() => items.filter(item => inZone(item, zona)), [items, zona]);
  const vencidasZona = itemsZona.filter(item => item.vencida).length;
  const zonas = useMemo(() => {
    const groups = new Map<string, { nombre: string; total: number; vencidas: number }>();
    for (const item of items) {
      const nombre = propertyZone(item);
      const key = nombre.toLocaleLowerCase("es-PE");
      const group = groups.get(key) ?? { nombre, total: 0, vencidas: 0 };
      group.total++;
      if (item.vencida) group.vencidas++;
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-PE"));
  }, [items]);

  function abrirZona(value: string | null) {
    setBusqueda("");
    setFiltro("Todas");
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete("zona"); else next.set("zona", value);
    window.history.pushState(null, "", `/visitas-pendientes${next.size ? `?${next}` : ""}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    return itemsZona.filter((item) => {
      const coincideTexto = !texto || item.codigo.toLowerCase().includes(texto) || item.nombre.toLowerCase().includes(texto) || item.ubicacion.toLowerCase().includes(texto) || item.posicion.includes(texto) || item.propietario.toLowerCase().includes(texto) || item.dni?.includes(texto);
      const coincideFiltro = filtro === "Todas" || (filtro === "Hoy" && item.dias === 0) || (filtro === "1-2 días" && item.dias >= 1 && item.dias <= 2) || (filtro === "Más de 2 días" && item.dias > 2);
      return coincideTexto && coincideFiltro;
    });
  }, [busqueda, filtro, itemsZona]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <PageHeading href="/visitas-pendientes" />
          <Link href="/registrar-visitas" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c80000] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#a90000]">Registrar visita realizada →</Link>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Bandeja de trabajo</p><p className="mt-1 text-sm font-semibold">Primero atiende las visitas con mayor antigüedad.</p></div><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200">{cargando ? "…" : vencidasZona} {vencidasZona === 1 ? "requiere" : "requieren"} atención</span></div></section>

        {error && <Feedback tone="error" className="mt-6">{error}</Feedback>}
        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pendientes</p><p className="mt-2 text-3xl font-bold text-amber-950">{cargando ? "…" : itemsZona.length}</p><p className="mt-1 text-xs text-amber-800/70">{zona && zona !== ALL_ZONES ? `en ${zona}` : "en todas las zonas"}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Requieren atención</p><p className="mt-2 text-3xl font-bold text-amber-950">{cargando ? "…" : vencidasZona}</p><p className="mt-1 text-xs text-amber-800/70">plazo de seguimiento vencido</p></div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Al completar</p><p className="mt-2 text-lg font-bold text-blue-950">Tasación pendiente</p><p className="mt-1 text-xs text-blue-700/80">transición automática</p></div>
        </section>

        {zona === null ? <section aria-labelledby="visit-zones-title" className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="visit-zones-title" className="text-lg font-bold text-slate-900">Visitas pendientes por zona</h2><p className="mt-1 text-sm text-slate-600">Abre una carpeta para revisar y atender sus visitas.</p></div>
            <button type="button" onClick={() => abrirZona(ALL_ZONES)} className="cartera-folder-navigation aa-button aa-button-secondary border-amber-200 bg-amber-50"><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />Ver listado general →</button>
          </div>
          {cargando ? <LoadingCards label="Cargando zonas…" /> : !error && <>
            <ul className="mt-7 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {zonas.map(group => <li key={group.nombre} className="min-w-0">
                <button type="button" onClick={() => abrirZona(group.nombre)} className="cartera-folder relative flex min-h-32 w-full items-center gap-4 rounded-b-2xl rounded-tr-2xl border border-amber-200 bg-amber-50/40 p-5 text-left shadow-sm hover:border-amber-300">
                  <span aria-hidden="true" className="cartera-folder-tab absolute -top-4 -left-px h-4 w-20 rounded-t-lg border border-b-0 border-amber-200 bg-amber-100" />
                  <FolderIcon className="h-10 w-10 shrink-0 text-amber-500" />
                  <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold text-slate-900">{group.nombre}</span><span className="mt-1 block text-sm text-slate-600">{group.total} visita{group.total === 1 ? "" : "s"} pendiente{group.total === 1 ? "" : "s"}</span><span className={`mt-2 block text-xs font-semibold ${group.vencidas ? "text-amber-800" : "text-slate-500"}`}>{group.vencidas ? `${group.vencidas} ${group.vencidas === 1 ? "requiere" : "requieren"} atención` : "Dentro del plazo de seguimiento"}</span></span>
                  <span aria-hidden="true" className="text-slate-400">→</span>
                </button>
              </li>)}
            </ul>
            {zonas.length === 0 && <div className="aa-card mt-5 p-8 text-center"><p className="font-semibold text-slate-900">No hay visitas pendientes</p><p className="mt-2 text-sm text-slate-500">La bandeja está sincronizada con la base de datos.</p></div>}
          </>}
        </section> : <>
        <nav aria-label="Ruta de visitas pendientes" className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" onClick={() => abrirZona(null)} className="cartera-folder-navigation aa-button aa-button-secondary border-amber-200 bg-amber-50"><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />← Volver a zonas</button>
          <ZoneContext name={zona === ALL_ZONES ? "Listado general" : zona} general={zona === ALL_ZONES} />
          {zona !== ALL_ZONES && <button type="button" onClick={() => abrirZona(ALL_ZONES)} className="ml-auto min-h-11 text-sm font-semibold text-[#c80000]">Ver listado general →</button>}
        </nav>
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-bold text-slate-900">{zona === ALL_ZONES ? "Visitas pendientes" : `Visitas pendientes · ${zona}`}</h2><p className="mt-1 text-xs text-slate-500">{filtrados.length} resultado{filtrados.length === 1 ? "" : "s"}</p></div><div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Buscar inmueble, DNI o posición" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar inmueble, DNI, posición..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400 focus:bg-white sm:w-64" /><select aria-label="Filtrar antigüedad de visitas" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"><option>Todas</option><option>Hoy</option><option>1-2 días</option><option>Más de 2 días</option></select></div></div>
          <ActiveFilters labels={[busqueda.trim() && `Búsqueda: ${busqueda}`, filtro !== "Todas" && `Antigüedad: ${filtro}`]} onClear={() => { setBusqueda(""); setFiltro("Todas"); }} />
          {cargando ? <LoadingCards label="Cargando visitas pendientes…" /> : filtrados.length > 0 ? <div className="divide-y divide-slate-100">{filtrados.map((item) => <div key={item.id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 hover:border-slate-300/70 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">{item.posicion}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{item.nombre}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.tipo}</span></div><p className="mt-1 text-xs text-slate-500">{propertyDisplayId(item)} · {item.ubicacion} · Propietario: {item.propietario}</p>{item.fechaLimite && <p className="mt-2 text-xs text-slate-600">Fecha límite: {item.fechaLimite}</p>}<p className={item.dias > 2 ? "mt-2 text-xs font-semibold text-amber-600" : "mt-2 text-xs font-semibold text-amber-600"}>{item.dias === 0 ? "Registrado hoy" : "Pendiente desde hace " + item.dias + " día" + (item.dias === 1 ? "" : "s")}</p></div><Link href={`/registrar-visitas?inmueble=${item.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Registrar visita</Link></div>)}</div> : <div className="px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</div><p className="mt-3 font-semibold text-slate-900">{error?"No se pudo consultar la bandeja":itemsZona.length?"No hay resultados con estos filtros":`No hay visitas pendientes${zona !== ALL_ZONES ? ` en ${zona}` : ""}`}</p><p className="mt-1 text-sm text-slate-500">{error?"Vuelve a cargar la pantalla para consultar las visitas.":itemsZona.length?"Prueba otra búsqueda o cambia el filtro.":"La bandeja está sincronizada con la base de datos."}</p></div>}
        </section>
        </>}
      </div>
    </main>
  );
}
