> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Tipos de inmueble

Administración → Tipos de inmueble permite agregar, renombrar, activar y desactivar opciones. Solo el administrador puede realizar cambios; el operador consulta el catálogo para editar fichas. Los nombres son únicos y tienen un máximo de 30 caracteres.

Renombrar actualiza el catálogo y los tipos de todos los inmuebles vinculados en una transacción. Desactivar conserva las asignaciones existentes, incluidas las históricas, e impide nuevas asignaciones. Una ficha puede conservar su tipo inactivo al modificar otros campos. El administrador puede eliminar tipos sin inmuebles vinculados, activos ni históricos. Se requiere confirmación en pantalla y el servidor vuelve a comprobar los vínculos dentro de una transacción bloqueada frente a asignaciones y renombrados simultáneos. Los cambios se registran en el registro de seguridad.

El registro, la ficha y los filtros de Cartera y Reportes consultan el catálogo. Los filtros incluyen tipos inactivos para consultar el historial. Las escrituras validan el catálogo en el servidor, sin depender de las opciones que muestre el navegador.

Instalación idempotente: `node scripts/install-property-types.mjs`. Crea `inm_tipos_inmueble`, instala las opciones iniciales solo si el catálogo está vacío e importa los tipos que ya utilizan los inmuebles sin cambiar sus datos. La migración equivalente está en `db/migrations/0010_amazing_bromley.sql`.

Prueba: `tests/photos.integration.mjs` comprueba permisos, duplicados, tipos desconocidos, renombrado compartido, rechazo de asignaciones inactivas, conservación del tipo inactivo y reactivación, usando datos temporales que elimina al finalizar.
