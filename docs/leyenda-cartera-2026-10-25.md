# Leyenda de Cartera según la vista

Se ajusta únicamente la leyenda de colores de Cartera. Se conserva el diseño original, las tarjetas, las listas, sus colores y sus reglas. La leyenda describe las etiquetas que ya se muestran.

| Color | Tarjetas | Lista compacta |
| --- | --- | --- |
| Amarillo | Pendientes | Visita pendiente |
| Violeta | No se utiliza | Tasación pendiente o por revisar |
| Azul | Seguimiento o publicación pendiente | Texto/publicación pendiente o seguimiento |
| Verde | Publicación registrada | Publicación registrada |
| Gris | Histórico o posición libre | Histórico |

En Tarjetas un pendiente puede usar amarillo en su etiqueta principal y azul en la etiqueta adicional de publicación pendiente; la leyenda refleja ambos usos sin cambiar los colores existentes.

Se sustituye «Completado» por «Publicación registrada». El expediente y el Portal web conservan sus estados propios; el verde no certifica la finalización de todos los procesos. La leyenda se selecciona según la vista realmente renderizada, incluido Histórico, que utiliza la lista aunque estuviera seleccionada la vista Tarjetas.

La revisión utiliza los estilos y condiciones reales de `PortfolioLabelRow.tsx`, `PortfolioPropertyCard.tsx` y `cardTheme` de Cartera. No hay cambios en APIs, esquema, datos ni permisos. Verificación: ESLint completo, compilación Webpack/TypeScript y comprobación del despliegue del commit en Vercel.

Para recuperar la leyenda anterior se puede revertir el commit de esta entrega; no requiere restaurar datos. El punto `recovery/diseno-20261025` sigue conservando el diseño anterior al rediseño.

## Presentación compacta

A petición del usuario, la leyenda visible se reduce a puntos de color y palabras breves. Se eliminan su título y explicación permanente; el significado completo queda en la ayuda ⓘ, desplegable por clic o teclado, sin desplazar el listado. Se conserva el contador de posiciones. En pantallas estrechas las etiquetas pueden repartirse en dos líneas para evitar desbordes.
