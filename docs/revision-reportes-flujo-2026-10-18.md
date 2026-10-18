# Revisión de Reportes con el flujo actual — 18 de octubre de 2026

## Hallazgos y cambios

1. Los pendientes no exponían el plazo vigente ni el atraso después de incorporar límites particulares. Se añade el reporte «Alertas de actividades» y el filtro «Plazo de actividad», con Vencido, Vence hoy y En plazo. La selección de actividades y fechas utiliza la misma consulta que el panel y la ficha. Los filtros se aplican antes de contar y paginar; ampliar un plazo retira el inmueble del reporte de vencidos.
2. Las columnas recomendadas se elegían por un recorte genérico y podían omitir la fecha de visita o el plazo. Ahora dependen del propósito del reporte: fecha real en actividades realizadas, límite/atraso en pendientes, inicio/fin en flujos, fechas e importes en salidas e historial de posición.
3. La descarga no identificaba la zona y reutilizaba la hora de la consulta anterior aunque obtenía datos nuevos. PDF y Excel incluyen la zona y los filtros aplicados, y registran la fecha de generación de la descarga. Se elimina la aclaración repetida de horario del PDF; se conserva el calendario de Perú.
4. «Cartera activa» anunciaba posiciones activas, pero su filtro admitía inmuebles activos sin posición. Ahora exige la posición activa, como el recorrido de cartera.
5. «Posiciones disponibles» se calculaba después de cargar inmuebles, podía truncar datos auxiliares y mezclaba filtros de inmuebles con huecos que aún no los tienen. Tiene consulta, total y paginación propios por zona/posición. Los filtros no aplicables quedan deshabilitados. El resto de reportes distingue la cifra contextual de posiciones libres de la zona.
6. Se retira la restricción antigua de posiciones 01–90 de la búsqueda de reportes, sin cambiar la capacidad o numeración existente de ninguna zona.
7. La última visita completada se elige con un orden estable de fecha de registro e identificador; el filtro de fecha y la fila muestran la misma visita aunque haya varias registradas el mismo día.
8. Las cancelaciones anteriores con un motivo distinto a los tres nombres actuales podían contar en el total y desaparecer de las filas. El detalle y el total ahora incluyen los mismos motivos de salida distintos de venta/alquiler.
9. El catálogo de la interfaz y la API se comparte. Los nombres de reportes inexistentes y estados no válidos se rechazan con un error explícito, sin devolver un conjunto de inmuebles distinto del solicitado.
10. En históricos, el filtro por posición utiliza la misma última asignación que aparece en la fila, para que una posición antigua no se cuente y desaparezca al mostrar el resultado. El reporte de uso de posiciones sigue mostrando cada asignación histórica por separado.
11. El nombre del inmueble en el resultado permite abrir su ficha conservando su zona. Los tiempos de flujo se describen como intervalos entre registros del sistema, para no confundirlos con la fecha histórica real de una visita.

12. En móvil, los indicadores se presentan en dos columnas para no alejar el resultado; las tablas amplias indican que se pueden recorrer horizontalmente.

## Alcance

No se cambian datos, visitas, tasaciones, posiciones, plazos generales ni fechas particulares. Las actividades completadas conservan sus fechas reales. La búsqueda de texto y el orden de la tabla siguen actuando sobre la página visible y se indican como tales; la exportación obtiene todas las filas de los filtros aplicados. El límite de seguridad de exportación se mantiene en 10 000 filas.

Los reportes de salidas e históricos se conservan. El reporte de alertas refleja la próxima actividad operativa de cada inmueble activo con posición, como el panel; los contratos de alquiler conservan sus vistas propias.

## Validación

Aprobados lint, compilación Webpack/TypeScript y 32 archivos de pruebas unitarias. La integración `tests/reports-workflow.integration.mjs` pasó en una base local aislada: los 22 reportes con igualdad de filas/totales; más de 50 inmuebles y posiciones libres; posición 101; históricos con dos asignaciones; visitas repetidas; fechas reales; plazos coincidentes con el panel y reprogramación; filtros; columnas por actividad; descargas PDF/Excel con zona y valores, y navegador en escritorio/móvil sin errores ni desbordamiento.

## Publicación y contraste de producción

- Lógica de reportes: `70203ac483a17e1b99bb030ea5a34979904e46e3`, publicada en `main` y `feat/registro-simplificado`.
- Vercel Production `7160691871`: `success`, `2026-10-18T21:02:57Z`, URL técnica `https://inmobiliaria-alfarov2-ntpgh4gwc-puma19.vercel.app`.
- Vercel Preview `7160697773`: `success`, `2026-10-18T21:03:25Z`, mismo código.
- Contraste autenticado del dominio de producción el `2026-10-18T21:03:59.166Z`: 22 reportes con filas/totales coincidentes. Instantánea: 129 activos, 71 posiciones libres, 13 inmuebles con visita realizada, 116 visitas pendientes, 13 tasaciones pendientes y ninguna tasación registrada. Los números son resultados de esa consulta, no valores fijos.
- Las alertas coinciden con el panel en inmuebles, orden, límite y estado de plazo. Descargas PDF y Excel aprobadas; Excel incluye la zona y todas las filas del reporte, no solo la página visible. Escritorio/móvil sin errores ni desbordamiento y acceso de operador denegado.
- Sin escrituras de negocio. Cuentas y sesiones temporales retiradas y ausencia comprobada. Bases locales de ensayo retiradas.
- Evidencia privada excluida de Git/Vercel: `output/reports-audit-production-smoke.mjs` y `output/reportes-auditoria/production-result.json`, junto con capturas. El ajuste posterior de presentación móvil solo compacta indicadores y añade la indicación de desplazamiento; conserva las consultas y exportaciones validadas.

Punto anterior de recuperación: `1c58d694623b858794a13e66830037588d191a1e`. Sin migraciones ni cambios de datos.
