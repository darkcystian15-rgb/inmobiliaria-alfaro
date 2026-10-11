"use client";

import { propertyDisplayId } from "@/lib/property-display-id";

import DraftRecovery from "@/app/components/DraftRecovery";
import PageHeading from "@/app/components/PageHeading";


import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

import { requestJson } from "@/lib/client-request";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import FolderIcon from "@/app/components/FolderIcon";
import ZoneContext from "@/app/components/ZoneContext";
import { ALL_ZONES, inZone, propertyZone } from "@/lib/property-zones";
import { useCallback, useEffect, useState, useRef, Suspense, useMemo } from "react";
import PublicationChecklist, { type Checklist } from "@/app/components/PublicationChecklist";
import SalePriceEditor from "@/app/components/SalePriceEditor";

type Item = {
  distrito?: string | null;
  expediente?: Checklist;
  texto?: string | null;
  inmuebleId: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
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
  distrito?: string | null;
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
  const [fragment, setFragment] = useState("");
  useEffect(() => {
    const sync = () => setFragment(window.location.hash);
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", sync); };
  }, []);
  const zone = searchParams.get("zona") || (selectedId || fragment ? ALL_ZONES : null);
  function abrirZona(value: string | null) {
    const url = new URL(window.location.href);
    if (value === null) url.searchParams.delete("zona"); else url.searchParams.set("zona", value);
    url.searchParams.delete("inmueble");
    url.hash = "";
    setFragment("");
    window.history.pushState(null, "", url.pathname + url.search);
  }
  const materialBase=useRef<Record<number,string>>({});
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

  const cargar = useCallback((signal?: AbortSignal) => {
    return Promise.all([
      requestJson<{ registradas: Item[] }>("/api/tasaciones", { signal }),
      requestJson<{ pendientes: Item[]; listos: Publicada[]; incompletos?: Publicada[]; publicadas: Publicada[] }>("/api/publicaciones", { signal }),
    ]).then(data => {
      if (signal?.aborted) return;
      const [tasaciones, publicaciones] = data;
      setRegistradas((tasaciones.registradas ?? []).filter(item => item.situacion === "aprobado"));
      setAprobadas((publicaciones.pendientes ?? []));
      setListos([...(publicaciones.listos ?? []), ...(publicaciones.incompletos ?? [])]);
      setPublicadas((publicaciones.publicadas ?? []));
      const newBase=Object.fromEntries([...(publicaciones.listos??[]),...(publicaciones.incompletos??[]),...(publicaciones.publicadas??[])].map(item=>[item.inmuebleId,item.texto??'']));
      const oldBase=materialBase.current;
      setTextosListos(previous=>Object.fromEntries(Object.entries(newBase).map(([id,value])=>[id,previous[Number(id)]!==undefined&&previous[Number(id)]!==oldBase[Number(id)]?previous[Number(id)]:value])));
      materialBase.current=newBase;
    }).catch(error => {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : "No se pudo cargar la bandeja.");
    }).finally(() => {
      if (!signal?.aborted) setCargando(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
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
        `${item.codigo} quedó listo para publicar.`
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
        `${item.codigo} fue actualizado correctamente.`
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
        `${item.codigo} fue marcado como publicado.`
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
    for (const item of [...registradas, ...aprobadas, ...listos, ...publicadas]) {
      const name = propertyZone(item), key = name.toLocaleLowerCase("es-PE");
      const group = groups.get(key) || { name, ids: new Set<number>() };
      group.ids.add(item.inmuebleId);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "es-PE"));
  }, [registradas, aprobadas, listos, publicadas]);
  const matches = (item: { inmuebleId: number; distrito?: string | null }) =>
    inZone(item, zone) && (!selectedId || String(item.inmuebleId) === selectedId);
  const visiblesRegistradas = registradas.filter(matches);
  const visiblesAprobadas = aprobadas.filter(matches);
  const visiblesListos = listos.filter(matches);
  const visiblesPublicadas = publicadas.filter(matches);

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
      <DraftRecovery draftKey="textos:actual" data={{textos,textosListos}} dirty={Object.values(textos).some(Boolean)||[...listos,...publicadas].some(item=>textosListos[item.inmuebleId]!==undefined&&textosListos[item.inmuebleId]!==item.texto)} onRestore={draft=>{if(draft.textos)setTextos(draft.textos as Record<number,string>);if(draft.textosListos)setTextosListos(draft.textosListos as Record<number,string>);}}/>
        {/* ENCABEZADO */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeading href="/tasaciones-textos-pendientes" />

          <a
            href="/registrar-tasaciones"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#171717] px-4 text-sm font-semibold text-white transition hover:bg-black"
          >
            Registrar tasaciones
          </a>
        </div>

        {/* MENSAJES */}

        {mensaje && <Feedback tone="success" className="my-5">{mensaje}</Feedback>}

        {error && <Feedback tone="error" className="my-5">{error}</Feedback>}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          {zone !== null ? <><button type="button" onClick={() => abrirZona(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">← Volver a zonas</button><ZoneContext name={zone === ALL_ZONES ? "Listado general" : zone} general={zone === ALL_ZONES} /></> : <button type="button" onClick={() => abrirZona(ALL_ZONES)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Ver listado general</button>}
        </div>

        {/* RESUMEN */}

        <section className="mb-7 rounded-3xl bg-[#171717] p-5 text-white shadow-sm sm:p-6">
          <div className="mb-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              Bandeja de seguimiento
            </div>

            <h2 className="mt-1 text-lg font-bold">
              Qué necesita atención ahora
            </h2>

            <p className="mt-1 text-sm text-white/80">
              El inmueble avanza por actividades reales,
              no por una etapa artificial.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Tasaciones negociadas", visiblesRegistradas.length], ["Texto pendiente", visiblesAprobadas.length], ["Listos para publicar", visiblesListos.filter(item=>item.expediente?.complete).length], ["Publicados", visiblesPublicadas.length]].map(([label, count]) => <div key={label} className="rounded-2xl bg-white/[0.07] p-4"><p className="text-xs text-white/75">{label}</p><p className="mt-2 text-2xl font-bold">{count}</p></div>)}
          </div>
        </section>

        {cargando ? (
            <LoadingCards label="Cargando inmuebles…" />
          ) : zone === null ? (
            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">Tasaciones y textos pendientes por zona</h2>
              <p className="mb-5 text-sm text-slate-500">Abre una carpeta para revisar las tasaciones y el material de esa zona.</p>
              {zones.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Todavía no hay inmuebles en esta bandeja.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{zones.map(group => <button key={group.name} type="button" onClick={() => abrirZona(group.name)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-md">
                <FolderIcon className="mb-4 h-12 w-12 text-[#c80000] transition group-hover:scale-110" />
                <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{group.ids.size} {group.ids.size === 1 ? "inmueble" : "inmuebles"}</p>
                <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <p>{registradas.filter(item => inZone(item, group.name)).length} tasaciones negociadas · {aprobadas.filter(item => inZone(item, group.name)).length} textos pendientes</p>
                  <p>{listos.filter(item => inZone(item, group.name) && item.expediente?.complete).length} listos para publicar · {publicadas.filter(item => inZone(item, group.name)).length} publicados</p>
                </div>
              </button>)}</div>}
            </section>
          ) : (
          <div className="space-y-7">
            <section id="tasaciones">
              <div className="mb-3 flex items-end justify-between">
                <div><h2 className="text-lg font-bold text-slate-900">Tasaciones negociadas</h2><p className="mt-1 text-sm text-slate-500">Precios acordados con el propietario. Puedes actualizar el precio o renta mensual y la observación incluso después de publicar.</p></div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{visiblesRegistradas.length}</span>
              </div>
              {visiblesRegistradas.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Todavía no hay tasaciones negociadas.</div> : <div className="space-y-3">{visiblesRegistradas.map(item => <article key={item.inmuebleId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[#fff1f1] px-2.5 py-1 text-xs font-bold text-[#c80000]">Pos. {item.posicion}</span><span className="text-xs font-semibold text-slate-500">{propertyDisplayId(item)} · Inmueble {item.inmuebleId}</span></div>
                <h3 className="mt-2 text-base font-bold text-slate-900">{item.nombre}</h3><p className="mt-1 text-sm text-slate-500">{item.tipo} · {item.ubicacion}</p><p className="mt-2 text-xs text-slate-500">Propietario: {item.propietario}</p>
                <SalePriceEditor item={item} onSaved={cargar} />
              </article>)}</div>}
            </section>

            {/* =====================================================
                02 · TEXTO Y MATERIAL
               ===================================================== */}

            <section id="material">
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
                      className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            Pos. {item.posicion}
                          </span>

                          <span className="text-xs font-semibold text-slate-500">
                            {propertyDisplayId(item)}
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-bold text-slate-900">
                          {item.nombre}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {item.tipo} · {item.ubicacion}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Propietario: {item.propietario}
                        </p>
                      </div>

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
                          <PublicationChecklist data={item.expediente ? { ...item.expediente, items: item.expediente.items.map(entry => entry.key === "texto" ? { ...entry, complete: Boolean((textos[item.inmuebleId] ?? item.texto ?? "").trim()) } : entry) } : undefined} code={item.codigo} /><p className="mt-3 text-xs font-semibold text-slate-600">Fotos de la publicación</p>
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

            <section id="listos">
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
                  No hay inmuebles listos para publicar.
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
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-[#fff1f1] px-2.5 py-1 text-xs font-bold text-[#c80000]">
                                Pos.{" "}
                                {item.posicion
                                  ? String(
                                      item.posicion
                                    ).padStart(2, "0")
                                  : "—"}
                              </span>

                              <span className="text-xs font-semibold text-slate-500">
                                {propertyDisplayId(item)}
                              </span>

                              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${item.expediente?.complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                                {item.expediente?.complete ? "Listo para publicar" : "Expediente pendiente"}
                              </span>
                            </div>

                            <h3 className="mt-2 text-base font-bold text-slate-900">
                              {item.referencia}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {item.tipo}
                            </p>
                          </div>
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
                            <PublicationChecklist data={item.expediente ? { ...item.expediente, items: item.expediente.items.map(entry => entry.key === "texto" ? { ...entry, complete: Boolean((textos[item.inmuebleId] ?? item.texto ?? "").trim()) } : entry) } : undefined} code={item.codigo} /><p className="mt-3 text-xs font-semibold text-slate-600">Fotos de la publicación</p>
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

<section>
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
            className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#fff1f1] px-2.5 py-1 text-xs font-bold text-[#c80000]">
                    Pos.{" "}
                    {item.posicion
                      ? String(item.posicion).padStart(
                          2,
                          "0"
                        )
                      : "—"}
                  </span>

                  <span className="text-xs font-semibold text-slate-500">
                    {propertyDisplayId(item)}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Publicado
                  </span>
                </div>

                <h3 className="mt-2 text-base font-bold text-slate-900">
                  {item.referencia}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {item.tipo}
                </p>

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

                  <PublicationChecklist data={item.expediente ? { ...item.expediente, items: item.expediente.items.map(entry => entry.key === "texto" ? { ...entry, complete: Boolean((textos[item.inmuebleId] ?? item.texto ?? "").trim()) } : entry) } : undefined} code={item.codigo} /><p className="mt-3 text-xs font-semibold text-slate-600">Fotos de la publicación</p>
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
                    {confirmarPublicacion.codigo}
                  </span>
                </div>

                <div className="mt-2 text-sm font-bold text-slate-900">
                  {confirmarPublicacion.referencia}
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
    </main>
  );
}