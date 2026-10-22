"use client";

import PropertySummary from "@/app/components/PropertySummary";

import { propertyAddress } from "@/lib/property-address.mjs";
import { MobileFormFeedback } from "./MobileFormActions";
import PropertyFolderBrowser from "./PropertyFolderBrowser";
import FolderIcon from "./FolderIcon";
import { sectionsForOperation, dossierStatus } from "@/lib/transaction-dossier.mjs";
import { informationFolders, folderForLegacyTab, filesByInformationFolder } from "@/lib/property-folders.mjs";
import TransactionDossier from "./TransactionDossier";

import { useSearchParams } from "next/navigation";


import { priceLabel, referenceLabel, targetLabel } from "@/lib/operation.mjs";

import OperationalTracking from './OperationalTracking';
import PropertyHistory from './PropertyHistory';
import ExternalAnnouncements from './ExternalAnnouncements';
import PageHeading from "@/app/components/PageHeading";


import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ContextLink as Link, NavigationReturnProvider, useReturnHref, ReturnLink } from "@/app/components/NavigationReturn";
import type { Checklist } from "./PublicationChecklist";
import { Feedback } from "./InterfaceFeedback";
import type { PropertyProgressData } from "@/lib/property-progress";
import ConfirmDialog from "./ConfirmDialog";
import PropertyVisits from "./PropertyVisits";
import PhotoGallery from "./PhotoGallery";
import { useSessionUser } from "./SessionProvider";
import { isAdministrator } from "@/lib/access.mjs";
import { requestJson } from "@/lib/client-request";

type Item = { zona: string; id: string; posicion: number | null; nombre: string; tipo: string; operacion: string; ubicacion: string; direccion: string | null; propietario: string; estado: string };
type Property = {
  zona?: string; id: number; inmuebleOrigenId?:number|null; codigo: string; posicion: number | null; tipo: string; operacion: string; referencia: string; estado: string;
  nombreContacto: string | null; direccion: string | null; distrito: string | null; provincia: string | null; departamento: string | null;
  areaTerreno: string | null; areaConstruida: string | null; habitaciones: string | number | null; banos: string | number | null;
  caracteristicas: string | null; observaciones: string | null; fechaRegistro: string;

};

type Document = { id: number; tipoDocumento: string; nombre: string; enlace: string; observacion: string | null; almacenamiento: string; tipoMime: string | null; nombreOriginal: string | null; tamanoBytes: number | null };
type Details = { documentacion?: { complete: boolean; completed: number; total: number; alerts: string[] }; alquiler?: {fechaAlquiler:string|null;rentaMensual:string|null;comision:string|null;garantia:string|null;adelanto:string|null;fechaInicioAlquiler:string|null;fechaFinAlquiler:string|null}|null; relacionados?: {id:number;codigo:string;referencia:string}[]; historial?: {id:number;evento:string;observacion:string|null;fecha:string;usuario:string|null}[]; expediente?: Checklist; venta?: { fechaVenta: string | null; precioFinal: string | null; comision: string | null } | null; progreso: PropertyProgressData; inmueble: Property; tasacion: { fechaTasacion: string; valorReferencia: string | null; precioObjetivo: string | null; precioVenta: string | null; observacion: string | null } | null; publicacion: { texto: string; enlace: string; publicado: boolean; fechaPublicacion: string | null } | null };
type Tab = "Resumen" | "Estado del expediente" | "Vendedor" | "Comprador" | "Inmueble" | "Visitas" | "Seguimiento" | "Tasación" | "Publicación";
type IconName = "home" | "user" | "document" | "image" | "chart" | "publish" | "search" | "map" | "check" | "arrow" | "save" | "close" | "link";
function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 16 5-5 4 4 4-6 5 7" /></>,
    document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
    chart: <><path d="M4 4v16h16M8 15l4-5 4 2 4-7" /></>,
    publish: <><path d="m3 11 18-8-8 18-3-8-7-2ZM10 13l11-10" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    map: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z" /><path d="M7 3v6h9V3M7 21v-8h10v8" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" /></>,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const positionLabel = (position: number | null) => position == null ? "—" : String(position).padStart(2, "0");
const money = (value: string | null | undefined) => value ? `S/ ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Por definir";
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "Sin fecha";

function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-4"><div><h3 className="text-sm font-bold text-slate-900">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>{children}</section>;
}
function Stat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 text-slate-500"><Icon name={icon} /><p className="text-xs font-bold uppercase tracking-wide">{label}</p></div><p className="mt-3 break-words text-sm font-semibold text-slate-800">{value}</p></div>;
}
export default function PropertyInformation({ initialCode = "", initialTab = "Resumen", initialFolder = "" }: { initialCode?: string; initialTab?: Tab; initialFolder?: string }) {
  const params = useSearchParams();
  const zone = params.get("zona") || "*";
  const admin = isAdministrator(useSessionUser());
  const [pendingProperty, setPendingProperty] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [zoneNames, setZoneNames] = useState<string[]>([]);
  const [folder, setFolder] = useState(() => initialFolder && (informationFolders("venta", admin).some(item => item.key === initialFolder) || ["vendedor", "comprador", "otros"].includes(initialFolder)) ? initialFolder : !admin && initialTab === "Seguimiento" ? "" : initialTab === "Resumen" ? "" : folderForLegacyTab(initialTab));
  const [dossier, setDossier] = useState<ReturnType<typeof dossierStatus> | null>(null);
  const [code, setCode] = useState(initialCode);
  const [tab, setTab] = useState<Tab>(!admin && initialTab === "Seguimiento" ? "Resumen" : initialTab);
  const [details, setDetails] = useState<Details | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const documentFiles = documents.filter(document => document.tipoDocumento !== "FOTO_INMUEBLE");
  const photoCount = documents.filter(document => document.tipoDocumento === "FOTO_INMUEBLE" && document.tipoMime?.startsWith("image/")).length;
  const [dossierDirty, setDossierDirty] = useState(false);
  const [uploadReady, setUploadReady] = useState(false);
  const originHref = useReturnHref(`/datos-inmuebles?zona=${encodeURIComponent(zone)}&codigo=${encodeURIComponent(code)}&carpeta=${encodeURIComponent(folder)}&pestana=${encodeURIComponent(tab.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}`);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [listReload, setListReload] = useState(0);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);
  const [message, setMessage] = useState("");
  const loadRequest = useRef(0);
  const sheet = useRef<HTMLDivElement>(null);
  const dirty = dossierDirty;
  const groupedFiles = filesByInformationFolder(documentFiles, dossier, details?.inmueble.operacion || "venta");
  const folders = informationFolders(details?.inmueble.operacion || "venta", admin, groupedFiles.otros.length);
  const activeFolder = folders.find(item => item.key === folder) || (folder === "otros" ? { label: "Otros archivos conservados" } : folder === "vendedor" ? { label: details?.inmueble.operacion === "alquiler" ? "Arrendador" : "Vendedor" } : folder === "comprador" ? { label: details?.inmueble.operacion === "alquiler" ? "Arrendatario" : "Comprador" } : undefined);
  const documentSection = sectionsForOperation(details?.inmueble.operacion || "venta").some(([key]) => key === folder) || folder === "otros";
  const rental = details?.inmueble.operacion === "alquiler";
  function changeZone(value: string) {
    if (busy || dossierDirty) return;
    const url = new URL(window.location.href);
    url.searchParams.set("zona", value);
    url.searchParams.delete("codigo");
    url.searchParams.delete("pestana");
    url.searchParams.delete("carpeta");
    selectProperty("");
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  useEffect(() => {
    if (!dirty && !dossierDirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, dossierDirty]);

  const load = useCallback((key: string, signal?: AbortSignal) => {
    const id = ++loadRequest.current;
    if (!key) return Promise.resolve();
    setErrorCarga(false);
    return Promise.all([
      requestJson<Details>(`/api/inmuebles/${encodeURIComponent(key)}`, { signal }),
      requestJson<{ config: object; status: ReturnType<typeof dossierStatus> }>(`/api/inmuebles/${encodeURIComponent(key)}/expediente`, { signal }),
      requestJson<{ archivos: Document[]; subidaHabilitada: boolean }>(`/api/inmuebles/${encodeURIComponent(key)}/archivos`, { signal }),
    ]).then(([data, expediente, files]) => {
      if (signal?.aborted || id !== loadRequest.current) return;
      setError(""); setDetails(data); setDocuments(files.archivos); setUploadReady(files.subidaHabilitada); setDossier(expediente.status);
      setItems(previous => previous.map(item => item.id !== data.inmueble.codigo ? item : { ...item, nombre: data.inmueble.referencia, direccion: data.inmueble.direccion, operacion: data.inmueble.operacion, tipo: data.inmueble.tipo, ubicacion: propertyAddress(data.inmueble), propietario: data.inmueble.nombreContacto || "Sin contacto" }));
    }).catch(error => {
      if (!signal?.aborted && id === loadRequest.current) { setErrorCarga(true); setError(error instanceof Error ? error.message : "No se pudo cargar la ficha."); }
    }).finally(() => {
      if (!signal?.aborted && id === loadRequest.current) setLoading(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ inmuebles: Item[]; zonas: string[] }>("/api/inmuebles?zona=*", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setItems(data.inmuebles); setZoneNames(data.zonas || []); } })
      .catch(error => { if (!controller.signal.aborted) setListError(error instanceof Error ? error.message : "No se pudieron cargar los inmuebles."); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [listReload]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { if (!controller.signal.aborted) void load(code, controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [code, load]);

  function selectProperty(key: string, discard = false) {
    if (busy || key === code) return;
    if (!discard && (dirty || dossierDirty)) { setPendingProperty(key); return; }
    setPendingProperty(null);
    ++loadRequest.current;
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("codigo", key); else url.searchParams.delete("codigo");
    url.searchParams.delete("pestana"); url.searchParams.delete("carpeta");
    window.history.replaceState(null, "", url.pathname + url.search);
    setCode(key); setFolder(""); setTab("Resumen"); setError(""); setMessage(""); setDossierDirty(false);
    setDetails(null); setDocuments([]); setDossier(null); setLoading(Boolean(key));
    if (key && window.innerWidth < 1536) window.requestAnimationFrame(() => sheet.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
  }
  function openFolder(key: string) {
    if (busy || dossierDirty) return;
    key = key === "resumen" ? "" : key;
    setFolder(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("carpeta", key); else url.searchParams.delete("carpeta");
    url.searchParams.delete("pestana");
    window.history.replaceState(null, "", url.pathname + url.search);
    const destination = informationFolders(details?.inmueble.operacion || "venta", admin).find(item => item.key === key);
    if (destination?.tab) setTab(destination.tab as Tab);
  }
  function openTab(value: Tab) {
    if (busy || dossierDirty) return;
    openFolder(folderForLegacyTab(value)); setTab(value);
  }
  return <NavigationReturnProvider href={originHref} zone={details?.inmueble.zona}><main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
    {pendingProperty !== null && <ConfirmDialog title="Cambios sin guardar" confirmLabel="Descartar cambios" onCancel={() => setPendingProperty(null)} onConfirm={() => selectProperty(pendingProperty, true)}><p>Tienes cambios pendientes en esta ficha. Si cambias de inmueble, se descartarán.</p></ConfirmDialog>}
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading href="/datos-inmuebles" />
        {admin && <ReturnLink />}
      </header>

      <nav aria-label="Ruta de carpetas" className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <button type="button" disabled={busy || dossierDirty} onClick={() => changeZone("*")} className="font-semibold text-red-700 disabled:opacity-50">Zonas</button>
        {(zone !== "*" || details) && <><span aria-hidden="true">/</span><button type="button" disabled={busy || dossierDirty} onClick={() => code ? changeZone(details?.inmueble.zona || zone) : undefined} className="break-words font-semibold">{details?.inmueble.zona || zone}</button></>}
        {details && <><span aria-hidden="true">/</span><button type="button" disabled={busy || dossierDirty} onClick={() => openFolder("")} className="min-w-0 break-words font-semibold">{positionLabel(details.inmueble.posicion)} · {details.inmueble.nombreContacto || "Sin contacto"}</button></>}
        {activeFolder && <><span aria-hidden="true">/</span><span aria-current="page" className="break-words text-slate-500">{activeFolder.label}</span></>}
      </nav>
      <div className="mt-6 space-y-5">
        <div hidden={Boolean(code)}><PropertyFolderBrowser items={items} zoneNames={zoneNames} zone={zone} loading={listLoading} error={listError} onZone={changeZone} onOpen={selectProperty} onRetry={() => { setListLoading(true); setListError(""); setListReload(value => value + 1); }} /></div>

        <div ref={sheet} hidden={!code} className="min-w-0 scroll-mt-24 xl:scroll-mt-5">
          {code && <button type="button" disabled={busy || dossierDirty} onClick={() => changeZone(details?.inmueble.zona || zone)} className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">← Volver a los inmuebles de la zona</button>}
          {error && <MobileFormFeedback value={error}><Feedback tone="error" className="mb-4">{error}{errorCarga && <button type="button" disabled={loading || busy} onClick={() => { setLoading(true); void load(code); }} className="aa-button aa-button-secondary mt-3">{loading ? "Cargando…" : "Reintentar"}</button>}</Feedback></MobileFormFeedback>}
          {message && <MobileFormFeedback value={message}><Feedback className="mb-4">{message}</Feedback></MobileFormFeedback>}
          {loading && !details ? <div role="status" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-8"><p className="text-sm text-slate-500">Cargando ficha del inmueble…</p><div className="h-28 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" /><div className="h-64 animate-pulse rounded-2xl bg-slate-50 motion-reduce:animate-none" /></div> : !details ? <div className="flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-red-100 bg-[#fff5f4] text-[#c80000]"><Icon name="home" className="h-9 w-9" /></div><p className="mt-6 text-lg font-bold text-slate-900">La ficha de tu inmueble, en un solo lugar</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Selecciona un inmueble de la lista para consultar sus datos, completar la información y organizar sus documentos.</p><div className="mt-7 flex flex-wrap justify-center gap-2">{["Contacto", "Expediente", "Visitas y seguimiento"].map(label => <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">{label}</span>)}</div></div> : <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
              <div className="h-1.5 bg-[#c80000]" />
              <div className="grid grid-cols-1 items-start gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4"><span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#fff1f1] text-[#c80000]"><span className="text-xs font-bold uppercase tracking-wider">Posición</span><span className="font-mono text-xl font-bold">{positionLabel(details.inmueble.posicion)}</span></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold capitalize text-slate-500">{details.inmueble.estado === "activo" ? "Inmueble en cartera" : "Ficha histórica"}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${details.inmueble.estado === "activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{details.inmueble.estado === "activo" ? "Activo" : "Histórico"}</span></div><h2 className="mt-2 break-words text-xl font-bold tracking-tight text-slate-950">{details.inmueble.nombreContacto || "Sin contacto"}</h2><p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500"><Icon name="map" className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words"><PropertySummary operation={details.inmueble.operacion} type={details.inmueble.tipo} location={details.inmueble.direccion} /></span></p><p className="mt-2 text-xs font-semibold text-slate-600">Zona: {details.inmueble.zona || "Sin zona"}</p></div></div>
                <div className="min-w-0 rounded-2xl bg-slate-50 px-5 py-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{priceLabel(details.inmueble.operacion)}</p><p className="mt-1 break-words text-lg font-bold tracking-tight text-slate-900">{money(details.tasacion?.precioVenta)}</p></div>
              </div>

            </section>


            {!folder && <section aria-label="Resumen del inmueble" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-bold text-slate-900">Resumen del inmueble</h3><p className="text-xs text-slate-500">Registro: {formatDate(details.inmueble.fechaRegistro)}</p></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Documentación" value={`${documentFiles.length} documento${documentFiles.length === 1 ? "" : "s"}`} icon="document" />
                <Stat label="Fotografías" value={`${photoCount} foto${photoCount === 1 ? "" : "s"}`} icon="image" />
                <Stat label="Estado documental" value={details.documentacion ? `${details.documentacion.completed}/${details.documentacion.total} requisitos · ${details.documentacion.complete ? "Completo" : "Con pendientes"}` : "Por completar"} icon="check" />
                <Stat label="Publicación" value={details.publicacion?.publicado ? "Publicado" : details.publicacion ? details.expediente?.complete ? "Lista para publicar" : "Con requisitos pendientes" : "Sin publicación"} icon="publish" />
              </div>
              <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-500">{referenceLabel(details.inmueble.operacion)}</dt><dd className="mt-1 text-sm font-bold text-slate-800">{money(details.tasacion?.valorReferencia)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">{targetLabel(details.inmueble.operacion)}</dt><dd className="mt-1 text-sm font-bold text-slate-800">{money(details.tasacion?.precioObjetivo)}</dd></div></dl>
              {details.inmueble.inmuebleOrigenId && <p className="mt-3 text-xs text-slate-500">Captación anterior: {details.inmueble.inmuebleOrigenId}</p>}
              {details.venta && <div className="mt-4 border-t border-slate-100 pt-4"><h4 className="mb-3 text-sm font-bold">Resultado de la venta</h4><div className="grid gap-3 sm:grid-cols-3"><Stat label="Fecha de venta" value={formatDate(details.venta.fechaVenta)} icon="chart" /><Stat label="Precio final" value={money(details.venta.precioFinal)} icon="chart" /><Stat label="Comisión" value={money(details.venta.comision)} icon="chart" /></div></div>}
              {details.alquiler && <div className="mt-4 border-t border-slate-100 pt-4"><h4 className="text-sm font-bold">Alquiler registrado</h4><p className="mt-1 text-xs text-slate-500">Cierre: {formatDate(details.alquiler.fechaAlquiler)} · Inicio: {formatDate(details.alquiler.fechaInicioAlquiler)} · Fin: {formatDate(details.alquiler.fechaFinAlquiler)}</p><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Renta mensual acordada" value={money(details.alquiler.rentaMensual)} icon="chart" /><Stat label="Comisión" value={money(details.alquiler.comision)} icon="chart" /><Stat label="Garantía" value={money(details.alquiler.garantia)} icon="chart" /><Stat label="Adelanto" value={money(details.alquiler.adelanto)} icon="chart" /></div></div>}
            </section>}

            {!folder && <section aria-label="Carpetas del inmueble" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-900">Carpetas del inmueble</h3><p className="mt-1 text-sm text-slate-500">Abre una carpeta para consultar o completar su información.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{rental ? "Alquiler" : "Venta"}</span></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{folders.map(item => {
                const section = dossier?.sections.find(section => section.key === item.key);
                const count = groupedFiles[item.key]?.length || 0;
                return <button key={item.key} type="button" onClick={() => openFolder(item.key)} disabled={busy || dossierDirty} className="flex min-h-28 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/50 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50"><FolderIcon className="h-9 w-9 shrink-0 text-amber-500" /><span className="min-w-0"><span className="block break-words text-sm font-bold text-slate-800">{item.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>{(section || item.key === "otros") && <span className="mt-2 block text-xs text-slate-600">{count} archivo{count === 1 ? "" : "s"}{section && ` · ${section.completed}/${section.total} requisitos`}</span>}{section && <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${section.pending ? "bg-amber-100 text-amber-900" : section.total ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{section.pending ? `${section.pending} pendiente${section.pending === 1 ? "" : "s"}` : section.total ? "Completo" : "Opcional / según condiciones"}</span>}{item.key === "visitas" && <span className="mt-2 block text-xs text-slate-600">{photoCount} fotos</span>}</span></button>;
              })}</div>
            </section>}
            {folder && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={busy || dossierDirty} onClick={() => openFolder("")} className="aa-button aa-button-secondary">← Carpetas del inmueble</button><h3 className="text-lg font-bold">{activeFolder?.label || "Información del inmueble"}</h3></div>}
            {dossierDirty && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Guarda o descarta los cambios y la selección de archivos antes de salir de esta carpeta.</p>}
            <section hidden={!folder} aria-label={activeFolder?.label || tab} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] sm:p-6">
              <div hidden={!documentSection && !["estado", "vendedor", "comprador"].includes(folder)}>
                <TransactionDossier key={details.inmueble.id} propertyId={details.inmueble.id} operation={details.inmueble.operacion} section={documentSection ? folder : undefined} view={documentSection ? "carpeta" : folder === "vendedor" ? "vendedor" : folder === "comprador" ? "comprador" : "estado"} files={documentFiles} uploadReady={uploadReady} administrator={admin} onChanged={() => load(code)} onBusyChange={setBusy} onDirtyChange={setDossierDirty} />
              </div>

              {admin && folder === "seguimiento" && <div className="space-y-5"><h3 className="text-lg font-bold">Seguimiento de {rental ? "alquiler" : "venta"}</h3><p className="text-sm text-slate-600">Plazos particulares e historial de la operación. Los pendientes documentales se consultan en Estado del expediente.</p><button className="aa-button aa-button-secondary" onClick={() => openTab("Estado del expediente")}>Ver pendientes documentales ({details.documentacion?.completed ?? 0}/{details.documentacion?.total ?? 0})</button><OperationalTracking key={`tracking-${code}`} propertyId={details.inmueble.id} administrator={admin} onChanged={()=>void load(code)} onBusyChange={setBusy} progress={details.progreso} documentaryComplete={details.documentacion?.complete ?? false}/><PropertyHistory events={details.historial??[]}/></div>}
              {folder === "visitas" && <div className="space-y-6"><PropertyVisits key={code} propertyId={details.inmueble.id} onBusyChange={setBusy} onChanged={() => { void load(code); }} /><PhotoGallery key={`photos-${code}-${photoCount}`} propertyId={details.inmueble.id} visitaId={null} editable allowUpload={false} onBusyChange={setBusy} onChanged={() => { void load(code); }} /></div>}
              {folder === "precios" && (details.tasacion ? <div className="space-y-6"><Block title="Tasación registrada" description={`Fecha de tasación: ${formatDate(details.tasacion.fechaTasacion)}`}><div className="grid gap-3 sm:grid-cols-3"><Stat label={referenceLabel(details.inmueble.operacion)} value={money(details.tasacion.valorReferencia)} icon="chart" /><Stat label={targetLabel(details.inmueble.operacion)} value={money(details.tasacion.precioObjetivo)} icon="chart" /><Stat label={priceLabel(details.inmueble.operacion)} value={money(details.tasacion.precioVenta)} icon="chart" /></div></Block><Block title="Observación"><p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{details.tasacion.observacion || "Sin observaciones registradas."}</p></Block>{admin && <Link href={`/tasaciones-textos-pendientes?inmueble=${details.inmueble.id}#material`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#c80000]">Gestionar {priceLabel(details.inmueble.operacion).toLowerCase()} <Icon name="arrow" /></Link>}</div> : <div className="rounded-2xl bg-slate-50 p-6"><p className="text-sm text-slate-500">Todavía no hay una tasación registrada.</p>{admin && <Link href={`/registrar-tasaciones?inmueble=${details.inmueble.id}`} className="mt-3 inline-flex text-xs font-semibold text-[#c80000]">Registrar tasación →</Link>}</div>)}

              {folder === "publicacion" && (details.publicacion ? <div className="space-y-5"><Block title="Publicación del inmueble" description={details.publicacion.publicado ? `Publicada el ${formatDate(details.publicacion.fechaPublicacion)}` : details.expediente?.complete ? "Texto y material listos para publicar." : "La publicación preparada tiene requisitos pendientes."}><p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{details.publicacion.texto}</p></Block><button type="button" onClick={() => openTab("Visitas")} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-red-700">Ver fotos de la publicación →</button></div> : <div className="rounded-2xl bg-slate-50 p-6"><p className="text-sm text-slate-500">Todavía no hay una publicación registrada.</p>{admin && <Link href={`/tasaciones-textos-pendientes?inmueble=${details.inmueble.id}#material`} className="mt-3 inline-flex text-xs font-semibold text-[#c80000]">Preparar texto y material →</Link>}</div>)}
              {folder === "publicacion" && <ExternalAnnouncements key={code} propertyId={details.inmueble.id} editable={admin&&details.inmueble.estado==='activo'} price={details.tasacion?.precioVenta??null}/>}
            </section>
          </>}
        </div>
      </div>
    </div>

    </main></NavigationReturnProvider>;
}
