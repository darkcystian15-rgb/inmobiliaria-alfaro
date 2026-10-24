# Pestañas en Registrar tasaciones

24 de octubre de 2026. La pantalla mantiene el flujo existente de tasación → texto → publicación, con dos pestañas:

- **Tasaciones por registrar**: formulario de los inmuebles con visita realizada y sin tasación.
- **Tasaciones Negociadas Registradas**: consulta de las tasaciones guardadas, con acceso a Actualizar valores e Ir a textos.

Solo se muestra un apartado a la vez. Cada pestaña tiene buscador independiente y contador de la zona; cambiar de pestaña conserva la búsqueda de cada apartado y lo escrito en el formulario, incluida la moneda. Las pestañas admiten flechas, Inicio y Fin con teclado y se bloquean mientras se guarda.

Un registro correcto abre Tasaciones Negociadas Registradas, limpia únicamente los campos del inmueble guardado y muestra la confirmación con Registrar texto de este inmueble. Se mantiene la zona en ese acceso. La búsqueda de registradas se limpia tras registrar para que el nuevo registro no quede oculto por un filtro anterior. Los errores de validación conservan el formulario y su pestaña.

La pestaña seleccionada se refleja en el parámetro `pestana` conservando zona, inmueble y regreso. Un enlace directo a un inmueble ya tasado abre Registradas por defecto. Los contadores reflejan la zona completa; si se llega a un inmueble pendiente concreto, el formulario puede centrarse en él y ofrece Ver todos los pendientes. Los enlaces para actualizar valores y continuar con textos incluyen la zona del inmueble y mantienen las reglas de navegación existentes.

No se cambian API, esquemas, importes, monedas guardadas, textos, confirmaciones de publicación, archivos ni permisos. Los borradores mantienen su formato y su recuperación anterior. Editar una tasación continúa conservando la etapa de texto/publicación.

## Restauración

Código anterior `152d9b9400c001fcb121c41f1b472f0ef18c5724`, conservado en `restore-points/tasaciones-pestanas-20261024/anterior.bundle`, privado y excluido de Git. Historial completo comprobado con git bundle verify. La corrección se puede revertir restaurando únicamente código, sin restaurar datos. Sigue disponible el punto de datos cifrado descrito en [Panel, precios y listados](panel-precios-listados-2026-10-24.md).

## Verificación

ESLint sin advertencias, TypeScript y compilación Next.js webpack aprobados (61 páginas). Integración con MySQL local desechable y Chromium autenticado en 1440/375 px aprobada: un solo panel visible, búsquedas independientes, búsqueda sin resultados, conservación de formulario/moneda al alternar, navegación con flechas, selección de Registradas tras guardar, limpieza de su filtro para mostrar el nuevo inmueble, contadores y acceso al texto con inmueble/zona correctos, y pestaña conservada tras recargar. También se mantuvieron las comprobaciones de edición de precios, regreso al panel y conservación de publicación, fechas y etapa. Capturas inspeccionadas; sin errores de ejecución ni desbordes.

Las escrituras de prueba fueron ficticias y exclusivamente locales; los datos de prueba se retiraron al terminar. La publicación sigue el despliegue automático de `main` al proyecto Vercel existente, sin migraciones ni tareas de modificación de datos de producción.
