"use client";

import FolderIcon from "@/app/components/FolderIcon";
import RentalAlerts from "@/app/components/RentalAlerts";
import WorkAgenda from "@/app/components/WorkAgenda";
import PageHeading from "@/app/components/PageHeading";


import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionUser } from "@/app/components/SessionProvider";
import StatusBadge from "@/app/components/StatusBadge";
import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

type DashboardData = {
  resumen: { activos: number; posicionesDisponibles: number; visitasPendientes: number; tasacionesPendientes: number; aprobaciones: number; negociaciones: number; textosPendientes: number; listosParaPublicar: number };
  pendientes: { etapa: string; total: number; tone: string }[];
  recientes: { numero: string; nombre: string; etapa: string; fecha: string | null }[];
};
const destinations: Record<string, { href: string; action: string }> = {
  "Visita pendiente": { href: "/visitas-pendientes", action: "Revisar visitas" },
  "Tasación pendiente": { href: "/registrar-tasaciones", action: "Registrar tasaciones" },
  "Expediente pendiente": { href: "/tasaciones-textos-pendientes#material", action: "Completar material" },
  "Listo para publicar": { href: "/tasaciones-textos-pendientes#listos", action: "Revisar publicaciones" },
};
function businessClock(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "numeric", hourCycle: "h23" }).format(now));
  return { greeting: hour >= 5 && hour < 12 ? "Buenos días" : hour < 18 && hour >= 12 ? "Buenas tardes" : "Buenas noches",
    icon: hour >= 5 && hour < 12 ? "☀️" : hour >= 12 && hour < 18 ? "🌤️" : hour >= 18 && hour < 23 ? "🌅" : "🌙",
    date: now.toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" }),
    time: now.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
  };
}
export default function Home() {
  const user = useSessionUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    const syncWhenVisible = () => { if (document.visibilityState === "visible") update(); };
    document.addEventListener("visibilitychange", syncWhenVisible);
    window.addEventListener("focus", update);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.removeEventListener("focus", update);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dashboard", { cache: "no-store", signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo cargar el panel.");
      if (!controller.signal.aborted) setData(body);
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "No se pudo cargar el panel."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const clock = now ? businessClock(now) : null;
  const work = data?.pendientes.filter(item => item.total > 0) ?? [];
  return <main className="min-h-screen bg-[#f7f7f5] p-6 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading href="/" />
        <Link href="/registrar-inmueble" className="aa-button aa-button-primary">+ Registrar inmueble</Link>
      </header>
      <section className="aa-card relative overflow-hidden p-5 sm:p-7">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[#c80000]" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-slate-600"><p className="capitalize">{clock?.date ?? "Resumen de la jornada"}</p><span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" /><time className="font-mono tabular-nums" dateTime={now?.toISOString()} aria-label={clock ? `Hora actual: ${clock.time}` : "Cargando hora"}>{clock?.time ?? "--:--:--"}</time></div><h2 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"><span aria-hidden="true" className="mr-2">{clock?.icon ?? ""}</span>{clock?.greeting ?? "Bienvenido"}, {user.nombre.split(" ")[0]}.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{loading ? "Estamos consultando los avances de la cartera." : error ? "Vuelve a cargar la información para consultar el estado actual." : work.length ? `${work.length} áreas del flujo necesitan seguimiento. Elige una para continuar.` : "No hay pendientes en las áreas consultadas. Puedes revisar la cartera y los reportes."}</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/cartera" className="aa-button aa-button-secondary">Ver cartera →</Link><Link href="/reportes" className="aa-button aa-button-secondary">Reportes</Link></div>
        </div>
      </section>
      <WorkAgenda/><RentalAlerts/>
      {error && <Feedback tone="error">{error}<button type="button" onClick={() => { setError(""); setLoading(true); setReload(value => value + 1); }} className="ml-3 font-semibold underline">Reintentar</button></Feedback>}
      {loading ? <LoadingCards label="Cargando cartera y pendientes…" count={6} /> : data && !error && <>
        <details open aria-labelledby="attention-title" className="aa-card p-5 sm:p-6">
          <summary className="cursor-pointer list-none"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="aa-eyebrow">Tu siguiente acción</p><h2 id="attention-title" className="mt-1 text-xl font-bold text-slate-950">Qué necesita atención</h2><p className="mt-2 text-sm leading-6 text-slate-600">Abre una bandeja para revisar sus inmuebles. Las tasaciones pendientes corresponden a inmuebles que ya tienen una visita realizada.</p></div><StatusBadge tone={work.length ? "pending" : "complete"}>{work.length ? "Hay tareas por atender" : "Al día"}</StatusBadge></div></summary>
          {work.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{work.map(item => {
            const target = destinations[item.etapa] ?? { href: "/cartera", action: "Ver cartera" };
            const progress = item.etapa === "En negociación";
            return <Link key={item.etapa} href={target.href} className={`cartera-folder group relative mt-5 flex min-w-0 flex-col rounded-b-2xl rounded-tr-2xl border p-4 transition hover:shadow-md ${progress ? "border-blue-200 bg-blue-50/50" : "border-amber-200 bg-amber-50/40"}`}>
              <span aria-hidden="true" className="cartera-folder-tab absolute -top-5 -left-px h-5 w-24 rounded-t-lg border border-b-0 border-amber-200 bg-amber-100" /><div className="mb-3 flex items-center justify-between gap-2"><FolderIcon /><span className="text-xs font-semibold text-slate-500">Abrir carpeta</span></div><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-3xl font-bold tabular-nums text-slate-950">{item.total}</span><StatusBadge tone={progress ? "progress" : "pending"}>{progress ? "En proceso" : "Pendiente"}</StatusBadge></div><h3 className="mt-3 text-sm font-bold text-slate-900">{item.etapa}</h3><span className="mt-4 text-sm font-semibold text-slate-800 group-hover:underline">{target.action} →</span>
            </Link>;
          })}</div> : <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">✓ No hay visitas, tasaciones, expedientes ni publicaciones pendientes en las áreas consultadas.</p>}
        </details>

        <div className="grid items-start gap-5">
          <section className="aa-card overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-900">Avances recientes</h2><p className="mt-1 text-sm text-slate-600">Últimos movimientos registrados.</p></div><div className="divide-y divide-slate-100">{data.recientes.length ? data.recientes.map((item, index) => <div key={`${item.numero}-${index}`} className="flex items-start gap-3 p-4 sm:p-5"><span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 font-mono text-sm font-bold text-slate-700">{item.numero}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-slate-900">{item.nombre}</p><p className="mt-1 text-sm text-slate-600">{item.etapa}</p><p className="mt-2 text-xs text-slate-500">{item.fecha ? new Date(item.fecha).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short" }) : "Sin fecha"}</p></div></div>) : <p className="p-5 text-sm text-slate-600">Todavía no hay movimientos registrados.</p>}</div></section>
        </div>
      </>}
      <section className="aa-card p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-900">Acciones rápidas</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Registrar visita", "/registrar-visitas"], ["Registrar tasación", "/registrar-tasaciones"], ["Completar material", "/tasaciones-textos-pendientes#material"], ["Consultar fichas", "/datos-inmuebles"]].map(([label, href]) => <Link key={href} href={href} className="cartera-folder-navigation aa-button aa-button-secondary justify-between border-amber-200 bg-amber-50/40"><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />{label}<span aria-hidden="true">→</span></Link>)}</div></section>
    </div>
  </main>;
}
