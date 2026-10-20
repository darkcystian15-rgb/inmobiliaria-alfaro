# Liberar inmueble desde el menú general, una zona y Cartera

Entrega del 20 de octubre de 2026. Solicitada junto con la publicación del
cambio de nombre de la pestaña Visitas a **Fotos** en Información de inmuebles.

## Funcionamiento

- Sin zona elegida, Seguimiento muestra **Liberar inmueble**. La pantalla
  presenta un selector de zona antes de consultar inmuebles activos.
- Con una zona activa, el menú abre el mismo módulo dentro de esa zona.
  El selector permite cambiar de zona; al cambiar se descarta la selección
  anterior de inmueble y se reinician los formularios de la pantalla.
- Al abrir la tarjeta de un inmueble activo en Cartera aparece **Liberar este
  inmueble**. El enlace abre `/liberar-inmuebles?zona=…&inmueble=…` con la clave
  interna del inmueble, muestra solo esa ficha y despliega sus opciones.
- Funciona también desde el listado general: el enlace usa la zona real de la
  ficha. Se conserva la búsqueda, estado y filtros de Cartera en el enlace de
  regreso. **Ver todos los inmuebles de la zona** retira la selección individual.
- Si una ficha ya no está activa, no existe o pertenece a otra zona, no se abre
  el formulario de otra ficha por sustitución; se muestra el aviso correspondiente.

Las opciones conservan su funcionamiento: cierre de operación a Histórico,
suspensión exclusiva de ventas y eliminación definitiva con dos confirmaciones.
Abrir el enlace no ejecuta ninguna de esas acciones. Los históricos no muestran
el nuevo acceso de liberación; las ventas suspendidas conservan su retorno existente.

## Datos y permisos

No hay migraciones, cargas ni cambios masivos de negocio. La API mantiene su
requisito de administrador y zona tanto para consulta como para escritura.
El selector general no habilita operaciones contra todas las zonas a la vez.
Se conservan transacciones, validaciones y limpieza durable de archivos.

## Pestaña Fotos

El nombre visible **Visitas** pasa a **Fotos** en Información de inmuebles.
Se conserva la clave interna y la compatibilidad de enlaces `pestana=visitas`,
así como la vinculación de fotografías a sus visitas.

## Verificación y entrega

- 32 archivos de pruebas unitarias aprobados; ESLint sin errores ni advertencias.
- Compilación de producción Webpack y TypeScript correcta fuera del sandbox.
  El intento restringido no pudo leer `tsc --showConfig`.
- `tests/sale-suspension.integration.mjs` sobre MySQL 8.4 local aislado y navegador:
  menú sin zona, selector, cambio a una zona vacía, acceso desde listado general,
  ficha única desplegada, opciones de cierre/suspensión/eliminación, regreso con
  búsqueda conservada, retirada del filtro individual y rechazo de ficha ajena
  o inexistente. Pestaña Fotos y enlace antiguo comprobados.
- Vistas de 1440 y 375 px, sin desbordamiento horizontal ni errores JavaScript.
  La navegación no intentó escrituras y conservó las tres fichas ficticias activas.
- La misma integración aprobó suspensión/retorno, Histórico, liberación de posición,
  conservación de relaciones, concurrencia, permisos y cierres de venta/alquiler.
- El primer ensayo arrancó antes de finalizar la compilación y se repitió sobre
  el build completo. Un selector de prueba demasiado estricto se corrigió antes
  de la ejecución satisfactoria; no se modificó la interfaz para satisfacerlo.

Las capturas privadas se guardan en `output/release-navigation/` y los registros
de prueba permanecen fuera de Git. Publicación y contraste de producción pendientes
de registrar tras el despliegue.
