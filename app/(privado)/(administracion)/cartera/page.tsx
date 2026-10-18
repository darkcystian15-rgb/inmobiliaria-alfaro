"use client";
import ZoneFolderCard from "@/app/components/ZoneFolderCard";
import { useZoneWorkspace } from "@/app/components/ZoneWorkspace";
import { zoneHref } from "@/lib/zone-url";
import { zoneUrl } from "@/lib/zone-url";

import PortfolioPropertyEditor from "@/app/components/PortfolioPropertyEditor";
import PropertySummary from "@/app/components/PropertySummary";

import PortfolioLabelRow from "@/app/components/PortfolioLabelRow";
import ZoneContext from "@/app/components/ZoneContext";
import OperationSelect from "@/app/components/OperationSelect";
import { priceLabel } from "@/lib/operation.mjs";

import PropertyTypeSelect from "@/app/components/PropertyTypeSelect";
import { propertyPanelId, propertyPanelContactId } from "@/lib/property-panel-id.mjs";

import PageHeading from "@/app/components/PageHeading";
import { ALL_ZONES, inZone } from "@/lib/property-zones";


import { useEffect, useMemo, useState } from "react";
import { ContextLink as Link, NavigationReturnProvider } from "@/app/components/NavigationReturn";
import { useRef } from "react";
import PublicationChecklist, { type Checklist } from "@/app/components/PublicationChecklist";
import StatusBadge from "@/app/components/StatusBadge";
import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";
import PhotoGallery from "@/app/components/PhotoGallery";

type Estado = "Activo" | "Histórico";
type Actividades = {
  visita: {
    estado: string;
    pendiente: boolean;
    realizada: boolean;
    fecha: string | Date | null;
  };
  tasacion: {
    estado: string;
    pendiente: boolean;
    situacion: string | null;
    fecha: string | Date | null;
  };
  material: {
    pendiente: boolean;
    fotosPendientes: boolean;
    textoPendiente: boolean;
  };
  negociacion: {
    estado: string;
    enCurso: boolean;
  };
  publicacion: {
    existe: boolean;
    publicado: boolean;
    tieneTexto: boolean;
    fechaPublicacion: string | Date | null;
  };
};

type Inmueble = {
  expediente?: Checklist;
  id: string;
  inmuebleId: number;
  posicion?: number;
  tipo: string;
  operacion: string;
  nombre: string;
  ubicacion: string;
  direccion: string | null;
  zona?: string;
  zonaId: number;
  distrito: string | null;
  estado: Estado;
  propietario: string;
  precioVenta: string | null;
  actividades: Actividades;
  visitaPendiente: boolean;
  tasacionPendiente: boolean;
  materialPendiente: boolean;
  fotosPendientes: boolean;
  tieneFotos: boolean;
  textoPendiente: boolean;
  negociacionEnCurso: boolean;
  fechaRegistro?: string | Date;
  fechaSalida?: string | Date;
};

type Posicion = {
  id:number; zonaId:number; zona:string;
  numero: number;
  disponible: boolean;
};

type Resumen = {
  enCartera: number;
  disponibles: number;
  visitasPendientes: number;
  tasacionesPendientes: number;
  materialPendiente: number;
  negociaciones: number;
  capacidad: number;
};

function FolderIcon({ className = "h-7 w-7 shrink-0 text-amber-500" }: { className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z" /></svg>;
}

function Icon({
  name,
}: {
  name:
    | "home"
    | "search"
    | "map"
    | "close"
    | "history"
    | "clock"
    | "chart"
    | "camera"
    | "handshake"
    | "check";
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  if (name === "map") {
    return (
      <svg {...common}>
        <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
        <path d="M9 3v15" />
        <path d="M15 6v15" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-5 3 3 5-7" />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg {...common}>
        <path d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  }

  if (name === "handshake") {
    return (
      <svg {...common}>
        <path d="m4 11 3-3 4 2 2-2 7 3-3 6-5-2-3 2-5-6Z" />
        <path d="m7 8 3 3" />
        <path d="m14 8-3 3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function EstadoActividad({
  estado,
  pendiente,
  icon,
}: {
  estado: string;
  pendiente: boolean;
  icon: "clock" | "chart" | "camera" | "handshake" | "check";
}) {
  const etiqueta =
    estado === "realizada"
      ? "Realizada"
      : estado === "registrada"
        ? "Registrada"
        : estado === "sin_negociacion"
          ? "Sin negociación"
          : estado === "en_curso"
            ? "En curso"
            : estado === "pendiente_aprobacion"
              ? "Pendiente aprobación"
              : pendiente
                ? "Pendiente"
                : estado;

  const tone = estado === "en_curso" ? "progress" : pendiente ? "pending" : ["realizada", "registrada", "aprobado", "completo"].includes(estado) ? "complete" : "neutral";
  return <StatusBadge tone={tone}><span className="inline-flex items-center gap-1.5"><Icon name={icon} />{etiqueta}</span></StatusBadge>;

}

const cardThemes = {
  visita: { label: "Visita pendiente", stripe: "bg-amber-400", badge: "bg-amber-50 text-amber-800 ring-amber-200", position: "bg-amber-50 text-amber-800", border: "hover:border-amber-300" },
  tasacion: { label: "Tasación pendiente", stripe: "bg-amber-400", badge: "bg-amber-50 text-amber-900 ring-amber-200", position: "bg-amber-50 text-amber-900", border: "hover:border-amber-300" },
  material: { label: "Publicación pendiente", stripe: "bg-amber-400", badge: "bg-amber-50 text-amber-900 ring-amber-200", position: "bg-amber-50 text-amber-900", border: "hover:border-amber-300" },
  publicado: { label: "Publicado", stripe: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", position: "bg-emerald-50 text-emerald-800", border: "hover:border-emerald-300" },
  seguimiento: { label: "En seguimiento", stripe: "bg-blue-400", badge: "bg-blue-50 text-blue-800 ring-blue-200", position: "bg-blue-50 text-blue-800", border: "hover:border-blue-300" },
};

function cardTheme(item: Inmueble) {
  if (item.estado === "Histórico") return { ...cardThemes.seguimiento, label: "Histórico", stripe: "bg-slate-300", badge: "bg-slate-100 text-slate-700 ring-slate-200" };
  if (item.actividades.publicacion.publicado) return cardThemes.publicado;
  if (item.actividades.tasacion.situacion === "pendiente_aprobacion") return { ...cardThemes.visita, label: "Tasación anterior por revisar" };
  if (item.negociacionEnCurso) return { ...cardThemes.seguimiento, label: "Seguimiento anterior" };
  if (item.visitaPendiente) return cardThemes.visita;
  if (item.tasacionPendiente) return cardThemes.tasacion;
  if (item.materialPendiente || item.actividades.tasacion.situacion === "aprobado") return cardThemes.material;
  return cardThemes.seguimiento;
}

function salePrice(value: string | null) {
  return value ? `S/ ${Number(value).toLocaleString("es-PE", { maximumFractionDigits: 2 })}` : "Por definir";
}

export default function CarteraPage() {
  const {zones:catalogoZonas,zone:zonaActual}=useZoneWorkspace();
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);
  const [estado, setEstado] = useState<"Todos" | Estado>("Activo");
  const [operacion, setOperacion] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] =
    useState<"posiciones" | "lista">("lista");

  const [seleccionado, setSeleccionado] =
    useState<Inmueble | null>(null);
  const [galeria, setGaleria] = useState<Inmueble | null>(null);
  const galleryDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = galleryDialog.current;
    if (galeria) dialog?.showModal(); else dialog?.close();
    return () => dialog?.close();
  }, [galeria]);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [todasPosiciones, setPosiciones] = useState<Posicion[]>([]);
  const [resumen, setResumen] = useState<Resumen>({
    enCartera: 0,
    disponibles: 0,
    visitasPendientes: 0,
    tasacionesPendientes: 0,
    materialPendiente: 0,
    negociaciones: 0,
    capacidad: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [cargandoPosiciones, setCargandoPosiciones] =
    useState(true);
  const [error, setError] = useState("");

  async function cargarDatos() {
    try {
      setError("");

      const [carteraResponse, posicionesResponse] =
        await Promise.all([
          fetch(zoneUrl("/api/cartera"), { cache: "no-store" }),
          fetch(zoneUrl("/api/posiciones"), { cache: "no-store" }),
        ]);

      const carteraData = await carteraResponse.json();
      const posicionesData = await posicionesResponse.json();

      if (!carteraResponse.ok) {
        throw new Error(
          carteraData.error ||
            "No se pudo cargar la cartera."
        );
      }

      if (!posicionesResponse.ok) {
        throw new Error(
          posicionesData.error ||
            "No se pudieron cargar las posiciones."
        );
      }

      setInmuebles(carteraData.inmuebles ?? []);
      setResumen(
        carteraData.resumen ?? {
          enCartera: 0,
          disponibles: 0,
          visitasPendientes: 0,
          tasacionesPendientes: 0,
          materialPendiente: 0,
          negociaciones: 0,
          capacidad: 0,
        }
      );
      setPosiciones(posicionesData.posiciones ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la información."
      );
    } finally {
      setCargando(false);
      setCargandoPosiciones(false);
    }
  }

  function restaurarVista(params: URLSearchParams) {
    setZonaSeleccionada(params.get("zona") || (["actividad", "vista", "disponibles"].some(key => params.has(key)) ? ALL_ZONES : null));
    const state = params.get("estado");
    setEstado(state === "Todos" || state === "Histórico" ? state : "Activo");
    setVista(params.get("vista") === "posiciones" || params.get("disponibles") === "1" ? "posiciones" : "lista");
    setSoloDisponibles(params.get("disponibles") === "1");
    setOperacion(params.get("operacion") || "Todos");
    setTipo(params.get("tipo") || "Todos");
    setBusqueda(params.get("buscar") || "");
  }

  useEffect(() => {
    const inicial = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      restaurarVista(params);
      void cargarDatos();
    }, 0);

    const intervalo = window.setInterval(
      cargarDatos,
      30000
    );

    const volver = () => restaurarVista(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", volver);
    return () => { window.clearTimeout(inicial); window.clearInterval(intervalo); window.removeEventListener("popstate", volver); };
  }, []);

  const activos = useMemo(
    () =>
      inmuebles.filter((x) => x.estado === "Activo"),
    [inmuebles]
  );


  const posiciones=todasPosiciones.filter(p=>!zonaSeleccionada||zonaSeleccionada===ALL_ZONES||p.zona===zonaSeleccionada);
  const zonas=catalogoZonas.map(z=>({...z,activos:z.ocupados}));
  const inmueblesZona = useMemo(() => inmuebles.filter(x => inZone(x, zonaSeleccionada)), [inmuebles, zonaSeleccionada]);
  const activosZona = useMemo(() => inmueblesZona.filter(x => x.estado === "Activo"), [inmueblesZona]);

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return inmueblesZona.filter((x) => {
      const coincideTexto =
        !texto ||
        `${propertyPanelId(x)} ${x.nombre} ${x.propietario} ${x.direccion ?? ""} ${x.distrito ?? ""} ${x.ubicacion}`
          .toLowerCase()
          .includes(texto);

      return (
        (estado === "Todos" || x.estado === estado) &&
        (tipo === "Todos" || x.tipo === tipo) &&
        (operacion === "Todos" || x.operacion === operacion) &&
        coincideTexto
      );
    });
  }, [
    inmueblesZona,
    estado,
    tipo,
    operacion,
    busqueda,
  ]);

  const porcentajeOcupacion =
    resumen.capacidad > 0
      ? Math.min(
          100,
          ((resumen.capacidad - resumen.disponibles) / resumen.capacidad) * 100
        )
      : 0;

  const inmueblePorPosicion = useMemo(() => {
    const mapa = new Map<string, Inmueble>();

    activos.forEach((inmueble) => {
      if (inmueble.posicion != null) {
        mapa.set(`${inmueble.zonaId}:${inmueble.posicion}`, inmueble);
      }
    });

    return mapa;
  }, [activos]);

  const limpiarFiltros = () => {
    setSoloDisponibles(false);
    setEstado("Activo");
    setTipo("Todos");
    setOperacion("Todos");
    setBusqueda("");
  };

  function abrirZona(zona: string | null) {
    limpiarFiltros();
    setVista("lista");
    setSeleccionado(null);
    setZonaSeleccionada(zona);
    window.history.pushState(null, "", zona === null ? "/cartera" : `/cartera?zona=${encodeURIComponent(zona)}`);
  }

  const returnParams = new URLSearchParams();
  if (zonaSeleccionada !== null) returnParams.set("zona", zonaSeleccionada);
  for (const [key, value, defaultValue] of [["estado", estado, "Activo"], ["operacion", operacion, "Todos"], ["tipo", tipo, "Todos"], ["vista", vista, "lista"], ["buscar", busqueda, ""]]) {
    if (value !== defaultValue) returnParams.set(key, value);
  }
  if (soloDisponibles) returnParams.set("disponibles", "1");
  const returnHref = `/cartera${returnParams.size ? `?${returnParams}` : ""}`;

  const tieneFiltros =
    soloDisponibles ||
    Boolean(busqueda) ||
    estado !== "Activo" ||
    tipo !== "Todos" ||
    operacion !== "Todos";

  return (
    <NavigationReturnProvider href={returnHref}><main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-[1550px]">
        {/* CABECERA */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0"><PageHeading href="/cartera" /><p className="mt-2 text-xs leading-5 text-slate-500">Capacidades y posiciones independientes por zona.</p></div>

          {zonaActual && <Link
            href={zoneHref("/registrar-inmueble",zonaActual?.nombre)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c80000] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a90000]"
          >
            + Registrar inmueble
          </Link>}
        </div>

        <p className="mt-4 text-sm text-slate-600">{zonaSeleccionada === null ? "Selecciona una zona para consultar sus inmuebles." : "Selecciona un inmueble de la lista para ver su información y abrir la ficha completa."}</p>
        {zonaSeleccionada !== null && <nav aria-label="Ruta de la cartera" className="mt-4 flex flex-wrap items-center gap-3 text-sm"><button type="button" onClick={() => abrirZona(null)} className="cartera-folder-navigation inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-slate-800 hover:bg-amber-100"><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />← Volver a zonas</button><ZoneContext name={zonaSeleccionada === ALL_ZONES ? "Listado general" : zonaSeleccionada} general={zonaSeleccionada === ALL_ZONES} /></nav>}
        {zonaSeleccionada === null && <section aria-label="Cartera por zonas" className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900">Cartera de inmuebles por zona</h2><button type="button" onClick={() => abrirZona(ALL_ZONES)} className="cartera-folder-navigation inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-amber-100"><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />Ver listado general →</button></div>
          <div className="mb-6"><Link href="/ubicaciones" className="aa-button aa-button-secondary">Agregar zona</Link></div>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-7 pt-5 sm:grid-cols-2 xl:grid-cols-3">{zonas.map(zona => <li key={zona.nombre} className="min-w-0">
            <ZoneFolderCard name={zona.nombre} onOpen={() => abrirZona(zona.nombre)}><span className="mt-1 block text-xs text-slate-500">{zona.activos} / {zona.capacidad} ocupados · {zona.disponibles} disponibles{zona.historicos > 0 ? ` · ${zona.historicos} histórico${zona.historicos === 1 ? "" : "s"}` : ""}</span></ZoneFolderCard>
          </li>)}</ul>
          {!cargando && !error && zonas.length === 0 && <p className="mt-4 text-sm text-slate-500">Todavía no hay inmuebles registrados en la cartera.</p>}
        </section>}
        {/* INDICADORES */}
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "En cartera",
              value: zonaSeleccionada && zonaSeleccionada !== ALL_ZONES ? activosZona.length : resumen.enCartera,
              detail: `de ${resumen.capacidad} posiciones${zonaActual ? " en esta zona" : " entre todas las zonas"}`,
              icon: "home" as const,
            },
            {
              label: "Disponibles",
              value: resumen.disponibles,
              detail: zonaActual ? "posiciones libres en esta zona" : "posiciones libres entre todas las zonas",
              icon: "map" as const,
            },
            {
              label: "Visitas pendientes",
              value: zonaSeleccionada && zonaSeleccionada !== ALL_ZONES ? activosZona.filter(x => x.visitaPendiente).length : resumen.visitasPendientes,
              detail: "",
              icon: "clock" as const,
            },
            {
              label: "Tasaciones pendientes",
              value: zonaSeleccionada && zonaSeleccionada !== ALL_ZONES ? activosZona.filter(x => x.tasacionPendiente).length : resumen.tasacionesPendientes,
              detail: "",
              icon: "chart" as const,
            },
          ].map((item) => {
            const inboxLink = item.label === "Visitas pendientes"
              ? `/visitas-pendientes?zona=${encodeURIComponent(zonaSeleccionada || ALL_ZONES)}`
              : item.label === "Tasaciones pendientes" ? `/tasaciones-textos-pendientes?zona=${encodeURIComponent(zonaSeleccionada || ALL_ZONES)}` : null;
            const content = <>
              <span className="cartera-folder-tab absolute -top-5 -left-px flex h-5 max-w-[95%] items-center rounded-t-lg border border-b-0 border-amber-200 bg-amber-100 px-3 text-xs font-semibold text-amber-900">{item.label}</span>
              <div className="flex items-center justify-between gap-3"><p className="text-3xl font-bold text-slate-950">{item.value}</p><FolderIcon className="h-9 w-9 shrink-0 text-amber-500" /></div>
              <p className="mt-2 min-h-5 text-xs text-slate-600">{item.detail || "Por atender"}</p>
              {inboxLink && <p className="mt-2 text-xs font-semibold text-[#c80000]">{item.label === "Visitas pendientes" ? "Ver visitas" : "Ver tasaciones"} →</p>}
            </>;
            const classes = "cartera-folder relative mt-5 rounded-b-2xl rounded-tr-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm";
            return inboxLink ? <Link key={item.label} href={inboxLink} data-folder-indicator="true" className={classes}>{content}</Link>
              : <div key={item.label} data-folder-indicator="true" className={classes}>{content}</div>;
          })}
        </div>

        {error && <Feedback tone="error" className="mt-5">{error}<button type="button" onClick={() => { setCargando(true); setCargandoPosiciones(true); void cargarDatos(); }} disabled={cargando} className="aa-button aa-button-secondary mt-3">Reintentar</button></Feedback>}
        {cargando && <LoadingCards label="Cargando cartera y posiciones…" count={6} />}

        {zonaSeleccionada !== null && <>
        <section aria-label="Buscar y filtrar cartera" className="aa-card mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Buscar inmueble</span><span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Icon name="search" /></span><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar por contacto o ubicación…" className="aa-input w-full pl-10" /></label>

          </div>
          <div className="mt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600">Estado<select value={estado} onChange={event => { setEstado(event.target.value as "Todos" | Estado); setSoloDisponibles(false); }} className="aa-input mt-2 w-full"><option>Activo</option><option>Todos</option><option>Histórico</option></select></label>
              <label className="text-xs font-semibold text-slate-600">Tipo de operación<OperationSelect filter value={operacion} onChange={setOperacion} className="aa-input mt-2 w-full" /></label><label className="text-xs font-semibold text-slate-600">Tipo de inmueble<PropertyTypeSelect filter value={tipo} onChange={setTipo} className="aa-input mt-2 w-full" /></label>
            </div>
          </div>
          {tieneFiltros && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><p className="text-xs text-slate-600">{soloDisponibles ? "Mostrando solamente posiciones libres" : `${estado} · ${tipo}${operacion !== "Todos" ? ` · ${operacion === "alquiler" ? "Alquiler" : "Venta"}` : ""}${busqueda ? ` · Búsqueda: ${busqueda}` : ""}`}</p><button type="button" onClick={limpiarFiltros} className="text-sm font-semibold text-[#c80000]">Limpiar filtros</button></div>}
        </section>

        {/* RESULTADOS */}
        <div className="mt-5 flex justify-end">
            <div aria-label="Vista de la cartera" className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button type="button" aria-pressed={vista === "posiciones"} onClick={() => setVista("posiciones")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${vista === "posiciones" ? "bg-[#c80000] text-white" : "text-slate-600"}`}>Tarjetas</button>
              <button type="button" aria-pressed={vista === "lista"} onClick={() => { setVista("lista"); setSoloDisponibles(false); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${vista === "lista" ? "bg-[#c80000] text-white" : "text-slate-600"}`}>Lista compacta</button>
            </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="break-words text-lg font-bold text-slate-900 sm:text-xl">
              {estado === "Histórico"
                ? "Histórico de inmuebles"
                : `CARTERA DE INMUEBLES ${zonaSeleccionada === ALL_ZONES ? "TODAS LAS ZONAS" : zonaSeleccionada?.toLocaleUpperCase("es-PE")}`}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Mostrando {soloDisponibles ? posiciones.filter(pos => pos.disponible).length : filtrados.length} registro
              {filtrados.length === 1 ? "" : "s"} con los
              filtros actuales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
            {[["Pendiente", "bg-amber-400"], ["En proceso", "bg-blue-400"], ["Completado", "bg-emerald-400"]].map(([label, color]) => <span key={label} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${color}`} />{label}</span>)}
            <span className="text-slate-500">{cargandoPosiciones ? "Consultando posiciones…" : `${posiciones.length || resumen.capacidad} posiciones`}</span>
          </div>
        </div>

        {/* POSICIONES */}
        {vista === "posiciones" &&
        estado !== "Histórico" ? (
          <div className="property-position-grid mt-3 grid gap-4">
            {cargandoPosiciones ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                Consultando posiciones reales de la cartera…
              </div>
            ) : posiciones.length > 0 ? (
              posiciones.map((pos) => {
                const x = inmueblePorPosicion.get(
                  `${pos.zonaId}:${pos.numero}`
                );

                const zonaPosicion = zonaSeleccionada === ALL_ZONES || zonaSeleccionada === null || pos.zona===zonaSeleccionada;
                const visible = zonaPosicion && (soloDisponibles ? !x : x ? filtrados.some(item => item.inmuebleId === x.inmuebleId) : !tieneFiltros);

                if (!visible) {
                  return null;
                }

                const theme = x ? cardTheme(x) : null;
                return (
                  <article data-folder-card="true" key={pos.id} className={`cartera-folder relative mt-4 flex h-full min-w-0 flex-col rounded-b-2xl rounded-tr-2xl border transition duration-200 ${x ? "border-amber-200 bg-amber-50/40 shadow-[0_3px_14px_rgba(15,23,42,0.04)] hover:border-amber-300 hover:shadow-lg" : "border-dashed border-slate-200 bg-slate-50/60"}`}>
                  <span aria-hidden="true" className={`cartera-folder-tab absolute -top-4 left-[-1px] h-4 w-24 rounded-t-xl border border-b-0 ${x ? "border-amber-200 bg-amber-100" : "border-slate-200 bg-slate-100"}`} />
                  <button
                    type="button"
                    onClick={() => x && setSeleccionado(x)}
                    disabled={!x}
                    aria-label={x ? `Ver detalle de ${x.propietario || "Sin contacto"}, posición ${pos.numero}` : `Posición ${pos.numero} disponible`}
                    className="group flex min-h-[345px] w-full flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c80000]"
                  >
                    <div aria-hidden="true" className="h-1.5 w-full rounded-tr-2xl bg-amber-100/70" />
                    <div className="flex w-full flex-1 flex-col p-3.5 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        {zonaSeleccionada===ALL_ZONES&&<span className="text-xs text-slate-500">{pos.zona}</span>}<span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-bold tracking-tight ${theme?.position ?? "bg-slate-100 text-slate-500"}`}>{String(pos.numero).padStart(2, "0")}</span>
                        <span className={x ? "text-slate-300" : "text-slate-300 text-2xl font-light"}>{x ? <FolderIcon /> : <FolderIcon className="h-7 w-7 shrink-0 text-slate-300" />}</span>
                      </div>
                      {x && theme ? <>
                        <span className={`mt-3 inline-flex self-start rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset ${theme.badge}`}>{theme.label}</span>
                        <h3 className="mt-3 min-h-10 break-words text-sm font-bold leading-5 text-slate-900" title={x.propietario || "Sin contacto"}>{x.propietario || "Sin contacto"}</h3>
                        <p className="mt-2 text-xs font-semibold text-slate-700"><PropertySummary operation={x.operacion} type={x.tipo} location={x.direccion} /></p>
                        <p className="mt-1 break-words font-mono text-xs text-slate-500">{propertyPanelId(x)}</p>
                        <div className="mt-3 flex min-h-12 content-start flex-wrap gap-1.5">
                          {x.visitaPendiente && <span className="rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-amber-800">Visita pendiente</span>}
                          {x.tasacionPendiente && <span className="rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-amber-900">Tasación pendiente</span>}
                          {x.materialPendiente && <span className="rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-amber-900">Material pendiente</span>}

                        </div>
                        <div className="mt-auto pt-4">
                          <div className="border-t border-slate-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{priceLabel(x.operacion)}</p><p className={`mt-1 break-words text-base font-bold tracking-tight ${x.precioVenta ? "text-slate-900" : "text-slate-500"}`}>{salePrice(x.precioVenta)}{x.operacion === "alquiler" ? " / mes" : ""}</p></div>
                          <p className="mt-3 text-xs font-semibold text-[#c80000] group-hover:text-[#a90000]">Ver detalle <span aria-hidden="true">→</span></p>
                        </div>
                      </> : <div className="flex flex-1 flex-col items-center justify-center py-6 text-center"><p className="text-xs font-semibold text-slate-500">Disponible</p><p className="mt-1 text-xs leading-4 text-slate-500">Lista para un nuevo inmueble</p></div>}
                    </div>
                  </button>
                  {x && <div className="mx-4 mb-4 grid gap-2">
                    <button type="button" onClick={() => setGaleria(x)} disabled={!x.tieneFotos} aria-label={`${x.tieneFotos ? "Ver fotos" : "Fotos pendientes"} de ${x.nombre}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-[#c80000] enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"><Icon name="camera" />{x.tieneFotos ? "Ver fotos" : "Fotos pendientes"}</button>
                  </div>}
                  </article>
                );
              })
            ) : (
              <div className="col-span-full rounded-2xl border border-[#eadede] bg-[#fff5f5] p-6 text-sm text-[#a90000]">
                No se encontraron posiciones administradas.
              </div>
            )}
          </div>
        ) : (
          <section aria-label="Lista compacta de inmuebles" className="aa-card mt-3 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500"><span>Inmueble</span><span className="hidden sm:block">Precio</span></div>
            <ul className="divide-y divide-slate-100">
              {filtrados.map(x => <li key={x.id}><PortfolioLabelRow property={x} onOpen={() => setSeleccionado(x)} /></li>)}
            </ul>
          </section>
        )}

        {filtrados.length === 0 && !cargando && !soloDisponibles && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">
              {error ? "No se pudo consultar la cartera" : tieneFiltros ? "No hay resultados con estos filtros" : "No hay inmuebles en esta vista"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {error ? "Vuelve a cargar la pantalla para consultar la cartera." : tieneFiltros ? "Prueba cambiando los filtros o limpia la búsqueda." : "Abre otra zona o revisa el listado general."}
            </p>
          </div>
        )}

        {/* CAPACIDAD */}
        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Icon name="map" />
              </span>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {zonaActual ? `Capacidad de ${zonaActual.nombre}` : "Capacidad total de las zonas"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {resumen.capacidad - resumen.disponibles} de{" "}
                  {resumen.capacidad} posiciones ocupadas ·{" "}
                  {resumen.disponibles} disponibles para
                  reutilización.
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-800 transition-all duration-500"
                style={{
                  width: `${porcentajeOcupacion}%`,
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>0%</span>
              <span>
                {porcentajeOcupacion.toLocaleString("es-PE",{maximumFractionDigits:1})}% ocupadas · {(100-porcentajeOcupacion).toLocaleString("es-PE",{maximumFractionDigits:1})}% disponibles
              </span>
              <span>100%</span>
            </div>
          </div>

          <Link
            href="/liberar-inmuebles"
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Icon name="history" />
            Gestionar liberaciones
          </Link>
        </div>

        </>}

        <dialog ref={galleryDialog} onCancel={event => { event.preventDefault(); setGaleria(null); }} aria-labelledby="property-gallery-title" className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl backdrop:bg-slate-950/50 sm:p-6">
          {galeria && <><div className="mb-5 flex items-start justify-between gap-3"><div className="min-w-0 break-words"><h2 id="property-gallery-title" className="text-lg font-bold text-slate-900">{galeria.nombre}</h2><p className="mt-1 text-xs text-slate-500">{propertyPanelId(galeria)} · {galeria.posicion ? `Posición ${galeria.posicion}` : 'Sin posición'}</p></div><button type="button" autoFocus onClick={() => setGaleria(null)} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">Cerrar</button></div><PhotoGallery key={galeria.inmuebleId} propertyId={galeria.inmuebleId} /></>}
        </dialog>
        {/* MODAL */}
        {seleccionado && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4"
            onClick={() => setSeleccionado(null)}
          >
            <div
              className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl bg-white p-4 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
                      {seleccionado.posicion
                        ? `Posición ${String(
                            seleccionado.posicion
                          ).padStart(2, "0")}`
                        : "Sin posición activa"}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        seleccionado.estado === "Activo"
                          ? "bg-[#f1f5f2] text-[#3f684c]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {seleccionado.estado}
                    </span>
                  </div>

                  <h3 className="mt-3 break-words text-xl font-bold text-slate-950">
                    {seleccionado.propietario || "Sin contacto"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    <PropertySummary operation={seleccionado.operacion} type={seleccionado.tipo} location={seleccionado.direccion} />
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSeleccionado(null)
                  }
                  aria-label="Cerrar detalle del inmueble"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <Icon name="close" />
                </button>
              </div>

              <PortfolioPropertyEditor key={seleccionado.inmuebleId} propertyId={seleccionado.inmuebleId} onSaved={async () => {
                const response = await fetch(zoneUrl("/api/cartera"), { cache: "no-store" });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Los datos se guardaron, pero no se pudo actualizar la cartera. Recarga la página.");
                const updated = (data.inmuebles as Inmueble[]).find(item => item.inmuebleId === seleccionado.inmuebleId);
                setInmuebles(data.inmuebles ?? []);
                if (updated) setSeleccionado(updated);
              }} />

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    ID del inmueble
                  </p>
                  <p className="mt-1 break-words font-mono text-sm font-semibold text-slate-700">
                    {propertyPanelContactId(seleccionado)}
                  </p>
                </div>


              </div>

              <div className="mt-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Seguimiento operativo
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        Visita
                      </span>
                      <EstadoActividad
                        estado={
                          seleccionado.actividades.visita
                            .estado
                        }
                        pendiente={
                          seleccionado.visitaPendiente
                        }
                        icon={
                          seleccionado.visitaPendiente
                            ? "clock"
                            : "check"
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        Tasación
                      </span>
                      <EstadoActividad
                        estado={
                          seleccionado.actividades
                            .tasacion.estado
                        }
                        pendiente={
                          seleccionado.tasacionPendiente
                        }
                        icon="chart"
                      />
                    </div>
                  </div>

<div className="rounded-2xl border border-slate-200 p-4">
  <p className="text-sm font-semibold text-slate-700">
    Material
  </p>

  {seleccionado.actividades.tasacion.estado !==
  "aprobado" ? (
    <p className="mt-2 text-xs font-medium text-slate-500">
      Aún no corresponde
    </p>
  ) : (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${
          seleccionado.fotosPendientes
            ? "bg-amber-50 text-amber-900"
            : "bg-emerald-50 text-emerald-800"
        }`}
      >
        {seleccionado.fotosPendientes
          ? "Fotos pendientes"
          : "Fotos completas"}
      </span>

      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${
          seleccionado.textoPendiente
            ? "bg-amber-50 text-amber-900"
            : "bg-emerald-50 text-emerald-800"
        }`}
      >
        {seleccionado.textoPendiente
          ? "Texto pendiente"
          : "Texto registrado"}
      </span>
    </div>
  )}
</div>

                  <PublicationChecklist data={seleccionado.expediente} code={seleccionado.id} />
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-background p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Publicación
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {!seleccionado.actividades.publicacion
                    .existe
                    ? "Sin publicación registrada"
                    : seleccionado.actividades.publicacion
                          .publicado
                      ? "Publicación realizada"
                      : "Texto registrado, pendiente de publicación"}
                </p>
              </div>

              <button type="button" onClick={() => setGaleria(seleccionado)} disabled={!seleccionado.tieneFotos} className="mt-3 w-full rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-[#c80000] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500">{seleccionado.tieneFotos ? "Ver fotos del inmueble" : "Fotos pendientes"}</button>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  href={
                    "/datos-inmuebles?codigo=" +
                    encodeURIComponent(
                      seleccionado.id
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  Ver ficha
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setSeleccionado(null)
                  }
                  className="rounded-xl bg-[#c80000] px-4 py-2.5 text-xs font-semibold text-white"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main></NavigationReturnProvider>
  );
}
