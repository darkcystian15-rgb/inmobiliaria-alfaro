import { propertyAddress } from "@/lib/property-address.mjs";
import { publicationReadiness, requirePublicationReadiness } from "@/lib/publication-readiness";
import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inmAsignacionesPosicion,
  inmInmuebles,
  inmPosiciones,
  inmPublicaciones,
  inmTasaciones,
  inmTimeline,
} from "@/db/schema";

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";


const mapPending = (row: Awaited<ReturnType<typeof approved>>[number]) => ({
  inmuebleId: row.inmuebleId,
  codigo: row.codigo,
  distrito: row.distrito,
  posicion: row.posicion
    ? String(row.posicion).padStart(2, "0")
    : "—",
  nombre: row.referencia,
  ubicacion: propertyAddress(row),
  tipo: row.tipo,
    operacion: row.operacion,
  propietario:
    [row.propietarioNombres, row.propietarioApellidos]
      .filter(Boolean)
      .join(" ") || "Sin contacto",
  valorReferencia: row.valorReferencia,
  precioObjetivo: row.precioObjetivo,
  precioVenta: row.precioVenta,
  observacion: row.observacion,
});

async function approved() {
  return db
    .select({
      inmuebleId: inmInmuebles.id,
      codigo: inmInmuebles.codigo,
      distrito: inmInmuebles.distrito,
      tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
      referencia: inmInmuebles.referencia,
      nombreContacto: inmInmuebles.nombreContacto,
      direccion: inmInmuebles.direccion,

      provincia: inmInmuebles.provincia,
      departamento: inmInmuebles.departamento,
      propietarioNombres: inmInmuebles.nombreContacto,
      propietarioApellidos: sql<string>`NULL`,
      posicion: inmPosiciones.numero,
      valorReferencia: inmTasaciones.valorReferencia,
      precioObjetivo: inmTasaciones.precioObjetivo,
      precioVenta: inmTasaciones.precioVenta,
      observacion: inmTasaciones.observacion,
      situacion: inmTasaciones.situacion,
    })
    .from(inmTasaciones)
    .innerJoin(
      inmInmuebles,
      eq(inmInmuebles.id, inmTasaciones.inmuebleId)
    )

    .leftJoin(
      inmAsignacionesPosicion,
      and(
        eq(
          inmAsignacionesPosicion.inmuebleId,
          inmInmuebles.id
        ),
        eq(inmAsignacionesPosicion.activa, true)
      )
    )
    .leftJoin(
      inmPosiciones,
      eq(
        inmPosiciones.id,
        inmAsignacionesPosicion.posicionId
      )
    )
    .leftJoin(
      inmPublicaciones,
      eq(
        inmPublicaciones.inmuebleId,
        inmInmuebles.id
      )
    )
    .where(
      and(
        eq(inmInmuebles.estado, "activo"),
        eq(inmTasaciones.situacion, "aprobado"),
        isNull(inmPublicaciones.id)
      )
    )
    .orderBy(
      desc(inmTasaciones.fechaActualizacion)
    );
}

async function published() {
  return db
    .select({
      inmuebleId: inmInmuebles.id,
      codigo: inmInmuebles.codigo,
      distrito: inmInmuebles.distrito,
      tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
      referencia: inmInmuebles.referencia,
      nombreContacto: inmInmuebles.nombreContacto,
      direccion: inmInmuebles.direccion,

      provincia: inmInmuebles.provincia,
      departamento: inmInmuebles.departamento,
      posicion: inmPosiciones.numero,
      publicado: inmPublicaciones.publicado,
      fechaPublicacion:
        inmPublicaciones.fechaPublicacion,
      texto: inmPublicaciones.texto,
    })
    .from(inmPublicaciones)
    .innerJoin(
      inmInmuebles,
      eq(inmInmuebles.id, inmPublicaciones.inmuebleId)
    )
    .leftJoin(
      inmAsignacionesPosicion,
      and(
        eq(
          inmAsignacionesPosicion.inmuebleId,
          inmInmuebles.id
        ),
        eq(inmAsignacionesPosicion.activa, true)
      )
    )
    .leftJoin(
      inmPosiciones,
      eq(
        inmPosiciones.id,
        inmAsignacionesPosicion.posicionId
      )
    )
    .where(
      and(
        eq(inmInmuebles.estado, "activo"),
        eq(inmPublicaciones.publicado, true)
      )
    )
    .orderBy(
      desc(inmPublicaciones.fechaPublicacion)
    );
}

async function ready() {
  return db
    .select({
      inmuebleId: inmInmuebles.id,
      codigo: inmInmuebles.codigo,
      distrito: inmInmuebles.distrito,
      tipo: inmInmuebles.tipo,
        operacion: inmInmuebles.operacion,
      referencia: inmInmuebles.referencia,
      nombreContacto: inmInmuebles.nombreContacto,
      direccion: inmInmuebles.direccion,

      provincia: inmInmuebles.provincia,
      departamento: inmInmuebles.departamento,
      posicion: inmPosiciones.numero,
      publicado: inmPublicaciones.publicado,
      fechaRegistro: inmPublicaciones.fechaRegistro,
      texto: inmPublicaciones.texto,
    })
    .from(inmPublicaciones)
    .innerJoin(
      inmInmuebles,
      eq(inmInmuebles.id, inmPublicaciones.inmuebleId)
    )
    .leftJoin(
      inmAsignacionesPosicion,
      and(
        eq(
          inmAsignacionesPosicion.inmuebleId,
          inmInmuebles.id
        ),
        eq(inmAsignacionesPosicion.activa, true)
      )
    )
    .leftJoin(
      inmPosiciones,
      eq(
        inmPosiciones.id,
        inmAsignacionesPosicion.posicionId
      )
    )
    .where(
      and(
        eq(inmInmuebles.estado, "activo"),
        eq(inmPublicaciones.publicado, false)
      )
    )
    .orderBy(
      desc(inmPublicaciones.fechaRegistro)
    );
}

export async function GET() {
  try {
    const auth = await authorizeApi();
    if (auth.response) return auth.response;
    const rows = await approved();
    const listos = await ready();
    const publicadas = await published();
    const expedientes = await publicationReadiness();
    const withChecklist = <T extends { inmuebleId: number; ubicacion?: string }>(item: T) => ({ ...item, ubicacion: item.ubicacion ?? propertyAddress(item), expediente: expedientes.get(item.inmuebleId) });

    return NextResponse.json({
      ok: true,
      pendientes: rows.map(mapPending).map(withChecklist),
      listos: listos.filter(item => expedientes.get(item.inmuebleId)?.complete).map(withChecklist),
      incompletos: listos.filter(item => !expedientes.get(item.inmuebleId)?.complete).map(withChecklist),
      publicadas: publicadas.map(withChecklist),
    });
  } catch (error) {
    console.error("Operación fallida: publicaciones", (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code ?? "ERROR");

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudieron consultar los textos pendientes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeApi(request);
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

    const inmuebleId = Number(body.inmuebleId);
    const texto = clean(body.texto);


    if (
      !Number.isInteger(inmuebleId) ||
      inmuebleId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Inmueble no válido.",
        },
        { status: 400 }
      );
    }

    if (!texto) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El texto de publicación es obligatorio.",
        },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .select()
        .from(inmInmuebles)
        .where(eq(inmInmuebles.id, inmuebleId))
        .limit(1).for("update");

      if (!property || property.estado !== "activo") {
        throw new Error(
          "El inmueble no está activo."
        );
      }

      const [tasacion] = await tx
        .select()
        .from(inmTasaciones)
        .where(
          and(
            eq(
              inmTasaciones.inmuebleId,
              inmuebleId
            ),
            eq(
              inmTasaciones.situacion,
              "aprobado"
            )
          )
        )
        .limit(1);

      if (!tasacion) {
        throw new Error(
          "El inmueble no tiene una tasación aprobada."
        );
      }

      await requirePublicationReadiness(tx, inmuebleId, texto);

      const [existingPublication] = await tx
        .select({
          id: inmPublicaciones.id,
        })
        .from(inmPublicaciones)
        .where(
          eq(
            inmPublicaciones.inmuebleId,
            inmuebleId
          )
        )
        .limit(1);

      if (existingPublication) {
        throw new Error(
          "El inmueble ya tiene una publicación registrada."
        );
      }

      const user = auth.user;

      await tx.insert(inmPublicaciones).values({
        inmuebleId,
        texto,
        driveLink: "",
        usuarioRegistroId: user.id,
        publicado: false,
      });

      await tx.insert(inmTimeline).values({
        inmuebleId,
        evento: "publicacion_registrada",
        observacion:
          "Texto registrado con las fotos de la galería. Inmueble listo para publicar.",
        usuarioId: user.id,
      });

      return {
        situacion: "listo_para_publicar",
      };
    });

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible registrar la publicación.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status:
          /no está activo|no tiene|ya tiene|Expediente incompleto/i.test(
            message
          )
            ? 409
            : 500,
      }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await authorizeApi(request);
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

    const inmuebleId = Number(body.inmuebleId);

    const editarMaterial = body.texto !== undefined;
    const texto = clean(body.texto);

    if (
      !Number.isInteger(inmuebleId) ||
      inmuebleId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Inmueble no válido.",
        },
        { status: 400 }
      );
    }

    if (editarMaterial) {
      if (!texto) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El texto de publicación es obligatorio.",
          },
          { status: 400 }
        );
      }

    }

    const result = await db.transaction(
      async (tx) => {
        const [property] = await tx
          .select()
          .from(inmInmuebles)
          .where(
            eq(inmInmuebles.id, inmuebleId)
          )
          .limit(1).for("update");

        if (
          !property ||
          property.estado !== "activo"
        ) {
          throw new Error(
            "El inmueble no está activo."
          );
        }

        const [publication] = await tx
          .select()
          .from(inmPublicaciones)
          .where(
            eq(
              inmPublicaciones.inmuebleId,
              inmuebleId
            )
          )
          .limit(1);

        if (!publication) {
          throw new Error(
            "El inmueble no tiene una publicación registrada."
          );
        }

        if (publication.publicado && !editarMaterial) {
          throw new Error(
            "La publicación ya figura como publicada."
          );
        }

        const user = auth.user;

        /*
         * Si viene texto, actualizamos
         * el material existente.
         *
         * No se crea otra publicación.
         */
        if (editarMaterial) {
          await tx
            .update(inmPublicaciones)
            .set({
              texto,

            })
            .where(
              eq(
                inmPublicaciones.id,
                publication.id
              )
            );

          await tx.insert(inmTimeline).values({
            inmuebleId,
            evento: "publicacion_actualizada",
            observacion: JSON.stringify({ anterior: publication.texto, nuevo: texto, anuncioExternoPendiente: publication.publicado }),
            usuarioId: user.id,
          });

          return {
            codigo: property.codigo,
            situacion: publication.publicado ? "publicado" : "listo_para_publicar",
          };
        }

        /*
         * Si no viene texto,
         * el PUT mantiene su función original:
         * marcar la publicación como realizada.
         */
        await requirePublicationReadiness(tx, inmuebleId);

        const ahora = new Date();

        await tx
          .update(inmPublicaciones)
          .set({
            publicado: true,
            fechaPublicacion: ahora,
            usuarioPublicacionId: user.id,
          })
          .where(
            eq(
              inmPublicaciones.id,
              publication.id
            )
          );

        await tx.insert(inmTimeline).values({
          inmuebleId,
          evento: "publicado",
          observacion:
            "La publicación fue marcada como publicada.",
          usuarioId: user.id,
        });

        return {
          codigo: property.codigo,
          situacion: "publicado",
          fechaPublicacion: ahora,
        };
      }
    );

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar la publicación.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status:
          /no está activo|no tiene|ya figura|Expediente incompleto/i.test(
            message
          )
            ? 409
            : 500,
      }
    );
  }
}
