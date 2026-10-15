> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Navegación, reintentos y formularios móviles

Punto de restauración previo: `recuperacion-antes-tres-mejoras-navegacion-20261011`.

- Los enlaces desde Cartera de inmuebles transportan la zona, búsqueda, estado, operación, tipo, posición, distrito, actividad y vista. Visitas pendientes transporta zona, búsqueda y antigüedad; Tasaciones y textos conserva zona y sección. Las fichas y los siguientes pasos mantienen ese origen. Al registrar se ofrece volver al listado de origen; no hay redirección automática. Las URLs de retorno admiten únicamente rutas internas conocidas.
- Reintentar vuelve a consultar datos y conserva los campos escritos. Se añadió en visitas pendientes, tasaciones y textos, registros, salida de inmuebles, contratos y consulta de ficha. Los errores de registro y validación conservan sus mensajes; no se repiten escrituras automáticamente. La actualización periódica de Cartera mantiene el listado visible.
- En celular, Registrar inmueble y Subir documento tienen acciones al pie con los mismos controles y validaciones. El registro muestra también la ayuda de campos faltantes. Los mensajes de los formularios se llevan a la vista; las acciones de visita y tasación se mantienen en su tarjeta. Las acciones de guardar cambios en la ficha se acomodan en columna en pantallas pequeñas.

No cambian APIs, payloads, cálculos, permisos, estados del negocio ni recuperación de borradores. No se añadió la guía para usuarios nuevos.

Validación: ESLint, TypeScript, compilación completa Next.js y pruebas de navegador con consultas y guardados simulados. Se comprobaron conservación de filtros, origen en siguiente paso y cancelación, reintentos GET, validaciones existentes, envío del formulario documental desde el botón móvil y ancho móvil sin desbordamiento. Sin escrituras de prueba en la base de datos real.
