> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Visitas pendientes por zona

La entrada de «Visitas pendientes» presenta carpetas agrupadas por el distrito registrado del inmueble, siguiendo el criterio de zonas de la cartera. Cada carpeta muestra su cantidad de visitas y las que requieren atención según el plazo de seguimiento existente.

Al abrir una zona, los indicadores y la lista corresponden únicamente a sus visitas. Se conservan posición, código, inmueble, tipo, ubicación, propietario, fecha límite, antigüedad y acceso al registro de la visita.

«Ver listado general» permite consultar todas las visitas y «Volver a zonas» regresa a las carpetas. La búsqueda y el filtro de antigüedad operan dentro de la vista seleccionada.

El indicador «Visitas pendientes» de la cartera abre `/visitas-pendientes?zona=<zona>`. El valor `*` representa el listado general; una URL sin zona muestra las carpetas. Los inmuebles sin distrito se agrupan en «Sin zona registrada».

La API conserva su autenticación y agrega el distrito a cada resultado. Esta actualización no modifica los datos ni el flujo de tasaciones.

Verificación: compilación de producción, TypeScript, ESLint y navegación en escritorio y celular; apertura de Chimbote, recarga con zona, búsqueda, listado general, historial del navegador y zona sin pendientes.

La zona abierta se identifica con el bloque «Zona actual», compartido con la cartera. El listado de visitas no muestra el responsable.
