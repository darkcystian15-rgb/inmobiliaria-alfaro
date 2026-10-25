# Integridad de datos y expedientes cerrados

Eliminación definitiva también en el portal, tareas recuperables de archivos y protección del expediente al cerrar. [Cambios, restauración y verificación](docs/integridad-datos-eliminacion-2026-10-25.md).

# Panel, precios y bandejas compactas

Una sola selección de moneda para los tres importes, conservando registros anteriores con monedas distintas. Cartera muestra los valores vigentes arriba, accesos separados para Tasación, Texto y Publicaciones y el resto de funciones del inmueble. Bandejas de pendientes en filas compactas. [Cambios, restauración y verificación](docs/panel-precios-listados-2026-10-24.md).

Registrar tasaciones tiene dos pestañas con contadores y búsquedas independientes, conservando borradores, zona y acceso al texto. [Flujo de pestañas y restauración](docs/tasaciones-pestanas-2026-10-24.md).

# Seguimiento por tareas separadas

Tasaciones pendientes y su registro, Textos pendientes y Registrar textos, Publicaciones pendientes y Registrar publicaciones. Sus submenús y pantallas operativas requieren seleccionar una zona válida; al volver a la vista general se ocultan. El texto se realiza antes de elegir/confirmar cartel y redes. Se conservan los datos y los enlaces anteriores. [Flujo, conservación y verificación](docs/submenus-flujo-2026-10-24.md).

# Texto y difusión por inmueble

Actualización del 24 de octubre: [Flujo, accesos desde Cartera, restauración y verificación](docs/texto-difusion-2026-10-24.md).

# Tasaciones con moneda por monto

Actualización del 23 de octubre: [Nuevos nombres, soles/dólares, edición compartida y despliegue](docs/tasaciones-nombres-monedas-2026-10-23.md).

# Información del inmueble por carpetas

Nueva entrega del 22 de octubre: [Explorador de zonas, inmuebles y carpetas; conservación y respaldo](docs/informacion-inmueble-carpetas-2026-10-22.md).

Ajuste posterior: [Carga completa dentro de cada ítem, para venta y alquiler](docs/carga-directa-por-item-2026-10-22.md).

Actualización: [Resumen informativo sobre las carpetas y visibilidad de Otros archivos](docs/resumen-informativo-inmueble-2026-10-22.md).

# Portal web desde la intranet

Nueva entrega: [Publicación web, condiciones, portada y pruebas de fase 4](docs/portal-web-fase4.md).

# Inmobiliaria Alfaro — intranet

Actualización del 20 de octubre: [Carga por arrastre en documentos y fotos de venta/alquiler](docs/carga-por-arrastre-2026-10-20.md).

Actualización del 20 de octubre: [Tres accesos a Liberar inmueble y pestaña Fotos](docs/liberar-inmueble-accesos-2026-10-20.md).

Revisión del 19 de octubre publicada: [Auditoría general de funcionamiento, datos y diseño](docs/auditoria-general-2026-10-19.md), con conciliación de las 133 fichas, corrección del panel, apertura directa de fichas y límites de la verificación del hosting real. Código de corrección `53fbef5`, publicado en Vercel Production.

Actualización del 19 de octubre: [Ventas suspendidas y retorno a cartera](docs/ventas-suspendidas-2026-10-19.md). Solo ventas: suspensión en Histórico, liberación de posición y retorno de la misma ficha con una posición disponible. Alquileres conservan su flujo.

Actualización: [Preparación para publicar](docs/preparacion-publicar-2026-10-18.md). Requisitos visuales como cuatro pasos, progreso y navegación directa al contenido registrado.

Actualización: [Reportes alineados con el flujo actual](docs/revision-reportes-flujo-2026-10-18.md). Plazos particulares, alertas, columnas por actividad y exportaciones con zona.

Actualización: [Historial detallado de archivos](docs/historial-archivos-2026-10-18.md). Subidas, cambios y eliminaciones con detalle en ficha y panel; se retiran aclaraciones repetidas de horario.

Actualización: [Alertas y plazos particulares por inmueble](docs/alertas-plazos-particulares-2026-10-18.md). Panel con diez actividades por página, Seguimiento exclusivo del administrador y configuración general separada.

Ajuste posterior: [Prioridades sin etiqueta de origen y contraste de tasaciones con Drive](docs/fechas-prioridades-tasaciones-drive-2026-10-18.md). Se mantienen fechas y avances; los documentos detectados quedan como candidatos por verificar.

**Auditoría previa publicada (18 de octubre, 18:30 UTC):** [Diseño, datos y continuidad](docs/auditoria-diseno-procesos-2026-10-18.md). Código `fc56a7d`, Production `7158854179` y Preview `7158848637`, ambos completados. Comprobación autenticada de siete zonas y 28 pantallas el `2026-10-18T18:34:11.657Z`, sin escrituras de negocio. El commit documental posterior conserva este código.

Ajuste de título de Cartera: **CARTERA DE INMUEBLES CHIMBOTE** (con la zona seleccionada, texto en mayúsculas y sin paréntesis), tamaño 18 px en móvil y 20 px desde 640 px. En el listado general: **CARTERA DE INMUEBLES TODAS LAS ZONAS**. Histórico conserva su título. Cambio solo visual; no modifica datos ni filtros. ESLint del archivo sin advertencias. El título se conserva en la entrega de auditoría publicada; las entregas anteriores de IDs mantienen su evidencia histórica.


Sistema privado de gestión de inmuebles construido con Next.js, React, TypeScript, MySQL y Drizzle. Incluye cartera por zonas, captación, visitas, precios, documentación, publicación, cierres, alquileres y reportes.

## Estado y avances

Criterio de identificación vigente: [ID visible por posición y filtros por contacto, dirección o ID completo](docs/id-posicion-filtros-2026-10-18.md). Este criterio sustituye el prefijo global y la búsqueda por campos adicionales descritos en entregas anteriores.

- [Búsqueda automática y orden por posición](docs/busqueda-orden-seguimiento-2026-10-18.md): Registrar visitas, Visitas pendientes, Registrar tasaciones y Tasaciones y textos pendientes, con filtro por contacto/dirección al escribir.

**Para retomar una sesión:** leer [Contexto vigente del 18 de octubre](docs/contexto-retomar-2026-10-18.md): cargas realizadas, casos pendientes, respaldos y comprobación de sincronización.

- [Carga seleccionada de Nuevo Chimbote](docs/carga-nuevo-chimbote-2026-10-18.md): 68 inmuebles, 3 ventas y 65 alquileres, con 68 visitas pendientes. Las otras seis zonas se conservan. El documento detalla los casos que siguen pendientes.

- [Catálogo ampliado para Nuevo Chimbote](docs/tipos-inmueble.md): Módulo, Condominio, Colegio y Almacén activos. La selección aprobada de Nuevo Chimbote ya fue cargada; quedan casos individuales por aclarar, descritos en la entrega.

- [Carga de cinco zonas desde Drive](docs/carga-cinco-zonas-2026-10-18.md): Tortugas 11, Huarmey 1, Casma 2, Lima 1 y Trujillo 3; selección numerada, 18 visitas pendientes y conservación de Chimbote/Nuevo Chimbote.

- [Reemplazo de Chimbote desde Drive](docs/carga-chimbote-2026-10-18.md): 43 inmuebles en las posiciones de sus carpetas, como recién registrados, con 43 visitas pendientes. Las otras zonas se conservan.

- [Orden del menú de Seguimiento](docs/orden-menu-seguimiento-2026-10-18.md): Registrar inmueble y Liberar inmueble encabezan el grupo, seguidos por visitas y tasaciones.

- [Fichas de venta y alquiler por operación y zona](docs/ficha-ventas-alquileres-2026-10-18.md): apartados por operación, cinco grupos de alquiler, documentos en Inmueble, fotos en Visitas y seguimiento documental; publicación verificada.

- [ID con contacto y dos formas de liberar](docs/liberacion-definitiva-2026-10-18.md): cierre a Histórico o eliminación completa con dos confirmaciones; incluye cambio aditivo y punto de restauración de fuente, datos y archivos.

- [Listado de archivos y navegación por zonas](docs/listado-archivos-2026-10-18.md): filtros automáticos, tipos documentales, Estadística y Liberar inmueble en Seguimiento; incluye respaldo y verificación de entrega.

- [Identificación y descripción de Cartera](docs/identificacion-cartera-2026-10-18.md): criterio uniforme para pantallas y reportes, publicado el 18 de octubre.

Consultar primero [Repositorio y estado de entrega](REPOSITORIO.md): repositorio, ramas, código publicado y límites de verificación. La entrega de auditoría `fc56a7d` está publicada y comprobada en escritorio y móvil; detalle en su Markdown.

- [Expediente de vendedor, comprador e inmueble](docs/expediente-operacion-2026-10-16.md): nueva organización documental y estado del expediente; referencia histórica anterior a los grupos específicos de alquiler del 18 de octubre.
- [Retirada de mapas y coordenadas](docs/retirada-mapas-2026-10-15.md): cambio posterior al estado consolidado; conserva ubicación referencial y zonas comerciales.

[Estado del 15 de octubre](docs/estado-actual-2026-10-15.md) se conserva como referencia histórica. Los documentos históricos conservan decisiones y pruebas de versiones anteriores; sus pendientes no describen necesariamente la versión actual.

- [Seguimiento de cambios](docs/seguimiento-cambios-2026-10-15.md).
- [Zonas de cartera unificadas](docs/zonas-cartera-unificadas-2026-10-15.md).
- [Edición desde Cartera](docs/edicion-desde-cartera.md).
- [Registro simplificado y recuperación](docs/registro-simplificado-2026-10-15.md).
- [Mapa funcional de la versión anterior](docs/mapa-funcional-revisado-2026-10-15.md).
- [Acceso y usuarios](docs/acceso.md).

## Desarrollo

Instalar las dependencias con `npm ci` y configurar privadamente `.env.local` según los servicios del entorno. No guardar credenciales en Git. La aplicación requiere MySQL y el almacenamiento documental usa un servicio HTTPS de hosting.

```sh
npm run dev
```

Abrir http://localhost:3000. Los administradores gestionan la cartera; los operadores acceden a Información de inmuebles según sus permisos.

## Comprobaciones

```sh
node --test tests/*.test.mjs
npm run lint -- --max-warnings=0
npm run build -- --webpack
```

Las integraciones que escriben datos requieren revisar su configuración y usar bases aisladas. No ejecutarlas contra producción para comprobar un despliegue.

## Comportamiento actual

La captación se realiza dentro de una zona y solicita posición disponible, operación, tipo, ubicación referencial y contacto. Departamento, provincia y distrito son opcionales en la ficha e independientes de la zona comercial. El DNI del propietario se adjunta como archivo.

Operación, tipo, contacto y dirección referencial se editan desde Cartera. El cambio de operación requiere inmueble activo sin precios ni publicación preparada. Los demás datos se completan en Información de inmuebles.

## Producción

Proyecto Vercel: `puma19/inmobiliaria-alfarov2`. Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.

Las migraciones de registro simplificado y zonas ya constan como aplicadas. No repetir `--apply` ni instaladores para desplegar actualizaciones de interfaz. Revisar siempre las referencias de recuperación y el estado de la base antes de cualquier adaptación de datos.
