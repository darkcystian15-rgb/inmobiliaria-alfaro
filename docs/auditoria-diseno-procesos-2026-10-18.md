# Auditoría de diseño, datos y continuidad — 18 de octubre de 2026

Revisión sobre `82e96b6`, publicada en el código `fc56a7defe609e227eff1d090f8cff5be7e820d6`. Production y Preview completados y dominio comprobado con sesión autenticada. Sin modificaciones de datos de negocio; las cifras de las cargas de Drive siguen siendo históricas.

## Criterio de producto

La carpeta representa una zona comercial. Cartera, Visitas pendientes y Tasaciones y textos pendientes reutilizan `ZoneFolderCard`: misma forma, tamaño de icono, jerarquía y foco de teclado. Los colores de estado se reservan para la información interior. Los documentos conservan iconos de archivo y los formularios mantienen controles explícitos de guardar.

La navegación permite consultar bandejas generales y elegir después una zona. Registrar y liberar siguen necesitando una zona concreta. Un enlace de una fila general transporta la zona real de ese inmueble. La ficha resuelve esa zona desde el inmueble consultado, incluso si se abrió desde el panel sin `zona` en la URL.

## Hallazgos corregidos

| Prioridad | Antes | Corrección y evidencia |
| --- | --- | --- |
| Alta | Varias visitas completadas multiplicaban las filas de un inmueble en tasaciones pendientes. El panel contaba inmuebles y la bandeja podía contar visitas. | `app/api/tasaciones/route.ts` utiliza existencia de visita en lugar de un join que multiplica filas. Regresión con dos visitas y una única tarea; comparación con panel y Cartera. |
| Alta | `ZonePage` bloqueaba las carpetas de visitas/tasaciones y las vistas `zona=*` que esas pantallas ofrecían. | Consulta general habilitada para ambas bandejas; los formularios y la liberación conservan su requisito de zona. |
| Alta | Desde una fila general, registrar visita/tasación perdía la zona y terminaba en una pantalla bloqueada. | Los enlaces incluyen la zona de la fila. Las acciones generales sin inmueble piden seleccionar una zona con un enlace a Cartera. |
| Alta | La ficha abierta sin zona podía enviar su siguiente acción a un formulario sin contexto. | `NavigationReturnProvider` transmite la zona real de la ficha a sus enlaces operativos. |
| Alta | La separación de la cabecera móvil dependía de `.mobile-page-shell > main`; el wrapper de `ZonePage` rompía ese selector. | La separación se aplica al contenedor común y se elimina el espacio duplicado de la ficha. Comprobación de posición de cabecera y contexto en móvil. |
| Media | El checklist de textos preparados y publicados leía `textos`, aunque sus editores escribían `textosListos`. | Cada checklist utiliza el texto de su editor. Vaciar un texto preparado refleja el pendiente y bloquea publicar hasta guardar un texto válido. |
| Media | La tarjeta «Listos para publicar» contaba solo completos, pero abría una sección que también contenía incompletos. | «Textos preparados» cuenta todas sus filas y desglosa cuántas están por completar y cuántas listas. Cada fila conserva su estado real. |
| Media | «Ver historial» del panel abría Resumen con un ancla a un elemento que solo se monta en Seguimiento. | El enlace selecciona `pestana=seguimiento` y el historial se abre. |
| Media | Seguimiento de alquileres mostraba `numeroOrden` global en lugar de la posición comercial. | Consume `posicion`, ya disponible en la API. Regresión con orden 902 y posición 7. |
| Media | `/alquileres`, aún accesible desde el panel, mostraba «Panel de control» como título porque no aparece en el menú principal. | Título explícito «Contratos de alquiler», dentro de Seguimiento. |
| Media | El umbral de vencimiento a 30 días usaba UTC y «hoy» usaba Perú; de noche podía adelantarse un día. | `rentalContractStatus` calcula ambas fechas con el calendario de Perú. Prueba del límite de 30 días y cambio de año. |
| Baja | Una renovación fuera de la zona consultada accedía a `property.id` sin comprobar que existiera. | Respuesta de negocio «Contrato no disponible en esta zona» antes de utilizar la ficha. |
| Media | Registrar visitas repetía flujo, acción, trazabilidad y conteos antes del formulario; otras bandejas incluían tarjetas estáticas sin una decisión asociada. | Se retiran esos bloques y la tarjeta «Fuente: Base de datos». Se conserva la instrucción de registrar visitas realizadas, los conteos útiles y las confirmaciones. |
| Media | La integración de archivos todavía esperaba ID global y el antiguo título singular del contrato de alquiler. | Expectativas actualizadas al ID por posición y al expediente de alquiler vigente; los códigos persistidos de las fichas de prueba se conservan. |
| Baja | Había variantes independientes del dibujo de carpetas y componentes abandonados. | Selector de zona compartido; retirados `GeographySelect`, `DocumentLibrary` y estilo de pin de mapa, sin consumidores en el código activo. |

## Redundancias que tienen una función

- Tasaciones negociadas es una vista de consulta y edición de precios. Puede contener inmuebles presentes también en material o publicaciones. Sus cifras no se deben sumar como etapas excluyentes; la búsqueda cuenta IDs únicos.
- La posición visible y el ID completo cumplen funciones distintas. El segundo incluye datos para identificar y buscar la ficha según el acuerdo vigente. No se retira de las bandejas como si fuera código muerto.
- El expediente documental de venta/alquiler y el material para publicar tienen requisitos distintos. Completar la publicación no equivale a completar el expediente de la operación.
- Las rutas antiguas `/nuevos`, `/tasaciones-pendientes` y las equivalencias de pestañas se conservan por compatibilidad. No son pantallas nuevas por mantener.
- `retired-coordinates.mjs` sigue limpiando coordenadas de borradores anteriores. Eliminarlo reintroduciría información retirada.
- Las carpetas `backup-dinamizacion-*` son copias históricas, excluidas de ESLint y de Vercel; no son rutas activas. Los respaldos privados y las evidencias de verificación no se publican.

## Validación

- 28 archivos de pruebas unitarias correctos: `node --test tests/*.test.mjs`.
- ESLint sin errores ni advertencias: `npm run lint -- --max-warnings=0`.
- Compilación de producción Webpack y TypeScript correcta, 48 páginas generadas. La ejecución restringida no pudo consultar `TypeScript --showConfig`; la compilación fuera del sandbox terminó con salida 0.
- `tests/task-search.integration.mjs`: API real con dos visitas y una tarea, conteos coincidentes con panel/Cartera, cuatro pantallas, cinco grupos, búsqueda, conservación de formularios, checklist, zona real de los enlaces, vista general, historial abierto, posición del alquiler y título de contratos; escritorio y móvil sin errores JavaScript ni desbordes.
- `tests/transaction-dossier.integration.mjs`: expediente de venta y alquiler, cinco grupos, permisos, concurrencia, PDF/imagen/Word/Excel, archivos múltiples, guardado desde el formulario, filtros por zona y vistas previas; navegador de escritorio/móvil correcto.
- `tests/file-list.integration.mjs`: cuatro tipos de archivo, categorías antiguas, paginación y numeración, acceso privado, cierre por zona, dos confirmaciones cancelables, borrado completo de datos ficticios, rollback, borradores, archivos compartidos y reintento durable tras fallo del hosting.
- El contenedor MySQL desechable y su volumen se retiraron al terminar; las bases, sesiones y datos ficticios de esta auditoría no permanecen en ejecución.
- Capturas privadas en `output/design-audit-local/`, `output/task-search-local/`, `output/dossier-local/`, `output/file-list-local/` y `output/property-delete-local/`, fuera de Git y Vercel.

La ampliación de las pruebas detectó expectativas históricas de ID/título que se actualizaron. También se corrigieron esperas del comprobador para aguardar la navegación y medir la posición del encabezado en el documento, independientemente del scroll. Los fallos de preparación del entorno no se presentan como pruebas satisfactorias; los resultados anteriores son las ejecuciones completas posteriores.

Las pruebas de navegador de bandejas combinan autenticación/MySQL reales con respuestas ficticias para cubrir estados que pueden estar vacíos en la base. La deduplicación y comparación entre panel/Cartera/tasaciones consultan las API reales contra la base local. La integración documental comprueba archivos y formularios con almacenamiento HTTPS ficticio. Ninguna de estas pruebas acredita por sí sola el estado de producción.

## Límites y continuidad de la entrega

1. El código de esta entrega ya tiene despliegue y recorrido autenticado, detallados abajo. El commit documental posterior debe conservar ese código y tener sus propios estados de despliegue; al retomar, consultar el HEAD de ambas ramas.
2. Los casos pendientes de contacto/tipo/posición de Nuevo Chimbote siguen siendo decisiones de datos del usuario. No completarlos mediante suposiciones ni repetir las importaciones.
3. Las reglas de material se expresan en `publicationReadiness` y en el SQL de reportes/agenda. Esta duplicación merece una futura unificación con pruebas de equivalencia; en esta entrega no se cambian los requisitos documentales.
4. La agenda del panel prioriza el siguiente paso de publicación y los vencimientos de alquiler. El expediente documental tiene seguimiento propio en la ficha; no debe interpretarse el panel sin tareas como certificación de expedientes completos.

## Recuperación

Los cambios no añaden migraciones ni cargas de inmuebles. La recuperación es de código revisado; no requiere restaurar la base ni reiniciar etapas. Revisar los cambios posteriores antes de revertir. El historial Git conserva los componentes retirados.

## Publicación y verificación real

- Código: `fc56a7defe609e227eff1d090f8cff5be7e820d6`, integrado por fast-forward y enviado atómicamente a `main` y `feat/registro-simplificado`. Referencias remotas comprobadas en ese SHA; sin reescribir historial.
- Production GitHub `7158854179`: Vercel `success`, «Deployment has completed», `2026-10-18T18:30:12Z`. Versión: https://inmobiliaria-alfarov2-8qfue7kgg-puma19.vercel.app.
- Preview GitHub `7158848637`: Vercel `success`, `2026-10-18T18:29:44Z`. Versión: https://inmobiliaria-alfarov2-em8k9e6q0-puma19.vercel.app.
- Evidencia consultada: API GitHub `/repos/darkcystian15-rgb/inmobiliaria-alfaro/deployments?sha=fc56a7defe609e227eff1d090f8cff5be7e820d6` y estados de ambos despliegues.
- Dominio comprobado: https://intranet.inmobiliariaalbertoalfaro.com.pe, finalizado el `2026-10-18T18:34:11.657Z`.
- Navegador autenticado: siete zonas por cuatro pantallas (28), orden por posición, búsqueda por contacto/dirección/ID, campos excluidos, limpieza, IDs visibles y escritorio/móvil sin errores JavaScript ni desbordes. Se comprobaron además acceso anónimo/operador, apertura de vistas generales, enlaces de las filas con su zona real, ficha abierta sin zona, apertura del historial y título de contratos.
- La consulta encontró Chimbote con 31 visitas pendientes y 12 tasaciones por registrar, y Nuevo Chimbote con 68 visitas pendientes. Son cifras de ese momento, no un inventario permanente ni una orden para reiniciar avances.
- Los grupos negociadas/material/preparados/publicados estaban vacíos en esa consulta. Su comportamiento con contenido, incluido el checklist al editar, conserva la prueba local ficticia; no se afirma haber probado registros inexistentes en producción.
- `businessWrites: 0`: el navegador bloqueó cualquier petición de escritura a `/api/`. Solo se crearon cuentas/sesiones aisladas para la comprobación y se eliminaron en `finally`, verificando su ausencia. No se ejecutaron migraciones, cargas de Drive, cierres ni eliminaciones reales.
- Comprobador y evidencia privados: `output/design-audit-production-smoke.mjs`, `output/design-audit-production/result.json` y capturas, excluidos de Git/Vercel. Los commits documentales posteriores no cambian el código anterior ni repiten datos.
- Recuperación privada de código anterior: `restore-points/auditoria-diseno-20261018/`, fuente e historial de la base `82e96b6`, con `source.tar`, `repository.bundle` y `SHA256SUMS`. No contiene una nueva copia de negocio porque esta entrega no cambia esos datos.
