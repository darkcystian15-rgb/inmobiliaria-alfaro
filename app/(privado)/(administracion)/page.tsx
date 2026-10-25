"use client";
import { useZoneWorkspace } from "@/app/components/ZoneWorkspace";
import { zoneHref, zoneUrl } from "@/lib/zone-url";

import PropertySummary from "@/app/components/PropertySummary";

import RentalAlerts from "@/app/components/RentalAlerts";
import WorkAgenda from "@/app/components/WorkAgenda";
import PageHeading from "@/app/components/PageHeading";


import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionUser } from "@/app/components/SessionProvider";
import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

type DashboardData = {
  resumen: { activos: number; posicionesDisponibles: number; visitasPendientes: number; tasacionesPendientes: number; aprobaciones: number; negociaciones: number; textosPendientes: number; listosParaPublicar: number };
  pendientes: { etapa: string; total: number; tone: string }[];
  recientes: { inmuebleId: number; numero: string; nombre: string; nombreContacto: string | null; tipo: string; operacion: string; direccion: string | null; etapa: string; detalle?:string|null; usuario?:string|null; fecha: string | null }[];
};
const destinations: Record<string, { href: string; action: string }> = {
  "Visita pendiente": { href: "/visitas-pendientes", action: "Revisar visitas" },
  "Tasación pendiente": { href: "/tasaciones-pendientes", action: "Revisar tasaciones" },
  "Texto pendiente": { href: "/textos-pendientes", action: "Revisar textos" },
  "Publicación pendiente": { href: "/publicaciones-pendientes", action: "Revisar publicaciones" },
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
  const {zone} = useZoneWorkspace();
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
    fetch(zoneUrl("/api/dashboard"), { cache: "no-store", signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo cargar el panel.");
      if (!controller.signal.aborted) setData(body);
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "No se pudo cargar el panel."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const clock = now ? businessClock(now) : null;
  const work = data?.pendientes.filter(item => item.total > 0) ?? [];
  return <main className="min-h-screen bg-background p-6 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading href="/" />
        <Link href="/cartera" className="aa-button aa-button-primary">Trabajar por zonas</Link>
      </header>
      <section className="aa-card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-[var(--aa-red)] px-4 py-3 sm:px-5">
        <h2 className="break-words text-base font-semibold text-slate-950">{clock?.greeting ?? "Bienvenido"}, {user.nombre.split(" ")[0]}.</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600"><p className="capitalize">{clock?.date ?? "Resumen de la jornada"}</p><time className="font-mono tabular-nums" dateTime={now?.toISOString()} aria-label={clock ? `Hora actual: ${clock.time}` : "Cargando hora"}>{clock?.time ?? "--:--:--"}</time></div>
      </section>
      <WorkAgenda/><RentalAlerts/>
      {error && <Feedback tone="error">{error}<button type="button" onClick={() => { setError(""); setLoading(true); setReload(value => value + 1); }} className="ml-3 font-semibold underline">Reintentar</button></Feedback>}
      {loading ? <LoadingCards label="Cargando cartera y pendientes…" count={6} /> : data && !error && <>
        <details open aria-labelledby="attention-title" className="aa-card p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><h2 id="attention-title" className="text-lg font-bold text-slate-950">Pendientes</h2><span className="text-sm text-slate-600">{work.length ? `${work.length} áreas` : "Al día"}<span aria-hidden="true" className="ml-2">⌄</span></span></summary>
          {work.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{work.map(item => {
            const target = destinations[item.etapa] ?? { href: "/cartera", action: "Ver cartera" };
            const progress = item.etapa === "En negociación";
            return <Link key={item.etapa} href={zoneHref(target.href,zone?.nombre)} className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50">
              <span className={`flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2 text-2xl font-bold tabular-nums ${progress ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-900"}`}>{item.total}</span>
              <div className="min-w-0"><h3 className="text-sm font-semibold text-slate-900">{item.etapa}</h3><span className="mt-1 block text-xs font-semibold text-[var(--aa-red)] group-hover:underline">{target.action} →</span></div>
            </Link>;
          })}</div> : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">✓ Sin pendientes en las áreas consultadas.</p>}
        </details>

        <section aria-labelledby="recent-progress-title" className="aa-card w-full overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5"><h2 id="recent-progress-title" className="text-lg font-bold text-slate-900">Avances recientes</h2><p className="text-xs text-slate-500">Últimos cinco movimientos</p></header>
          <ul className="divide-y divide-slate-100">{data.recientes.length ? data.recientes.map((item, index) => <li key={`${item.inmuebleId}-${index}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition hover:bg-slate-50/70 sm:px-5">
            <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
              <span aria-label={`Posición ${item.numero}`} className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 px-1 font-mono text-xs font-semibold text-slate-500">{item.numero}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-5 text-slate-900" title={item.nombreContacto || "Sin contacto"}>{item.nombreContacto || "Sin contacto"}</p><p className="mt-1 break-words text-xs leading-5 text-slate-500"><PropertySummary operation={item.operacion} type={item.tipo} location={item.direccion} /></p>
                <p className="mt-0.5 break-words text-xs leading-5 text-slate-600"><span>{item.etapa}</span><span aria-hidden="true" className="mx-2 text-slate-300">·</span><time dateTime={item.fecha ?? undefined} className="text-slate-500">{item.fecha ? new Date(item.fecha).toLocaleString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "Sin fecha"}</time></p>
                {item.detalle&&<p className="mt-1 break-words text-xs text-slate-600">{item.detalle}</p>}{item.usuario&&<p className="mt-1 text-xs text-slate-500">Por: {item.usuario}</p>}
              </div>
            </div>
            <Link href={`/datos-inmuebles?codigo=${item.inmuebleId}&pestana=seguimiento#historial`} aria-label={`Ver historial de ${item.nombre}`} className="col-start-2 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#c80000] transition hover:bg-slate-50 sm:col-start-auto">Ver historial →</Link>
          </li>) : <li className="px-5 py-4 text-sm text-slate-600">Todavía no hay movimientos registrados.</li>}</ul>
        </section>
      </>}

    </div>
  </main>;
}
