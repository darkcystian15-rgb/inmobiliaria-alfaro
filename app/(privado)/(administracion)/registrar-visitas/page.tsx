"use client";

import { propertyDisplayId } from "@/lib/property-display-id";

import DraftRecovery from "@/app/components/DraftRecovery";
import RegistrationSuccess, { type NextRegistrationAction } from "@/app/components/RegistrationSuccess";
import PageHeading from "@/app/components/PageHeading";


import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

import Link from "next/link";
import { todayInPeru } from "@/lib/calendar.mjs";
import PhotoUploader, { type UploadedPhoto } from "@/app/components/PhotoUploader";
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
  fotos: UploadedPhoto[];
};

export default function Page() {
  const [items, setItems] = useState<Visita[]>([]);
  const [fechas, setFechas] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [pendienteEvidencia, setPendienteEvidencia] = useState<Record<number, boolean>>({});
  const [fotos, setFotos] = useState<Record<number, UploadedPhoto[]>>({});
  const [subiendoFotos, setSubiendoFotos] = useState<Record<number, boolean>>({});
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [siguienteAccion, setSiguienteAccion] = useState<NextRegistrationAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hoy = todayInPeru();

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const response = await fetch("/api/visitas", {
        cache: "no-store",
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error || "No se pudieron cargar las visitas pendientes."
        );
      }

      const todos: Visita[] = body.items ?? [];
      setFotos(previous => Object.fromEntries(todos.map(item => [item.id, previous[item.id] ?? (item.fotos ?? []).slice(0, 20)])));

      const params = new URLSearchParams(window.location.search);
      const inmuebleParam = params.get("inmueble");
      const inmuebleId = inmuebleParam ? Number(inmuebleParam) : null;

      setItems(
        inmuebleId !== null && Number.isInteger(inmuebleId)
          ? todos.filter((item: Visita) => item.id === inmuebleId)
          : todos
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las visitas pendientes."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void cargar(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function marcarRealizada(item: Visita) {
    if (procesando !== null || subiendoFotos[item.id]) return;
    if (!fechas[item.id]) { setError('Indica la fecha de la visita.'); return; }
    if ((fotos[item.id]?.length ?? 0) > 20) { setError("Selecciona hasta 20 fotos para esta visita."); return; }
    if (!fotos[item.id]?.length && !pendienteEvidencia[item.id]) { setError('Sube una foto o confirma que regularizarás la evidencia después.'); return; }
    setProcesando(item.id);
    setMensaje(null);
    setSiguienteAccion(null);
    setError(null);

    try {
      const response = await fetch("/api/visitas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inmuebleId: item.id,
          fechaVisita: fechas[item.id],
          observaciones: observaciones[item.id] ?? "",
          pendienteEvidencia: pendienteEvidencia[item.id] === true,
          fotoIds: (fotos[item.id] || []).map(foto => foto.id),
        }),
      });

      const raw = await response.text();

      let body: {
        ok?: boolean;
        message?: string;
        error?: string;
        pendienteEvidencia?: boolean;
      } = {};

      if (raw.trim()) {
        try {
          body = JSON.parse(raw);
        } catch {
          throw new Error(
            `El servidor respondió con un formato inesperado (HTTP ${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          body.error ||
            `No fue posible registrar la visita (HTTP ${response.status}).`
        );
      }

      setItems((actuales) =>
        actuales.filter((actual) => actual.id !== item.id)
      );

      setFechas(current=>{const next={...current};delete next[item.id];return next;});
      setObservaciones(current=>{const next={...current};delete next[item.id];return next;});
      setMensaje(
        `“${item.nombre}”: ${body.message || "Visita registrada correctamente."}`
      );
      setSiguienteAccion(body.pendienteEvidencia
        ? { href: `/datos-inmuebles?codigo=${item.id}&pestana=visitas`, label: "Agregar fotos de esta visita" }
        : { href: `/registrar-tasaciones?inmueble=${item.id}`, label: "Registrar tasación de este inmueble" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar la visita."
      );
    } finally {
      setProcesando(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
      <DraftRecovery draftKey="visitas:actual" data={{fechas,observaciones}} dirty={Object.values(fechas).some(Boolean)||Object.values(observaciones).some(Boolean)} onRestore={draft=>{if(draft.fechas)setFechas(draft.fechas as Record<number,string>);if(draft.observaciones)setObservaciones(draft.observaciones as Record<number,string>);}}/>
        {/* Encabezado */}
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <PageHeading href="/registrar-visitas" />

          <Link
            href="/visitas-pendientes"
            className="cartera-folder-navigation inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
          >
            <span className="text-base">←</span>
            Ver visitas pendientes
          </Link>
        </header>

        {/* Flujo */}
        <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Flujo de trabajo
              </p>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                La visita es la actividad que corresponde atender ahora
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c80000] text-xs font-bold text-white">
                  01
                </span>
                <span className="text-xs font-semibold text-red-800">
                  Visita pendiente
                </span>
              </div>

              <span className="hidden text-slate-300 sm:block">→</span>

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500 shadow-sm">
                  02
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  Visita registrada
                </span>
              </div>

              <span className="hidden text-slate-300 sm:block">→</span>

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500 shadow-sm">
                  03
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  Tasación, cuando corresponda
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Mensajes */}
        {mensaje && <RegistrationSuccess message={mensaje} nextAction={siguienteAccion} />}

        {error && <Feedback tone="error" className="my-5">{error}</Feedback>}

        {/* Resumen */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Visitas pendientes
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {items.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Inmuebles que requieren registro
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Acción actual
            </p>
            <p className="mt-2 text-lg font-bold text-red-950">
              Registrar visita
            </p>
            <p className="mt-1 text-xs text-red-700/80">
              Solo cuando la visita haya ocurrido
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trazabilidad
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              Automática
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Fecha, usuario y evento quedan registrados
            </p>
          </div>
        </div>

        {/* Lista */}
        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Inmuebles con visita pendiente
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Registra la fecha real de la visita y, si corresponde, agrega
                observaciones y las fotografías de la visita.
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
              {items.length} pendientes
            </span>
          </div>

          {cargando ? (
            <LoadingCards label="Cargando visitas pendientes…" />
          ) : items.length > 0 ? (
            <div className="space-y-5">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
                >
                  <div className="p-5 sm:p-6">
                    {/* Cabecera inmueble */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-sm font-bold text-amber-700">
                          {item.posicion}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {item.nombre}
                            </h3>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {item.tipo}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {propertyDisplayId(item)}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {item.ubicacion}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">
                              Propietario:
                            </span>{" "}
                            {item.propietario || "Sin propietario registrado"}
                            {item.dni ? ` · DNI ${item.dni}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                          Visita pendiente
                        </span>

                        {item.dias > 0 && (
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            {item.dias}{" "}
                            {item.dias === 1 ? "día" : "días"} en cartera
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="my-6 border-t border-slate-100" />

                    {/* Campos */}
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`fecha-${item.id}`}
                          className="text-xs font-bold text-slate-700"
                        >
                          Fecha de visita realizada *
                        </label>

                        <p className="mt-1 text-xs text-slate-500">
                          Indica el día en que efectivamente se realizó la
                          visita.
                        </p>

                        <input
                          id={`fecha-${item.id}`}
                          type="date"
                          max={hoy}
                          value={fechas[item.id] ?? ""}
                          onChange={(e) =>
                            setFechas((actuales) => ({
                              ...actuales,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fafafa] px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-[#c80000] focus:bg-white focus:ring-2 focus:ring-red-100"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-700">Fotografías de la visita</p>
                        <p className="mb-3 mt-1 text-xs text-slate-500">Recomendamos al menos una foto como constancia. Puedes registrar sin fotos y regularizarlas en Información de inmuebles → Visitas.</p>
                        <PhotoUploader propertyId={item.id} photos={fotos[item.id] || []}
                          disabled={procesando !== null}
                          onUploaded={photo => {
                            setFotos(current => ({ ...current, [item.id]: [...(current[item.id] || []), photo] }));
                            setItems(current => current.map(property => property.id === item.id ? { ...property, fotos: [...(property.fotos || []), photo] } : property));
                          }}
                          onBusyChange={busy => setSubiendoFotos(current => ({ ...current, [item.id]: busy }))} />
                        {item.fotos?.length > 0 && <fieldset disabled={procesando !== null || subiendoFotos[item.id]} className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                          <legend className="text-xs font-semibold text-slate-600">Fotos seleccionadas: {fotos[item.id]?.length || 0} / 20</legend>
                          <p className="text-xs text-slate-500">Puedes usar tus fotos ya guardadas y elegir cuáles corresponden a esta visita.</p>
                          <div className="max-h-40 space-y-2 overflow-auto">{item.fotos.map(photo => {
                            const checked = (fotos[item.id] || []).some(selected => selected.id === photo.id);
                            return <label key={photo.id} className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={checked} disabled={!checked && (fotos[item.id]?.length || 0) >= 20} onChange={event => setFotos(current => ({ ...current, [item.id]: event.target.checked ? [...(current[item.id] || []), photo] : (current[item.id] || []).filter(selected => selected.id !== photo.id) }))} /><span className="truncate">{photo.nombre}</span></label>;
                          })}</div>
                        </fieldset>}
                      </div>
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor={`obs-${item.id}`}
                        className="text-xs font-bold text-slate-700"
                      >
                        Observaciones de la visita
                      </label>

                      <p className="mt-1 text-xs text-slate-500">
                        Opcional. Puedes dejar constancia de lo observado,
                        medidas, fotografías tomadas u otra información útil.
                      </p>

                      <textarea
                        id={`obs-${item.id}`}
                        rows={3}
                        value={observaciones[item.id] ?? ""}
                        onChange={(e) =>
                          setObservaciones((actuales) => ({
                            ...actuales,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Ej.: Se realizó la visita, se tomaron medidas y fotografías del inmueble..."
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-[#fafafa] px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-[#c80000] focus:bg-white focus:ring-2 focus:ring-red-100"
                      />
                    </div>

                    {!fotos[item.id]?.length && <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><input type="checkbox" checked={pendienteEvidencia[item.id] || false} disabled={procesando !== null || subiendoFotos[item.id]} onChange={event => setPendienteEvidencia(current => ({ ...current, [item.id]: event.target.checked }))} /><span>La visita se realizó. Registrar como «Pendiente de evidencia» y agregar al menos una foto después en Información de inmuebles → Visitas.</span></label>}
                    {/* Acción */}
                    <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#f7f7f5] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          ¿La visita ya se realizó?
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Al registrarla, quedará guardada en el historial de
                          actividad del inmueble.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={procesando !== null || subiendoFotos[item.id] || (!fotos[item.id]?.length && !pendienteEvidencia[item.id]) || !fechas[item.id]}
                        onClick={() => marcarRealizada(item)}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c80000] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {procesando === item.id ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <span>✓</span>
                            Registrar visita realizada
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                ✓
              </div>

              <h3 className="mt-4 text-lg font-bold text-emerald-950">
                No hay visitas pendientes
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-emerald-800/80">
                Todas las visitas que corresponden actualmente están
                registradas. Puedes continuar con las demás actividades de la
                cartera.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/cartera"
                  className="inline-flex items-center justify-center rounded-xl bg-[#c80000] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#a90000]"
                >
                  Volver a cartera
                </Link>

                <Link
                  href="/tasaciones-textos-pendientes"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  Revisar otras actividades
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}