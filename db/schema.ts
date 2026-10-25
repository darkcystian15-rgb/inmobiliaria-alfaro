import {
  boolean,
  date,
  datetime,
  decimal,
  int,
  mysqlTable,
  index,
  tinyint,
  timestamp,
  text,
  uniqueIndex,
  varchar,
  bigint,
  primaryKey,
  mediumtext,
} from "drizzle-orm/mysql-core";

export const inmUsuarios = mysqlTable("inm_usuarios", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  usuario: varchar("usuario", { length: 60 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  intentosFallidos: int("intentos_fallidos").notNull().default(0),
  bloqueoHasta: timestamp("bloqueo_hasta", { mode: "date" }),
  mfaSecret: varchar("mfa_secret", { length: 255 }),
  mfaLastStep: bigint("mfa_last_step", { mode: "number" }),
  rol: varchar("rol", { length: 30 }).notNull().default("usuario"),
  activo: boolean("activo").notNull().default(true),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("uq_inm_usuarios_email").on(table.email),
  usuarioIdx: uniqueIndex("uq_inm_usuarios_usuario").on(table.usuario),
}));

export const inmSesiones = mysqlTable("inm_sesiones", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  expira: timestamp("expira", { mode: "date" }).notNull(),
  lastSeen: timestamp("last_seen", { mode: "date" }).defaultNow().notNull(),
  authenticatedAt: timestamp("authenticated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  usuarioIdx: index("idx_inm_sesiones_usuario").on(table.usuarioId),
  expiraIdx: index("idx_inm_sesiones_expira").on(table.expira),
}));

export const authLimits = mysqlTable('inm_auth_limits', {
  bucketKey: varchar('bucket_key',{length:64}).primaryKey(),
  hits: int('hits',{unsigned:true}).notNull(),
  expires: datetime('expires',{mode:'date'}).notNull(),
});
export const securityAudit = mysqlTable("inm_security_audit", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  actorId: bigint("actor_id", { mode: "number", unsigned: true }),
  action: varchar("action", { length: 60 }).notNull(),
  resource: varchar("resource", { length: 120 }).notNull(),
  outcome: varchar("outcome", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
export const authChallenges = mysqlTable("inm_auth_challenges", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  secret: varchar("secret", { length: 255 }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});
export const inmPropietarios = mysqlTable("inm_propietarios", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  dni: varchar("dni", { length: 20 }),
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

export const inmZonas = mysqlTable("inm_zonas", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  clave: varchar("clave", { length: 100 }).notNull(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  capacidad: tinyint("capacidad", { unsigned: true }).notNull(),
  activo: boolean("activo").notNull().default(true),
  departamento: varchar("departamento", { length: 100 }),
  provincia: varchar("provincia", { length: 100 }),
  distrito: varchar("distrito", { length: 100 }),
}, table => ({ claveIdx: uniqueIndex("uq_zonas_clave").on(table.clave), nombreIdx: uniqueIndex("uq_zonas_nombre").on(table.nombre) }));

export const inmInmuebles = mysqlTable("inm_inmuebles", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 350 }).notNull(),
  zonaId: int("zona_id", { unsigned: true }).references(() => inmZonas.id),
  numeroOrden: bigint("numero_orden", { mode: "number", unsigned: true }),
  datosPrueba: boolean("datos_prueba").notNull().default(false),
  datosValidados: boolean("datos_validados").notNull().default(false),
  propietarioId: bigint("propietario_id", { mode: "number", unsigned: true }).references(() => inmPropietarios.id),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  operacion: varchar("operacion", { length: 10 }).notNull().default("venta"),
  moneda: varchar("moneda", { length: 3 }),
  referencia: varchar("referencia", { length: 255 }).notNull(),
  nombreContacto: varchar("nombre_contacto", { length: 281 }),
  direccion: varchar("direccion", { length: 350 }),
  numeroDireccion: varchar("numero_direccion", { length: 30 }),
  inmuebleOrigenId: bigint("inmueble_origen_id", {mode:"number",unsigned:true}),
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
  ordenIdx: uniqueIndex("uq_inm_inmuebles_numero_orden").on(table.numeroOrden),
}));

export const inmSecuencias = mysqlTable("inm_secuencias", {
  nombre: varchar("nombre", { length: 50 }).primaryKey(),
  valor: bigint("valor", { mode: "number", unsigned: true }).notNull().default(0),
});

export const inmCodigosAnteriores = mysqlTable("inm_codigos_anteriores", {
  codigo: varchar("codigo", { length: 350 }).primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
});

export const inmPosiciones = mysqlTable("inm_posiciones_zona", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  zonaId: int("zona_id", { unsigned: true }).notNull().references(() => inmZonas.id),
  numero: tinyint("numero", { unsigned: true }).notNull(),
  activo: boolean("activo").notNull().default(true),
}, (table) => ({
  numeroIdx: uniqueIndex("uq_zona_numero").on(table.zonaId, table.numero),
}));

export const inmAsignacionesPosicion = mysqlTable("inm_asignaciones_zona", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  posicionId: int("posicion_id", { unsigned: true }).notNull().references(() => inmPosiciones.id),
  fechaInicio: timestamp("fecha_inicio", { mode: "date" }).defaultNow().notNull(),
  fechaFin: timestamp("fecha_fin", { mode: "date" }),
  activa: boolean("activa").notNull().default(true),
});

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
  valorReferenciaMoneda: varchar("valor_referencia_moneda", { length: 3 }).notNull().default("PEN"),
  precioObjetivo: decimal("precio_objetivo", { precision: 15, scale: 2 }),
  precioObjetivoMoneda: varchar("precio_objetivo_moneda", { length: 3 }).notNull().default("PEN"),
  precioVenta: decimal("precio_venta", { precision: 15, scale: 2 }),
  precioVentaMoneda: varchar("precio_venta_moneda", { length: 3 }).notNull().default("PEN"),
  situacion: varchar("situacion", { length: 30 }).notNull().default("pendiente_aprobacion"),
  observacion: text("observacion"),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  fechaActualizacion: timestamp("fecha_actualizacion", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  inmuebleIdx: uniqueIndex("uq_inm_tasaciones_inmueble").on(table.inmuebleId),
}));

export const inmNegociaciones = mysqlTable("inm_negociaciones", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  estado: varchar("estado", { length: 20 }).notNull().default("en_curso"),
  fechaInicio: timestamp("fecha_inicio", { mode: "date" }).defaultNow().notNull(),
  fechaFin: timestamp("fecha_fin", { mode: "date" }),
  observaciones: text("observaciones"),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
  fechaActualizacion: timestamp("fecha_actualizacion", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
});

export const inmPublicaciones = mysqlTable("inm_publicaciones", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  texto: text("texto").notNull(),
  driveLink: varchar("drive_link", { length: 1000 }).notNull(),
  textoRealizado: boolean("texto_realizado").notNull().default(true),
  fechaTextoRealizado: timestamp("fecha_texto_realizado", { mode: "date" }),
  mediosDifusion: varchar("medios_difusion", { length: 10 }),
  cartelColocado: boolean("cartel_colocado").notNull().default(false),
  redesPublicadas: boolean("redes_publicadas").notNull().default(false),
  referenciasDifusion: text("referencias_difusion"),
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
  moneda: varchar("moneda", { length: 3 }),
  detalleOtro: varchar("detalle_otro", { length: 500 }),
  fechaVenta: date("fecha_venta"),
  fechaAlquiler: date("fecha_alquiler", { mode: "string" }),
  rentaMensual: decimal("renta_mensual", { precision: 15, scale: 2 }),
  garantia: decimal("garantia", { precision: 15, scale: 2 }),
  adelanto: decimal("adelanto", { precision: 15, scale: 2 }),
  fechaInicioAlquiler: date("fecha_inicio_alquiler", { mode: "string" }),
  fechaFinAlquiler: date("fecha_fin_alquiler", { mode: "string" }),
  precioFinal: decimal("precio_final", { precision: 15, scale: 2 }),
  comision: decimal("comision", { precision: 15, scale: 2 }),
  datosSimulados: boolean("datos_simulados").notNull().default(false),
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
  visitaId: bigint("visita_id", { mode: "number", unsigned: true }).references(() => inmVisitas.id),
  esPortada: boolean("es_portada").notNull().default(false),
  tipoDocumento: varchar("tipo_documento", { length: 80 }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  enlace: varchar("enlace", { length: 1000 }).notNull(),
  almacenamiento: varchar("almacenamiento", { length: 20 }).notNull().default("enlace"),
  rutaAlmacenamiento: varchar("ruta_almacenamiento", { length: 1000 }),
  nombreOriginal: varchar("nombre_original", { length: 255 }),
  tamanoBytes: bigint("tamano_bytes", { mode: "number", unsigned: true }),
  tipoMime: varchar("tipo_mime", { length: 150 }),
  observacion: varchar("observacion", { length: 500 }),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull().references(() => inmUsuarios.id),
  fechaRegistro: timestamp("fecha_registro", { mode: "date" }).defaultNow().notNull(),
});

export const inmExpedientes = mysqlTable('inm_expedientes', {
  inmuebleId: bigint('inmueble_id', { mode: 'number', unsigned: true }).primaryKey().references(() => inmInmuebles.id),
  configuracion: text('configuracion').notNull(),
  version: int('version', { unsigned: true }).notNull().default(1),
  actualizado: timestamp('actualizado', { mode: 'date' }).defaultNow().onUpdateNow().notNull(),
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

export const inmSeguimiento = mysqlTable("inm_seguimiento", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", { mode: "number", unsigned: true }).notNull().references(() => inmInmuebles.id),
  actividad: varchar("actividad", {length: 30}).notNull(),
  responsableId: bigint("responsable_id", {mode: "number", unsigned: true}).references(() => inmUsuarios.id),
  fechaLimite: date("fecha_limite", {mode: "string"}),
  observacion: varchar("observacion", {length: 500}),
  actualizado: timestamp("actualizado", {mode: "date"}).defaultNow().onUpdateNow().notNull(),
}, table => ({actividadIdx: uniqueIndex("uq_seguimiento_actividad").on(table.inmuebleId,table.actividad)}));
export const inmAnuncios = mysqlTable("inm_anuncios", {
  id: bigint("id", {mode: "number",unsigned: true}).autoincrement().primaryKey(),
  inmuebleId: bigint("inmueble_id", {mode: "number",unsigned: true}).notNull().references(() => inmInmuebles.id),
  canal: varchar("canal", {length: 80}).notNull(),
  revisionTexto: bigint("revision_texto", {mode:"number",unsigned:true}).notNull().default(0),
  enlace: varchar("enlace", {length: 1000}).notNull(),
  fechaPublicacion: date("fecha_publicacion", {mode: "string"}).notNull(),
  precioPublicado: decimal("precio_publicado", {precision:15,scale:2}).notNull(),
  precioPublicadoMoneda: varchar("precio_publicado_moneda", {length:3}).notNull().default("PEN"),
  actualizado: timestamp("actualizado", {mode: "date"}).defaultNow().onUpdateNow().notNull(),
}, table => ({inmuebleIdx:index("idx_anuncios_inmueble").on(table.inmuebleId)}));

export const inmBorradores = mysqlTable('inm_borradores', {
  usuarioId: bigint('usuario_id',{mode:'number',unsigned:true}).notNull().references(()=>inmUsuarios.id,{onDelete:'cascade'}),
  clave: varchar('clave',{length:120}).notNull(),
  contenido: mediumtext('contenido').notNull(),
  actualizado: timestamp('actualizado',{mode:'date'}).defaultNow().onUpdateNow().notNull(),
},table=>({clavePk:primaryKey({columns:[table.usuarioId,table.clave]})}));

export const inmTiposInmueble = mysqlTable('inm_tipos_inmueble', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  nombre: varchar('nombre', { length: 30 }).notNull(),
  activo: boolean('activo').notNull().default(true),
}, table => ({ nombreIdx: uniqueIndex('uq_tipos_inmueble_nombre').on(table.nombre) }));

export const inmUbicaciones = mysqlTable('inm_ubicaciones', {
 id: bigint('id',{mode:'number',unsigned:true}).autoincrement().primaryKey(),
 nivel: varchar('nivel',{length:20}).notNull(),
 nombre: varchar('nombre',{length:100}).notNull(),
 padreId: bigint('padre_id',{mode:'number',unsigned:true}),
 activo: boolean('activo').notNull().default(true),
},t=>({parentIdx:index('idx_ubicaciones_padre').on(t.padreId),nameIdx:uniqueIndex('uq_ubicaciones_nombre').on(t.nivel,t.padreId,t.nombre)}));

// Temporary confirmation/cleanup jobs. No FK: the property is physically deleted first.
export const inmEliminacionesPendientes = mysqlTable('inm_eliminaciones_pendientes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  inmuebleId: bigint('inmueble_id', { mode: 'number', unsigned: true }).notNull(),
  zonaId: int('zona_id', { unsigned: true }).notNull(),
  usuarioId: bigint('usuario_id', { mode: 'number', unsigned: true }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull(),
  motivo: varchar('motivo', { length: 40 }).notNull().default(''),
  detalle: varchar('detalle', { length: 500 }).notNull().default(''),
  huella: varchar('huella', { length: 64 }).notNull(),
  rutas: mediumtext('rutas').notNull(),
  expira: datetime('expira', { mode: 'date' }).notNull(),
  creado: timestamp('creado', { mode: 'date' }).defaultNow().notNull(),
}, table => ({ zonaIdx: index('idx_eliminaciones_zona').on(table.zonaId, table.estado) }));

export const inmTareasArchivos = mysqlTable('inm_tareas_archivos', {
 id: varchar('id',{length:36}).primaryKey(),
 inmuebleId: bigint('inmueble_id',{mode:'number',unsigned:true}),
 archivoId: bigint('archivo_id',{mode:'number',unsigned:true}),
 ruta: varchar('ruta',{length:1000}).notNull(),
 tipo: varchar('tipo',{length:20}).notNull(),
 usuarioId: bigint('usuario_id',{mode:'number',unsigned:true}),
 expira: datetime('expira',{mode:'date'}).notNull(),
 creado: timestamp('creado',{mode:'date'}).defaultNow().notNull(),
}, t=>({expiresIdx:index('idx_tareas_expira').on(t.expira)}));
export const inmExpedientesCierre = mysqlTable('inm_expedientes_cierre', {
 liberacionId: bigint('liberacion_id',{mode:'number',unsigned:true}).primaryKey(),
 inmuebleId: bigint('inmueble_id',{mode:'number',unsigned:true}).notNull(),
 contenido: mediumtext('contenido').notNull(),
 creado: timestamp('creado',{mode:'date'}).defaultNow().notNull(),
},t=>({propertyIdx:index('idx_cierre_inmueble').on(t.inmuebleId)}));
