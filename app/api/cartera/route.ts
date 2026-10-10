import { isDemoProperty } from '@/lib/demo-data';
import { publicationReadiness } from "@/lib/publication-readiness";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmArchivos,
  inmAsignacionesPosicion,
  inmInmuebles,
  inmNegociaciones,
  inmPosiciones,
  inmPropietarios,
  inmPublicaciones,
  inmTasaciones,
  inmVisitas,
} from "@/db/schema";

const tipoMap: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  local: "Local",
  oficina: "Oficina",
  otros: "Otros",
};

export async function GET() {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    /*
     * 1. Inmuebles
     *
     * La cartera se determina por estado, no por etapa.
     * Un inmueble puede estar activo aunque tenga actividades
     * pendientes o todavía no tenga propietario registrado.
     */
    const inmuebles = await db
      .select({
        id: inmInmuebles.id,
        datosPrueba: isDemoProperty,
        codigo: inmInmuebles.codigo,
        propietarioId: inmInmuebles.propietarioId,
        tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
        referencia: inmInmuebles.referencia,
        direccion: inmInmuebles.direccion,
        numeroDireccion: inmInmuebles.numeroDireccion,
        latitud: inmInmuebles.latitud,
        longitud: inmInmuebles.longitud,
        distrito: inmInmuebles.distrito,
        provincia: inmInmuebles.provincia,
        departamento: inmInmuebles.departamento,
        estado: inmInmuebles.estado,
        fechaRegistro: inmInmuebles.fechaRegistro,
        fechaSalida: inmInmuebles.fechaSalida,
        posicion: inmPosiciones.numero,
        propietarioNombres: inmPropietarios.nombres,
        propietarioApellidos: inmPropietarios.apellidos,
      })
      .from(inmInmuebles)
      .leftJoin(
        inmPropietarios,
        eq(inmPropietarios.id, inmInmuebles.propietarioId)
      )
      .leftJoin(
        inmAsignacionesPosicion,
        and(
          eq(inmAsignacionesPosicion.inmuebleId, inmInmuebles.id),
          eq(inmAsignacionesPosicion.activa, true)
        )
      )
      .leftJoin(
        inmPosiciones,
        eq(inmPosiciones.id, inmAsignacionesPosicion.posicionId)
      )
      .orderBy(sql`${inmPosiciones.numero} IS NULL`,asc(inmPosiciones.numero),asc(inmInmuebles.id));

    const positionAvailability = await db.select({ numero: inmPosiciones.numero, assigned: inmAsignacionesPosicion.id })
      .from(inmPosiciones).leftJoin(inmAsignacionesPosicion, and(
        eq(inmAsignacionesPosicion.posicionId, inmPosiciones.id), eq(inmAsignacionesPosicion.activa, true),
      )).where(eq(inmPosiciones.activo, true));
    const capacidad = new Set(positionAvailability.map(position => position.numero)).size;
    const disponibles = positionAvailability.filter(position => position.assigned == null).length;

    if (inmuebles.length === 0) {
      return NextResponse.json({
        inmuebles: [],
        resumen: {
          enCartera: 0,
          disponibles,
          visitasPendientes: 0,
          tasacionesPendientes: 0,
          materialPendiente: 0,
          negociaciones: 0,
          capacidad,
        },
      });
    }

    const inmuebleIds = inmuebles.map((x) => x.id);

    /*
     * 2. Visitas
     *
     * No usamos inm_inmuebles.etapa.
     * Se determina directamente desde las visitas registradas.
     */
    const visitas = await db
      .select({
        inmuebleId: inmVisitas.inmuebleId,
        completada: inmVisitas.completada,
        fechaVisita: inmVisitas.fechaVisita,
        fechaCompletada: inmVisitas.fechaCompletada,
      })
      .from(inmVisitas)
      .where(and(inArray(inmVisitas.inmuebleId, inmuebleIds), eq(inmVisitas.completada, true)))
      .orderBy(desc(inmVisitas.fechaRegistro));

    /*
     * 3. Tasaciones
     */
    const tasaciones = await db
      .select({
        inmuebleId: inmTasaciones.inmuebleId,
        situacion: inmTasaciones.situacion,
        fechaTasacion: inmTasaciones.fechaTasacion,
        precioVenta: inmTasaciones.precioVenta,
      })
      .from(inmTasaciones)
      .where(inArray(inmTasaciones.inmuebleId, inmuebleIds))
      .orderBy(desc(inmTasaciones.fechaActualizacion));

    /*
     * 4. Negociaciones
     */
    const negociaciones = await db
      .select({
        inmuebleId: inmNegociaciones.inmuebleId,
        estado: inmNegociaciones.estado,
        fechaInicio: inmNegociaciones.fechaInicio,
        fechaFin: inmNegociaciones.fechaFin,
      })
      .from(inmNegociaciones)
      .where(inArray(inmNegociaciones.inmuebleId, inmuebleIds))
      .orderBy(desc(inmNegociaciones.fechaInicio));

    /*
     * 5. Archivos/material
     */
    const archivos = await db
      .select({
        inmuebleId: inmArchivos.inmuebleId,
        tipoDocumento: inmArchivos.tipoDocumento,
        tipoMime: inmArchivos.tipoMime,
        almacenamiento: inmArchivos.almacenamiento,
      })
      .from(inmArchivos)
      .where(inArray(inmArchivos.inmuebleId, inmuebleIds));

    /*
     * 6. Publicación/texto
     *
     * La publicación es independiente de la negociación.
     */
    const publicaciones = await db
      .select({
        inmuebleId: inmPublicaciones.inmuebleId,
        texto: inmPublicaciones.texto,
        publicado: inmPublicaciones.publicado,
        fechaPublicacion: inmPublicaciones.fechaPublicacion,
      })
      .from(inmPublicaciones)
      .where(inArray(inmPublicaciones.inmuebleId, inmuebleIds));

    /*
     * Construimos mapas para evitar multiplicar registros
     * por los múltiples JOIN de actividades.
     */

    const visitasPorInmueble = new Map<
      number,
      {
        pendiente: boolean;
        realizada: boolean;
        fechaVisita: Date | string | null;
      }
    >();

    for (const visita of visitas) {
      // La consulta está ordenada por fechaRegistro DESC,
      // por lo que la primera visita de cada inmueble es la más reciente.
      if (visitasPorInmueble.has(visita.inmuebleId)) {
        continue;
      }

      visitasPorInmueble.set(visita.inmuebleId, {
        pendiente: !visita.completada,
        realizada: visita.completada,
        fechaVisita: visita.fechaVisita,
      });
    }

    const tasacionPorInmueble = new Map<
      number,
      {
        existe: boolean;
        situacion: string | null;
        fechaTasacion: Date | string | null;
        precioVenta: string | null;
      }
    >();

    for (const tasacion of tasaciones) {
      if (!tasacionPorInmueble.has(tasacion.inmuebleId)) {
        tasacionPorInmueble.set(tasacion.inmuebleId, {
          existe: true,
          situacion: tasacion.situacion,
          fechaTasacion: tasacion.fechaTasacion,
          precioVenta: tasacion.precioVenta,
        });
      }
    }

    const negociacionPorInmueble = new Map<
      number,
      {
        enCurso: boolean;
        estado: string | null;
      }
    >();

    for (const negociacion of negociaciones) {
      const actual = negociacionPorInmueble.get(negociacion.inmuebleId);

      if (!actual) {
        negociacionPorInmueble.set(negociacion.inmuebleId, {
          enCurso: negociacion.estado === "en_curso",
          estado: negociacion.estado,
        });
        continue;
      }

      if (negociacion.estado === "en_curso") {
        actual.enCurso = true;
        actual.estado = "en_curso";
      }
    }

    const fotosPorInmueble = new Set<number>();

    for (const archivo of archivos) {
      if (archivo.tipoDocumento === 'FOTO_INMUEBLE' && archivo.almacenamiento === 'hosting' && archivo.tipoMime?.startsWith('image/')) {
        fotosPorInmueble.add(archivo.inmuebleId);
      }
    }

    const publicacionPorInmueble = new Map<
      number,
      {
        tieneTexto: boolean;
        publicado: boolean;
        fechaPublicacion: Date | null;
      }
    >();

    for (const publicacion of publicaciones) {
      publicacionPorInmueble.set(publicacion.inmuebleId, {
        tieneTexto: Boolean(publicacion.texto?.trim()),
        publicado: publicacion.publicado,
        fechaPublicacion: publicacion.fechaPublicacion,
      });
    }

    /*
     * 7. Transformamos cada inmueble a indicadores independientes.
     */
    const expedientes = await publicationReadiness();
    const resultado = inmuebles.map((row) => {
      const visita = visitasPorInmueble.get(row.id);
      const tasacion = tasacionPorInmueble.get(row.id);
      const negociacion = negociacionPorInmueble.get(row.id);
      const publicacion = publicacionPorInmueble.get(row.id);

 const visitaPendiente = row.posicion != null && (visita?.pendiente ?? true);
const visitaRealizada =
  visita?.realizada ?? false;

const tasacionPendiente = row.posicion != null && visitaRealizada && !tasacion?.existe;

const materialHabilitado = tasacion?.situacion === "aprobado";

const fotosPendientes =
  materialHabilitado && !expedientes.get(row.id)?.fotosVisita;

const textoPendiente =
  materialHabilitado && !publicacion?.tieneTexto;

const materialPendiente =
  materialHabilitado && !expedientes.get(row.id)?.complete;

      const estadoNormalizado = row.estado?.toLowerCase() ?? "";

      return {
        id: row.codigo,
        inmuebleId: row.id,
        datosPrueba: Boolean(row.datosPrueba),

        posicion: row.posicion ?? undefined,

        tipo:
          tipoMap[row.tipo?.toLowerCase()] ??
          row.tipo,

        nombre: row.referencia,

        ubicacion:
          [[row.direccion,row.numeroDireccion].filter(Boolean).join(" "), row.distrito, row.provincia, row.departamento]
            .filter(Boolean)
            .join(", ") || "Sin ubicación registrada",

        distrito: row.distrito?.trim() || null,
        zona: [row.distrito, row.provincia, row.departamento].filter(Boolean).join(", "),
        operacion: row.operacion,
        direccion: [row.direccion,row.numeroDireccion].filter(Boolean).join(" ") || null,
        latitud: row.latitud ?? null,
        longitud: row.longitud ?? null,
        precioVenta: tasacion?.precioVenta ?? null,

        estado:
          estadoNormalizado === "activo"
            ? "Activo"
            : "Histórico",

        propietario:
          [row.propietarioNombres, row.propietarioApellidos]
            .filter(Boolean)
            .join(" ") || "Sin propietario",

        actividades: {
          visita: {
            estado: visitaPendiente
              ? "pendiente"
              : visitaRealizada
                ? "realizada"
                : "pendiente",
            pendiente: visitaPendiente,
            realizada: visitaRealizada,
            fecha: visita?.fechaVisita ?? null,
          },

        tasacion: {
  estado: !visitaRealizada
    ? "Aún no corresponde"
    : tasacionPendiente
      ? "pendiente"
      : tasacion?.situacion ?? "registrada",
  pendiente: tasacionPendiente,
            situacion: tasacion?.situacion ?? null,
            fecha: tasacion?.fechaTasacion ?? null,
          },

          material: {
            pendiente: materialPendiente,
            fotosPendientes,
            textoPendiente,
          },

          negociacion: {
            estado: negociacion?.estado ?? "sin_negociacion",
            enCurso: negociacion?.enCurso ?? false,
          },

          publicacion: {
            existe: Boolean(publicacion),
            publicado: publicacion?.publicado ?? false,
            tieneTexto: publicacion?.tieneTexto ?? false,
            fechaPublicacion: publicacion?.fechaPublicacion ?? null,
          },
        },

        /*
         * Estos campos resumen actividades para facilitar
         * filtros y componentes del frontend.
         */
        visitaPendiente,
        tasacionPendiente,
        materialPendiente,
        fotosPendientes,
        tieneFotos: fotosPorInmueble.has(row.id),
        expediente: expedientes.get(row.id),
        textoPendiente,
        negociacionEnCurso: negociacion?.enCurso ?? false,

        fechaRegistro: row.fechaRegistro,
        fechaSalida: row.fechaSalida,
      };
    });

    /*
     * 8. Resumen operativo.
     *
     * Los KPIs se calculan sobre exactamente los mismos
     * datos que se entregan a la cartera.
     */
    const ocupados=resultado.filter(x=>x.estado==='Activo');
    const activos = ocupados;

    return NextResponse.json({
      inmuebles: resultado,

      resumen: {
        enCartera: ocupados.length,
        pruebas: ocupados.filter(x=>x.datosPrueba).length,
        disponibles,
        visitasPendientes: activos.filter(
          (x) => x.visitaPendiente
        ).length,
        tasacionesPendientes: activos.filter(
          (x) => x.tasacionPendiente
        ).length,
        materialPendiente: activos.filter(
          (x) => x.materialPendiente
        ).length,
        negociaciones: activos.filter(
          (x) => x.negociacionEnCurso
        ).length,
        capacidad,
      },
    });
  } catch (error) {
    console.error("Operación fallida: cartera", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      {
        error:
          "No se pudo consultar la cartera de inmuebles.",
      },
      { status: 500 }
    );
  }
}
