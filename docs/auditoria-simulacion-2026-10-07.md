> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Auditoría de ingresos y persistencia — 7 de octubre de 2026

## Alcance

Simulaciones por HTTP contra una instancia local del código actual, conectada a la base configurada en el proyecto. Se utilizaron cuentas, propietarios e inmuebles temporales. Las pruebas de fotos y documentos utilizaron almacenamiento HTTPS aislado en memoria; no modificaron archivos del hosting real. No se desplegaron cambios.

## Inconsistencia reproducida y corrección

Dos solicitudes simultáneas de captación en la misma posición devolvieron ambas 201. El bloqueo de la posición no era suficiente: la consulta posterior de asignaciones podía leer una instantánea anterior de la transacción bajo REPEATABLE READ.

La consulta de ocupación ahora utiliza una lectura con `FOR UPDATE`, que comprueba el estado confirmado más reciente. Se aplicó la misma corrección al reingreso de alquileres, que contenía el mismo patrón. La prueba de captación registra todos los ingresos exitosos antes de evaluar el resultado, para poder limpiarlos incluso si reaparece el fallo.

## Escenarios

- Captación sin propietario, vinculación posterior, campos incompletos, límites de texto y posición ocupada.
- Captación simultánea, cierre simultáneo, liberación de posición y concordancia entre panel, cartera y reportes.
- Visitas con fotos, sin evidencia confirmada y regularización posterior; vínculo correcto, compresión, portada, descarga privada y eliminación.
- Tasación antes/después de visita, tres precios, precios inválidos y cambios después de publicar.
- Expediente incompleto, documentos obligatorios, preparación y actualización de publicación.
- Venta antes de publicar, fechas imposibles/futuras, precio final y comisión.
- Alquiler, separación de resultados, renovación y reingreso con conservación de la ficha histórica.
- Catálogos de tipos y ubicaciones: permisos, duplicados, jerarquía, renombrado, desactivación, eliminación y concurrencia.
- Propietarios compartidos, responsables, borradores privados, anuncios desactualizados, reportes por fecha de actividad y paginación.

## Preservación

Se guardaron fuera del repositorio huellas SHA-256 del contenido de cada tabla antes de las simulaciones. La comparación ordena todas las filas y compara contenido y cantidad, no solamente conteos. La primera simulación, que reprodujo el fallo, terminó con todas las filas idénticas al estado inicial.

Esta comparación verifica las filas. Las inserciones temporales pueden avanzar los contadores AUTO_INCREMENT; no se reinician ni se reutilizan identificadores.

## Límites

Esta auditoría comprueba API y persistencia; no equivale a una prueba manual de cada formulario en navegador. Las comprobaciones de permisos utilizan sesiones temporales. No se probaron envíos externos ni se sustituyó el almacenamiento real para los usuarios del sistema.

La compilación con Webpack pasó. Turbopack falló por restricciones del entorno al abrir su puerto interno. ESLint, TypeScript y las 17 pruebas unitarias pasaron.

## Resultado final

Pasaron las tres suites de integración: fotos/flujo completo, precios y mejoras operativas. La captación concurrente terminó con respuestas 201 y 409; el cierre concurrente también produjo un solo ingreso exitoso. Todas las filas de las 23 tablas quedaron idénticas a las huellas iniciales después de eliminar los registros temporales. Las 17 comprobaciones de integridad devolvieron cero inconsistencias.

Estado conservado: 12 inmuebles, 12 propietarios, 90 posiciones, 12 asignaciones, 2 visitas, 1 tasación, 1 publicación, 9 archivos y ningún cierre. También se conservaron los 11 seguimientos, el borrador existente, los catálogos, las cuentas, las sesiones y el historial.

Mi evaluación: los flujos probados validan correctamente los expedientes incompletos y separan venta de alquiler. El defecto material fue la disponibilidad bajo concurrencia, que una prueba secuencial no habría detectado. La corrección está en el código local y fue verificada; requiere el despliegue habitual para llegar al sistema alojado.

## Despliegue posterior autorizado

El 7 de octubre se publicó la corrección en Vercel: `dpl_BC9zYCHu6XLWc4vjQU9X2yHTqTBf`, estado READY. La compilación remota con Turbopack y TypeScript pasó. Los dominios de producción apuntan a esta versión: https://intranet.inmobiliariaalbertoalfaro.com.pe y https://inmobiliaria-alfarov2-umber.vercel.app.

Pasó la comprobación autenticada de páginas y APIs, coherencia de panel/reportes, expediente y permisos de operador. Las cuentas temporales se eliminaron; la comparación posterior confirmó que todas las filas de las 23 tablas siguen idénticas a la línea base anterior a las simulaciones. El dominio de intranet devuelve 200 en login y 401 en reportes sin sesión.

Codespaces quedó ejecutando el servidor de desarrollo con Webpack en el puerto privado 3000. Login devuelve 200 y reportes sin sesión devuelve 401. Los cambios están guardados en el espacio de trabajo; esta publicación no creó un commit ni hizo push a GitHub.

Estos resultados verifican los escenarios ejercitados. No se ha medido capacidad bajo carga sostenida ni se ha probado restauración desde respaldos en esta auditoría.
