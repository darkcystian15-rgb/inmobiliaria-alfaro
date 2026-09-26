"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  resumen: {
    activos: number;
    posicionesDisponibles: number;
    visitasPendientes: number;
    tasacionesPendientes: number;
    aprobaciones: number;
    negociaciones: number;
    textosPendientes: number;
    listosParaPublicar: number;
  };
  pendientes: {
    etapa: string;
    total: number;
    tone: string;
  }[];
  recientes: {
    numero: string;
    nombre: string;
    etapa: string;
    fecha: string | Date | null;
  }[];
};

const toneStyles: Record<string, string> = {
  dark: "border-slate-900 bg-slate-900 text-white",
  blue: "border-blue-100 bg-blue-50/70",
  amber: "border-amber-100 bg-amber-50/70",
  orange: "border-orange-100 bg-orange-50/70",
  violet: "border-violet-100 bg-violet-50/70",
  rose: "border-rose-100 bg-rose-50/70",
  emerald: "border-emerald-100 bg-emerald-50/70",
};

const dotStyles: Record<string, string> = {
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
};

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudo cargar el dashboard.");
        return body;
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard."))
      .finally(() => setCargando(false));
  }, []);

  const resumen = data
    ? [
        { titulo: "Inmuebles activos", valor: data.resumen.activos, detalle: "de 90 posiciones", tone: "dark" },
        { titulo: "Posiciones disponibles", valor: data.resumen.posicionesDisponibles, detalle: "listas para nuevos inmuebles", tone: "blue" },
        { titulo: "Visitas pendientes", valor: data.resumen.visitasPendientes, detalle: "requieren atención", tone: "amber" },
        { titulo: "Tasaciones pendientes", valor: data.resumen.tasacionesPendientes, detalle: "requieren atención", tone: "orange" },
      ]
    : [];

  const metricas = data
    ? [
        { titulo: "Aprobaciones", valor: data.resumen.aprobaciones, detalle: "pendientes de decisión", tone: "violet" },
        { titulo: "En negociación", valor: data.resumen.negociaciones, detalle: "con el propietario", tone: "violet" },
        { titulo: "Textos pendientes", valor: data.resumen.textosPendientes, detalle: "requiere completar", tone: "rose" },
        { titulo: "Listos para publicar", valor: data.resumen.listosParaPublicar, detalle: "esperando publicación", tone: "emerald" },
      ]
    : [];

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="flex min-h-[76px] items-center justify-between px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Panel de control</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">Alberto Alfaro</p>
              <p className="text-xs text-slate-500">Administrador</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">AA</div>
          </div>
        </div>
      </header>

      <div className="p-5 sm:p-6 lg:p-8">
        <section className="relative mb-7 overflow-hidden rounded-3xl bg-slate-900 px-6 py-7 text-white shadow-lg sm:px-8 sm:py-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/5" />
          <div className="absolute -bottom-24 right-40 h-64 w-64 rounded-full bg-white/[0.03]" />
          <div className="relative">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">Hoy · Resumen de cartera</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Buenos días, Alberto.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Aquí tienes lo importante: qué está pendiente, qué avanzó y dónde puedes continuar trabajando.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/cartera" className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-slate-100">Ver cartera →</a>
              <a href="/reportes" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10">Ver reportes</a>
            </div>
          </div>
        </section>

        {cargando && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
            Cargando información real de la cartera...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {resumen.map((x) => (
            <div key={x.titulo} className={`rounded-2xl border p-5 shadow-sm ${toneStyles[x.tone]}`}>
              <div className="flex items-start justify-between gap-3">
                <p className={`text-xs font-semibold ${x.tone === "dark" ? "text-slate-300" : "text-slate-600"}`}>{x.titulo}</p>
                <span className={`h-2 w-2 rounded-full ${x.tone === "dark" ? "bg-white" : x.tone === "blue" ? "bg-blue-500" : x.tone === "amber" ? "bg-amber-500" : "bg-orange-500"}`} />
              </div>
              <p className={`mt-4 text-4xl font-bold tracking-tight ${x.tone === "dark" ? "text-white" : "text-slate-950"}`}>{x.valor}</p>
              <p className={`mt-2 text-xs ${x.tone === "dark" ? "text-slate-400" : "text-slate-500"}`}>{x.detalle}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricas.map((x) => (
            <div key={x.titulo} className={`rounded-2xl border bg-white p-4 shadow-sm ${toneStyles[x.tone]}`}>
              <p className="text-xs font-semibold text-slate-500">{x.titulo}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-bold text-slate-950">{x.valor}</p>
                <span className="pb-1 text-[11px] font-medium text-slate-400">{x.detalle}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="font-bold text-slate-950">Requieren atención</h3>
                <p className="mt-1 text-xs text-slate-500">Trabajo pendiente que puede mover el flujo hacia la siguiente etapa.</p>
              </div>
              <a href="/visitas-pendientes" className="text-xs font-semibold text-slate-600 transition hover:text-slate-950">Ver pendientes →</a>
            </div>
            <div className="divide-y divide-slate-100">
              {data?.pendientes.map((x) => (
                <div key={x.etapa} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50/70">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{x.total}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{x.etapa}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">Inmuebles en esta etapa del flujo</p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[x.tone]}`} />
                    {x.total > 0 ? "Pendiente" : "Sin pendientes"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="font-bold text-slate-950">Avances recientes</h3>
              <p className="mt-1 text-xs text-slate-500">Últimos movimientos registrados en la cartera.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {data?.recientes.map((x, index) => (
                <div key={`${x.numero}-${index}`} className="flex items-center gap-3 px-6 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">{x.numero}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{x.nombre}</p>
                    <p className="mt-1 text-xs text-slate-500">{x.etapa}</p>
                  </div>
                  <span className="text-[11px] text-slate-400">{formatDate(x.fecha)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-bold text-slate-950">Acciones rápidas</h3>
              <p className="mt-1 text-xs text-slate-500">Accesos directos al trabajo operativo.</p>
            </div>
            <a href="/cartera" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 hover:text-slate-950">Abrir cartera →</a>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["/registrar-inmueble", "Registrar inmueble", "Asignar una posición disponible."],
              ["/registrar-visitas", "Registrar visita", "Completar el proceso de visita."],
              ["/registrar-tasaciones", "Registrar tasación", "Actualizar la tasación actual."],
              ["/liberar-inmuebles", "Liberar inmueble", "Registrar y confirmar una salida."],
            ].map((x) => (
              <a key={x[0]} href={x[0]} className="group rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-950">{x[1]}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{x[2]}</p>
              </a>
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Flujo operativo</p>
            <p className="mt-1 text-xs text-slate-500">Registro → visita → tasación → aprobación → texto → publicación → liberación.</p>
          </div>
          <a href="/reportes" className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Ver reportes</a>
        </div>
      </div>
    </main>
  );
}
