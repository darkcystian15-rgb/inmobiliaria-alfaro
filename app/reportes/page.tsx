"use client";

import { useEffect, useMemo, useState } from "react";

type Reporte = { nombre: string; descripcion: string; categoria: string; icono: string };
type Row = Record<string, any>;

const reportes: Reporte[] = [
  { nombre: "Cartera activa", descripcion: "Inmuebles actualmente ocupando posiciones 01–90.", categoria: "Cartera", icono: "⌂" },
  { nombre: "Posiciones disponibles", descripcion: "Posiciones libres para nuevos registros.", categoria: "Cartera", icono: "▦" },
  { nombre: "Inmuebles por etapa", descripcion: "Distribución y detalle del avance del flujo comercial.", categoria: "Cartera", icono: "◫" },
  { nombre: "Inmuebles por estado", descripcion: "Situación actual de los registros activos e históricos.", categoria: "Cartera", icono: "✓" },
  { nombre: "Visitas realizadas", descripcion: "Visitas efectivamente completadas y registradas.", categoria: "Gestión", icono: "◉" },
  { nombre: "Tasaciones realizadas", descripcion: "Tasaciones vigentes registradas en el sistema.", categoria: "Gestión", icono: "⌁" },
  { nombre: "Aprobaciones y negociación", descripcion: "Pendientes, aprobados, rechazados y negociaciones.", categoria: "Gestión", icono: "◇" },
  { nombre: "Textos pendientes", descripcion: "Inmuebles aprobados que aún requieren texto.", categoria: "Gestión", icono: "≡" },
  { nombre: "Listos para publicar", descripcion: "Textos registrados y listos para publicación.", categoria: "Gestión", icono: "↗" },
  { nombre: "Publicados", descripcion: "Inmuebles cuya publicación ya fue registrada.", categoria: "Gestión", icono: "●" },
  { nombre: "Vendidos", descripcion: "Inmuebles liberados por venta.", categoria: "Salidas", icono: "✓" },
  { nombre: "Retirados / cancelados", descripcion: "Salidas por cancelación u otros motivos.", categoria: "Salidas", icono: "↩" },
  { nombre: "Motivos de liberación", descripcion: "Detalle de las causas de salida de cartera.", categoria: "Salidas", icono: "!" },
  { nombre: "Histórico de inmuebles", descripcion: "Registros que ya no están activos.", categoria: "Histórico", icono: "◷" },
  { nombre: "Tiempo de permanencia", descripcion: "Días desde el registro hasta la salida o actualidad.", categoria: "Histórico", icono: "◌" },
  { nombre: "Posición ocupada", descripcion: "Historial de uso de cada posición reutilizable.", categoria: "Histórico", icono: "01" },
  { nombre: "Registro → visita", descripcion: "Tiempo desde el alta hasta la visita.", categoria: "Flujo", icono: "→" },
  { nombre: "Visita → tasación", descripcion: "Tiempo entre visita y tasación.", categoria: "Flujo", icono: "→" },
  { nombre: "Tasación → aprobación", descripcion: "Seguimiento entre tasación y decisión.", categoria: "Flujo", icono: "→" },
  { nombre: "Aprobación → publicación", descripcion: "Tiempo desde aprobación hasta publicación.", categoria: "Flujo", icono: "→" },
];

const grupos = ["Todos", "Cartera", "Gestión", "Salidas", "Histórico", "Flujo"];
const tone: Record<string, string> = {
  Cartera: "bg-blue-100 text-blue-700",
  Gestión: "bg-violet-100 text-violet-700",
  Salidas: "bg-rose-100 text-rose-700",
  Histórico: "bg-slate-100 text-slate-700",
  Flujo: "bg-cyan-100 text-cyan-700",
};

function fecha(value: any) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE");
}

function exportarCSV(rows: Row[], reporte: string) {
  if (!rows.length) return;
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r)))).filter(k => !["inmuebleId"].includes(k));
  const csv = [keys.join(";"), ...rows.map(r => keys.map(k => {
    const value = r[k] ?? "";
    return '"' + String(value).replace(/"/g, '""') + '"';
  }).join(";"))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-${reporte.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const [categoria, setCategoria] = useState("Todos");
  const [seleccionado, setSeleccionado] = useState("Cartera activa");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [etapa, setEtapa] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [posicion, setPosicion] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [rows, setRows] = useState<Row[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const visibles = useMemo(() => reportes.filter(r => categoria === "Todos" || r.categoria === categoria), [categoria]);
  const reporteInfo = reportes.find(r => r.nombre === seleccionado)!;

  async function cargar() {
    setCargando(true); setError("");
    try {
      const params = new URLSearchParams({ reporte: seleccionado, desde: fechaDesde, hasta: fechaHasta, etapa, estado, posicion, tipo });
      const response = await fetch(`/api/reportes?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo generar el reporte.");
      setRows(data.rows ?? []);
      setResumen(data.resumen ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
      setRows([]);
    } finally { setCargando(false); }
  }

  useEffect(() => { cargar(); }, [seleccionado]);

  const limpiar = () => {
    setFechaDesde(""); setFechaHasta(""); setEtapa("Todas"); setEstado("Todos"); setPosicion(""); setTipo("Todos");
  };

  const columnas = useMemo(() => {
    if (!rows.length) return [];
    const preferred = ["codigo", "posicion", "nombre", "propietario", "ubicacion", "tipo", "estado", "etapa", "fechaRegistro", "fechaVisita", "tasacion", "situacionTasacion", "motivoLiberacion", "dias", "fechaInicioPosicion", "fechaFinPosicion", "fechaInicioFlujo", "fechaFinFlujo"];
    return preferred.filter(k => rows.some(r => r[k] !== undefined));
  }, [rows]);

  const etiqueta: Record<string,string> = {
    codigo:"Código", posicion:"Pos.", nombre:"Inmueble", propietario:"Propietario", ubicacion:"Ubicación", tipo:"Tipo",
    estado:"Estado", etapa:"Etapa", fechaRegistro:"Registro", fechaVisita:"Visita", tasacion:"Precio objetivo",
    situacionTasacion:"Situación tasación", motivoLiberacion:"Motivo", dias:"Días", fechaInicioPosicion:"Inicio posición",
    fechaFinPosicion:"Fin posición", fechaInicioFlujo:"Inicio", fechaFinFlujo:"Fin",
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl print:max-w-none">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between print:mb-4">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl text-indigo-600">▥</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">Fase 1 · Información</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Reportes</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Consulta datos reales de la cartera, gestión, salidas, histórico y tiempos del flujo.</p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300">Imprimir / PDF</button>
            <button onClick={() => exportarCSV(rows, seleccionado)} disabled={!rows.length} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Exportar Excel/CSV</button>
          </div>
        </header>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)] print:hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="text-base font-bold text-slate-900">Filtros</h2><p className="mt-1 text-sm text-slate-500">Los filtros se aplican directamente sobre los datos de la base de datos.</p></div>
            <div className="flex gap-2">
              <button onClick={cargar} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Aplicar filtros</button>
              <button onClick={() => { limpiar(); setTimeout(cargar, 0); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300">Limpiar</button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-semibold text-slate-500">Desde<input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
            <label className="text-xs font-semibold text-slate-500">Hasta<input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
            <label className="text-xs font-semibold text-slate-500">Etapa<select value={etapa} onChange={e => setEtapa(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Todas</option><option>Visita pendiente</option><option>Tasación pendiente</option><option>Aprobación / negociación</option><option>Aprobado</option><option>Rechazado</option><option>Listo para publicar</option><option>Publicado</option></select></label>
            <label className="text-xs font-semibold text-slate-500">Estado<select value={estado} onChange={e => setEstado(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Todos</option><option>Activo</option><option>Histórico</option><option>En negociación</option><option>Aprobado</option><option>Rechazado</option></select></label>
            <label className="text-xs font-semibold text-slate-500">Posición<input value={posicion} onChange={e => setPosicion(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="01–90" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
            <label className="text-xs font-semibold text-slate-500">Tipo<select value={tipo} onChange={e => setTipo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Todos</option><option>Casa</option><option>Departamento</option><option>Terreno</option><option>Local</option><option>Oficina</option><option>Otros</option></select></label>
          </div>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

        {resumen && <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {[
            ["Resultado", resumen.total], ["Activos", resumen.activos], ["Históricos", resumen.historicos], ["Disponibles", resumen.disponibles],
            ["Visitas", resumen.visitasPendientes], ["Tasaciones", resumen.tasacionesPendientes], ["Listos", resumen.listosParaPublicar], ["Publicados", resumen.publicados],
          ].map(([t,v]) => <div key={String(t)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.045)]"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t}</p><p className="mt-2 text-2xl font-bold text-slate-950">{v}</p></div>)}
        </section>}

        <section className="mt-7 print:hidden">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="text-base font-bold text-slate-900">Reportes disponibles</h2><p className="mt-1 text-sm text-slate-500">Selecciona el informe que quieres consultar.</p></div>
            <div className="flex flex-wrap gap-2">{grupos.map(g => <button key={g} onClick={() => setCategoria(g)} className={`rounded-full px-3.5 py-2 text-xs font-bold ${categoria === g ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"}`}>{g}</button>)}</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibles.map(r => <button key={r.nombre} onClick={() => setSeleccionado(r.nombre)} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${seleccionado === r.nombre ? "border-indigo-300 ring-2 ring-indigo-50" : "border-slate-200"}`}>
              <div className="flex gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${tone[r.categoria]}`}>{r.icono}</span><div><p className="text-sm font-bold text-slate-900">{r.nombre}</p><p className="mt-1 text-xs leading-5 text-slate-500">{r.descripcion}</p></div></div>
            </button>)}
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)] print:mt-0 print:border-0 print:shadow-none">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-500">{reporteInfo.categoria}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{seleccionado}</h2><p className="mt-1 text-xs text-slate-500">{reporteInfo.descripcion}</p></div>
            {cargando && <span className="text-xs font-semibold text-slate-400">Consultando…</span>}
          </div>
          <div className="overflow-x-auto">
            {rows.length ? <table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr>{columnas.map(k => <th key={k} className="px-4 py-3">{etiqueta[k] || k}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row,i) => <tr key={`${row.codigo || row.posicion || i}-${i}`} className="hover:bg-slate-50 hover:border-slate-300">{columnas.map(k => <td key={k} className="px-4 py-3 text-xs text-slate-600">{k.toLowerCase().includes("fecha") || k === "fechaVisita" || k === "fechaInicioFlujo" || k === "fechaFinFlujo" || k === "fechaInicioPosicion" || k === "fechaFinPosicion" ? fecha(row[k]) : row[k] === null || row[k] === undefined || row[k] === "" ? "—" : String(row[k])}</td>)}</tr>)}</tbody></table> :
            <div className="p-12 text-center"><p className="font-semibold text-slate-700">{cargando ? "Generando reporte…" : "No hay registros para esta consulta"}</p><p className="mt-1 text-sm text-slate-400">Prueba con otros filtros o selecciona otro reporte.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
