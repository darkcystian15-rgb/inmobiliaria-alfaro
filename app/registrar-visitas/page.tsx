"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Visita = {
  id: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  tipo: string;
  propietario: string;
  dni: string;
};

function RegistrarVisitasPage() {
  const searchParams = useSearchParams();
  const inmuebleIdParam = searchParams.get("inmuebleId");
  const inmuebleIdSeleccionado = inmuebleIdParam ? Number(inmuebleIdParam) : null;

  const [items, setItems] = useState<Visita[]>([]);
  const [fechas, setFechas] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [enlacesDrive, setEnlacesDrive] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);

  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const usuarioActual = "Usuario actual";

  useEffect(() => {
    const cargarVisitas = async () => {
      try {
        setCargando(true);
        setError(null);

        const respuesta = await fetch("/api/visitas", { cache: "no-store" });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
          throw new Error(data.error || "No se pudieron cargar las visitas pendientes.");
        }

        const visitas = data.items ?? [];

        if (inmuebleIdSeleccionado) {
          setItems(
            visitas.filter((item: Visita) => item.id === inmuebleIdSeleccionado)
          );
        } else {
          setItems(visitas);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al cargar las visitas.");
      } finally {
        setCargando(false);
      }
    };

    cargarVisitas();
  }, []);

  const marcarRealizada = async (item: Visita) => {
    setError(null);
    setMensaje(null);

    const fechaVisita = fechas[item.id];

    if (!fechaVisita) {
      setError(`Registra la fecha en que se realizó la visita de “${item.nombre}”.`);
      return;
    }

    try {
      setGuardando(item.id);

      const respuesta = await fetch("/api/visitas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inmuebleId: item.id,
          fechaVisita,
          observaciones: observaciones[item.id] ?? "",
          driveLink: enlacesDrive[item.id] ?? "",
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok || !data.ok) {
        throw new Error(data.error || "No se pudo registrar la visita.");
      }

      setItems((actuales) => actuales.filter((actual) => actual.id !== item.id));
      setMensaje(
        `Visita de “${item.nombre}” registrada correctamente. El inmueble pasa a Tasación pendiente.`
      );

      setFechas((actual) => {
        const copia = { ...actual };
        delete copia[item.id];
        return copia;
      });

      setObservaciones((actual) => {
        const copia = { ...actual };
        delete copia[item.id];
        return copia;
      });

      setEnlacesDrive((actual) => {
        const copia = { ...actual };
        delete copia[item.id];
        return copia;
      });

      window.setTimeout(() => setMensaje(null), 4500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la visita.");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m8 14 2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
                Fase 1 · Registro de actividad
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Registrar visitas realizadas
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Registra la visita cuando realmente haya ocurrido. No es una agenda: cada inmueble permanece pendiente hasta completar este proceso.
            </p>
          </div>

          <Link
            href="/visitas-pendientes"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Ver visitas pendientes
          </Link>
        </div>

        {mensaje && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              ✓
            </span>
            <div>
              {mensaje}
              <p className="mt-1 text-xs font-normal text-emerald-700">
                Se registra usuario, fecha y observaciones en la trazabilidad del inmueble.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Por registrar
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{items.length}</p>
            <p className="mt-1 text-xs text-slate-500">procesos de visita pendientes</p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Al completar
            </p>
            <p className="mt-2 text-lg font-bold text-violet-950">Tasación pendiente</p>
            <p className="mt-1 text-xs text-violet-700/80">
              transición automática del flujo
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Registrado por
            </p>
            <p className="mt-2 text-lg font-bold text-cyan-950">{usuarioActual}</p>
            <p className="mt-1 text-xs text-cyan-700/80">
              se reemplazará por el usuario autenticado
            </p>
          </div>
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Visitas por confirmar</h2>
              <p className="mt-1 text-xs text-slate-500">
                Fecha y usuario quedan como parte de la trazabilidad automática.
              </p>
            </div>

            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              {items.length} pendientes
            </span>
          </div>

          {cargando ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-600">
                Cargando visitas pendientes...
              </p>
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-base font-bold text-violet-700">
                            {item.posicion}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{item.nombre}</h3>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                {item.tipo}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.ubicacion} · {item.codigo}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Propietario: {item.propietario} · DNI {item.dni}
                            </p>
                          </div>
                        </div>

                        <span className="self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                          Visita pendiente
                        </span>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`fecha-${item.id}`}
                            className="text-xs font-semibold text-slate-600"
                          >
                            Fecha de visita realizada *
                          </label>

                          <input
                            id={`fecha-${item.id}`}
                            type="date"
                            max={hoy}
                            value={fechas[item.id] ?? ""}
                            onChange={(e) =>
                              setFechas((actual) => ({
                                ...actual,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`drive-${item.id}`}
                            className="text-xs font-semibold text-slate-600"
                          >
                            Evidencia / fotografías en Google Drive (opcional)
                          </label>

                          <input
                            id={`drive-${item.id}`}
                            type="url"
                            value={enlacesDrive[item.id] ?? ""}
                            onChange={(e) =>
                              setEnlacesDrive((actual) => ({
                                ...actual,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="https://drive.google.com/..."
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                          />

                          <p className="mt-1 text-[11px] text-slate-400">
                            Por ahora se guarda el enlace; el archivo no se almacena en la aplicación.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`obs-${item.id}`}
                          className="text-xs font-semibold text-slate-600"
                        >
                          Observación de la visita (opcional)
                        </label>

                        <textarea
                          id={`obs-${item.id}`}
                          rows={3}
                          value={observaciones[item.id] ?? ""}
                          onChange={(e) =>
                            setObservaciones((actual) => ({
                              ...actual,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder="Ej.: se realizó visita, se tomaron medidas y fotografías; propietario presente..."
                          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        />
                      </div>

                      <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Al registrar</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Se completará la visita y el inmueble pasará a{" "}
                            <strong>Tasación pendiente</strong>.
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={guardando === item.id}
                          onClick={() => marcarRealizada(item)}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                            {guardando === item.id ? "…" : "✓"}
                          </span>
                          {guardando === item.id
                            ? "Guardando..."
                            : "Registrar visita realizada"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
                ✓
              </div>

              <h3 className="mt-4 font-bold text-emerald-950">
                Todas las visitas están registradas
              </h3>

              <p className="mt-1 text-sm text-emerald-800/80">
                Los inmuebles completados continúan en la etapa de tasación pendiente.
              </p>

              <Link
                href="/tasaciones-textos-pendientes"
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Ver tasaciones pendientes
              </Link>
            </div>
          )}
        </section>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              i
            </span>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Trazabilidad y archivos
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                La aplicación registrará automáticamente la fecha, usuario y observación de cada hito. Las fotografías o evidencias se mantienen en Google Drive mediante enlaces, sin subir archivos al sistema por ahora.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-5 lg:p-8">
          <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            Cargando...
          </div>
        </main>
      }
    >
      <RegistrarVisitasPage />
    </Suspense>
  );
}
