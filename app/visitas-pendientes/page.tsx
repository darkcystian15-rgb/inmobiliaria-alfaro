"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type VisitaPendiente = {
  id: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  dias: number;
  tipo: string;
  propietario: string;
  dni: string;
};

export default function Page() {
  const [items, setItems] = useState<VisitaPendiente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarVisitas() {
      try {
        setCargando(true);
        setError("");

        const response = await fetch("/api/visitas", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudieron cargar las visitas pendientes.");
        }

        const data = await response.json();
        setItems(data.items);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al cargar las visitas."
        );
      } finally {
        setCargando(false);
      }
    }

    cargarVisitas();
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return items.filter((item) => {
      const coincideTexto =
        !texto ||
        item.codigo.toLowerCase().includes(texto) ||
        item.nombre.toLowerCase().includes(texto) ||
        item.ubicacion.toLowerCase().includes(texto) ||
        String(item.posicion).includes(texto) ||
        item.propietario.toLowerCase().includes(texto) ||
        item.dni.includes(texto);

      const coincideFiltro =
        filtro === "Todas" ||
        (filtro === "Hoy" && item.dias === 0) ||
        (filtro === "1-2 días" && item.dias >= 1 && item.dias <= 2) ||
        (filtro === "Más de 2 días" && item.dias > 2);

      return coincideTexto && coincideFiltro;
    });
  }, [items, busqueda, filtro]);

  const pendientesAtencion = items.filter((item) => item.dias > 2).length;

  return (
    <main className="min-h-screen bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 8v4l2.5 2.5" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="8.5" />
                </svg>
              </span>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
                Fase 1 · Seguimiento
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Visitas pendientes
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Bandeja de procesos de visita. No son citas ni una agenda: cada
              inmueble permanece aquí hasta que la visita haya sido realizada y
              registrada.
            </p>
          </div>

          <Link
            href="/registrar-visitas"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Registrar visita realizada <span aria-hidden>→</span>
          </Link>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Pendientes
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-950">
              {items.length}
            </p>
            <p className="mt-1 text-xs text-amber-800/70">
              procesos de visita abiertos
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              Requieren atención
            </p>
            <p className="mt-2 text-3xl font-bold text-rose-950">
              {pendientesAtencion}
            </p>
            <p className="mt-1 text-xs text-rose-800/70">
              más de 2 días pendientes
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Al completar
            </p>
            <p className="mt-2 text-lg font-bold text-violet-950">
              Tasación pendiente
            </p>
            <p className="mt-1 text-xs text-violet-700/80">
              se habilita automáticamente
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Procesos pendientes
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {cargando
                  ? "Cargando..."
                  : `${filtrados.length} resultado${
                      filtrados.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar inmueble, DNI, posición..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white sm:w-64"
              />

              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              >
                <option>Todas</option>
                <option>Hoy</option>
                <option>1-2 días</option>
                <option>Más de 2 días</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-900">
                No se pudieron cargar las visitas
              </p>
              <p className="mt-1 text-xs text-rose-700">{error}</p>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {cargando ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-slate-600">
                  Cargando visitas pendientes...
                </p>
              </div>
            ) : (
              filtrados.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">
                    {item.posicion}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {item.nombre}
                      </h3>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {item.tipo}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.codigo} · {item.ubicacion} · Propietario:{" "}
                      {item.propietario}
                      {item.dni ? ` · DNI: ${item.dni}` : ""}
                    </p>

                    <p
                      className={
                        item.dias > 2
                          ? "mt-2 text-xs font-semibold text-rose-600"
                          : "mt-2 text-xs font-semibold text-amber-600"
                      }
                    >
                      {item.dias === 0
                        ? "Registrado hoy"
                        : "Pendiente desde hace " +
                          item.dias +
                          " día" +
                          (item.dias === 1 ? "" : "s")}
                    </p>
                  </div>

                  <Link
                    href={`/registrar-visitas?inmuebleId=${item.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Registrar visita
                  </Link>
                </div>
              ))
            )}
          </div>

          {!cargando && filtrados.length === 0 && !error && (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                ✓
              </div>
              <p className="mt-3 font-semibold text-slate-900">
                No hay resultados
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Prueba con otro criterio de búsqueda.
              </p>
            </div>
          )}
        </section>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Regla del proceso
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800/80">
            Un inmueble no sale de esta bandeja por crear una cita o registrar
            una intención. Sale cuando la visita realmente se realiza y se
            registra. Después, el sistema lo coloca en{" "}
            <strong>Tasación pendiente</strong>.
          </p>
        </div>
      </div>
    </main>
  );
}
