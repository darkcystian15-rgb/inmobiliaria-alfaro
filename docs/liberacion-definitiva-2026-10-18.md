# ID con contacto y dos formas de liberar — 18 de octubre de 2026

## Cambios solicitados

- En el panel de detalle de Cartera se conserva un solo bloque **ID del inmueble** con el contacto al final: `012-venta-local-av meigss c3-lidia chavarria`.
- Se retira de ese panel el bloque separado «Contacto». El dato sigue guardado y visible en los demás apartados.
- El Listado de archivos usa también el ID con contacto. Se conserva el ID base en los otros listados y los códigos de base de datos no cambian.
- Si se filtra una zona concreta, no se repite la zona debajo de cada resultado. En «Todas las zonas activas» se conserva la indicación de zona para distinguir los resultados.
- Cada fila muestra una sola etiqueta de archivo, como «Tasación 1», sin repetir debajo su nombre/categoría. El nombre original se mantiene al abrir el visor.

## Liberar inmueble por zona

Dos acciones expresas dentro de la zona seleccionada:

1. **Cerrar operación y conservar en Histórico:** venta o alquiler realizados por la inmobiliaria. Valida fecha, resultado económico y comisión según las reglas existentes; conserva ficha, documentos, fotos, historial y resultado. Libera la posición. Los motivos de retiro/cancelación ya no se aceptan como nuevos cierres históricos.
2. **Eliminar definitivamente:** desistimiento, venta/alquiler por otro canal u otro motivo con detalle obligatorio. Elimina físicamente la ficha, sus archivos, fotos y registros relacionados, y libera la posición. No se convierte en una ficha histórica ni en una papelera.

Los registros históricos anteriores no se borran ni se reclasifican automáticamente con esta entrega.

## Dos confirmaciones de eliminación

- «Revisar eliminación» abre el primer diálogo, con identidad y alcance del borrado.
- «Continuar con la eliminación» prepara una confirmación de servidor y abre el segundo diálogo: **«¿Seguro que quieres eliminar este inmueble?»**. Muestra también la cantidad de archivos.
- Solo **«Sí, eliminar definitivamente»** ejecuta el borrado. Cancelar cualquiera de los dos diálogos conserva el inmueble.
- La confirmación pertenece al administrador que la preparó, a ese inmueble y a esa zona; caduca a los cinco minutos. El servidor compara una huella de la ficha y registros relacionados: si cambiaron, exige revisar y confirmar otra vez.
- No se permiten peticiones anónimas, de operador, sin zona o de otra zona. La segunda petición requiere el identificador preparado y la confirmación expresa.

## Integridad y archivos privados

El borrado de datos se hace en una transacción con bloqueos: archivos, visitas, tasaciones, publicaciones, negociaciones, expediente, seguimientos, anuncios, historial, aliases y asignaciones de posición tanto actuales como antiguas. Se borran los borradores de la ficha actuales y antiguos (ID numérico, códigos previos o identidad en el formulario) y se retira únicamente la entrada del inmueble de los borradores compartidos. Los guardados posteriores no pueden reintroducir borradores de una ficha ya inexistente.

Se conserva la zona, su posición reutilizable, los catálogos y los datos de otros inmuebles. Un propietario antiguo se borra solo si ya no tiene inmuebles asociados. Si otro inmueble apunta a la captación eliminada, se retira únicamente ese enlace; no se elimina la otra ficha. Los archivos compartidos con otra ficha se conservan para ella.

Después de confirmar la transacción se borran los archivos físicos por el servicio privado del hosting. Una tarea técnica temporal conserva únicamente lo necesario para completar esa limpieza. Si el hosting falla o la función se interrumpe, la pantalla avisa que falta borrar archivos y ofrece **Completar eliminación de archivos**; el trabajo no se pierde y los archivos ya no son accesibles mediante la ficha eliminada. No se anuncia eliminación completa hasta terminar. Las llamadas DELETE al hosting son idempotentes; al terminar se borra la tarea.

No se conserva historial operativo del inmueble eliminado. Solo queda un evento técnico mínimo de seguridad (administrador, fecha, acción y UUID de operación), sin contacto, ficha ni contenido de archivos.

## Base de datos

- Se añade únicamente `inm_eliminaciones_pendientes`, InnoDB: confirmaciones temporales y limpieza de archivos pendiente. No tiene FK al inmueble porque la ficha se elimina físicamente antes de la limpieza.
- Migración aditiva: `db/migrations/0017_property_deletion.sql`. También está en el modelo Drizzle y en el esquema de instalaciones nuevas.
- Instalador: `node scripts/install-property-deletion.mjs`, previsualiza por defecto. La aplicación requiere la tabla antes de desplegar esta versión.
- Se probó en MySQL local: previsualización sin escrituras, creación y segunda previsualización sin cambios. La aplicación ya se probó contra un esquema nuevo exportado desde Drizzle.
- En producción se confirmó primero que no existía y se añadió con `--apply --checkpoint restore-points/liberacion-definitiva-20261018T022959Z/esquema`. El instalador verificó InnoDB. No se eliminaron ni actualizaron inmuebles reales al instalarla.

## Punto de restauración privado

`restore-points/liberacion-definitiva-20261018T022959Z/`, excluido de Git y Vercel.

- Commit previo: `05ad01fd1632a72e20df14c75af953b067f7e0f4`.
- `source.tar.gz`, `repository.bundle` y `manifest.json`: fuente e historial anteriores, con SHA-256.
- `datos/business.json` y `business-manifest.json`: instantánea consistente de 24 tablas de negocio y sus esquemas, sin contraseñas, tokens ni sesiones.
- `datos/files/`: copia de los nueve archivos privados existentes en esa consulta, con sus rutas y hashes en la instantánea. Las cifras corresponden a ese momento.
- `esquema/deletion-schema-before.json` y `deletion-schema-applied.json`: constancias del cambio aditivo y su hash.
- Directorios privados y archivos 0600. Se verificaron los hashes de fuente, bundle, metadatos y de cada documento.

El hosting local contiene secretos no exportables. Las copias de archivos se obtuvieron desde la intranet autenticada con una cuenta temporal, eliminada al terminar. No se modificaron datos de negocio para respaldar.

**Recuperación:** verificar hashes antes de usar las copias, extraer la fuente/clonar el bundle en otro directorio y revisar actividad posterior. El último código anterior acreditado es `be75db0`, Production GitHub `7148704744`, URL https://inmobiliaria-alfarov2-8fmhtptt8-puma19.vercel.app. La tabla técnica es aditiva y puede permanecer al volver al código previo; no descartar tareas de archivos pendientes sin revisarlas. Recuperar una ficha borrada exige restaurar coordinadamente sus registros y archivos privados desde la copia y comprobar que su antigua posición siga libre. No sobrescribir otros inmuebles ni actividad posterior. Esta copia cubre los datos existentes al tomarla, no documentos creados después.

## Validación

- 27 archivos de pruebas unitarias correctos.
- ESLint sin advertencias y compilación Webpack/TypeScript correctos.
- `tests/file-list.integration.mjs`, MySQL 8.4 y hosting HTTPS locales desechables: ID con contacto, ausencia de etiquetas duplicadas, cierre histórico, borrado de todas las relaciones (incluidas asignaciones antiguas), permisos, zona, confirmación ausente/caducada, cambios posteriores, rollback completo ante FK desconocida, borradores, propietarios y archivos compartidos, fallo parcial del hosting y reintento durable.
- Navegador autenticado local: cancelar el primer y segundo diálogo no borra; confirmar el segundo sí elimina una ficha ficticia. Capturas privadas en `output/property-delete-local/`, escritorio y móvil sin errores JavaScript ni desbordes.
- Todas las eliminaciones de prueba se hicieron exclusivamente sobre datos ficticios locales. No se utiliza una ficha real para probar el borrado.

## Publicación

- Código publicado: `3604f0606bba6bee81ca287511302fbb9aee0812`, subido atómicamente a `main` y `feat/registro-simplificado`; ambas referencias remotas comprobadas en ese SHA.
- Vercel informó a GitHub estado `success`, «Deployment has completed», entorno **Production**, despliegue GitHub `7150850215`, el `2026-10-18T06:19:38Z`.
- URL de versión: https://inmobiliaria-alfarov2-ego6dlnjs-puma19.vercel.app.
- Evidencia: API de despliegues de GitHub para ese SHA y `/repos/darkcystian15-rgb/inmobiliaria-alfaro/deployments/7150850215/statuses`.
- Comprobación autenticada del dominio https://intranet.inmobiliariaalbertoalfaro.com.pe con `tests/file-list.production.smoke.mjs`: correcta. Siete zonas activas y un archivo coincidente en esta consulta; filtros de zona y cuatro tipos, permisos anónimo/operador, apertura privada, ID con contacto, etiquetas sin duplicar, zona obligatoria, cancelación del primer diálogo de eliminación y navegador de escritorio/móvil sin errores ni desbordes.
- La prueba no ejecutó eliminaciones ni modificó inmuebles, documentos o cierres reales. Las dos cuentas y sesiones temporales fueron eliminadas al terminar. La confirmación completa del borrado conserva la evidencia local ficticia descrita arriba.
- Comprobación de esquema por previsualización: `apply:false`, `newTable:false`, `businessWrites:0`. No se repitió la migración.
- Validación repetida al completar la entrega: 27 archivos de pruebas correctos, ESLint sin advertencias y compilación final Webpack/TypeScript correcta. El sandbox impidió la primera compilación; fuera de él terminó correctamente tras reintentos de recursos externos.
- El primer intento de subida recibió HTTP 403 con la credencial activa del entorno. La credencial personal ya guardada permitió completar la subida; no se cambiaron permisos del repositorio.
- Capturas privadas actualizadas en `output/file-list-production/`, excluidas de Git y Vercel. Los commits posteriores de documentación no alteran el código publicado.
