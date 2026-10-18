> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Tipos de inmueble

Administración → Tipos de inmueble permite agregar, renombrar, activar y desactivar opciones. Solo el administrador puede realizar cambios; el operador consulta el catálogo para editar fichas. Los nombres son únicos y tienen un máximo de 30 caracteres.

Renombrar actualiza el catálogo y los tipos de todos los inmuebles vinculados en una transacción. Desactivar conserva las asignaciones existentes, incluidas las históricas, e impide nuevas asignaciones. Una ficha puede conservar su tipo inactivo al modificar otros campos. El administrador puede eliminar tipos sin inmuebles vinculados, activos ni históricos. Se requiere confirmación en pantalla y el servidor vuelve a comprobar los vínculos dentro de una transacción bloqueada frente a asignaciones y renombrados simultáneos. Los cambios se registran en el registro de seguridad.

El registro, la ficha y los filtros de Cartera y Reportes consultan el catálogo. Los filtros incluyen tipos inactivos para consultar el historial. Las escrituras validan el catálogo en el servidor, sin depender de las opciones que muestre el navegador.

Instalación idempotente: `node scripts/install-property-types.mjs`. Crea `inm_tipos_inmueble`, instala las opciones iniciales solo si el catálogo está vacío e importa los tipos que ya utilizan los inmuebles sin cambiar sus datos. La migración equivalente está en `db/migrations/0010_amazing_bromley.sql`.

Prueba: `tests/photos.integration.mjs` comprueba permisos, duplicados, tipos desconocidos, renombrado compartido, rechazo de asignaciones inactivas, conservación del tipo inactivo y reactivación, usando datos temporales que elimina al finalizar.


## Ampliación del 18 de octubre de 2026

Se agregaron al catálogo activo **Módulo**, **Condominio**, **Colegio** y **Almacén**, por solicitud del usuario, como preparación para Nuevo Chimbote. La operación usa la API de administración existente, sin migración de esquema ni cambios de código de aplicación. Se conservan los tipos anteriores y no se asignan estos tipos a fichas existentes.

Verificación completada el `2026-10-18T13:44:25.244Z`: 13 tipos en total; Módulo (40), Condominio (41), Colegio (42) y Almacén (43), activos y sin duplicados. La consulta de catálogo, la pantalla Tipos de inmueble y las cuatro opciones del selector de Registrar inmueble de Nuevo Chimbote pasaron la comprobación, sin guardar ninguna ficha. Evidencia y copia previa del catálogo en `output/catalog-types/`, privado y excluido de Git y Vercel. Las cuentas y sesiones temporales de comprobación se eliminan al terminar.

**Estado previo a la carga:** estaba pendiente migrar Nuevo Chimbote. La ampliación del catálogo no cargó inmuebles ni eliminó su data. Posteriormente se ejecutó la [selección de 68 inmuebles](carga-nuevo-chimbote-2026-10-18.md), que detalla los casos restantes pendientes. El análisis de nombres identificó 86 carpetas con número entero, de las cuales diez solo contienen X y 76 tienen nombres identificables; además existe la carpeta especial 37A. La selección de posiciones y resolución de datos ambiguos aún no se ha ejecutado. Las carpetas sin numerar no se cargarán, según la instrucción del usuario.
