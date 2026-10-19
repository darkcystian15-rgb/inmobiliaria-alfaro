# Auditoría general de funcionamiento, datos y diseño — 19 de octubre de 2026

Revisión del código base `61d23c0`, del dominio de producción y de MySQL. Correcciones publicadas en el código `53fbef544c2400418bb6e0d6037c83ead5452215`, sincronizado en ambas ramas. Las comprobaciones anteriores a la publicación se identifican como locales; la entrega Vercel se documenta al final.

## Hallazgos y correcciones

| Prioridad | Hallazgo comprobado | Resultado local |
| --- | --- | --- |
| Alta | El panel devolvía cero visitas y tasaciones pendientes y mostraba «Al día», aunque SQL, Cartera y reportes coincidían en 95 y 36. | Se consulta la asignación activa mediante un join por `inmueble_id`. La versión corregida devuelve 95 y 36 sobre la misma base, sin modificar registros de negocio. |
| Media | Al abrir una ficha mediante enlace directo, el selector completo de inmuebles antecedía al contenido y ocupaba la primera pantalla en móvil y escritorio mediano. | La selección se oculta cuando ya hay una ficha elegida, hasta el diseño de dos columnas de 1536 px. «Volver a elegir inmueble» permite recuperar la lista y sus filtros. Se conserva la confirmación por cambios sin guardar. |
| Media | `storageConfigured()` habilitaba la subida con cualquier URL no vacía, incluso inválida. | Se exige una URL HTTPS válida sin credenciales incrustadas y un token no vacío. Se agregaron casos de regresión. No se sustituyeron credenciales. |
| Media | El auditor antiguo seguía consultando las asignaciones anteriores y exigía DNI numérico y propietario vinculado, condiciones sustituidas por el registro simplificado. | El auditor usa `inm_asignaciones_zona`, contempla las categorías documentales vigentes, distingue pendientes permitidos de errores de integridad y ejecuta una transacción de solo lectura. |
| Validación | La prueba de búsqueda seleccionaba también los títulos del checklist renovado y buscaba su nombre anterior. | Se actualizan los selectores y se comprueban el progreso reactivo, la acción para completar texto y la reapertura del selector. |

La causa del contador no era una pérdida de visitas: Drizzle quitaba el nombre de la tabla de la referencia a la columna exterior en un SELECT de una sola tabla. Dentro de la subconsulta, `id` se resolvía contra la asignación. Después de las cargas, los IDs del inmueble y de su asignación son independientes. La prueba de regresión usa expresamente el inmueble 1 y la asignación 401; la solución elimina esa subconsulta.

## Estado real de datos consultado

Instantánea del 19 de octubre entre 21:55 y 22:06 UTC; los conteos cambian con la actividad posterior del usuario.

| Zona | Activos | Histórico | Posiciones libres | Visitas pendientes | Tasaciones por registrar |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chimbote | 43 | 1 | 7 | 14 | 29 |
| Nuevo Chimbote | 68 | 1 | 22 | 61 | 7 |
| Tortugas | 11 | 0 | 9 | 11 | 0 |
| Casma | 3 | 0 | 7 | 3 | 0 |
| Huarmey | 1 | 0 | 9 | 1 | 0 |
| Lima | 2 | 0 | 8 | 2 | 0 |
| Trujillo | 3 | 0 | 7 | 3 | 0 |
| Total | 131 | 2 | 69 | 95 | 36 |

- 133 fichas: 83 ventas activas, 48 alquileres activos y dos ventas inactivas.
- 200 posiciones. Cada activo tiene una sola asignación vigente en su zona. Las dos fichas históricas no ocupan posición activa.
- 36 visitas completadas; ninguna tasación registrada, publicación, anuncio o archivo en las tablas actuales. No se encontraron eventos de subida/eliminación de archivos en el historial consultado.
- 36 visitas pendientes de evidencia fotográfica. El flujo vigente permite registrarlas sin fotos si se confirma que la evidencia se regularizará después. No se reinician ni se declaran inválidas por ese motivo.
- 19 contactos conservan el sufijo provisional `-FTO`. No hay fichas sin dirección o sin contacto. No se han inventado nombres ni cambiado operaciones para eliminar estos pendientes.

## Integridad y sincronización

Se inspeccionaron 31 tablas y se contrastó el esquema vigente: sin tablas o columnas requeridas faltantes, claves foráneas faltantes ni índices declarados ausentes. Se aceptan índices históricos con nombres distintos cuando sus columnas y unicidad son equivalentes.

Las 31 relaciones del esquema no presentan filas huérfanas. Las 21 comprobaciones adicionales de integridad quedaron en cero: posiciones duplicadas, zonas incompatibles, asignaciones activas en históricos, fechas de asignación incoherentes, cierres duplicados o incompatibles, importes de cierre inválidos, tasaciones sin visita, referencias de fotos cruzadas, portadas duplicadas, visitas completadas sin fecha, tipos desconocidos, JSON de expediente inválido y secuencia global atrasada, entre otras.

La conciliación de producción realizó 264 consultas HTTP: las 133 fichas se compararon con SQL en código, contacto, dirección, operación, tipo, zona, estado, posición y avance de visita. También se comprobaron las siete zonas, disponibilidad, bandejas, 22 reportes y permisos de nueve APIs administrativas. La discrepancia funcional encontrada fue el contador del panel. La misma conciliación sobre la versión local corregida terminó sin discrepancias.

Las huellas de las tablas de negocio se conservaron sin cambios entre comprobaciones. Se crearon únicamente cuentas y sesiones temporales para la verificación autenticada; se eliminaron al terminar cada ejecución. No se repitieron cargas, migraciones, restauraciones ni modificaciones de fichas reales.

## Diseño y navegación

En producción se recorrieron 108 combinaciones de pantalla y ancho: 1440, 768 y 375 px. Incluyen panel, cartera activa/histórica, registro, liberación, visitas, tasaciones, material de publicación, listado de archivos, reportes, contratos, catálogos, usuarios, seguridad y nueve apartados de una ficha de venta y otra de alquiler.

No se detectaron errores JavaScript, respuestas HTTP fallidas, desbordamiento horizontal global, botones visibles sin nombre accesible ni campos visibles sin etiqueta en esas vistas. El navegador bloqueó las escrituras de negocio y no hubo intentos de escritura durante el recorrido. Las listas y formularios largos requieren desplazamiento vertical; no se consideran fallos por su longitud. La revisión visual identificó el selector antepuesto a la ficha como la fricción corregida en esta entrega.

La versión local corregida se revisó adicionalmente en 57 combinaciones de pantalla/ancho con datos actuales: sin discrepancias de API, errores de navegador ni desbordamientos. Las capturas muestran la ficha seleccionada en la primera pantalla móvil y el panel indicando áreas pendientes.

## Pruebas de funcionamiento

- 32 archivos unitarios aprobados; ESLint sin errores ni advertencias; compilación Webpack/TypeScript correcta fuera del sandbox.
- Integraciones MySQL 8.4 desechables: suspensión/retorno de ventas, reportes del flujo, plazos particulares, expediente y documentos, listado de archivos/eliminación definitiva y búsquedas/navegación.
- Cobertura de concurrencia: una activación por ficha, una ficha por posición, conflictos de versión y preservación de las relaciones y documentos al suspender/retomar.
- Las integraciones documentales usan un hosting HTTPS local simulado para probar subida, lectura, vista previa, permisos, limpieza, fallos y reintento durable. No suben documentos reales.
- Integración adicional de seguridad aislada: login y alta de MFA, rechazo de repetición, cifrado del secreto, permisos, reautenticación de cambios sensibles, expiración por inactividad, eventos de auditoría, nonce CSP y límites persistentes de intentos. Activar MFA para el ensayo no cambia la política de Production.
- Expediente y listado de archivos se repitieron sobre la compilación final: ambos aprobados, incluida la reapertura del selector y la subida/vista previa con el hosting HTTPS simulado.

## Límite de la comprobación del hosting real

El endpoint documentado del hosting respondió HTTP 401 al GET anónimo: está accesible y protege el acceso público. La configuración disponible en `.env.local` contiene una URL documental inválida; el ensayo de imagen real se detuvo antes de enviar una subida. No se creó un archivo de prueba externo.

No hay registros documentales actuales desde los que comprobar una descarga real a través de la aplicación. Por tanto, **no se acredita en esta auditoría una subida/descarga/eliminación autenticada contra el hosting real**, ni que sus credenciales de Vercel sean válidas. Las pruebas HTTPS locales sí verifican el flujo de la aplicación. La comprobación completa del servicio necesita su configuración válida; no se deben sustituir claves con valores supuestos.

## Evidencia y entrega

Evidencia privada, excluida de Git: `output/general-audit/db-result.json`, `business-snapshot.json`, `production-reconciliation-result.json`, `production-result.json`, `local/local-reconciliation-result.json`, registros de integraciones y capturas. Estos archivos no se publican porque pueden contener información operativa o imágenes de fichas.

Esta revisión no cambia el esquema ni los datos comerciales. La publicación anterior documentada en [ventas suspendidas](ventas-suspendidas-2026-10-19.md) conserva su evidencia histórica.

El contenedor MySQL desechable y su volumen se eliminaron al terminar; el servidor local de auditoría quedó detenido. Las capturas y los informes privados se conservaron.

## Publicación autorizada en Vercel

- Código: `53fbef544c2400418bb6e0d6037c83ead5452215`. Subida atómica de `main` y `feat/registro-simplificado`; Codespaces conserva las mismas referencias.
- Proyecto existente: `puma19/inmobiliaria-alfarov2`. La integración GitHub no inició el despliegue durante esta entrega; se publicó mediante la sesión disponible de Vercel CLI, sin crear otro proyecto.
- Despliegue: `dpl_9niDQryZAqUTxeTKui3uNr4cKAUN`, entorno `production`, estado `READY`; compilación y TypeScript aprobados en Vercel.
- [Versión publicada](https://inmobiliaria-alfarov2-6qt60n7a7-puma19.vercel.app) y [detalle Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/9niDQryZAqUTxeTKui3uNr4cKAUN).
- `vercel inspect` confirmó los alias `inmobiliaria-alfarov2-umber.vercel.app` e `intranet.inmobiliariaalbertoalfaro.com.pe`.
- Los commits posteriores de evidencia conservan el código funcional de esta entrega.

Comprobación autenticada del dominio terminada el `2026-10-19T22:17:30.668Z`: 265 consultas HTTP, 133 fichas, siete zonas, 22 reportes y nueve APIs administrativas. Panel con 131 activos, 69 posiciones libres, 95 visitas pendientes y 36 tasaciones por registrar; coincide con SQL, Cartera y reportes. Las 57 combinaciones de vista/ancho adicionales pasaron sin errores JavaScript, respuestas HTTP fallidas ni desbordamiento horizontal. Ninguna escritura de negocio; huellas comerciales idénticas y cuentas/sesiones temporales eliminadas. Evidencia privada en `output/general-audit/deployed/production-result.json`.

La API de archivos de Production informa `subidaHabilitada=true` con la validación nueva: la configuración desplegada satisface el formato HTTPS y token no vacío. Esto no sustituye la prueba autenticada completa de transferencia con el hosting real, cuyo límite se mantiene explicado arriba.
