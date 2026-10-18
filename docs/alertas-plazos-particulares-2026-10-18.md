# Alertas y plazos particulares — 18 de octubre de 2026

## Comportamiento

El panel sustituye las tres prioridades por antigüedad por alertas de actividades, ordenadas por fecha límite vigente: vencidos primero, con hasta diez filas por página. Muestra el total real del grupo, contadores de vencidos, vencen hoy y próximos dos días; filtros y paginación permiten revisar todos los pendientes sin truncarlos a diez. Si no hay vencidos, la prioridad actual muestra los que vencen hoy; después los próximos y, en ausencia de estos, el resto de pendientes.

Cada fila muestra zona, posición y contacto del inmueble, actividad, límite y días de atraso. Permite atender la actividad o abrir Seguimiento en la ficha correcta. Un límite particular se identifica como tal. Los contratos de alquiler conservan su sección independiente.

## Ajuste por inmueble

Seguimiento queda reservado al administrador, tanto en la pestaña como en la API. Muestra el límite vigente de la actividad actual y si procede del plazo general o de una fecha particular. El formulario contiene actividad, fecha límite particular y observación; se elimina la selección de responsable. Los datos históricos anteriores se conservan.

Una fecha particular manda sobre el plazo general. Ampliarla a futuro retira esa actividad del grupo de vencidos; ponerla hoy la mueve a «Vencen hoy». Vaciarla y guardar vuelve al plazo general. El pendiente sigue existiendo hasta completar su actividad. Cada ajuste registra fecha, usuario y valores anteriores/nuevos en el historial, que se actualiza en la ficha al guardar.

Agenda y ficha comparten la misma consulta de actividad y el mismo cálculo de plazo. Visitas pendientes utiliza el mismo cálculo de calendario de Perú. El panel vuelve a consultar al abrirlo, recuperar el foco o cada minuto. No hay sincronización instantánea entre dispositivos; el refresco periódico recoge los cambios externos.

## Configuración general

Los valores generales se editan en Administración → Plazos generales, fuera de la ficha. Visita conserva dos días y tasación tres mientras el administrador no cambie su configuración. Cambiar un valor general recalcula los pendientes sin fecha particular; no modifica límites particulares ni fechas reales de visitas/tasaciones.

Los plazos se cuentan desde el registro que activa cada etapa, como en la corrección previa. El panel muestra la siguiente actividad operativa pendiente de cada inmueble activo con posición: visita, tasación, material o publicación. El expediente documental conserva su control específico en Estado del expediente y su ajuste en Seguimiento; no se duplica como una segunda alerta operativa de la misma ficha.

## Validación

Validación aprobada: lint, compilación Webpack/TypeScript, 30 archivos de pruebas unitarias y `tests/workflow-deadline.integration.mjs`. Se comprobaron calendario y clasificación de alertas, más de diez vencidos con totales y páginas sin duplicados, reprogramación mediante API y formulario, retorno al plazo general, conservación de límites particulares al cambiar el general, historial y permisos de operador. La integración se ejecutó en una base local aislada, sin cambiar datos comerciales de producción.

## Publicación comprobada

- Código: `df532a59e1e821acdc632d9af0af95a224f22d76`, publicado atómicamente en `main` y `feat/registro-simplificado`.
- Vercel Production `7160140428`: `success`, `2026-10-18T20:17:42Z`, URL técnica `https://inmobiliaria-alfarov2-bt6q9slog-puma19.vercel.app`.
- Vercel Preview `7160130874`: `success`, `2026-10-18T20:16:53Z`, mismo código.
- Verificación autenticada del dominio de producción: `2026-10-18T20:18:20.010Z`. Diez filas de un grupo de 116 próximos a vencer, cero vencidos y cero que vencen hoy en esa consulta. Estos conteos son una instantánea, no valores fijos del sistema.
- Panel y ficha coinciden en el límite vigente; Seguimiento y sus API quedan bloqueados para operador. Configuración general disponible fuera de la ficha. Escritorio y móvil de 375 px sin errores JavaScript ni desbordamiento horizontal.
- Se bloquearon las solicitudes de escritura de negocio del navegador. No se editaron inmuebles ni plazos reales. Las cuentas y sesiones temporales se retiraron y se comprobó su ausencia. La base local aislada también fue retirada.
- Evidencia privada excluida de Git/Vercel: `output/alerts-production-smoke.mjs` y `output/alertas-plazos/production-result.json`, con capturas del panel y ficha.

Los commits de evidencia posteriores solo modifican Markdown. Punto anterior de recuperación: `e38e2af260533eaa4883ffca831d792cde88904f`; la entrega no requiere migraciones.
