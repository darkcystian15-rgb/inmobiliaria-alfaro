"use client";
import GeographySelect from "./GeographySelect";

import { propertyDisplayId } from "@/lib/property-display-id";

import OperationSelect from "./OperationSelect";
import { priceLabel, referenceLabel, targetLabel, operationLabel } from "@/lib/operation.mjs";
import PropertyTypeSelect from "./PropertyTypeSelect";
import DraftRecovery from './DraftRecovery';
import OperationalTracking from './OperationalTracking';
import PropertyHistory from './PropertyHistory';
import ExternalAnnouncements from './ExternalAnnouncements';
import PageHeading from "@/app/components/PageHeading";


import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import PublicationChecklist, { type Checklist } from "./PublicationChecklist";
import PropertyProgress from "./PropertyProgress";
import { Feedback } from "./InterfaceFeedback";
import type { PropertyProgressData } from "@/lib/property-progress";
import ConfirmDialog from "./ConfirmDialog";
import PropertyVisits from "./PropertyVisits";
import PhotoGallery from "./PhotoGallery";
import PropertyLocation from "./PropertyLocation";
import { compressImage, isImageFile } from "@/lib/client-images";
import { useSessionUser } from "./SessionProvider";
import { isAdministrator } from "@/lib/access.mjs";
import { filterProperties } from "@/lib/property-list.mjs";

type Item = { datosPrueba?: number; id: string; posicion: number | null; nombre: string; tipo: string; ubicacion: string; propietario: string; estado: string };
type Property = {
  id: number; inmuebleOrigenId?:number|null; datosPrueba: boolean; datosValidados:boolean; evidenciaPrueba: number; codigo: string; posicion: number | null; tipo: string; operacion: string; referencia: string; estado: string;
  propietarioId: number | null; numeroDireccion?:string|null; direccion: string | null; distrito: string | null; provincia: string | null; departamento: string | null;
  latitud: string | null; longitud: string | null;
  areaTerreno: string | null; areaConstruida: string | null; habitaciones: string | number | null; banos: string | number | null;
  caracteristicas: string | null; observaciones: string | null; fechaRegistro: string;
  propietarioDni: string | null; propietarioNombres: string | null; propietarioApellidos: string | null;
  propietarioTelefono: string | null; propietarioEmail: string | null; propietarioReferencia: string | null;
};
type Owner = { dni: string; nombres: string; apellidos: string; telefono: string; email: string; referenciaContacto: string };
type Document = { id: number; tipoDocumento: string; nombre: string; enlace: string; observacion: string | null; almacenamiento: string; tipoMime: string | null; nombreOriginal: string | null; tamanoBytes: number | null };
type Details = { alquiler?: {fechaAlquiler:string|null;rentaMensual:string|null;comision:string|null;garantia:string|null;adelanto:string|null;fechaInicioAlquiler:string|null;fechaFinAlquiler:string|null}|null; relacionados?: {id:number;codigo:string;referencia:string}[]; historial?: {id:number;evento:string;observacion:string|null;fecha:string;usuario:string|null}[]; expediente?: Checklist; venta?: { fechaVenta: string | null; precioFinal: string | null; comision: string | null; datosSimulados: boolean } | null; progreso: PropertyProgressData; inmueble: Property; tasacion: { fechaTasacion: string; valorReferencia: string | null; precioObjetivo: string | null; precioVenta: string | null; observacion: string | null } | null; publicacion: { texto: string; enlace: string; publicado: boolean; fechaPublicacion: string | null } | null };
type DocumentForm = { tipoDocumento: string; nombre: string; observacion: string };
const emptyDocument: DocumentForm = { tipoDocumento: "DNI_PROPIETARIO", nombre: "", observacion: "" };
const emptyOwner: Owner = { dni: "", nombres: "", apellidos: "", telefono: "", email: "", referenciaContacto: "" };
const documentTypes = [["DNI_PROPIETARIO", "DNI del propietario"], ["DOCUMENTO_PROPIEDAD", "Documento de propiedad"], ["COPIA_LITERAL", "Copia literal"], ["CONTRATO", "Contrato"], ["TASACION", "Tasación"], ["TEXTO_PUBLICACION", "Texto de publicación"], ["VIDEO_INMUEBLE", "Video / recorrido"], ["PLANO", "Plano"], ["RECIBO_SERVICIO", "Recibo de servicio"], ["OTRO", "Otro"]];
const tabs = [["Resumen", "home"], ["Propietario", "user"], ["Inmueble", "building"], ["Documentación", "document"], ["Fotos", "image"], ["Visitas", "image"], ["Tasación", "chart"], ["Publicación", "publish"]] as const;
type Tab = (typeof tabs)[number][0];
type IconName = (typeof tabs)[number][1] | "search" | "map" | "check" | "arrow" | "save" | "close" | "link";
const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-[#c80000]/40 focus:bg-white disabled:opacity-50";
const primaryClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#c80000] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-50";

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    building: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-6h4v6" /></>,
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

function ownerFrom(property: Property): Owner {
  return { dni: property.propietarioDni ?? "", nombres: property.propietarioNombres ?? "", apellidos: property.propietarioApellidos ?? "", telefono: property.propietarioTelefono ?? "", email: property.propietarioEmail ?? "", referenciaContacto: property.propietarioReferencia ?? "" };
}
const positionLabel = (position: number | null) => position == null ? "—" : String(position).padStart(2, "0");
const money = (value: string | null | undefined) => value ? `S/ ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Por definir";
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "Sin fecha";

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  return data as T;
}

function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-4"><div><h3 className="text-sm font-bold text-slate-900">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>{children}</section>;
}
function Stat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 text-slate-500"><Icon name={icon} /><p className="text-xs font-bold uppercase tracking-wide">{label}</p></div><p className="mt-3 break-words text-sm font-semibold text-slate-800">{value}</p></div>;
}
function SaveBar({ dirty, busy }: { dirty: boolean; busy: boolean }) {
  return <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"><p className={`flex items-center gap-2 text-xs ${dirty ? "text-amber-700" : "text-slate-500"}`}><Icon name={dirty ? "document" : "check"} />{dirty ? "Tienes cambios por guardar" : "Sin cambios pendientes"}</p><button type="submit" disabled={!dirty || busy} className={primaryClass}><Icon name="save" />{busy ? "Guardando…" : "Guardar cambios"}</button></div>;
}

function DeleteDocumentDialog({ document, busy, onCancel, onConfirm }: {
  document: Document; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const hosted = document.almacenamiento === "hosting";
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} aria-labelledby="delete-document-title" aria-describedby="delete-document-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm">
    <span className="mb-4 inline-flex rounded-2xl bg-red-50 p-3 text-[#c80000]"><Icon name="document" className="h-6 w-6" /></span>
    <h2 id="delete-document-title" className="text-lg font-bold text-slate-900">{hosted ? "Eliminar documento" : "Quitar enlace"}</h2>
    <p className="mt-3 break-words rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">{document.nombre}</p>
    <p id="delete-document-description" className="mt-4 text-sm leading-6 text-slate-500">{hosted ? "Se eliminará el documento y su archivo guardado. Esta acción no se puede deshacer." : "Se quitará el enlace de la ficha. El archivo externo se conservará."}</p>
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button type="button" autoFocus disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-50">Cancelar</button>
      <button type="button" disabled={busy} onClick={onConfirm} className={`${primaryClass} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c80000]`}>{busy ? "Eliminando…" : hosted ? "Eliminar documento" : "Quitar enlace"}</button>
    </div>
  </dialog>;
}

export default function PropertyInformation({ initialCode = "", initialTab = "Resumen" }: { initialCode?: string; initialTab?: Tab }) {
  const admin = isAdministrator(useSessionUser());
  const [changeOwner, setChangeOwner] = useState(false);
  const [confirmOwner, setConfirmOwner] = useState(false);
  const [pendingProperty, setPendingProperty] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialCode ? "todos" : "activo");
  const [code, setCode] = useState(initialCode);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [details, setDetails] = useState<Details | null>(null);
  const [form, setForm] = useState<Property | null>(null);
  const [owner, setOwner] = useState<Owner>(emptyOwner);
  const [documents, setDocuments] = useState<Document[]>([]);
  const documentFiles = documents.filter(document => document.tipoDocumento !== "FOTO_INMUEBLE");
  const photoCount = documents.filter(document => document.tipoDocumento === "FOTO_INMUEBLE" && document.tipoMime?.startsWith("image/")).length;
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadReady, setUploadReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocument);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [listReload, setListReload] = useState(0);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const loadRequest = useRef(0);
  const sheet = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => filterProperties(items, query, status) as Item[], [items, query, status]);
  const dirty = !!details && (JSON.stringify(form) !== JSON.stringify(details.inmueble) || JSON.stringify(owner) !== JSON.stringify(ownerFrom(details.inmueble)));

  const load = useCallback((key: string, signal?: AbortSignal, preserveForm = false) => {
    const id = ++loadRequest.current;
    if (!key) return Promise.resolve();
    return Promise.all([
      requestJson<Details>(`/api/inmuebles/${encodeURIComponent(key)}`, { signal }),
      requestJson<{ archivos: Document[]; subidaHabilitada: boolean }>(`/api/inmuebles/${encodeURIComponent(key)}/archivos`, { signal }),
    ]).then(([data, files]) => {
      if (signal?.aborted || id !== loadRequest.current) return;
      setError(""); setDetails(data); if(!preserveForm){setForm(data.inmueble); setOwner(ownerFrom(data.inmueble));} setDocuments(files.archivos); setUploadReady(files.subidaHabilitada);
      setItems(previous => previous.map(item => item.id !== data.inmueble.codigo ? item : { ...item, nombre: data.inmueble.referencia, ubicacion: [data.inmueble.direccion, data.inmueble.distrito, data.inmueble.provincia, data.inmueble.departamento].filter(Boolean).join(", ") || "Ubicación por completar", propietario: [data.inmueble.propietarioNombres, data.inmueble.propietarioApellidos].filter(Boolean).join(" ") || "Sin propietario" }));
    }).catch(error => {
      if (!signal?.aborted && id === loadRequest.current) setError(error instanceof Error ? error.message : "No se pudo cargar la ficha.");
    }).finally(() => {
      if (!signal?.aborted && id === loadRequest.current) setLoading(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ inmuebles: Item[] }>("/api/inmuebles", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setItems(data.inmuebles); })
      .catch(error => { if (!controller.signal.aborted) setListError(error instanceof Error ? error.message : "No se pudieron cargar los inmuebles."); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [listReload]);
  useEffect(() => {
    const controller = new AbortController();
    void load(code, controller.signal);
    return () => controller.abort();
  }, [code, load]);

  function selectProperty(key: string, discard = false) {
    if (busy || key === code) return;
    if (!discard && (dirty || documentForm.nombre || documentFile || documentForm.observacion)) { setPendingProperty(key); return; }
    setPendingProperty(null);
    ++loadRequest.current;
    setCode(key); setTab("Resumen"); setError(""); setMessage(""); setDocumentForm(emptyDocument); setDocumentFile(null);
    setDetails(null); setForm(null); setOwner(emptyOwner); setDocuments([]); setLoading(Boolean(key));
    if (key && window.innerWidth < 1536) window.requestAnimationFrame(() => sheet.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
  }
  async function save(event?: FormEvent<HTMLFormElement>, sharedConfirmed = false) {
    event?.preventDefault();
    const ownerDirty = !!details && JSON.stringify(owner) !== JSON.stringify(ownerFrom(details.inmueble));
    if (ownerDirty && !changeOwner && (details?.relacionados?.length ?? 0) > 1 && !sharedConfirmed) { setConfirmOwner(true); return; }
    setConfirmOwner(false);
    if (!form || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await requestJson(`/api/inmuebles/${encodeURIComponent(code)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, datosPrueba: admin ? form.datosPrueba : undefined, datosValidados:admin?form.datosValidados:undefined, propietario: owner, cambiarPropietario: changeOwner, confirmarPropietarioCompartido: sharedConfirmed }) });
      setLoading(true);
      await load(code);
      setChangeOwner(false);
      setMessage("Cambios guardados correctamente.");
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudieron guardar los cambios."); }
    finally { setBusy(false); }
  }
  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !documentFile || !uploadReady) return;
    if (!isImageFile(documentFile) && documentFile.size > 4 * 1024 * 1024) { setError("El archivo debe pesar como máximo 4 MB."); return; }
    const body = new FormData();
    body.set("archivo", documentFile);
    body.set("tipoDocumento", documentForm.tipoDocumento);
    body.set("nombre", documentForm.nombre);
    body.set("observacion", documentForm.observacion);
    setBusy(true); setError(""); setMessage("");
    try {
      if (isImageFile(documentFile)) body.set("archivo", await compressImage(documentFile));
      await requestJson(`/api/inmuebles/${encodeURIComponent(code)}/archivos`, { method: "POST", body });
      setDocumentForm(emptyDocument); setDocumentFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await load(code,undefined,true); setMessage("Archivo guardado en el hosting correctamente.");
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo registrar el documento."); }
    finally { setBusy(false); }
  }
  async function removeDocument(document: Document) {
    const hosted = document.almacenamiento === "hosting";
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await requestJson(`/api/inmuebles/${encodeURIComponent(code)}/archivos?archivoId=${document.id}`, { method: "DELETE" });
      await load(code,undefined,true); setMessage(hosted ? "Documento eliminado del hosting." : "Enlace retirado. El archivo externo se conserva.");
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo quitar el enlace."); }
    finally { setBusy(false); setDocumentToDelete(null); }
  }
  function propertyField(label: string, key: keyof Property, type = "text", placeholder?: string) {
    return <label className="block text-xs font-semibold text-slate-600">{label}<input type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? (key === "habitaciones" || key === "banos" ? "1" : "0.01") : undefined} value={typeof form?.[key] === "boolean" ? "" : form?.[key] ?? ""} placeholder={placeholder} required={key === "referencia"} disabled={busy} onChange={event => setForm(previous => previous ? { ...previous, [key]: event.target.value } : previous)} className={inputClass} /></label>;
  }
  function ownerField(label: string, key: keyof Owner, type = "text") {
    return <label className="block text-xs font-semibold text-slate-600">{label}<input type={type} maxLength={key === "dni" ? 8 : undefined} inputMode={key === "dni" ? "numeric" : undefined} value={owner[key]} disabled={busy} onChange={event => setOwner(previous => ({ ...previous, [key]: event.target.value }))} className={inputClass} /></label>;
  }

  return <main className="min-h-screen bg-[#f7f7f5] p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
    {pendingProperty !== null && <ConfirmDialog title="Cambios sin guardar" confirmLabel="Descartar cambios" onCancel={() => setPendingProperty(null)} onConfirm={() => selectProperty(pendingProperty, true)}><p>Tienes cambios pendientes en esta ficha. Si cambias de inmueble, se descartarán.</p></ConfirmDialog>}
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading href="/datos-inmuebles" />
        {admin && <Link href="/cartera" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300">← Volver a cartera</Link>}
      </header>

      <div className="mt-7 grid items-start gap-5 2xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside aria-label="Buscar y seleccionar inmueble" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)] 2xl:sticky 2xl:top-6">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">Tus inmuebles</h2><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">Por posición</span></div>
            <label className="relative mt-4 block"><span className="sr-only">Buscar inmueble por nombre, posición, código, ubicación o propietario</span><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500"><Icon name="search" /></span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar un inmueble…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-xs outline-none transition focus:border-[#c80000]/40 focus:bg-white" /></label>
            <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1" aria-label="Filtrar por estado">
              {[["activo", "Activos"], ["historico", "Históricos"], ["todos", "Todos"]].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${status === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500"><span aria-live="polite">{listLoading ? "Cargando inmuebles…" : `${filtered.length} de ${items.length} inmuebles`}</span><span>Pos. ↑</span></div>
          <div className="max-h-80 overflow-y-auto px-2 pb-3 2xl:max-h-[calc(100vh-22rem)] 2xl:min-h-64">
            {listLoading ? <div className="space-y-2 px-2" aria-label="Cargando lista">{[1, 2, 3].map(value => <div key={value} className="h-24 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />)}</div> : listError ? <div role="alert" className="rounded-2xl bg-red-50 p-4 text-xs text-red-700"><p>{listError}</p><button type="button" onClick={() => { setListLoading(true); setListError(""); setListReload(value => value + 1); }} className="mt-3 font-bold underline underline-offset-4">Reintentar</button></div> : filtered.length === 0 ? <div className="px-5 py-10 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon name="search" /></div><p className="mt-3 text-sm font-semibold text-slate-700">Sin resultados</p><p className="mt-1 text-xs leading-5 text-slate-500">Prueba otro nombre, código o estado.</p>{(query || status !== "todos") && <button type="button" onClick={() => { setQuery(""); setStatus("todos"); }} className="mt-4 text-xs font-semibold text-[#c80000]">Ver todos los inmuebles</button>}</div> : filtered.map(item => <button key={item.id} type="button" aria-pressed={code === item.id} disabled={busy} onClick={() => selectProperty(item.id)} className={`mb-1.5 flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-wait ${code === item.id ? "border-red-100 bg-[#fff5f4] shadow-sm" : "border-transparent hover:border-slate-100 hover:bg-slate-50"}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${code === item.id ? "bg-[#c80000] text-white" : "bg-slate-100 text-slate-500"}`}>{positionLabel(item.posicion)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800" title={item.nombre}>{item.nombre}</span><span className="mt-1 block truncate text-xs capitalize text-slate-500">{item.tipo} · {item.ubicacion}</span><span className="mt-1.5 block truncate font-mono text-xs text-slate-500" title={item.id}>{propertyDisplayId(item)}</span></span>
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.estado === "activo" ? "bg-emerald-500" : "bg-slate-300"}`} title={item.estado === "activo" ? "Activo" : "Histórico"}><span className="sr-only">{item.estado === "activo" ? "Activo" : "Histórico"}</span></span>
            </button>)}
          </div>
          <div className="border-t border-slate-100 px-5 py-3"><p className="text-xs leading-5 text-slate-500">{status === "todos" ? "Activos primero; cada grupo está ordenado por posición." : "Ordenados por posición. Los inmuebles sin posición aparecen al final."}</p></div>
        </aside>

        <div ref={sheet} className="min-w-0 scroll-mt-5">
          {code && <button type="button" disabled={busy} onClick={() => selectProperty("")} className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500 2xl:hidden">← Volver a elegir inmueble</button>}
          {error && <Feedback tone="error" className="mb-4">{error}</Feedback>}
          {message && <Feedback className="mb-4">{message}</Feedback>}
          {loading && !details ? <div role="status" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-8"><p className="text-sm text-slate-500">Cargando ficha del inmueble…</p><div className="h-28 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" /><div className="h-64 animate-pulse rounded-2xl bg-slate-50 motion-reduce:animate-none" /></div> : !details ? <div className="flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-red-100 bg-[#fff5f4] text-[#c80000]"><Icon name="home" className="h-9 w-9" /></div><p className="mt-6 text-lg font-bold text-slate-900">La ficha de tu inmueble, en un solo lugar</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Selecciona un inmueble de la lista para consultar sus datos, completar la información y organizar sus documentos.</p><div className="mt-7 flex flex-wrap justify-center gap-2">{["Datos del propietario", "Características", "Documentación"].map(label => <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">{label}</span>)}</div></div> : <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
              <div className="h-1.5 bg-[#c80000]" />
              <div className="grid grid-cols-1 items-start gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4"><span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#fff1f1] text-[#c80000]"><span className="text-xs font-bold uppercase tracking-wider">Posición</span><span className="font-mono text-xl font-bold">{positionLabel(details.inmueble.posicion)}</span></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold capitalize text-slate-500">{details.inmueble.tipo} · {operationLabel(details.inmueble.operacion)}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${details.inmueble.estado === "activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{details.inmueble.estado === "activo" ? "Activo" : "Histórico"}</span></div><h2 className="mt-2 break-words text-xl font-bold tracking-tight text-slate-950">{details.inmueble.referencia}</h2><p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500"><Icon name="map" className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{[details.inmueble.direccion, details.inmueble.numeroDireccion, details.inmueble.distrito, details.inmueble.provincia, details.inmueble.departamento].filter(Boolean).join(", ") || "Ubicación por completar"}</span></p><p className="mt-2 break-all font-mono text-xs text-slate-500">{propertyDisplayId(details.inmueble)}</p></div></div>
                <div className="min-w-0 rounded-2xl bg-slate-50 px-5 py-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{priceLabel(details.inmueble.operacion)}</p><p className="mt-1 break-words text-lg font-bold tracking-tight text-slate-900">{money(details.tasacion?.precioVenta)}</p></div>
              </div>
              <nav aria-label="Apartados de la ficha" className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2">
                {tabs.map(([label, icon]) => <button key={label} type="button" aria-current={tab === label ? "page" : undefined} disabled={busy} onClick={() => setTab(label)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold transition ${tab === label ? "bg-[#fff1f1] text-[#c80000]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon name={icon} />{label}{label === "Documentación" && documentFiles.length > 0 && <span className="rounded-md bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200">{documentFiles.length}</span>}{label === "Fotos" && photoCount > 0 && <span className="rounded-md bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200">{photoCount}</span>}</button>)}
              </nav>
            </section>

            <DraftRecovery key={code} draftKey={`ficha:${code}`} data={{form,owner,changeOwner}} dirty={dirty} onRestore={draft=>{if(draft.form&&typeof draft.form==='object'&&draft.owner&&typeof draft.owner==='object'){setForm(draft.form as Property);setOwner(draft.owner as Owner);setChangeOwner(draft.changeOwner===true);}}}/>
            <PropertyProgress data={details.progreso} administrator={admin} propertyId={details.inmueble.id} />
            <OperationalTracking key={`tracking-${code}`} propertyId={details.inmueble.id} administrator={admin} progress={details.progreso}/>
            <PropertyHistory events={details.historial??[]}/>
            <PublicationChecklist data={details.expediente} code={code} onSelect={value=>setTab(value as Tab)} />
            {details.venta && <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-base font-bold">Resultado económico de la venta{details.venta.datosSimulados ? " · DATOS FICTICIOS" : ""}</h3><div className="mt-3 grid gap-3 sm:grid-cols-3"><Stat label="Fecha de venta" value={formatDate(details.venta.fechaVenta)} icon="chart" /><Stat label="Precio final" value={money(details.venta.precioFinal)} icon="chart" /><Stat label="Comisión de la inmobiliaria" value={money(details.venta.comision)} icon="chart" /></div><p className="mt-2 text-xs text-slate-600">La comisión es ingreso antes de gastos. Los cierres anteriores pueden figurar sin importes registrados.</p></section>}

            <section aria-label={tab} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] sm:p-6">
              {tab === "Resumen" && <div className="space-y-6">{details.inmueble.inmuebleOrigenId&&<Link href={`/datos-inmuebles?codigo=${details.inmueble.inmuebleOrigenId}`} className="text-sm font-semibold text-[#c80000]">Consultar contrato y ficha de la captación anterior →</Link>}{details.alquiler && <Block title="Alquiler registrado" description={`Cierre: ${formatDate(details.alquiler.fechaAlquiler)} · Inicio: ${formatDate(details.alquiler.fechaInicioAlquiler)} · Fin: ${formatDate(details.alquiler.fechaFinAlquiler)}`}><div className="grid gap-3 sm:grid-cols-2"><Stat label="Renta mensual acordada" value={money(details.alquiler.rentaMensual)} icon="chart" /><Stat label="Comisión" value={money(details.alquiler.comision)} icon="chart" /><Stat label="Garantía" value={money(details.alquiler.garantia)} icon="chart" /><Stat label="Adelanto" value={money(details.alquiler.adelanto)} icon="chart" /></div></Block>}
                {admin&&<details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Administración de indicadores</summary><form onSubmit={save} className="mt-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form?.datosPrueba} onChange={event=>setForm(current=>current?{...current,datosPrueba:event.target.checked}:current)}/>Marcar este inmueble como datos de prueba</label><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form?.datosValidados} onChange={event=>setForm(current=>current?{...current,datosValidados:event.target.checked}:current)}/>Confirmo que revisé y validé los datos y documentos reales</label>{(form?.datosPrueba!==details.inmueble.datosPrueba||form?.datosValidados!==details.inmueble.datosValidados)&&<button className="aa-button aa-button-primary mt-3" disabled={busy}>Guardar clasificación</button>}<p className="mt-2 text-xs text-slate-600">Reemplaza los ejemplos y valida los datos reales para incluir el inmueble en indicadores comerciales. Si sigue marcado como prueba, permanece excluido.</p></form></details>}
                <PropertyLocation key={`${code}-summary`} latitude={details.inmueble.latitud} longitude={details.inmueble.longitud} address={[details.inmueble.direccion, details.inmueble.numeroDireccion, details.inmueble.distrito, details.inmueble.provincia, details.inmueble.departamento].filter(Boolean).join(", ")} />
                <Block title="Una mirada al inmueble" description="Los datos principales para continuar completando la ficha."><div className="grid gap-3 sm:grid-cols-2"><Stat label="Propietario" value={[details.inmueble.propietarioNombres, details.inmueble.propietarioApellidos].filter(Boolean).join(" ") || "Por completar"} icon="user" /><Stat label="Dirección" value={details.inmueble.direccion || "Por completar"} icon="map" /><Stat label="Documentación" value={`${documentFiles.length} documento${documentFiles.length === 1 ? "" : "s"} registrado${documentFiles.length === 1 ? "" : "s"}`} icon="document" /><Stat label="Publicación" value={details.publicacion?.publicado ? "Publicado" : details.publicacion ? details.expediente?.complete ? "Lista para publicar" : "Expediente pendiente" : "Sin publicación"} icon="publish" /></div></Block>
                <Block title="Precios del inmueble"><div className="grid gap-3 sm:grid-cols-3">{[[referenceLabel(details.inmueble.operacion), details.tasacion?.valorReferencia], [targetLabel(details.inmueble.operacion), details.tasacion?.precioObjetivo], [priceLabel(details.inmueble.operacion), details.tasacion?.precioVenta]].map(([label, value]) => <div key={label} className={`rounded-2xl border p-4 ${label === priceLabel(details.inmueble.operacion) ? "border-red-100 bg-[#fff5f4]" : "border-slate-100 bg-slate-50"}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-slate-900">{money(value)}</p></div>)}</div></Block>
                <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setTab("Inmueble")} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-red-200 hover:bg-[#fffafa]"><span><span className="block text-xs font-bold text-slate-800">Completar datos del inmueble</span><span className="mt-1 block text-xs text-slate-500">Ubicación y características</span></span><Icon name="arrow" /></button><button type="button" onClick={() => setTab("Documentación")} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-red-200 hover:bg-[#fffafa]"><span><span className="block text-xs font-bold text-slate-800">Organizar documentación</span><span className="mt-1 block text-xs text-slate-500">Archivos y documentos</span></span><Icon name="arrow" /></button></div>
              </div>}

              {tab === "Propietario" && (<form onSubmit={save} className="space-y-7">
                {!!details.relacionados?.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>Este propietario está vinculado a {details.relacionados.length} inmueble(s). Una corrección de sus datos se aplica a todas sus fichas.</p><ul className="mt-2 space-y-1">{details.relacionados.map(item=><li key={item.id}>{propertyDisplayId(item)} · {item.referencia}</li>)}</ul><label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={changeOwner} onChange={event=>{setChangeOwner(event.target.checked);if(event.target.checked)setOwner(emptyOwner);else setOwner(ownerFrom(details.inmueble));}}/>Cambiar propietario de este inmueble</label>{changeOwner&&<p className="mt-2 text-xs">Vincula el nuevo DNI sin cambiar los datos del propietario anterior. Si el DNI ya existe, se conservan sus datos registrados.</p>}</div>}
                {details.inmueble.propietarioId == null && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Completa el nombre del propietario; el DNI y los demás datos son opcionales.</p>}
                <Block title="Datos personales" description="Identifica al propietario del inmueble."><div className="grid gap-4 sm:grid-cols-2">{ownerField("DNI", "dni")}{ownerField("Nombres", "nombres")}{ownerField("Apellidos", "apellidos")}</div></Block>
                <div className="border-t border-slate-100" />
                <Block title="Contacto" description="Mantén a mano los datos para comunicarte con el propietario."><div className="grid gap-4 sm:grid-cols-2">{ownerField("Teléfono", "telefono", "tel")}{ownerField("Correo electrónico", "email", "email")}</div><div className="mt-4">{ownerField("Referencia de contacto", "referenciaContacto")}</div></Block>
                <SaveBar dirty={dirty} busy={busy || loading} />
              </form>)}

              {tab === "Inmueble" && <form onSubmit={save} className="space-y-7">
                <Block title="Identificación" description="Nombre registrado al incorporar el inmueble.">{propertyField("Nombre o referencia", "referencia", "text", "Nombre del inmueble")}<label className="mt-4 block text-xs font-semibold text-slate-600">Tipo de operación<OperationSelect value={form?.operacion || "venta"} disabled={busy || loading || !admin || Boolean(details.tasacion) || Boolean(details.publicacion) || details.inmueble.estado !== "activo"} onChange={operacion => setForm(previous => previous ? { ...previous, operacion } : previous)} className={inputClass} /></label><p className="mt-2 text-xs text-slate-500">La operación se define antes de registrar precios o publicación.</p><label className="mt-4 block text-xs font-semibold text-slate-600">Tipo de inmueble<PropertyTypeSelect value={form?.tipo || ""} preserveCurrent disabled={busy || loading} onChange={tipo => setForm(previous => previous ? { ...previous, tipo } : previous)} className={inputClass} /></label></Block>
                <div className="border-t border-slate-100" />
                <Block title="Ubicación"><div className="space-y-4">{propertyField("Calle / avenida", "direccion", "text", "Calle o avenida")}{propertyField("Número / lote", "numeroDireccion")}<GeographySelect disabled={busy||loading} value={{departamento:form?.departamento||null,provincia:form?.provincia||null,distrito:form?.distrito||null}} onChange={next=>setForm(old=>old?{...old,...next}:old)}/></div></Block>
                <PropertyLocation key={`${code}-edit`} latitude={form?.latitud ?? null} longitude={form?.longitud ?? null} address={[form?.direccion, form?.numeroDireccion, form?.distrito, form?.provincia, form?.departamento, "Perú"].filter(Boolean).join(", ")} editable disabled={busy || loading} onChange={point => setForm(previous => previous ? { ...previous, latitud: point ? point.lat.toFixed(7) : null, longitud: point ? point.lng.toFixed(7) : null } : previous)} />
                <div className="border-t border-slate-100" />
                {Number(form?.areaConstruida)>Number(form?.areaTerreno)*10 && Number(form?.areaTerreno)>0 && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Revisa las superficies: el área construida supera diez veces el terreno. Puede ser válido en varias plantas; confirma las unidades.</p>}<Block title="Características" description="Superficies y distribución del inmueble."><div className="grid gap-4 sm:grid-cols-2">{propertyField("Área de terreno (m²)", "areaTerreno", "number")}{propertyField("Área construida (m²)", "areaConstruida", "number")}{propertyField(["Local","Local comercial","Oficina"].includes(form?.tipo||"") ? "Ambientes" : "Habitaciones", "habitaciones", "number")}{propertyField("Baños", "banos", "number")}</div><label className="mt-4 block text-xs font-semibold text-slate-600">Detalles adicionales<textarea rows={4} value={form?.caracteristicas || ""} disabled={busy} onChange={event => setForm(previous => previous ? { ...previous, caracteristicas: event.target.value } : previous)} placeholder="Distribución, acabados, servicios y otros detalles…" className={inputClass} /></label></Block>
                <Block title="Observaciones"><textarea aria-label="Observaciones del inmueble" rows={3} value={form?.observaciones || ""} disabled={busy} onChange={event => setForm(previous => previous ? { ...previous, observaciones: event.target.value } : previous)} placeholder="Comentarios que quieras conservar en la ficha…" className={inputClass} /></Block>
                <SaveBar dirty={dirty} busy={busy || loading} />
              </form>}

              {tab === "Fotos" && <PhotoGallery key={code} propertyId={details.inmueble.id} editable onBusyChange={setBusy} onChanged={() => {
                void Promise.all([requestJson<Details>(`/api/inmuebles/${encodeURIComponent(code)}`), requestJson<{archivos:Document[];subidaHabilitada:boolean}>(`/api/inmuebles/${encodeURIComponent(code)}/archivos`)]).then(([updated,files])=>{setDetails(updated);setDocuments(files.archivos);setUploadReady(files.subidaHabilitada);}).catch(error=>setError(error instanceof Error?error.message:'No se pudo actualizar la ficha.'));
              }} />}

              {tab === "Documentación" && <div className="space-y-7">
                <Block title="Documentación del inmueble" description="Guarda DNI, contratos, planos y otros documentos. Las fotografías del inmueble se gestionan en la pestaña Fotos."><div className="grid gap-2 sm:grid-cols-2">{documentTypes.map(([value, label]) => { const count = documents.filter(document => document.tipoDocumento === value).length; return <div key={value} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3"><span className="text-xs font-medium text-slate-600">{label}</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${count ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{count ? `${count} registrado${count === 1 ? "" : "s"}` : "Por completar"}</span></div>; })}</div></Block>
                {documentFiles.length > 0 && <Block title="Documentos registrados"><div className="space-y-2">{documentFiles.map(document => <article key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"><div className="flex min-w-0 basis-full items-start gap-3 sm:flex-1 sm:basis-auto"><span className="rounded-xl bg-slate-50 p-2.5 text-slate-500"><Icon name="document" /></span><div className="min-w-0"><p className="break-words text-xs font-bold text-slate-800">{document.nombre}</p><p className="mt-1 text-xs text-slate-500">{documentTypes.find(([value]) => value === document.tipoDocumento)?.[1] || document.tipoDocumento}</p>{document.almacenamiento === "hosting" && <p className="mt-1 break-words text-xs text-emerald-700">Guardado en hosting · {document.nombreOriginal} · {((document.tamanoBytes || 0) / 1024).toLocaleString("es-PE", { maximumFractionDigits: 0 })} KB</p>}{document.observacion && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{document.observacion}</p>}</div></div><div className="flex flex-wrap gap-2"><a href={document.enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Icon name="link" />Abrir</a>{document.almacenamiento === "hosting" && <a href={`${document.enlace}?download=1`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Descargar</a>}{admin && <button type="button" disabled={busy} onClick={() => setDocumentToDelete(document)} aria-label={`${document.almacenamiento === "hosting" ? "Eliminar documento" : "Quitar enlace"} de ${document.nombre}`} className="rounded-lg px-2.5 py-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Icon name="close" /></button>}</div></article>)}</div></Block>}
                {!uploadReady && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">{admin ? "Para activar la subida, configura el almacenamiento de documentos y vuelve a desplegar el proyecto." : "La subida de documentos está pendiente de activación por el administrador."}</p>}
                <form onSubmit={addDocument} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"><Block title="Agregar un documento" description="PDF, Word, Excel o documentos escaneados en JPG, PNG y WebP. Hasta 4 MB por archivo; las imágenes se comprimen automáticamente. Se guarda de forma privada, organizado por inmueble y tipo de documento."><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Tipo de documento<select value={documentForm.tipoDocumento} disabled={busy} onChange={event => setDocumentForm(previous => ({ ...previous, tipoDocumento: event.target.value }))} className={inputClass}>{documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Nombre<input required maxLength={255} value={documentForm.nombre} disabled={busy} onChange={event => setDocumentForm(previous => ({ ...previous, nombre: event.target.value }))} placeholder="Ej. Copia literal actualizada" className={inputClass} /></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Archivo<input ref={fileInput} required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" disabled={busy || !uploadReady} onChange={event => { const selected = event.target.files?.[0] || null; setDocumentFile(selected); if (selected && !documentForm.nombre) setDocumentForm(previous => ({ ...previous, nombre: selected.name.replace(/\.[^.]+$/, "") })); }} className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-red-700`} />{documentFile && <span className="mt-2 block break-words text-xs font-normal text-slate-500">{documentFile.name} · {(documentFile.size / 1024 / 1024).toFixed(2)} MB</span>}</label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Observación<textarea rows={2} maxLength={500} value={documentForm.observacion} disabled={busy} onChange={event => setDocumentForm(previous => ({ ...previous, observacion: event.target.value }))} placeholder="Fecha, versión o comentario sobre el documento" className={inputClass} /></label></div><button type="submit" disabled={busy || !uploadReady || !documentFile} className={`${primaryClass} mt-5`}><Icon name="document" />{busy ? "Guardando…" : "Subir documento"}</button></Block></form>
              </div>}

              {tab === "Visitas" && <PropertyVisits key={code} propertyId={details.inmueble.id} onBusyChange={setBusy} onChanged={() => { void load(code, undefined, true); }} />}
              {tab === "Tasación" && (details.tasacion ? <div className="space-y-6"><Block title="Tasación registrada" description={`Fecha de tasación: ${formatDate(details.tasacion.fechaTasacion)}`}><div className="grid gap-3 sm:grid-cols-3"><Stat label={referenceLabel(details.inmueble.operacion)} value={money(details.tasacion.valorReferencia)} icon="chart" /><Stat label={targetLabel(details.inmueble.operacion)} value={money(details.tasacion.precioObjetivo)} icon="chart" /><Stat label={priceLabel(details.inmueble.operacion)} value={money(details.tasacion.precioVenta)} icon="chart" /></div></Block><Block title="Observación"><p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{details.tasacion.observacion || "Sin observaciones registradas."}</p></Block>{admin && <Link href={`/tasaciones-textos-pendientes?inmueble=${details.inmueble.id}#material`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#c80000]">Gestionar {priceLabel(details.inmueble.operacion).toLowerCase()} <Icon name="arrow" /></Link>}</div> : <div className="rounded-2xl bg-slate-50 p-6"><p className="text-sm text-slate-500">Todavía no hay una tasación registrada.</p>{admin && <Link href={`/registrar-tasaciones?inmueble=${details.inmueble.id}`} className="mt-3 inline-flex text-xs font-semibold text-[#c80000]">Registrar tasación →</Link>}</div>)}

              {tab === "Publicación" && (details.publicacion ? <div className="space-y-5"><Block title="Publicación del inmueble" description={details.publicacion.publicado ? `Publicada el ${formatDate(details.publicacion.fechaPublicacion)}` : details.expediente?.complete ? "Texto y material listos para publicar." : "La publicación preparada tiene requisitos pendientes."}><p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{details.publicacion.texto}</p></Block><button type="button" onClick={() => setTab("Fotos")} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-red-700">Ver fotos de la publicación →</button></div> : <div className="rounded-2xl bg-slate-50 p-6"><p className="text-sm text-slate-500">Todavía no hay una publicación registrada.</p>{admin && <Link href={`/tasaciones-textos-pendientes?inmueble=${details.inmueble.id}#material`} className="mt-3 inline-flex text-xs font-semibold text-[#c80000]">Preparar texto y material →</Link>}</div>)}
              {tab === "Publicación" && <ExternalAnnouncements key={code} propertyId={details.inmueble.id} editable={admin&&details.inmueble.estado==='activo'} price={details.tasacion?.precioVenta??null}/>}
            </section>
          </>}
        </div>
      </div>
    </div>
    {confirmOwner && <ConfirmDialog title="Corregir propietario compartido" confirmLabel="Aplicar a sus inmuebles" onCancel={()=>setConfirmOwner(false)} onConfirm={()=>void save(undefined,true)}><p>Los datos de este propietario se actualizarán en todas sus fichas vinculadas. Confirma que se trata de la misma persona.</p></ConfirmDialog>}
    {documentToDelete && <DeleteDocumentDialog document={documentToDelete} busy={busy} onCancel={() => setDocumentToDelete(null)} onConfirm={() => { void removeDocument(documentToDelete); }} />}
  </main>;
}
