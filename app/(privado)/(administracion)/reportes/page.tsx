"use client";
import { reportCatalog as reportes, recommendedReportColumns } from "@/lib/report-catalog.mjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { zoneUrl } from "@/lib/zone-url";

import ZoneReportFilter from "@/app/components/ZoneReportFilter";
import PropertySummary from "@/app/components/PropertySummary";
import WorkspaceFileIcon from "@/app/components/WorkspaceFileIcon";
import OperationSelect from "@/app/components/OperationSelect";
import { reportPeriodField } from "@/lib/report-period.mjs";

import PropertyTypeSelect from "@/app/components/PropertyTypeSelect";
import PageHeading from "@/app/components/PageHeading";


import type { ReportRow, ReportSummary } from "@/lib/report-types";
import { useEffect, useMemo, useState } from "react";
import ResponsiveFilters from "@/app/components/ResponsiveFilters";
import { Feedback } from "@/app/components/InterfaceFeedback";
import Image from "next/image";
import { reportPDFLayout, reportText, reportCellValue } from "@/lib/report-export";

type Row = ReportRow;

const grupos = [
  "Todos",
  "Cartera",
  "Gestión",
  "Salidas",
  "Histórico",
  "Flujo",
];


export default function Page() {
  const params = useSearchParams();
  const zona = params.get("zona") || "*";
  const [plazo,setPlazo]=useState("Todos");
  const [busquedaResultado, setBusquedaResultado] = useState("");
  const [orden, setOrden] = useState<{ key: string; asc: boolean } | null>(null);
  const [categoria, setCategoria] =
    useState("Todos");

  const [consulta, setConsulta] = useState({
    reporte: "Cartera activa", plazo:"Todos", desde: "", hasta: "", situacion: "Todas", estado: "Todos", posicion: "", tipo: "Todos", operacion: "Todos", pagina: "1",
  });
  const [operacion,setOperacion]=useState("Todos");
  const [paginacion,setPaginacion]=useState({pagina:1,paginas:1,total:0});
  const seleccionado = consulta.reporte;
  const [exportando, setExportando] = useState<"pdf" | "excel" | null>(null);
  const [errorExportacion, setErrorExportacion] = useState("");
  const [seleccionColumnas, setSeleccionColumnas] = useState<Record<string, string[]>>({});
  const [generado, setGenerado] = useState<Date | null>(null);

  const [fechaDesde, setFechaDesde] =
    useState("");

  const [fechaHasta, setFechaHasta] =
    useState("");

  const [situacion, setSituacion] =
    useState("Todas");

  const [estado, setEstado] =
    useState("Todos");

  const [posicion, setPosicion] =
    useState("");

  const [tipo, setTipo] =
    useState("Todos");

  const [rows, setRows] =
    useState<Row[]>([]);

  const [resumen, setResumen] =
    useState<ReportSummary | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const visibles = useMemo(
    () =>
      reportes.filter(
        (reporte) =>
          categoria === "Todos" ||
          reporte.categoria ===
            categoria,
      ),
    [categoria],
  );

  const reporteInfo =
    reportes.find(
      (reporte) =>
        reporte.nombre ===
        seleccionado,
    )!;

  function solicitarReporte(reporte: string) {
    setBusquedaResultado("");
    setOrden(null);
    setCargando(true);
    setRows([]);
    setResumen(null);
    setGenerado(null);
    setError("");
    setErrorExportacion("");
    setConsulta({ reporte, plazo:reporte==="Posiciones disponibles"?"Todos":plazo, desde: reporte==="Posiciones disponibles"?"":fechaDesde, hasta: reporte==="Posiciones disponibles"?"":fechaHasta, situacion:reporte==="Posiciones disponibles"?"Todas":situacion, estado:reporte==="Posiciones disponibles"?"Todos":estado, posicion, tipo:reporte==="Posiciones disponibles"?"Todos":tipo,operacion:reporte==="Posiciones disponibles"?"Todos":operacion,pagina:"1" });
  }

  function cargar() { solicitarReporte(seleccionado); }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const params = new URLSearchParams(consulta);
        const response = await fetch(zoneUrl(`/api/reportes?${params.toString()}`), { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo generar el reporte.");
        if (controller.signal.aborted) return;
        setGenerado(new Date());
        setRows(data.rows ?? []);
        setResumen(data.resumen ?? null);
        setPaginacion(data.paginacion??{pagina:1,paginas:1,total:(data.rows??[]).length});
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
        setRows([]);
        setResumen(null);
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [consulta]);

  const limpiar = () => {
    setFechaDesde("");
    setFechaHasta("");
    setSituacion("Todas");
    setEstado("Todos");
    setPosicion("");
    setTipo("Todos");
    setOperacion("Todos");
    setPlazo("Todos");
    setBusquedaResultado("");
    setOrden(null);
    setCargando(true);
    setRows([]);
    setResumen(null);
    setGenerado(null);
    setError("");
    setErrorExportacion("");
    setConsulta({ reporte: seleccionado, plazo:"Todos", desde: "", hasta: "", situacion: "Todas", estado: "Todos", posicion: "", tipo: "Todos", operacion: "Todos",pagina:"1" });
  };

  const columnas =
    useMemo(() => {
      if (!rows.length) return [];

      const preferred = [
        "zona",
        "posicion",
        "nombre",
        "codigo",
        "propietario",
        "ubicacion",
        "tipo",
        "operacion",
        "rentaMensualSolicitada",
        "fechaAlquiler",
        "rentaMensual",
        "garantia",
        "adelanto",
        "fechaInicioAlquiler",
        "fechaFinAlquiler",
        "estado",
        "situaciones",
        "actividadPendiente",
        "fechaLimite",
        "estadoPlazo",
        "diasRetraso",
        "plazoOrigen",
        "fechaSalida",
        "activaPosicion",
        "fechaRegistro",
        "fechaVisita",
        "fechaTasacion",
        "tasacion",
        "fechaPublicacion",
        "motivoLiberacion",
        "fechaVenta",
        "precioFinal",
        "comision",
        "expedientePendiente",
        "dias",
        "fechaInicioPosicion",
        "fechaFinPosicion",
        "fechaInicioFlujo",
        "fechaFinFlujo",
      ];

      return preferred.filter(
        (key) =>
          rows.some(
            (row) =>
              row[key] !==
              undefined,
          ),
      );
    }, [rows]);

  const recomendadas = recommendedReportColumns(seleccionado,columnas);
  const elegidas = seleccionColumnas[seleccionado] ?? recomendadas;
  const columnasElegidas = columnas.filter(key => elegidas.includes(key));
  const orientacionPDF = reportPDFLayout(columnasElegidas).orientation === "landscape" ? "horizontal" : "vertical";
  function seleccionarColumnas(keys: string[]) {
    setSeleccionColumnas(previous => ({ ...previous, [seleccionado]: keys }));
  }

  const etiqueta: Record<
    string,
    string
  > = {
    fechaLimite:"Fecha límite", estadoPlazo:"Estado del plazo",diasRetraso:"Días de atraso",plazoOrigen:"Plazo",actividadPendiente:"Actividad pendiente",fechaSalida:"Salida",activaPosicion:"Asignación activa",
    fechaVenta: "Fecha de venta",
    precioFinal: "Precio final (S/)",
    comision: "Comisión (S/)",
    expedientePendiente: "Expediente pendiente",
    codigo: "ID del inmueble",
    zona: "Zona",
    posicion: "Pos.",
    nombre: "Inmueble",
    propietario: "Contacto",
    ubicacion: "Ubicación",
    tipo: "Tipo",
    operacion: "Operación",
    rentaMensualSolicitada: "Renta mensual solicitada (S/)",
    fechaAlquiler: "Fecha de cierre del alquiler",
    rentaMensual: "Renta mensual acordada (S/)",
    garantia: "Garantía (S/)",
    adelanto: "Adelanto (S/)",
    fechaInicioAlquiler: "Inicio del alquiler",
    fechaFinAlquiler: "Fin del alquiler",
    estado: "Estado",
    situaciones:
      "Situación / actividades",
    fechaRegistro: "Registro",
    fechaVisita: "Visita",
    fechaTasacion: "Tasación",
    tasacion: "Precio objetivo",
    situacionTasacion:
      "Situación tasación",
    estadoNegociacion:
      "Negociación",
    fechaPublicacion:
      "Publicación",
    motivoLiberacion:
      "Motivo",
    dias: "Días",
    fechaInicioPosicion:
      "Inicio posición",
    fechaFinPosicion:
      "Fin posición",
    fechaInicioFlujo:
      "Inicio",
    fechaFinFlujo:
      "Fin",
  };

  const filtrosAplicados = [
    `Zona: ${zona==="*"?"Todas las zonas":zona}`,
    consulta.plazo!=="Todos"&&`Plazo: ${consulta.plazo}`,
    consulta.desde && `Desde: ${reportText("fecha", consulta.desde)}`,
    consulta.hasta && `Hasta: ${reportText("fecha", consulta.hasta)}`,
    consulta.situacion !== "Todas" && `Actividad: ${consulta.situacion}`,
    consulta.estado !== "Todos" && `Estado: ${consulta.estado}`,
    consulta.posicion && `Posición: ${consulta.posicion}`,
    consulta.operacion !== "Todos" && `Operación: ${consulta.operacion === "alquiler" ? "Alquiler" : "Venta"}`,
    consulta.tipo !== "Todos" && `Tipo: ${consulta.tipo}`,
    seleccionado==='Posiciones disponibles'?'Disponibilidad actual; sin filtro de fechas':`Fecha utilizada: ${{fechaLimite:"Fecha límite",fechaRegistro:"Registro",fechaVenta:"Venta",fechaSalida:"Salida",fechaVisita:"Visita",fechaTasacion:"Tasación",fechaPublicacion:"Publicación",fechaInicioPosicion:"Inicio de posición",fechaInicioFlujo:"Inicio del recorrido"}[reportPeriodField(seleccionado) as "fechaRegistro"]}`,
  ].filter(Boolean).join(" · ") || "Todos los registros · Sin restricciones";
  const filtrosPendientes = seleccionado==='Posiciones disponibles'?posicion!==consulta.posicion:plazo!==consulta.plazo || operacion !== consulta.operacion || fechaDesde !== consulta.desde || fechaHasta !== consulta.hasta || situacion !== consulta.situacion || estado !== consulta.estado || posicion !== consulta.posicion || tipo !== consulta.tipo;

  async function descargar(formato: "pdf" | "excel") {
    if (cargando || exportando || !rows.length || !generado || !columnasElegidas.length) return;
    setExportando(formato);
    setErrorExportacion("");
    try {
      const exports = await import("@/lib/report-export");
      const response=await fetch(zoneUrl(`/api/reportes?${new URLSearchParams({...consulta,todos:'1'})}`),{cache:'no-store'});
      const full=await response.json();if(!response.ok)throw new Error(full.error||'No se pudo preparar el reporte completo.');
      const report = { title: seleccionado, description: reporteInfo.descripcion, columns: columnasElegidas, labels: etiqueta, rows:full.rows, summary: full.resumen ?? null, filters: filtrosAplicados, generatedAt: new Date() };
      await (formato === "pdf" ? exports.exportReportPDF(report) : exports.exportReportExcel(report));
    } catch (err) {
      setErrorExportacion(err instanceof Error ? err.message : "No se pudo descargar el archivo. Inténtalo nuevamente.");
    } finally {
      setExportando(null);
    }
  }

  const filasVisibles = useMemo(() => {
    const texto = busquedaResultado.trim().toLocaleLowerCase("es");
    const visibles = rows.filter(row => !texto || Object.entries(row).some(([key, value]) =>
      reportText(key, value).toLocaleLowerCase("es").includes(texto)));
    if (!orden) return visibles;
    return [...visibles].sort((a, b) => {
      const av = a[orden.key], bv = b[orden.key];
      const result = orden.key.toLowerCase().includes("fecha") && av && bv ?
        new Date(String(av)).getTime() - new Date(String(bv)).getTime() :
        typeof av === "number" && typeof bv === "number" ? av - bv :
        reportText(orden.key, av).localeCompare(reportText(orden.key, bv), "es", { numeric: true });
      return orden.asc ? result : -result;
    });
  }, [rows, busquedaResultado, orden]);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl print:max-w-none">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between print:mb-4">
          <div className="flex gap-3">
            <div className="hidden shrink-0 rounded-xl border border-slate-200 bg-white p-3 sm:flex sm:items-center">
              <Image src="/branding/logo.png" alt="Inmobiliaria Alberto Alfaro" width={170} height={54} className="h-auto w-[150px]" />
            </div>

            <PageHeading href="/reportes" /><ZoneReportFilter />
          </div>

          <div className="flex flex-wrap gap-2 print:hidden" aria-busy={!!exportando}>
            <button onClick={() => void descargar("pdf")} disabled={cargando || !!exportando || !rows.length || !columnasElegidas.length}
              className="rounded-xl border border-[#c80000]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#c80000] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
              {exportando === "pdf" ? "Preparando PDF…" : "Descargar PDF"}
            </button>
            <button onClick={() => void descargar("excel")} disabled={cargando || !!exportando || !rows.length || !columnasElegidas.length}
              className="rounded-xl bg-[#c80000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-40">
              {exportando === "excel" ? "Preparando Excel…" : "Descargar Excel"}
            </button>
          </div>
        </header>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)] print:hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Filtros
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Ajusta la consulta y pulsa «Generar reporte». Las descargas usan los filtros del resultado mostrado.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={cargar}
                className="rounded-xl bg-[#c80000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a80000]"
              >
                Generar reporte
              </button>

              <button
                onClick={limpiar}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="mt-5"><ResponsiveFilters active={filtrosPendientes || filtrosAplicados !== "Todos los registros · Sin restricciones"}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <label className="text-xs font-semibold text-slate-500">
              Desde
              <input
                disabled={seleccionado==='Posiciones disponibles'}
                type="date"
                value={fechaDesde}
                onChange={(e) =>
                  setFechaDesde(
                    e.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Hasta
              <input
                disabled={seleccionado==='Posiciones disponibles'}
                type="date"
                value={fechaHasta}
                onChange={(e) =>
                  setFechaHasta(
                    e.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Actividad / situación
              <select
                disabled={seleccionado==='Posiciones disponibles'}
                value={situacion}
                onChange={(e) =>
                  setSituacion(
                    e.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option>
                  Todas
                </option>
                <option>
                  Visita pendiente
                </option>
                <option>
                  Tasación pendiente
                </option>
                <option>
                  Material pendiente
                </option>
                <option>
                  Listo para publicar
                </option>
                <option>
                  Publicado
                </option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-500">Plazo de actividad<select value={plazo} disabled={seleccionado==='Posiciones disponibles'} onChange={e=>setPlazo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Todos</option><option>Vencido</option><option>Vence hoy</option><option>En plazo</option></select></label>
            <label className="text-xs font-semibold text-slate-500">
              Estado
              <select
                disabled={seleccionado==='Posiciones disponibles'}
                value={estado}
                onChange={(e) =>
                  setEstado(
                    e.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option>
                  Todos
                </option>
                <option>
                  Activo
                </option>
                <option>
                  Histórico
                </option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Posición
              <input
                value={posicion}
                onChange={(e) =>
                  setPosicion(
                    e.target.value
                      .replace(
                        /\D/g,
                        "",
                      )
                      .slice(0, 6),
                  )
                }
                placeholder="Número de posición"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Operación
              <OperationSelect disabled={seleccionado==='Posiciones disponibles'} filter value={operacion} onChange={setOperacion} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Tipo de inmueble
              <PropertyTypeSelect disabled={seleccionado==='Posiciones disponibles'} filter value={tipo} onChange={setTipo} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
            </label>
          </div>
          </ResponsiveFilters></div>
        </section>

        <p className="mt-3 text-xs text-slate-600">El período utiliza la fecha indicada en los filtros aplicados. Posiciones disponibles muestra la disponibilidad actual. Las descargas incluyen todos los resultados aplicados.</p>
        {filtrosPendientes && <p className="mt-3 text-sm font-medium text-amber-700" role="status">Hay filtros pendientes de aplicar. Genera el reporte para actualizar el resultado y las descargas.</p>}
        {errorExportacion && <Feedback tone="error" className="mt-4">{errorExportacion}</Feedback>}
        {error && <Feedback tone="error" className="mt-5">{error}</Feedback>}

        {resumen && (
          <section className="mt-6 aa-summary p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Indicadores del reporte · Filtros aplicados
                </p>

                <h2 className="mt-1 text-base font-bold text-slate-900">
                  Resumen del resultado
                </h2>
              </div>

              <span className="text-xs text-slate-500">
                {paginacion.total} registros en el reporte seleccionado
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
              {[
                [
                  "Registros del reporte",
                  paginacion.total,
                ],
                [
                  "Activos",
                  resumen.activos,
                ],
                [
                  "Históricos",
                  resumen.historicos,
                ],
                [
                  "Posiciones libres (zona)",
                  resumen.disponibles,
                ],
                [
                  "Visitas pendientes",
                  resumen.visitasPendientes,
                ],
                [
                  "Tasaciones pendientes",
                  resumen.tasacionesPendientes,
                ],
                [
                  "Material pendiente",
                  resumen.materialPendiente,
                ],
                [
                  "Publicados",
                  resumen.publicados,
                ],
              ].map(
                ([titulo, valor]) => (
                  <div
                    key={String(
                      titulo,
                    )}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {titulo}
                    </p>

                    <p className="mt-1.5 text-xl font-bold text-slate-900">
                      {valor}
                    </p>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="aa-card p-4 print:hidden" aria-label="Reportes disponibles">
            <h2 className="text-base font-bold text-slate-900">Reportes disponibles</h2>
            <label className="mt-3 block text-xs font-semibold text-slate-500">Categoría
              <select value={categoria} onChange={event => setCategoria(event.target.value)} className="aa-input mt-1 w-full">
                {grupos.map(grupo => <option key={grupo}>{grupo}</option>)}
              </select>
            </label>
            <nav className="mt-3 grid max-h-80 gap-1 overflow-y-auto sm:grid-cols-2 xl:max-h-[640px] xl:grid-cols-1">
              {visibles.map(reporte => <button key={reporte.nombre} type="button"
                aria-current={seleccionado === reporte.nombre ? "page" : undefined}
                title={reporte.descripcion} onClick={() => solicitarReporte(reporte.nombre)}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${seleccionado === reporte.nombre ? "bg-red-50 font-semibold text-[#c80000]" : "text-slate-600 hover:bg-slate-50"}`}>
                <WorkspaceFileIcon report />
                {reporte.nombre}
              </button>)}
            </nav>
          </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)] print:mt-0 print:border-0 print:shadow-none">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#c80000]">
                {
                  reporteInfo.categoria
                }
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-950">
                {seleccionado}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {
                  reporteInfo.descripcion
                }
              </p>
            </div>

            {cargando && (
              <span className="text-xs font-semibold text-slate-500">
                Consultando…
              </span>
            )}
          </div>

          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs leading-5 text-slate-600">
            <p><span className="font-semibold">Filtros aplicados:</span> {filtrosAplicados}</p>
            {generado && <p>Consulta actualizada: {generado.toLocaleString("es-PE", { timeZone: "America/Lima" })} · {paginacion.total} resultados</p>}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-3 print:hidden">
            <label className="w-full text-xs font-semibold text-slate-500 sm:max-w-xs">Buscar en esta página
              <input type="search" value={busquedaResultado} onChange={event => setBusquedaResultado(event.target.value)}
                placeholder="Código, ubicación, contacto…" className="aa-input mt-1 w-full" />
            </label>
            <div className="flex flex-wrap gap-2" aria-busy={!!exportando}>
              <button type="button" onClick={() => void descargar("pdf")} disabled={cargando || !!exportando || !rows.length || !columnasElegidas.length} className="aa-button aa-button-secondary disabled:opacity-40">{exportando === "pdf" ? "Preparando PDF…" : "Descargar PDF"}</button>
              <button type="button" onClick={() => void descargar("excel")} disabled={cargando || !!exportando || !rows.length || !columnasElegidas.length} className="aa-button aa-button-primary disabled:opacity-40">{exportando === "excel" ? "Preparando Excel…" : "Descargar Excel"}</button>
            </div>
            {busquedaResultado && <p role="status" className="w-full text-xs text-slate-500">{filasVisibles.length} coincidencias de {rows.length} filas de esta página. Las descargas conservan todos los resultados de los filtros aplicados.</p>}
          </div>
          {!!rows.length && !cargando && (
            <details className="border-b border-slate-200 print:hidden">
            <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-700">Columnas del reporte · {columnasElegidas.length} seleccionadas</summary>
            <fieldset disabled={!!exportando} className="border-b border-slate-200 px-5 py-4 print:hidden">
              <legend className="float-left mb-2 w-full text-sm font-bold text-slate-900">Columnas del reporte</legend>
              <p className="clear-both text-xs leading-5 text-slate-500">Marca las columnas que quieres ver y descargar en PDF o Excel.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => seleccionarColumnas(recomendadas)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Recomendadas</button>
                <button type="button" onClick={() => seleccionarColumnas(columnas)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Seleccionar todas</button>
                <button type="button" onClick={() => seleccionarColumnas([])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Desmarcar todas</button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {columnas.map(key => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={columnasElegidas.includes(key)} onChange={event => seleccionarColumnas(event.target.checked ? [...elegidas, key] : elegidas.filter(column => column !== key))} className="h-4 w-4 accent-[#c80000]" />
                    {etiqueta[key] ?? key}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600" role="status">
                {columnasElegidas.length ? `${columnasElegidas.length} de ${columnas.length} columnas · PDF ${orientacionPDF}. Todas las columnas elegidas van en el ancho de la página; las filas continúan en otras hojas si hace falta.` : "Selecciona al menos una columna para ver y descargar el reporte."}
              </p>
              {columnasElegidas.length > 10 && <p className="mt-1 text-xs text-amber-700">Con muchas columnas, el texto puede quedar estrecho. Selecciona las necesarias para facilitar la lectura.</p>}

            </fieldset>
            </details>
          )}
          <nav aria-label="Páginas del reporte" className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><p className="text-sm text-slate-600">{paginacion.total} resultados · Página {paginacion.pagina} de {Math.max(1,paginacion.paginas)}</p><div className="flex gap-3">{[-1,1].map(direction=><button key={direction} type="button" disabled={cargando||direction===-1&&paginacion.pagina<=1||direction===1&&paginacion.pagina>=paginacion.paginas} className="aa-button aa-button-secondary disabled:opacity-40" onClick={()=>{setCargando(true);setConsulta(current=>({...current,pagina:String(paginacion.pagina+direction)}));}}>{direction===-1?'Anterior':'Siguiente'}</button>)}</div></nav>
          <div className="max-h-[65vh] overflow-auto print:max-h-none" aria-busy={cargando}>
            {filasVisibles.length && columnasElegidas.length ? (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    {columnasElegidas.map(
                      (key) => (
                        <th
                          key={key}
                          className="px-4 py-3 whitespace-nowrap"
                          aria-sort={orden?.key === key ? (orden.asc ? "ascending" : "descending") : "none"}
                        >
                          <button type="button" className="flex min-h-8 items-center gap-2 text-left hover:text-[#c80000]" onClick={() => setOrden(current => ({ key, asc: current?.key === key ? !current.asc : true }))}>
                            {etiqueta[key] || key}<span aria-hidden="true">{orden?.key === key ? (orden.asc ? "↑" : "↓") : "↕"}</span>
                          </button>
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filasVisibles.map(
                    (
                      row,
                      index,
                    ) => (
                      <tr
                        key={`${row.codigo || row.posicion || index}-${index}`}
                        className="bg-white transition hover:bg-red-50/40"
                      >
                        {columnasElegidas.map(
                          (key) => (
                            <td
                              key={key}
                              className="px-4 py-3 text-xs text-slate-600"
                            >
                              {key === "nombre" && typeof row.propietario === "string" ? <div className="min-w-48 max-w-md"><p className="break-words font-semibold text-slate-900">{row.inmuebleId?<Link className="underline-offset-2 hover:underline" href={`/datos-inmuebles?codigo=${row.inmuebleId}&zona=${encodeURIComponent(String(row.zona||"*"))}`}>{row.propietario||"Sin contacto"}</Link>:row.propietario||"Sin contacto"}</p><p className="mt-1 break-words leading-5 text-slate-500"><PropertySummary operation={String(row.operacion || "venta")} type={String(row.tipo || "Tipo por completar")} location={typeof row.ubicacion === "string" ? row.ubicacion : null} /></p></div> : reportText(key, reportCellValue(key, row))}
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <p className="font-semibold text-slate-700">
                  {cargando
                    ? "Generando reporte…"
                    : rows.length && !filasVisibles.length ? "No hay coincidencias en esta página" : rows.length ? "Selecciona las columnas del reporte" : "No hay registros para esta consulta"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {rows.length && !filasVisibles.length ? "Cambia o borra el texto de búsqueda para ver las filas." : rows.length ? "Marca al menos una columna en las opciones de arriba." : "Prueba con otros filtros o selecciona otro reporte."}
                </p>
              </div>
            )}
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
