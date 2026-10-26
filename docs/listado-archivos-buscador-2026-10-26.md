# Listado de archivos: búsqueda automática, colores y vista previa

## Cambios

- Buscador automático con espera de 300 ms al escribir y cancelación de solicitudes anteriores. Consulta todos los archivos coincidentes, no solo la página visible.
- Busca por palabras en código/posición del inmueble, operación, tipo de inmueble, dirección, contacto, zona y nombre del documento. Conserva zona y tipo en la URL y vuelve a la primera página al cambiar filtros.
- Límite de 150 caracteres y consultas parametrizadas. `%` y `_` se interpretan como texto, sin comodines SQL.
- La numeración por inmueble y categoría se calcula antes de buscar y paginar: buscar una tasación concreta conserva su número.
- Filtros y encabezado con tonos ámbar como las carpetas de Cartera; etiquetas ámbar para tasaciones, azul para contratos, verde para minutas y violeta para escrituras. Se conserva el texto de cada categoría.
- Nombre original del archivo visible con icono de formato y botón rojo de apertura.
- Una página fuera de rango muestra la última página disponible.
- PDF e imágenes se consultan desde el visor con carga autenticada privada, indicador de carga, mensaje de error y liberación de la URL temporal al cerrar. Descargar sigue siendo opcional. La visualización de PDF depende del soporte del navegador; se ofrece apertura en otra pestaña.
- Word y Excel muestran: «Vista previa no disponible para archivos Word o Excel. Debes descargar el archivo para consultarlo.». En estos formatos se ofrece Descargar archivo, sin un botón que sugiera una vista previa.

## Datos y acceso

No se añaden tablas, migraciones ni cambios de documentos existentes. Se mantienen los permisos y las rutas de descarga autenticadas. No se envían archivos a visores externos. El visor compartido aplica estas mejoras también a la ficha del inmueble.

## Validación

- Pruebas unitarias de filtros y documentos correctas, incluida longitud y normalización de búsqueda.
- TypeScript y ESLint de los archivos modificados correctos.
- Integración ampliada para búsqueda combinada, búsqueda de documento en segunda página conservando número, caracteres literales, página fuera de rango y búsqueda automática en navegador.
- Compilación de producción con Webpack correcta, usando una URL de base local válida (la variable heredada del entorno no era una URL utilizable).
- `tests/file-list.integration.mjs --file-list-only`: correcto con MySQL 8.4 desechable. Verifica permisos, cuatro categorías, zonas activas, búsqueda por contacto/dirección, documento de segunda página conservando «Tasación 53», texto con `%`/`_`, página fuera de rango, PDF mediante URL blob privada y aviso de Word/Excel sin botón de apertura.
- Navegador autenticado a 1440 y 375 px: sin errores JavaScript ni desbordamiento horizontal. Capturas privadas en `output/file-list-search/desktop.png` y `mobile.png`.
- La ejecución histórica sin la opción específica se detuvo en Liberaciones por una tabla ausente del entorno de ensayo. La prueba específica completa del listado pasó. No se alteraron datos de producción para probar.

## Publicación

Solicitada por el usuario en Vercel. Pendiente de completar y confirmar el despliegue.

## Recuperación

Revisión anterior: `a635809709e8ec5f334a8cc572260f8334cf4c18`. Revertir el commit funcional de esta entrega y publicar de nuevo. No requiere restauración de base de datos.
