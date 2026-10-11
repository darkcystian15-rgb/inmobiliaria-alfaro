# Tasaciones por zona

La entrada de «Registrar tasaciones» presenta carpetas por distrito, siguiendo el criterio de zonas de cartera y visitas. Cada carpeta muestra cuántas tasaciones están pendientes de registro y cuántas están vigentes. Las zonas con tasaciones vigentes siguen accesibles aunque no tengan pendientes.

Al abrir una carpeta, los indicadores, los formularios pendientes y la lista de tasaciones negociadas corresponden a esa zona. Se conservan ubicación, propietario, DNI, fecha, los tres precios, observación, guardado y acceso al seguimiento. «Zona actual» identifica la carpeta abierta.

«Ver listado general» reúne todas las zonas; «Volver a zonas» regresa a las carpetas. Cambiar de vista conserva los valores escritos en los formularios y su recuperación como borrador.

El indicador de tasaciones de cartera abre `/registrar-tasaciones?zona=<zona>`. `*` representa el listado general. El acceso existente `?inmueble=<id>` sigue enfocando ese inmueble. La ruta histórica `/tasaciones-pendientes` redirige conservando zona e inmueble.

La API agrega el distrito a sus resultados; las reglas de registro y autenticación permanecen vigentes.

Verificación: TypeScript, ESLint, compilación de producción y navegador en escritorio y celular. Se comprobó Chimbote con 3 pendientes y 1 vigente, listado general, recarga, historial, conservación del formulario, foco por inmueble y zona vacía. El guardado se simuló en la vista previa, sin modificar tasaciones reales.
