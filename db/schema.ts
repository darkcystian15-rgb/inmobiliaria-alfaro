import {
  boolean,
  date,
  decimal,
  int,
  mysqlTable,
  tinyint,
  timestamp,
  text,
  uniqueIndex,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";

export const inmUsuarios = mysqlTable("inm_usuarios", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  rol: varchar("rol", { length: 30 }).notNull().default("usuario"),
  activo: boolean("activo").notNull().default(true),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("uq_inm_usuarios_email").on(table.email),
}));

export const inmPropietarios = mysqlTable("inm_propietarios", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  dni: varchar("dni", { length: 20 }).notNull(),
  nombres: varchar("nombres", { length: 120 }).notNull(),
  apellidos: varchar("apellidos", { length: 160 }).notNull(),
  telefono: varchar("telefono", { length: 40 }),
  email: varchar("email", { length: 160 }),
  referenciaContacto: varchar("referencia_contacto", { length: 255 }),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  fechaActualizacion: timestamp("fecha_actualizacion", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dniIdx: uniqueIndex("uq_inm_propietarios_dni").on(table.dni),
}));

export const inmInmuebles = mysqlTable("inm_inmuebles", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull(),
  propietarioId: bigint("propietario_id", { mode: "number", unsigned: true }).notNull().references(() => inmPropietarios.id),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  referencia: varchar("referencia", { length: 255 }).notNull(),
  direccion: varchar("direccion", { length: 255 }),
  distrito: varchar("distrito", { length: 100 }),
  provincia: varchar("provincia", { length: 100 }),
  departamento: varchar("departamento", { length: 100 }),
  areaTerreno: decimal("area_terreno", { precision: 12, scale: 2 }),
  areaConstruida: decimal("area_construida", { precision: 12, scale: 2 }),
  habitaciones: int("habitaciones"),
  banos: int("banos"),
  caracteristicas: text("caracteristicas"),
  observaciones: text("observaciones"),
  estado: varchar("estado", { length: 30 }).notNull().default("activo"),
  etapa: varchar("etapa", { length: 40 }).notNull().default("visita_pendiente"),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  fechaActualizacion: timestamp("fecha_actualizacion", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
  fechaSalida: timestamp("fecha_salida", { mode: "date" }),
}, (table) => ({
  codigoIdx: uniqueIndex("uq_inm_inmuebles_codigo").on(table.codigo),
}));

export const inmPosiciones = mysqlTable("inm_posiciones", {
  id: tinyint("id", { unsigned: true }).primaryKey(),
  numero: tinyint("numero", { unsigned: true }).notNull(),
  activo: boolean("activo").notNull().default(true),
}, (table) => ({
  numeroIdx: uniqueIndex("uq_inm_posiciones_numero").on(table.numero),
}));

export const inmAsignacionesPosicion = mysqlTable("inm_asignaciones_posicion", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  posicionId: tinyint("posicion_id", { unsigned: true }).notNull().references(() => inmPosiciones.id),
  fechaInicio: timestamp("fecha_inicio", { mode: "date" }).defaultNow().notNull(),
  fechaFin: timestamp("fecha_fin", { mode: "date" }),
  activa: boolean("activa").notNull().default(true),
}));

export const inmVisitas = mysqlTable("inm_visitas", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  fechaVisita: date("fecha_visita"),
  completada: boolean("completada").notNull().default(false),
  fechaCompletada: timestamp("fecha_completada", { mode: "date" }),
  observaciones: text("observaciones"),
  driveLink: varchar("drive_link", { length: 1000 }),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
});

export const inmTasaciones = mysqlTable("inm_tasaciones", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  fechaTasacion: date("fecha_tasacion").notNull(),
  valorReferencia: decimal("valor_referencia", { precision: 15, scale: 2 }),
  precioObjetivo: decimal("precio_objetivo", { precision: 15, scale: 2 }),
  situacion: varchar("situacion", { length: 30 }).notNull().default("pendiente_aprobacion"),
  observacion: text("observacion"),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  fechaActualizacion: timestamp("fecha_actualizacion", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  inmuebleIdx: uniqueIndex("uq_inm_tasaciones_inmueble").on(table.inmuebleId),
}));

export const inmPublicaciones = mysqlTable("inm_publicaciones", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  texto: text("texto").notNull(),
  driveLink: varchar("drive_link", { length: 1000 }).notNull(),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  usuarioRegistroId: bigint("usuario_registro_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  publicado: boolean("publicado").notNull().default(false),
  fechaPublicacion: timestamp("fecha_publicacion", { mode: "date" }),
  usuarioPublicacionId: bigint("usuario_publicacion_id", { mode: "number", unsigned: true }).references(() => inmUsuarios.id),
}, (table) => ({
  inmuebleIdx: uniqueIndex("uq_inm_publicaciones_inmueble").on(table.inmuebleId),
}));

export const inmLiberaciones = mysqlTable("inm_liberaciones", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  motivo: varchar("motivo", { length: 40 }).notNull(),
  detalleOtro: varchar("detalle_otro", { length: 500 }),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  usuarioRegistroId: bigint("usuario_registro_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  confirmado: boolean("confirmado").notNull().default(false),
  fechaConfirmacion: timestamp("fecha_confirmacion", { mode: "date" }),
  usuarioConfirmacionId: bigint("usuario_confirmacion_id", { mode: "number", unsigned: true }).references(() => inmUsuarios.id),
  anulada: boolean("anulada").notNull().default(false),
  fechaAnulacion: timestamp("fecha_anulacion", { mode: "date" }),
});

export const inmArchivos = mysqlTable("inm_archivos", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  tipoDocumento: varchar("tipo_documento", { length: 80 }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  enlace: varchar("enlace", { length: 1000 }).notNull(),
  observacion: varchar("observacion", { length: 500 }),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
});

export const inmTimeline = mysqlTable("inm_timeline", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  evento: varchar("evento", { length: 60 }).notNull(),
  observacion: text("observacion"),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  fechaEvento: timestamp("fecha_evento", { mode: "date" }).defaultNow().notNull(),
});

export const inmConfigAlertas = mysqlTable("inm_config_alertas", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  dias: int("dias").notNull(),
  activo: boolean("activo").notNull().default(true),
  descripcion: varchar("descripcion", { length: 255 }),
  fechaActualizacion: timestamp("fecha_actualizacion", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
  usuarioActualizacionId: bigint("usuario_actualizacion_id", { mode: "number", unsigned: true }).references(() => inmUsuarios.id),
}, (table) => ({
  tipoIdx: uniqueIndex("uq_inm_config_alertas_tipo").on(table.tipo),
}));
