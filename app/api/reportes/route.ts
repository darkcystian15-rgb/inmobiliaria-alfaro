import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmLiberaciones,
  inmPosiciones,
  inmPropietarios,
  inmPublicaciones,
  inmTasaciones,
  inmTimeline,
  inmVisitas,
} from "@/db/schema";

const etapaMap: Record<string, string> = {
  visita_pendiente: "Visita pendiente",
  tasacion_pendiente: "Tasación pendiente",
  pendiente_aprobacion: "Pendiente de aprobación",
  en_negociacion: "En negociación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  tasacion_rechazada: "Tasación rechazada",
  texto_pendiente: "Texto pendiente",
  listo_para_publicar: "Listo para publicar",
  publicado: "Publicado",
  liberado: "Liberado",
};

const tipoMap: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  local: "Local",
  oficina: "Oficina",
  otros: "Otros",
};

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function daysBetween(a?: Date | string | null, b?: Date | string | null) {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(diff)) return null;
  return Math.max(0, Math.round(diff / 86400000));
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const reporte = sp.get("reporte") || "Cartera activa";
    const desde = sp.get("desde") || "";
    const hasta = sp.get("hasta") || "";
    const etapa = sp.get("etapa") || "Todas";
    const estado = sp.get("estado") || "Todos";
    const posicion = sp.get("posicion") || "";
    const tipo = sp.get("tipo") || "Todos";

    const inmuebleRows = await db
      .select({
        id: inmInmuebles.id,
        codigo: inmInmuebles.codigo,
        referencia: inmInmuebles.referencia,
        tipo: inmInmuebles.tipo,
        estado: inmInmuebles.estado,
        etapa: inmInmuebles.etapa,
        fechaRegistro: inmInmuebles.fechaRegistro,
        fechaSalida: inmInmuebles.fechaSalida,
        distrito: inmInmuebles.distrito,
        provincia: inmInmuebles.provincia,
        departamento: inmInmuebles.departamento,
        propietario: inmPropietarios.nombres,
        propietarioApellidos: inmPropietarios.apellidos,
      })
      .from(inmInmuebles)
      .leftJoin(inmPropietarios, eq(inmPropietarios.id, inmInmuebles.propietarioId))
      .orderBy(asc(inmInmuebles.fechaRegistro));

    const positionRows = await db
      .select({
        inmuebleId: inmAsignacionesPosicion.inmuebleId,
        posicion: inmPosiciones.numero,
        activa: inmAsignacionesPosicion.activa,
        fechaInicio: inmAsignacionesPosicion.fechaInicio,
        fechaFin: inmAsignacionesPosicion.fechaFin,
      })
      .from(inmAsignacionesPosicion)
      .leftJoin(inmPosiciones, eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId))
      .orderBy(asc(inmAsignacionesPosicion.fechaInicio));

    const visitas = await db.select().from(inmVisitas).orderBy(asc(inmVisitas.fechaRegistro));
    const tasaciones = await db.select().from(inmTasaciones).orderBy(asc(inmTasaciones.fechaRegistro));
    const publicaciones = await db.select().from(inmPublicaciones).orderBy(asc(inmPublicaciones.fechaRegistro));
    const liberaciones = await db.select().from(inmLiberaciones).orderBy(asc(inmLiberaciones.fechaRegistro));
    const timeline = await db.select().from(inmTimeline).orderBy(asc(inmTimeline.fechaEvento));

    const posByInmueble = new Map<number, typeof positionRows>();
    for (const p of positionRows) {
      const arr = posByInmueble.get(p.inmuebleId) || [];
      arr.push(p);
      posByInmueble.set(p.inmuebleId, arr);
    }
    const visitaByInmueble = new Map(visitas.map(v => [v.inmuebleId, v]));
    const tasacionByInmueble = new Map(tasaciones.map(t => [t.inmuebleId, t]));
    const publicacionByInmueble = new Map(publicaciones.map(p => [p.inmuebleId, p]));
    const liberacionByInmueble = new Map(liberaciones.map(l => [l.inmuebleId, l]));
    const timelineByInmueble = new Map<number, typeof timeline>();
    for (const event of timeline) {
      const arr = timelineByInmueble.get(event.inmuebleId) || [];
      arr.push(event);
      timelineByInmueble.set(event.inmuebleId, arr);
    }

    const base = inmuebleRows.map(x => {
      const activePosition = posByInmueble.get(x.id)?.find(p => p.activa);
      const tas = tasacionByInmueble.get(x.id);
      const pub = publicacionByInmueble.get(x.id);
      const lib = liberacionByInmueble.get(x.id);
      const item = {
        inmuebleId: x.id,
        codigo: x.codigo,
        nombre: x.referencia,
        tipo: tipoMap[x.tipo?.toLowerCase()] ?? x.tipo,
        ubicacion: [x.distrito, x.provincia, x.departamento].filter(Boolean).join(", ") || "Sin ubicación",
        propietario: [x.propietario, x.propietarioApellidos].filter(Boolean).join(" ") || "Sin propietario",
        posicion: activePosition?.posicion ?? posByInmueble.get(x.id)?.at(-1)?.posicion ?? null,
        estado: x.estado?.toLowerCase() === "activo" ? "Activo" : "Histórico",
        etapa: etapaMap[x.etapa?.toLowerCase()] ?? x.etapa,
        fechaRegistro: fmtDate(x.fechaRegistro),
        fechaSalida: fmtDate(x.fechaSalida),
        fechaVisita: fmtDate(visitaByInmueble.get(x.id)?.fechaCompletada ?? visitaByInmueble.get(x.id)?.fechaVisita),
        tasacion: tas ? Number(tas.precioObjetivo ?? tas.valorReferencia ?? 0) : null,
        situacionTasacion: tas?.situacion ?? null,
        publicacionRegistrada: Boolean(pub),
        publicado: Boolean(pub?.publicado),
        motivoLiberacion: lib?.motivo ?? null,
        detalleLiberacion: lib?.detalleOtro ?? null,
      };
      return item;
    });

    const filtered = base.filter(x => {
      const fecha = x.fechaRegistro ? new Date(x.fechaRegistro) : null;
      if (desde && (!fecha || fecha < new Date(`${desde}T00:00:00`))) return false;
      if (hasta && (!fecha || fecha > new Date(`${hasta}T23:59:59`))) return false;
      if (etapa !== "Todas" && x.etapa !== etapa && !(etapa === "Aprobación / negociación" && ["Pendiente de aprobación", "En negociación"].includes(x.etapa))) return false;
      if (estado !== "Todos") {
        const ok = estado === x.estado
          || (estado === "En negociación" && x.etapa === "En negociación")
          || (estado === "Aprobado" && x.etapa === "Aprobado")
          || (estado === "Rechazado" && ["Rechazado", "Tasación rechazada"].includes(x.etapa));
        if (!ok) return false;
      }
      if (posicion && String(x.posicion) !== posicion.replace(/^0+/, "")) return false;
      if (tipo !== "Todos" && x.tipo !== tipo) return false;
      return true;
    });

    const active = filtered.filter(x => x.estado === "Activo");
    let rows: any[] = filtered;

    if (reporte === "Posiciones disponibles") {
      const occupied = new Set(base.filter(x => x.estado === "Activo" && x.posicion).map(x => x.posicion));
      rows = Array.from({ length: 90 }, (_, i) => i + 1)
        .filter(n => !occupied.has(n))
        .map(n => ({ posicion: n, estado: "Disponible" }));
    } else if (reporte === "Visitas realizadas") {
      rows = filtered.filter(x => Boolean(x.fechaVisita)).map(x => ({ ...x, fechaVisita: x.fechaVisita }));
    } else if (reporte === "Tasaciones realizadas") {
      rows = filtered.filter(x => x.tasacion !== null);
    } else if (reporte === "Aprobaciones y negociación") {
      rows = filtered.filter(x => ["Pendiente de aprobación", "En negociación", "Aprobado", "Rechazado", "Tasación rechazada"].includes(x.etapa));
    } else if (reporte === "Textos pendientes") {
      rows = filtered.filter(x => x.etapa === "Aprobado" && !x.publicacionRegistrada);
    } else if (reporte === "Listos para publicar") {
      rows = filtered.filter(x => x.etapa === "Listo para publicar" && !x.publicado);
    } else if (reporte === "Publicados") {
      rows = filtered.filter(x => x.publicado);
    } else if (reporte === "Vendidos") {
      rows = filtered.filter(x => x.motivoLiberacion === "vendido");
    } else if (reporte === "Retirados / cancelados") {
      rows = filtered.filter(x => ["cancelacion_propietario", "cancelacion_externa", "otro"].includes(x.motivoLiberacion || ""));
    } else if (reporte === "Motivos de liberación") {
      rows = filtered.filter(x => Boolean(x.motivoLiberacion));
    } else if (reporte === "Tiempo de permanencia") {
      rows = filtered.map(x => ({ ...x, dias: daysBetween(x.fechaRegistro, x.fechaSalida) ?? daysBetween(x.fechaRegistro, new Date()) }));
    } else if (reporte === "Posición ocupada") {
      rows = positionRows.map(p => {
        const x = base.find(i => i.inmuebleId === p.inmuebleId);
        return x ? { ...x, posicion: p.posicion, fechaInicioPosicion: fmtDate(p.fechaInicio), fechaFinPosicion: fmtDate(p.fechaFin), activaPosicion: p.activa } : null;
      }).filter(Boolean);
    } else if (reporte.includes("→")) {
      const events = timelineByInmueble;
      const targetMap: Record<string, [string, string]> = {
        "Registro → visita": ["inmueble_registrado", "visita_realizada"],
        "Visita → tasación": ["visita_realizada", "tasacion_realizada"],
        "Tasación → aprobación": ["tasacion_realizada", "tasacion_actualizada"],
        "Aprobación → publicación": ["tasacion_actualizada", "publicacion_registrada"],
      };
      const [from, to] = targetMap[reporte] || ["", ""];
      rows = filtered.map(x => {
        const ev = events.get(x.inmuebleId) || [];
        const a = ev.find(e => e.evento === from)?.fechaEvento;
        const b = ev.find(e => e.evento === to)?.fechaEvento;
        return { ...x, fechaInicioFlujo: fmtDate(a), fechaFinFlujo: fmtDate(b), dias: daysBetween(a, b) };
      }).filter((x: any) => x.fechaInicioFlujo);
    } else if (reporte === "Histórico de inmuebles") {
      rows = filtered.filter(x => x.estado === "Histórico");
    } else if (reporte === "Inmuebles por estado") {
      rows = filtered;
    } else if (reporte === "Inmuebles por etapa") {
      rows = filtered;
    } else if (reporte === "Cartera activa") {
      rows = active;
    }

    const resumen = {
      total: rows.length,
      activos: base.filter(x => x.estado === "Activo").length,
      historicos: base.filter(x => x.estado === "Histórico").length,
      disponibles: Math.max(0, 90 - base.filter(x => x.estado === "Activo").filter(x => x.posicion).length),
      visitasPendientes: base.filter(x => x.estado === "Activo" && x.etapa === "Visita pendiente").length,
      tasacionesPendientes: base.filter(x => x.estado === "Activo" && x.etapa === "Tasación pendiente").length,
      aprobaciones: base.filter(x => x.estado === "Activo" && x.etapa === "Pendiente de aprobación").length,
      negociaciones: base.filter(x => x.estado === "Activo" && x.etapa === "En negociación").length,
      listosParaPublicar: base.filter(x => x.estado === "Activo" && x.etapa === "Listo para publicar").length,
      publicados: base.filter(x => x.estado === "Activo" && x.publicado).length,
    };

    return NextResponse.json({ ok: true, reporte, resumen, rows });
  } catch (error) {
    console.error("Error en reportes:", error);
    return NextResponse.json({ ok: false, error: "No se pudo generar el reporte." }, { status: 500 });
  }
}
