"use client";
import OperationSelect from "@/app/components/OperationSelect";
import { operationLabel, priceLabel } from "@/lib/operation.mjs";

import PropertyTypeSelect from "@/app/components/PropertyTypeSelect";
import { propertyDisplayId } from "@/lib/property-display-id";

import PageHeading from "@/app/components/PageHeading";


import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRef } from "react";
import PublicationChecklist, { type Checklist } from "@/app/components/PublicationChecklist";
import StatusBadge from "@/app/components/StatusBadge";
import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";
import ResponsiveFilters from "@/app/components/ResponsiveFilters";
import PhotoGallery from "@/app/components/PhotoGallery";
import PropertyMapDialog from "@/app/components/PropertyMapDialog";

type Estado = "Activo" | "Histórico";
type FiltroActividad =
  | "Todas"
  | "Visita pendiente"
  | "Tasación pendiente"
  | "Material pendiente";

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
  datosPrueba?: boolean;
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
  distrito: string | null;
  latitud: string | null;
  longitud: string | null;
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

function primaryTone(item: Inmueble) {
  if (item.estado === "Histórico") return "neutral" as const;
  if (item.actividades.publicacion.publicado) return "complete" as const;
  if (item.negociacionEnCurso) return "progress" as const;
  if (item.visitaPendiente || item.tasacionPendiente || item.materialPendiente || item.actividades.tasacion.situacion === "pendiente_aprobacion") return "pending" as const;
  return "progress" as const;
}

function salePrice(value: string | null) {
  return value ? `S/ ${Number(value).toLocaleString("es-PE", { maximumFractionDigits: 2 })}` : "Por definir";
}

export default function CarteraPage() {
  const [estado, setEstado] = useState<"Todos" | Estado>("Activo");
  const [operacion, setOperacion] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [distrito, setDistrito] = useState("Todos");
  const [posicionFiltro, setPosicionFiltro] = useState("Todas");
  const [actividad, setActividad] =
    useState<FiltroActividad>("Todas");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] =
    useState<"posiciones" | "lista">("lista");

  const [seleccionado, setSeleccionado] =
    useState<Inmueble | null>(null);
  const [galeria, setGaleria] = useState<Inmueble | null>(null);
  const [mapa, setMapa] = useState<Inmueble | null>(null);
  const galleryDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = galleryDialog.current;
    if (galeria) dialog?.showModal(); else dialog?.close();
    return () => dialog?.close();
  }, [galeria]);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [resumen, setResumen] = useState<Resumen>({
    enCartera: 0,
    disponibles: 90,
    visitasPendientes: 0,
    tasacionesPendientes: 0,
    materialPendiente: 0,
    negociaciones: 0,
    capacidad: 90,
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
          fetch("/api/cartera", { cache: "no-store" }),
          fetch("/api/posiciones", { cache: "no-store" }),
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
          disponibles: 90,
          visitasPendientes: 0,
          tasacionesPendientes: 0,
          materialPendiente: 0,
          negociaciones: 0,
          capacidad: 90,
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

  useEffect(() => {
    const inicial = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const activity = params.get("actividad");
      if (["Visita pendiente", "Tasación pendiente", "Material pendiente"].includes(activity ?? "")) setActividad(activity as FiltroActividad);
      if (params.get("vista") === "lista") setVista("lista");
      if (params.get("vista") === "posiciones" || params.get("disponibles") === "1") setVista("posiciones");
      if (params.get("disponibles") === "1") setSoloDisponibles(true);
      void cargarDatos();
    }, 0);

    const intervalo = window.setInterval(
      cargarDatos,
      30000
    );

    return () => { window.clearTimeout(inicial); window.clearInterval(intervalo); };
  }, []);

  const activos = useMemo(
    () =>
      inmuebles.filter((x) => x.estado === "Activo"),
    [inmuebles]
  );

  const distritosCartera = useMemo(() => {
    const unicos = new Map<string, string>();
    for (const inmueble of activos) {
      const distrito = inmueble.distrito?.trim().replace(/\s+/g, " ");
      if (distrito) unicos.set(distrito.toLocaleLowerCase("es-PE"), distrito);
    }
    return [...unicos.values()].sort((a, b) => a.localeCompare(b, "es-PE"));
  }, [activos]);

  const distritosFiltro = useMemo(() => [...new Set(inmuebles.map(x => x.distrito?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "es-PE")), [inmuebles]);

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return inmuebles.filter((x) => {
      const coincideTexto =
        !texto ||
        `${x.nombre} ${x.propietario} ${x.direccion ?? ""} ${x.distrito ?? ""} ${x.ubicacion}`
          .toLowerCase()
          .includes(texto);

      const coincideActividad =
        actividad === "Todas" ||
        (actividad === "Visita pendiente" &&
          x.visitaPendiente) ||
        (actividad === "Tasación pendiente" &&
          x.tasacionPendiente) ||
        (actividad === "Material pendiente" &&
          x.materialPendiente);

      return (
        (estado === "Todos" || x.estado === estado) &&
        (tipo === "Todos" || x.tipo === tipo) &&
        (distrito === "Todos" || x.distrito?.trim() === distrito) &&
        (posicionFiltro === "Todas" || (posicionFiltro === "sin" ? x.posicion == null : x.posicion === Number(posicionFiltro))) &&
        (operacion === "Todos" || x.operacion === operacion) &&
        coincideActividad &&
        coincideTexto
      );
    });
  }, [
    inmuebles,
    estado,
    tipo,
    operacion,
    distrito,
    posicionFiltro,
    actividad,
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
    const mapa = new Map<number, Inmueble>();

    activos.forEach((inmueble) => {
      if (inmueble.posicion != null) {
        mapa.set(inmueble.posicion, inmueble);
      }
    });

    return mapa;
  }, [activos]);

  const limpiarFiltros = () => {
    setSoloDisponibles(false);
    setEstado("Activo");
    setTipo("Todos");
    setDistrito("Todos");
    setPosicionFiltro("Todas");
    setOperacion("Todos");
    setActividad("Todas");
    setBusqueda("");
  };

  const tieneFiltros =
    soloDisponibles ||
    Boolean(busqueda) ||
    estado !== "Activo" ||
    tipo !== "Todos" ||
    distrito !== "Todos" ||
    posicionFiltro !== "Todas" ||
    operacion !== "Todos" ||
    actividad !== "Todas";

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-6 lg:p-8">
      <div className="mx-auto max-w-[1550px]">
        {/* CABECERA */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0"><PageHeading href="/cartera" /><p className="mt-2 break-words text-xs leading-5 text-slate-500">Distritos de la cartera: {cargando ? "Cargando…" : distritosCartera.length ? distritosCartera.join(", ") : error ? "No se pudieron consultar." : "Sin distritos registrados."}</p></div>

          <Link
            href="/registrar-inmueble"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c80000] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a90000]"
          >
            + Registrar inmueble
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-600">Selecciona un inmueble de la lista para ver su información y abrir la ficha completa. También puedes consultar las posiciones en la vista de tarjetas.</p>
        {/* INDICADORES */}
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "En cartera",
              value: resumen.enCartera,
              detail: `de ${resumen.capacidad}`,
              icon: "home" as const,
            },
            {
              label: "Disponibles",
              value: resumen.disponibles,
              detail: "posiciones libres",
              icon: "map" as const,
            },
            {
              label: "Visitas pendientes",
              value: resumen.visitasPendientes,
              detail: "Visitas pendientes",
              icon: "clock" as const,
            },
            {
              label: "Tasaciones pendientes",
              value: resumen.tasacionesPendientes,
              detail: "Tasaciones pendientes",
              icon: "chart" as const,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon name={item.icon} />
                </span>

                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.detail}
                </span>
              </div>

              <p className="mt-4 text-2xl font-bold text-slate-950">
                {item.value}
              </p>

              {!["Visitas pendientes", "Tasaciones pendientes"].includes(item.label) && <p className="mt-1 text-xs font-semibold text-slate-500">
                {item.label}
              </p>}
            </div>
          ))}
        </div>



        {error && <Feedback tone="error" className="mt-5">{error}<button type="button" onClick={() => void cargarDatos()} className="ml-3 font-semibold underline">Reintentar</button></Feedback>}
        {cargando && <LoadingCards label="Cargando cartera y posiciones…" count={6} />}

        <section aria-label="Buscar y filtrar cartera" className="aa-card mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Buscar inmueble</span><span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Icon name="search" /></span><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar por propietario o ubicación…" className="aa-input w-full pl-10" /></label>
            <div aria-label="Vista de la cartera" className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button type="button" aria-pressed={vista === "posiciones"} onClick={() => setVista("posiciones")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${vista === "posiciones" ? "bg-[#c80000] text-white" : "text-slate-600"}`}>Tarjetas</button>
              <button type="button" aria-pressed={vista === "lista"} onClick={() => { setVista("lista"); setSoloDisponibles(false); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${vista === "lista" ? "bg-[#c80000] text-white" : "text-slate-600"}`}>Lista compacta</button>
            </div>
          </div>
          <div className="mt-3"><ResponsiveFilters active={tieneFiltros}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600">Estado<select value={estado} onChange={event => { setEstado(event.target.value as "Todos" | Estado); setSoloDisponibles(false); }} className="aa-input mt-2 w-full"><option>Activo</option><option>Todos</option><option>Histórico</option></select></label>
              <label className="text-xs font-semibold text-slate-600">Operación<OperationSelect filter value={operacion} onChange={setOperacion} className="aa-input mt-2 w-full" /></label><label className="text-xs font-semibold text-slate-600">Tipo de inmueble<PropertyTypeSelect filter value={tipo} onChange={setTipo} className="aa-input mt-2 w-full" /></label>
              <label className="text-xs font-semibold text-slate-600">Posición<select value={posicionFiltro} onChange={event => setPosicionFiltro(event.target.value)} className="aa-input mt-2 w-full"><option value="Todas">Todas las posiciones</option>{[...new Set([...posiciones.map(p => p.numero), ...inmuebles.flatMap(x => x.posicion == null ? [] : [x.posicion])])].sort((a, b) => a - b).map(numero => <option key={numero} value={String(numero)}>Posición {String(numero).padStart(2, "0")}</option>)}<option value="sin">Sin posición</option></select></label>
              <label className="text-xs font-semibold text-slate-600">Distrito<select value={distrito} onChange={event => { setDistrito(event.target.value); setSoloDisponibles(false); }} className="aa-input mt-2 w-full"><option value="Todos">Todos los distritos</option>{distritosFiltro.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-600">Actividad<select value={actividad} onChange={event => setActividad(event.target.value as FiltroActividad)} className="aa-input mt-2 w-full">{["Todas", "Visita pendiente", "Tasación pendiente", "Material pendiente"].map(value => <option key={value}>{value}</option>)}</select></label>
            </div>
          </ResponsiveFilters></div>
          {tieneFiltros && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><p className="text-xs text-slate-600">{soloDisponibles ? "Mostrando solamente posiciones libres" : `${estado} · ${tipo} · ${distrito} · ${posicionFiltro === "Todas" ? "Todas las posiciones" : posicionFiltro === "sin" ? "Sin posición" : `Posición ${posicionFiltro}`} · ${actividad}`}</p><button type="button" onClick={limpiarFiltros} className="text-sm font-semibold text-[#c80000]">Limpiar filtros</button></div>}
        </section>

        {/* RESULTADOS */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              {estado === "Histórico"
                ? "Histórico de inmuebles"
                : "Cartera operativa"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Mostrando {soloDisponibles ? posiciones.filter(pos => pos.disponible && (posicionFiltro === "Todas" || posicionFiltro === String(pos.numero))).length : filtrados.length} registro
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
                  pos.numero
                );

                const coincidePosicion = posicionFiltro === "Todas" || posicionFiltro === String(pos.numero);
                const soloFiltroPosicion = posicionFiltro !== "Todas" && !busqueda && tipo === "Todos" && distrito === "Todos" && operacion === "Todos" && actividad === "Todas" && estado === "Activo";
                const visible = coincidePosicion && (soloDisponibles ? !x : x ? filtrados.some(item => item.inmuebleId === x.inmuebleId) : soloFiltroPosicion || !tieneFiltros);

                if (!visible) {
                  return null;
                }

                const theme = x ? cardTheme(x) : null;
                return (
                  <article key={pos.numero} className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border transition duration-200 ${x ? `border-slate-200 bg-white shadow-[0_3px_14px_rgba(15,23,42,0.04)] hover:shadow-lg ${theme?.border}` : "border-dashed border-slate-200 bg-slate-50/60"}`}>
                  <button
                    type="button"
                    onClick={() => x && setSeleccionado(x)}
                    disabled={!x}
                    aria-label={x ? `Ver detalle de ${x.nombre}, posición ${pos.numero}` : `Posición ${pos.numero} disponible`}
                    className="group flex min-h-[345px] w-full flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c80000]"
                  >
                    <div aria-hidden="true" className={`h-1.5 w-full ${theme?.stripe ?? "bg-slate-100"}`} />
                    <div className="flex w-full flex-1 flex-col p-3.5 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-bold tracking-tight ${theme?.position ?? "bg-slate-100 text-slate-500"}`}>{String(pos.numero).padStart(2, "0")}</span>
                        <span className={x ? "text-slate-300" : "text-slate-300 text-2xl font-light"}>{x ? <Icon name="home" /> : "+"}</span>
                      </div>
                      {x && theme ? <>
                        <span className={`mt-3 inline-flex self-start rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset ${theme.badge}`}>{theme.label}</span>
                        <h3 className="mt-3 min-h-10 line-clamp-2 break-words text-sm font-bold leading-5 text-slate-900" title={x.nombre}>{x.nombre}</h3>
                        <p className="mt-1 break-words font-mono text-xs text-slate-500">{propertyDisplayId(x)}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-700">{operationLabel(x.operacion)} · {x.tipo}</p>
                        <p className="mt-2 flex items-start gap-1.5 text-xs leading-4 text-slate-500"><span aria-hidden="true" className="shrink-0"><Icon name="map" /></span><span className="min-h-8 min-w-0 line-clamp-2 break-words" title={x.ubicacion}>{x.ubicacion}</span></p>
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
                    <button type="button" onClick={() => setMapa(x)} aria-label={`${x.direccion?.trim() ? "Consultar dirección" : "Consultar zona aproximada"} de ${x.nombre}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"><Icon name="map" />{x.direccion?.trim() ? "Consultar dirección" : "Consultar zona aproximada"}</button>
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
            <div aria-hidden="true" className="hidden grid-cols-[3rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_6rem_7rem_minmax(0,1.5fr)] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 lg:grid">
              <span>Pos.</span><span>Propietario / Inmueble</span><span>Tipo</span><span>Distrito</span><span>Operación</span><span className="text-right">Precio</span><span>Pendiente / Estado</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {filtrados.map(x => <li key={x.id}>
                <button type="button" onClick={() => setSeleccionado(x)} aria-label={`Ver detalle de ${x.nombre}, ${x.posicion ? `posición ${x.posicion}` : "sin posición"}`} className="group grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition hover:bg-red-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c80000] lg:grid-cols-[3rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_6rem_7rem_minmax(0,1.5fr)] lg:py-3.5">
                  <span className="row-span-2 font-mono text-sm font-semibold text-slate-500 lg:row-span-1">{x.posicion ? String(x.posicion).padStart(2, "0") : "—"}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-[#c80000]" title={x.nombre}>{x.nombre}</span><span className="mt-0.5 block truncate text-xs text-slate-500" title={x.direccion || "Dirección por completar"}>{x.direccion || "Dirección por completar"}</span><span className="mt-0.5 block truncate text-xs text-slate-500 lg:hidden">{x.tipo} · {x.distrito || "Distrito por completar"} · {operationLabel(x.operacion)}</span></span>
                  <span className="hidden truncate text-sm text-slate-600 lg:block" title={x.tipo}>{x.tipo}</span>
                  <span className="hidden truncate text-sm text-slate-600 lg:block" title={x.distrito || "Distrito por completar"}>{x.distrito || "Por completar"}</span>
                  <span className="hidden text-sm text-slate-600 lg:block">{operationLabel(x.operacion)}</span>
                  <span className="col-start-3 row-start-1 text-right text-xs font-semibold text-slate-800 lg:col-start-auto lg:row-start-auto lg:text-sm">{salePrice(x.precioVenta)}{x.operacion === "alquiler" ? <span className="block text-xs font-normal text-slate-500">/ mes</span> : null}</span>
                  <span className="col-span-2 col-start-2 row-start-2 flex min-w-0 items-center gap-2 lg:col-span-1 lg:col-start-auto lg:row-start-auto"><StatusBadge tone={primaryTone(x)}>{cardTheme(x).label}</StatusBadge><span aria-hidden="true" className="ml-auto text-slate-300 group-hover:text-[#c80000]">→</span></span>
                </button>
              </li>)}
            </ul>
          </section>
        )}

        {filtrados.length === 0 && !cargando && !soloDisponibles && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">
              No encontramos inmuebles
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Prueba cambiando los filtros o la búsqueda.
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
                  Capacidad de cartera
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

        <dialog ref={galleryDialog} onCancel={event => { event.preventDefault(); setGaleria(null); }} aria-labelledby="property-gallery-title" className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl backdrop:bg-slate-950/50 sm:p-6">
          {galeria && <><div className="mb-5 flex items-start justify-between gap-3"><div className="min-w-0 break-words"><h2 id="property-gallery-title" className="text-lg font-bold text-slate-900">{galeria.nombre}</h2><p className="mt-1 text-xs text-slate-500">{propertyDisplayId(galeria)} · {galeria.posicion ? `Posición ${galeria.posicion}` : 'Sin posición'}</p></div><button type="button" autoFocus onClick={() => setGaleria(null)} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">Cerrar</button></div><PhotoGallery key={galeria.inmuebleId} propertyId={galeria.inmuebleId} /></>}
        </dialog>
        {mapa && <PropertyMapDialog key={mapa.inmuebleId} property={mapa} onClose={() => setMapa(null)} />}
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
                    {seleccionado.nombre}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {operationLabel(seleccionado.operacion)} · {seleccionado.tipo} ·{" "}
                    {seleccionado.ubicacion}
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

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f7f7f5] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    ID del inmueble
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
                    {propertyDisplayId(seleccionado)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f7f5] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Propietario
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {seleccionado.propietario}
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

              <div className="mt-4 rounded-2xl bg-[#f7f7f5] p-4">
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

              <button type="button" onClick={() => setMapa(seleccionado)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"><Icon name="map" />{seleccionado.direccion?.trim() ? "Consultar dirección" : "Consultar zona aproximada"}</button>
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
    </main>
  );
}
