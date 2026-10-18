"use client";

import { propertyPanelId } from "@/lib/property-panel-id.mjs";
import PropertyTaskSearch from "@/app/components/PropertyTaskSearch";
import { filterTaskProperties } from "@/lib/property-task-list.mjs";

import PropertyListIdentity from "@/app/components/PropertyListIdentity";

import DraftRecovery from "@/app/components/DraftRecovery";
import PageHeading from "@/app/components/PageHeading";


import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

import { requestJson } from "@/lib/client-request";

import { ContextLink as Link, NavigationReturnProvider } from "@/app/components/NavigationReturn";
import { useSearchParams } from "next/navigation";
import FolderIcon from "@/app/components/FolderIcon";
import ZoneFolderCard from "@/app/components/ZoneFolderCard";
import ZoneContext from "@/app/components/ZoneContext";
import { ALL_ZONES, inZone, propertyZone } from "@/lib/property-zones";
import { useCallback, useEffect, useState, useRef, Suspense, useMemo } from "react";
import PublicationChecklist, { type Checklist } from "@/app/components/PublicationChecklist";
import SalePriceEditor from "@/app/components/SalePriceEditor";

type Item = {
  zona?:string; distrito?: string | null;
  expediente?: Checklist;
  texto?: string | null;
  inmuebleId: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  direccion: string | null;
  tipo: string;
  operacion: string;
  propietario: string;
  valorReferencia?: string | null;
  precioObjetivo?: string | null;
  precioVenta?: string | null;
  situacion?: string | null;
  observacion?: string | null;
  fechaTasacion?: string | null;
};

type Publicada = {
  nombreContacto: string | null;
  ubicacion: string;
  direccion: string | null;
  zona?:string; distrito?: string | null;
  expediente?: Checklist;
  inmuebleId: number;
  codigo: string;
  tipo: string;
  operacion: string;
  referencia: string;
  posicion: number | null;
  publicado: boolean;
  fechaPublicacion: string | null;
  texto: string | null;
};

export default function TasacionesTextosPendientesPage() {
  return <Suspense fallback={<LoadingCards label="Cargando bandeja…" />}><TasacionesTextosContent /></Suspense>;
}

function TasacionesTextosContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("inmueble");
  const [busqueda, setBusqueda] = useState(searchParams.get("buscar") || "");
  const [fragment, setFragment] = useState("");
  useEffect(() => {
    const sync = () => setFragment(window.location.hash);
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  const zone = searchParams.get("zona") || (selectedId || fragment ? ALL_ZONES : null);
  function abrirZona(value: string | null) {
    const url = new URL(window.location.href);
    if (value === null) url.searchParams.delete("zona"); else url.searchParams.set("zona", value);
    url.searchParams.delete("inmueble");
    url.searchParams.delete("buscar");
    setBusqueda("");
    url.hash = "";
    setFragment("");
    window.history.pushState(null, "", url.pathname + url.search);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const materialBase=useRef<Record<number,string>>({});
  const [pendientesTasacion, setPendientesTasacion] = useState<Item[]>([]);
  const [registradas, setRegistradas] = useState<Item[]>([]);
  const [aprobadas, setAprobadas] = useState<Item[]>([]);

  const [textos, setTextos] = useState<Record<number, string>>({});

  const [textosListos, setTextosListos] = useState<
    Record<number, string>
  >({});

  const [listos, setListos] = useState<Publicada[]>([]);

  const [publicadas, setPublicadas] = useState<Publicada[]>(
  []
);

  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState<number | null>(
    null
  );

  const [actualizandoMaterial, setActualizandoMaterial] =
    useState<number | null>(null);

  const [publicando, setPublicando] = useState<number | null>(
    null
  );

  /*
   * Inmueble seleccionado para confirmar publicación.
   */
  const [confirmarPublicacion, setConfirmarPublicacion] =
    useState<Publicada | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = useCallback((signal?: AbortSignal) => {
    if (!signal?.aborted) { setCargando(true); setError(""); setErrorCarga(false); }
    return Promise.all([
      requestJson<{ pendientes: Item[]; registradas: Item[] }>("/api/tasaciones", { signal }),
      requestJson<{ pendientes: Item[]; listos: Publicada[]; incompletos?: Publicada[]; publicadas: Publicada[] }>("/api/publicaciones", { signal }),
    ]).then(data => {
      if (signal?.aborted) return;
      const [tasaciones, publicaciones] = data;
      setPendientesTasacion(tasaciones.pendientes ?? []);
      setRegistradas((tasaciones.registradas ?? []).filter(item => item.situacion === "aprobado"));
      setAprobadas((publicaciones.pendientes ?? []));
      setListos([...(publicaciones.listos ?? []), ...(publicaciones.incompletos ?? [])]);
      setPublicadas((publicaciones.publicadas ?? []));
      const newBase=Object.fromEntries([...(publicaciones.listos??[]),...(publicaciones.incompletos??[]),...(publicaciones.publicadas??[])].map(item=>[item.inmuebleId,item.texto??'']));
      const oldBase=materialBase.current;
      setTextosListos(previous=>Object.fromEntries(Object.entries(newBase).map(([id,value])=>[id,previous[Number(id)]!==undefined&&previous[Number(id)]!==oldBase[Number(id)]?previous[Number(id)]:value])));
      materialBase.current=newBase;
    }).catch(error => {
      if (!signal?.aborted) { setErrorCarga(true); setError(error instanceof Error ? error.message : "No se pudo cargar la bandeja."); }
    }).finally(() => {
      if (!signal?.aborted) setCargando(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { if (!controller.signal.aborted) void cargar(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [cargar]);

  async function guardarTexto(item: Item) {
    const texto = (
      textos[item.inmuebleId] || ""
    ).trim();

    if (!texto) {
      setError(
        "Ingresa el texto de publicación."
      );
      return;
    }

    try {
      setGuardando(item.inmuebleId);
      setMensaje("");
      setError("");

      const response = await fetch(
        "/api/publicaciones",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inmuebleId: item.inmuebleId,
            texto,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "No se pudo registrar la publicación."
        );
      }

      setMensaje(
        `${propertyPanelId(item)} quedó listo para publicar.`
      );

      setTextos(current=>{const next={...current};delete next[item.inmuebleId];return next;});
      setCargando(true);
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el texto."
      );
    } finally {
      setGuardando(null);
    }
  }

  async function actualizarMaterial(item: Publicada) {
    const texto = (
      textosListos[item.inmuebleId] ??
      item.texto ??
      ""
    ).trim();

    if (!texto) {
      setError(
        "El texto de publicación es obligatorio."
      );
      return;
    }

    try {
      setActualizandoMaterial(
        item.inmuebleId
      );

      setMensaje("");
      setError("");

      const response = await fetch(
        "/api/publicaciones",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inmuebleId: item.inmuebleId,
            texto,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "No se pudo actualizar el material."
        );
      }

      setMensaje(
        `${propertyPanelId(item)} fue actualizado correctamente.`
      );

      setCargando(true);
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el material."
      );
    } finally {
      setActualizandoMaterial(null);
    }
  }

  function solicitarPublicacion(item: Publicada) {
    setMensaje("");
    setError("");
    setConfirmarPublicacion(item);
  }

  async function confirmarMarcarPublicado() {
    if (!confirmarPublicacion) return;

    const item = confirmarPublicacion;

    try {
      setPublicando(item.inmuebleId);
      setMensaje("");
      setError("");

      const response = await fetch(
        "/api/publicaciones",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inmuebleId: item.inmuebleId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "No se pudo marcar la publicación."
        );
      }

      setConfirmarPublicacion(null);

      setMensaje(
        `${propertyPanelId(item)} fue marcado como publicado.`
      );

      setCargando(true);
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo marcar como publicado."
      );
    } finally {
      setPublicando(null);
    }
  }

  const zones = useMemo(() => {
    const groups = new Map<string, { name: string; ids: Set<number> }>();
    for (const item of [...pendientesTasacion, ...registradas, ...aprobadas, ...listos, ...publicadas]) {
      const name = propertyZone(item), key = name.toLocaleLowerCase("es-PE");
      const group = groups.get(key) || { name, ids: new Set<number>() };
      group.ids.add(item.inmuebleId);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "es-PE"));
  }, [pendientesTasacion, registradas, aprobadas, listos, publicadas]);
  const matches = (item: { inmuebleId: number; distrito?: string | null }) =>
    inZone(item, zone) && (!selectedId || String(item.inmuebleId) === selectedId);
  const visiblesPendientes = filterTaskProperties(pendientesTasacion.filter(matches), busqueda);
  const visiblesRegistradas = filterTaskProperties(registradas.filter(matches), busqueda);
  const visiblesAprobadas = filterTaskProperties(aprobadas.filter(matches), busqueda);
  const visiblesListos = filterTaskProperties(listos.filter(matches), busqueda);
  const visiblesPublicadas = filterTaskProperties(publicadas.filter(matches), busqueda);
  const totalBusqueda = new Set([...pendientesTasacion, ...registradas, ...aprobadas, ...listos, ...publicadas].filter(matches).map(item => item.inmuebleId)).size;
  const totalFiltrados = new Set([...visiblesPendientes, ...visiblesRegistradas, ...visiblesAprobadas, ...visiblesListos, ...visiblesPublicadas].map(item => item.inmuebleId)).size;
  const returnParams = new URLSearchParams(searchParams.toString());
  if (busqueda) returnParams.set("buscar", busqueda); else returnParams.delete("buscar");
  const scope = zone && zone !== ALL_ZONES ? `en ${zone}` : "en todas las zonas";
  const cards = [
    { id: "tasaciones", label: "Tasaciones pendientes", count: visiblesPendientes.length, note: "Registrar tasación", icon: "price", color: "border-violet-200 bg-violet-50/70 text-violet-950", accent: "text-violet-700", badge: "bg-violet-100" },
    { id: "material", label: "Texto pendiente", count: visiblesAprobadas.length, note: "Preparar texto y material", icon: "text", color: "border-amber-200 bg-amber-50/70 text-amber-950", accent: "text-amber-700", badge: "bg-amber-100" },
    { id: "listos", label: "Textos preparados", count: visiblesListos.length, note: `${visiblesListos.filter(item => !item.expediente?.complete).length} por completar · ${visiblesListos.filter(item => item.expediente?.complete).length} listos para publicar`, icon: "ready", color: "border-blue-200 bg-blue-50/70 text-blue-950", accent: "text-blue-700", badge: "bg-blue-100" },
    { id: "publicados", label: "Publicados", count: visiblesPublicadas.length, note: "Consultar o corregir material", icon: "published", color: "border-emerald-200 bg-emerald-50/70 text-emerald-950", accent: "text-emerald-700", badge: "bg-emerald-100" },
  ];
  function irASeccion(id: string) {
    const url = new URL(window.location.href);
    if (zone === null) url.searchParams.set("zona", ALL_ZONES);
    url.hash = id;
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    setFragment(url.hash);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  useEffect(() => {
    if (!fragment || cargando || zone === null) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(fragment.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [fragment, cargando, zone]);


  return (
    <NavigationReturnProvider href={`/tasaciones-textos-pendientes${returnParams.size ? `?${returnParams}` : ""}${fragment}`}><main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
      <DraftRecovery draftKey="textos:actual" data={{textos,textosListos}} dirty={Object.values(textos).some(Boolean)||[...listos,...publicadas].some(item=>textosListos[item.inmuebleId]!==undefined&&textosListos[item.inmuebleId]!==item.texto)} onRestore={draft=>{if(draft.textos)setTextos(draft.textos as Record<number,string>);if(draft.textosListos)setTextosListos(draft.textosListos as Record<number,string>);}}/>
        {/* ENCABEZADO */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeading href="/tasaciones-textos-pendientes" />

          <Link
            href={zone && zone !== ALL_ZONES ? "/registrar-tasaciones" : "/cartera"}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
          >
            {zone && zone !== ALL_ZONES ? "Registrar tasaciones" : "Seleccionar zona para registrar"}
          </Link>
        </div>

        {/* MENSAJES */}

        {mensaje && <Feedback tone="success" className="my-5">{mensaje}</Feedback>}

        {error && <Feedback tone="error" className="my-5">{error}{errorCarga && <button type="button" disabled={cargando} onClick={() => void cargar()} className="aa-button aa-button-secondary mt-3">{cargando ? "Cargando…" : "Reintentar"}</button>}</Feedback>}

        <section className="mb-6 aa-summary p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Bandeja de trabajo</p><p className="mt-1 text-sm font-semibold">Revisa los precios, prepara el material y confirma la publicación.</p></div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">{cargando ? "…" : visiblesPendientes.length} por tasar · {cargando ? "…" : visiblesAprobadas.length} por preparar texto</span>
          </div>
        </section>
        <section aria-label="Resumen y accesos de la bandeja" className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => <button key={card.id} type="button" disabled={cargando} onClick={() => irASeccion(card.id)} className={`rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 disabled:opacity-60 ${card.color}`}>
            <span className="flex items-center justify-between gap-3"><span className={`text-xs font-semibold uppercase tracking-wide ${card.accent}`}>{card.label}</span><span className={`rounded-xl p-2 ${card.badge} ${card.accent}`}><WorkflowIcon kind={card.icon} /></span></span>
            <span className="mt-2 block text-3xl font-bold">{cargando ? "…" : card.count}</span>
            <span className={`mt-1 block text-xs ${card.accent}`}>{scope}</span>
            <span className={`mt-4 flex items-center justify-between gap-2 border-t border-current/10 pt-3 text-xs font-semibold ${card.accent}`}>{card.note}<span aria-hidden="true">→</span></span>
          </button>)}
        </section>
        {zone !== null && <nav aria-label="Ruta de tasaciones y textos pendientes" className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" onClick={() => abrirZona(null)} className="cartera-folder-navigation aa-button aa-button-secondary border-violet-200 bg-violet-50"><FolderIcon className="h-5 w-5 shrink-0 text-violet-500" />← Volver a zonas</button>
          <ZoneContext name={zone === ALL_ZONES ? "Listado general" : zone} general={zone === ALL_ZONES} tone="violet" />
          {zone !== ALL_ZONES && <button type="button" onClick={() => abrirZona(ALL_ZONES)} className="ml-auto min-h-11 text-sm font-semibold text-violet-700">Ver listado general →</button>}
        </nav>}

        {zone !== null && <section aria-label="Buscar inmuebles de la bandeja" className="aa-card mb-6 p-4"><PropertyTaskSearch value={busqueda} onChange={setBusqueda} count={totalFiltrados} total={totalBusqueda} disabled={cargando} />{busqueda.trim() && totalBusqueda > 0 && totalFiltrados === 0 && <p className="mt-3 text-sm text-slate-600">No hay inmuebles que coincidan con la búsqueda.</p>}</section>}

        {cargando ? (
            <LoadingCards label="Cargando inmuebles…" />
          ) : error && !registradas.length && !pendientesTasacion.length && !aprobadas.length && !listos.length && !publicadas.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No se pudo consultar la bandeja. Pulsa Reintentar para obtener los inmuebles.</div>
          ) : zone === null ? (
            <section aria-labelledby="appraisal-zones-title">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <div><h2 id="appraisal-zones-title" className="text-lg font-bold text-slate-900">Tasaciones y textos pendientes por zona</h2><p className="mt-1 text-sm text-slate-600">Abre una carpeta para revisar las tasaciones y el material de esa zona.</p></div>
                <button type="button" onClick={() => abrirZona(ALL_ZONES)} className="cartera-folder-navigation aa-button aa-button-secondary border-violet-200 bg-violet-50"><FolderIcon className="h-5 w-5 shrink-0 text-violet-500" />Ver listado general →</button>
              </div>
              {zones.length === 0 ? <div className="aa-card p-8 text-center"><p className="font-semibold text-slate-900">No hay inmuebles en esta bandeja</p><p className="mt-2 text-sm text-slate-500">La bandeja está sincronizada con la base de datos.</p></div> : <ul className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">{zones.map(group => <li key={group.name} className="min-w-0"><ZoneFolderCard name={group.name} onOpen={() => abrirZona(group.name)}><span className="mt-1 block text-sm text-slate-600">{group.ids.size} {group.ids.size === 1 ? "inmueble" : "inmuebles"}</span>
                  <span className="mt-2 block text-xs font-semibold text-violet-700">{pendientesTasacion.filter(item => inZone(item, group.name)).length} tasaciones pendientes</span>
                  <span className="mt-1 block text-xs text-slate-600">{registradas.filter(item => inZone(item, group.name)).length} tasaciones negociadas · {aprobadas.filter(item => inZone(item, group.name)).length} textos pendientes</span>
                  <span className="mt-1 block text-xs text-slate-500">{listos.filter(item => inZone(item, group.name) && item.expediente?.complete).length} listos para publicar · {publicadas.filter(item => inZone(item, group.name)).length} publicados</span>
                </ZoneFolderCard></li>)}</ul>}
            </section>
          ) : (
          <div className="space-y-7">
            <section id="tasaciones" tabIndex={-1} className="scroll-mt-6 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 p-5">
                <div><h2 className="text-lg font-bold text-slate-900">Tasaciones pendientes de registro</h2><p className="mt-1 text-sm text-slate-500">Inmuebles con visita realizada que todavía no tienen tasación registrada.</p></div>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">{visiblesPendientes.length}</span>
              </div>
              {visiblesPendientes.length === 0 ? <div className="p-6 text-sm text-slate-500">No hay tasaciones por registrar{zone !== ALL_ZONES ? ` en ${zone}` : ""}.</div> : <div className="divide-y divide-slate-100">{visiblesPendientes.map(item => <article key={item.inmuebleId} className="flex flex-col gap-4 p-5 transition hover:bg-violet-50/40 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-700" /><p className="ml-15 mt-2 text-xs font-semibold text-violet-700">Visita realizada · Tasación por registrar</p></div>
                <Link href={`/registrar-tasaciones?zona=${encodeURIComponent(propertyZone(item))}&inmueble=${item.inmuebleId}`} className="self-start rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 sm:self-auto">Registrar tasación →</Link>
              </article>)}</div>}
            </section>
            <section id="negociadas" tabIndex={-1} className="scroll-mt-6 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-end justify-between">
                <div><h2 className="text-lg font-bold text-slate-900">Tasaciones negociadas</h2><p className="mt-1 text-sm text-slate-500">Tasaciones registradas con los precios acordados con el propietario. Puedes actualizar el precio o renta mensual y la observación incluso después de publicar.</p></div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{visiblesRegistradas.length}</span>
              </div>
              {visiblesRegistradas.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Todavía no hay tasaciones negociadas.</div> : <div className="space-y-3">{visiblesRegistradas.map(item => <article key={item.inmuebleId} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-violet-200">
                <PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1f1] text-sm font-bold text-[#c80000]" />
                <SalePriceEditor item={item} onSaved={cargar} />
              </article>)}</div>}
            </section>

            {/* =====================================================
                02 · TEXTO Y MATERIAL
               ===================================================== */}

            <section id="material" tabIndex={-1} className="scroll-mt-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-900">
                  02 · Texto y material
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Solo aparecen inmuebles cuya tasación ya
                  fue negociada y todavía no tienen una
                  publicación registrada.
                </p>
              </div>

              {visiblesAprobadas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  No hay tasaciones negociadas pendientes de
                  preparar texto.
                </div>
              ) : (
                <div className="space-y-4">
                  {visiblesAprobadas.map((item) => (
                    <div
                      key={item.inmuebleId}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-violet-200"
                    >
                      <div className="mb-4"><PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.propietario} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700" /></div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Texto de publicación
                          </label>

                          <textarea
                            value={
                              textos[
                                item.inmuebleId
                              ] ?? ""
                            }
                            onChange={(event) =>
                              setTextos(
                                (current) => ({
                                  ...current,
                                  [item.inmuebleId]:
                                    event.target.value,
                                })
                              )
                            }
                            rows={7}
                            placeholder="Redacta aquí el texto comercial del inmueble..."
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-500 focus:border-[#c80000]"
                          />
                        </div>

                        <div>
                          <PublicationChecklist data={item.expediente ? { ...item.expediente, items: item.expediente.items.map(entry => entry.key === "texto" ? { ...entry, complete: Boolean((textos[item.inmuebleId] ?? "").trim()) } : entry) } : undefined} code={item.codigo} /><p className="mt-3 text-xs font-semibold text-slate-600">Fotos de la publicación</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">Usa las fotos de las visitas y de la ficha. Puedes revisarlas y actualizarlas en la galería.</p>
                          <Link href={`/datos-inmuebles?codigo=${encodeURIComponent(item.codigo)}&pestana=fotos`} className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-red-700">Ver y editar fotos →</Link>
                          <button
                            type="button"
                            onClick={() =>
                              guardarTexto(item)
                            }
                            disabled={
                              guardando === item.inmuebleId || !textos[item.inmuebleId]?.trim() || !item.expediente?.items.filter(entry => entry.key !== "texto").every(entry => entry.complete)
                            }
                            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#c80000] px-4 text-xs font-bold text-white transition hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {guardando ===
                            item.inmuebleId
                              ? "Guardando..."
                              : "Guardar y dejar listo para publicar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* =====================================================
                03 · LISTOS PARA PUBLICAR
               ===================================================== */}

            <section id="listos" tabIndex={-1} className="scroll-mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-900">
                  03 · Textos preparados y publicación
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Material y texto registrados. Puedes
                  revisarlos o modificarlos antes de confirmar
                  que la publicación fue realizada.
                </p>
              </div>

              {visiblesListos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  No hay textos preparados en esta vista.
                </div>
              ) : (
                <div className="space-y-4">
                  {visiblesListos.map((item) => {
                    const textoActual =
                      textosListos[item.inmuebleId] ??
                      item.texto ??
                      "";

                    return (
                      <div
                        key={item.inmuebleId}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-violet-200"
                      >
                        <div className="mb-5 space-y-3">
                          <PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.nombreContacto} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1f1] text-sm font-bold text-[#c80000]" />
                          <span className={`ml-15 inline-block rounded-full border px-2.5 py-1 text-xs font-bold ${item.expediente?.complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                            {item.expediente?.complete ? "Listo para publicar" : "Expediente pendiente"}
                          </span>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-600">
                              Texto de publicación
                            </label>

                            <textarea
                              value={textoActual}
                              onChange={(event) =>
                                setTextosListos(
                                  (current) => ({
                                    ...current,
                                    [item.inmuebleId]:
                                      event.target.value,
                                  })
                                )
                              }
                              rows={7}
                              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-500 focus:border-[#c80000]"
                            />
                          </div>

                          <div>
                            <PublicationChecklist data={item.expediente ? { ...item.expediente, items: item.expediente.items.map(entry => entry.key === "texto" ? { ...entry, complete: Boolean(textoActual.trim()) } : entry) } : undefined} code={item.codigo} /><p className="mt-3 text-xs font-semibold text-slate-600">Fotos de la publicación</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">Usa las fotos de las visitas y de la ficha. Puedes revisarlas y actualizarlas en la galería.</p>
                          <Link href={`/datos-inmuebles?codigo=${encodeURIComponent(item.codigo)}&pestana=fotos`} className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-red-700">Ver y editar fotos →</Link>
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() =>
                                  actualizarMaterial(
                                    item
                                  )
                                }
                                disabled={
                                  actualizandoMaterial ===
                                  item.inmuebleId
                                }
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#c80000] px-4 text-xs font-bold text-white transition hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actualizandoMaterial ===
                                item.inmuebleId
                                  ? "Guardando..."
                                  : "Guardar cambios"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  solicitarPublicacion(
                                    item
                                  )
                                }
                                disabled={
                                  publicando === item.inmuebleId || !item.expediente?.complete || (textosListos[item.inmuebleId]??item.texto)!==item.texto
                                }
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#c80000] px-4 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Marcar como publicado
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>




{/* =====================================================
    04 · PUBLICADOS
   ===================================================== */}

<section id="publicados" tabIndex={-1} className="scroll-mt-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
  <div className="mb-3 flex items-end justify-between">
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        04 · Publicados
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Inmuebles cuya publicación ya fue realizada.
      </p>
    </div>

    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
      {visiblesPublicadas.length}
    </span>
  </div>

  {visiblesPublicadas.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
      Todavía no hay publicaciones realizadas.
    </div>
  ) : (
    <div className="space-y-4">
      {visiblesPublicadas.map((item) => {
        const fecha = item.fechaPublicacion
          ? new Date(
              item.fechaPublicacion
            ).toLocaleDateString("es-PE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "Fecha no registrada";

        return (
          <div
            key={item.inmuebleId}
            className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-violet-200"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <PropertyListIdentity code={item.codigo} position={item.posicion} contact={item.nombreContacto} operation={item.operacion} type={item.tipo} location={item.direccion} positionClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1f1] text-sm font-bold text-[#c80000]" />
                <span className="ml-15 mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Publicado</span>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50/60 p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                      Fecha de publicación
                    </div>

                    <div className="mt-1 text-sm font-bold text-slate-800">
                      {fecha}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Estado
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-sm font-bold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Publicación realizada
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full lg:max-w-xs">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Material publicado
                  </div>

                  <PublicationChecklist data={item.expediente ? { ...item.expediente, items: item.expediente.items.map(entry => entry.key === "texto" ? { ...entry, complete: Boolean((textosListos[item.inmuebleId] ?? item.texto ?? "").trim()) } : entry) } : undefined} code={item.codigo} /><p className="mt-3 text-xs font-semibold text-slate-600">Fotos de la publicación</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">Usa las fotos de las visitas y de la ficha. Puedes revisarlas y actualizarlas en la galería.</p>
                          <Link href={`/datos-inmuebles?codigo=${encodeURIComponent(item.codigo)}&pestana=fotos`} className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-red-700">Ver y editar fotos →</Link>

                </div>
              </div>
            </div>

            {item.texto && (
              <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-600">
                  Ver texto de publicación
                </summary>

                <div className="border-t border-slate-200 px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {item.texto}
                  </p>
                  <label className="mt-4 block text-xs font-semibold">Corregir texto publicado<textarea value={textosListos[item.inmuebleId]??item.texto??''} onChange={event=>setTextosListos(current=>({...current,[item.inmuebleId]:event.target.value}))} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label><button type="button" disabled={actualizandoMaterial!==null} onClick={()=>void actualizarMaterial(item)} className="aa-button aa-button-primary mt-3">Guardar corrección con historial</button><p className="mt-2 text-xs text-slate-600">Luego actualiza los anuncios externos y confirma sus datos en la ficha.</p>

                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  )}
</section>





          </div>
        )}
      </div>

      {/* =========================================================
          MODAL DE CONFIRMACIÓN DE PUBLICACIÓN
         ========================================================= */}

      {confirmarPublicacion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmarPublicacion(null);
            }
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-publicacion-title"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12.5 9.5 17 19 7.5"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h2
                    id="modal-publicacion-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    Confirmar publicación
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Estás a punto de marcar este inmueble
                    como publicado.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#fff1f1] px-2.5 py-1 text-xs font-bold text-[#c80000]">
                    Pos.{" "}
                    {confirmarPublicacion.posicion
                      ? String(
                          confirmarPublicacion.posicion
                        ).padStart(2, "0")
                      : "—"}
                  </span>

                  <span className="text-xs font-semibold text-slate-500">
                    {propertyPanelId(confirmarPublicacion)}
                  </span>
                </div>

                <div className="mt-2 text-sm font-bold text-slate-900">
                  {confirmarPublicacion.nombreContacto || "Sin contacto"}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {confirmarPublicacion.tipo}
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Esta acción registrará la fecha de publicación
                y moverá el inmueble fuera de la bandeja
                “Listos para publicar”.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setConfirmarPublicacion(null)
                }
                disabled={publicando !== null}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarMarcarPublicado}
                disabled={publicando !== null}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#c80000] px-5 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publicando !== null
                  ? "Confirmando..."
                  : "Sí, marcar como publicado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main></NavigationReturnProvider>
  );
}
function WorkflowIcon({ kind }: { kind: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {kind === "price" ? <><path d="M3 4h8l10 10-7 7L3 10V4Z" /><circle cx="7.5" cy="7.5" r="1" /></> : kind === "text" ? <><path d="M7 3h7l4 4v14H6V3h1Z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></> : kind === "ready" ? <><path d="M7 4H4v16h16V4h-3M9 3h6v4H9z" /><path d="m8 14 3 3 5-6" /></> : <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>}
  </svg>;
}
