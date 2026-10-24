"use client";

import { useZoneWorkspace } from "./ZoneWorkspace";
import { zoneWorkflowPaths } from "@/lib/zone-workflow";
import { zoneHref } from "@/lib/zone-url";
import Image from "next/image";
import { useState } from "react";
import { dashboardMenuItem, menuGroups } from "@/lib/navigation";
import { isAdministrator } from "@/lib/access.mjs";
import LogoutButton from "./LogoutButton";
import { useSessionUser } from "./SessionProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ name }: { name: string }) {
  const common = { className: "h-[18px] w-[18px]", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 16 5-4 4 4 3-3 6 5"/></>,
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    home: <path d="m3 10 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z"/>,
    plus: <><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></>,
    release: <><path d="M4 7h11"/><path d="m11 3 4 4-4 4"/><path d="M20 17H9"/><path d="m13 13-4 4 4 4"/></>,
    visit: <><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 9h8M8 13h5M8 17h3"/></>,
    valuation: <><path d="M5 20V9l7-5 7 5v11"/><path d="M8 20v-5h8v5"/><path d="M9 10h6"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
    clipboard: <><rect x="5" y="5" width="14" height="15" rx="2"/><path d="M9 5V4h6v1M8 10h8M8 14h6"/></>,
    report: <><path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/></>,
    database: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-4-5"/></>,
    map: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="M6 6l12 12M18 6 6 18"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function MenuLink({ item, onNavigate }: { item: { href: string; label: string; icon: string }; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { zone } = useZoneWorkspace();
  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href === "/cartera" && zone ? `/cartera?zona=${encodeURIComponent(zone.nombre)}` : zoneHref(item.href, zone?.nombre)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium transition ${active ? "bg-[var(--aa-brand-soft)] text-[var(--aa-red-dark)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/70 text-[var(--aa-red-dark)]" : "text-slate-500 group-hover:text-slate-700"}`}>
        <Icon name={item.icon}/>
      </span>
      <span className="min-w-0 flex-1 leading-5">{item.label}</span>{active && <span className="h-1.5 w-1.5 rounded-full bg-[#c80000]" />}
    </Link>
  );
}

function MenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useSessionUser();
  const {zone} = useZoneWorkspace();
  const groups=menuGroups.map(group=>({...group,items:group.items.filter(item=>!isAdministrator(user)?item.href==="/datos-inmuebles":zone||!zoneWorkflowPaths.has(item.href))})).filter(group=>group.items.length);
  const phaseOne = groups.filter(group => !group.items.some(item => item.href === "/datos-inmuebles"));
  const phaseTwo = groups.filter(group => group.items.some(item => item.href === "/datos-inmuebles"));
  const renderGroups = (items: typeof groups) => items.map(group => <div key={group.label}>
    <div className="mb-2 mt-6 px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</div>
    <div className="space-y-1">
      {group.items.map(item => <MenuLink key={item.href} item={item} onNavigate={onNavigate} />)}
    </div>
  </div>);
  return (
    <>
      {isAdministrator(user) && <section aria-labelledby="navigation-phase-one">
        <h2 id="navigation-phase-one" className="mb-3 border-l-4 border-[var(--aa-red)] px-3 text-lg font-extrabold tracking-wide text-slate-900">FASE 1</h2>
        <div className="mb-1">
          <MenuLink item={dashboardMenuItem} onNavigate={onNavigate} />
        </div>
        {zone && <Link href="/cartera" onClick={onNavigate} className="aa-button aa-button-secondary mb-3 w-full">← Todas las zonas</Link>}
        {zone && <p className="px-3 text-sm font-bold text-slate-900">Zona: {zone.nombre}</p>}
        {renderGroups(phaseOne)}
      </section>}
      {phaseTwo.length > 0 && <section aria-labelledby="navigation-phase-two" className={isAdministrator(user) ? "mt-7 border-t border-slate-200 pt-5" : ""}>
        <h2 id="navigation-phase-two" className="mb-3 border-l-4 border-[var(--aa-red)] px-3 text-lg font-extrabold tracking-wide text-slate-900">FASE 2</h2>
        {!isAdministrator(user) && zone && <Link href="/cartera" onClick={onNavigate} className="aa-button aa-button-secondary mb-3 w-full">← Todas las zonas</Link>}
        {!isAdministrator(user) && zone && <p className="px-3 text-sm font-bold text-slate-900">Zona: {zone.nombre}</p>}
        {renderGroups(phaseTwo)}
      </section>}
    </>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const user = useSessionUser();

  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-center border-b border-slate-200 bg-white/95 px-20 backdrop-blur-sm xl:hidden">
        <Image src="/branding/logo.png" alt="" width={128} height={40} className="h-auto max-h-10 w-32 object-contain" />
      </div>
      <button
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="navigation-panel"
        onClick={() => setOpen((value) => !value)}
        className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl border border-[#e7e5e2] bg-white text-slate-700 shadow-sm xl:hidden"
      >
        <Icon name={open ? "close" : "menu"}/>
      </button>

      {open && (
        <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px] xl:hidden" />
      )}

      <aside id="navigation-panel" className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,18rem)] flex-col border-r border-slate-200 bg-[var(--aa-workspace)] shadow-xl transition-transform duration-200 xl:top-0 xl:w-72 xl:translate-x-0 xl:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex shrink-0 flex-col items-center justify-center border-b border-slate-100 px-5 py-4">
          <div className="flex w-[176px] items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
            <Image
              width={170}
              height={54}
              src="/branding/logo.png"
              alt="Inmobiliaria Alberto Alfaro"
              className="h-auto w-full object-contain"
            />
          </div>
          <div className="mt-3 w-[176px] text-center">
            <div aria-hidden="true" className="mx-auto mb-3 h-0.5 w-10 rounded-full bg-[var(--aa-red)]" />
            <div className="text-sm font-bold tracking-[0.12em] text-slate-900">INTRANET</div>
            <div className="mt-1 text-xs leading-4 text-slate-500">Gestión inmobiliaria</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <MenuContent onNavigate={() => setOpen(false)}/>
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff1f1] text-[#c80000]">
                <span className="h-2 w-2 rounded-full bg-[#c80000]" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">{user.nombre}</div>
                <div className="text-xs text-slate-500">{user.rol === "administrador" ? "Administrador" : "Operador"}</div>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3 text-xs leading-4 text-slate-500">
              Cartera, seguimiento y pendientes en un solo lugar.
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
