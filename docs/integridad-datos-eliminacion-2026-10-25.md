# Integridad de datos, archivos y expedientes cerrados

Actualización solicitada el 25 de octubre de 2026. Base intranet: `ff2e26b293f41b29fc5ec1a986a416df5f91559c`. Se atienden los puntos 1–4 de la revisión de procesos. El texto de la intranet es para redes y conserva sus confirmaciones al editar; es independiente de la descripción del portal. Los borradores antiguos continúan ocultándose a los 14 días, sin limpieza adicional.

## Eliminación definitiva de inmueble y anuncio

Se mantiene la doble confirmación del administrador. La eliminación interna conserva una tarea durable con los datos necesarios para solicitar el borrado remoto y limpiar archivos. Mientras falta confirmación del portal o del hosting no se anuncia la operación como completa. La bandeja existente permite reintentar, y el mantenimiento diario retoma las tareas.

El receptor del portal incorpora `status: deleted`, autenticado con el token existente y asociado exclusivamente al ID interno estable. Borra la ficha pública, galería, información adicional, publicaciones, eventos dependientes por FK y metadatos de mapa/edición. Las fotos sincronizadas se sirven desde el hosting de intranet, donde se limpia cada ruta exclusiva. No se eliminan recursos compartidos del sitio ni archivos utilizados por otro registro.

El portal conserva una marca técnica mínima sin datos comerciales, fotos ni ID público para rechazar entregas retrasadas que intenten recrear el anuncio. Repetir una eliminación ya confirmada es seguro. Después de la confirmación se borran también los borradores, instantáneas publicadas y eventos del Portal web en la intranet. Si el servicio falla, se conserva la tarea y no se inventa una confirmación.

La decisión voluntaria de retirar o conservar el anuncio al cerrar/suspender una operación se mantiene. La eliminación definitiva es diferente: siempre incluye el portal.

## Subidas y borrados recuperables

La tabla nueva `inm_tareas_archivos` registra la ruta antes de subir, incluidas copias literales grandes y banners. Confirmar el registro consume la tarea dentro de su transacción. Las subidas abandonadas vencen después de una hora, posterior a la vigencia de la autorización del navegador; el mantenimiento las limpia comprobando que no estén referenciadas. La confirmación y la limpieza bloquean la misma tarea para impedir que se registre una subida que ya se limpió.

Al borrar un documento, se guarda la tarea y se retira el registro documental en la misma transacción. Solo después se solicita el borrado físico. Si el hosting falla, la API devuelve 202, conserva la tarea y el documento deja de contar como evidencia. Un error posterior de MySQL no restaura un registro que apunte a bytes borrados: la tarea permanece y permite repetir el DELETE, que el hosting ya trata como idempotente.

El mantenimiento `GET /api/mantenimiento/archivos` requiere `CRON_SECRET`, no está abierto a usuarios anónimos y está programado una vez al día a las 08:00 UTC. Procesa lotes y conserva lo no completado. No busca ni elimina archivos históricos desconocidos: solo tareas registradas y eliminaciones expresamente confirmadas.

## Expediente al cerrar

Cada nuevo cierre de venta o alquiler guarda su configuración, metadatos de archivos, moneda, resultado, usuario y fecha en `inm_expedientes_cierre`, dentro de la transacción del cierre. Las rutas de modificación de ficha, expediente y archivos rechazan cambios cuando existe un cierre definitivo confirmado y no anulado. La consulta y descarga continúan disponibles; el expediente informa que está protegido. Las ventas suspendidas no se consideran cierres definitivos.

Los cierres anteriores también se protegen a partir de esta actualización; no se fabrica una instantánea retrospectiva ni se declara que sus documentos actuales sean los que había al cerrar. Esta entrega no incorpora un procedimiento de rectificación/reapertura: los documentos cerrados se conservan sin sobrescribirlos. La renovación de fechas de alquiler conserva su flujo e historial existentes; la instantánea original no se modifica.

## Esquema y despliegue

`db/migrations/0031_data_integrity.sql` crea únicamente las dos tablas nuevas, sin modificar fichas, importes, archivos ni cierres anteriores. `scripts/install-data-integrity.mjs` prepara el esquema idempotentemente durante la compilación de Vercel. El despliegue del receptor del portal debe preceder al de la intranet para que `deleted` sea reconocido. El mantenimiento no debe activarse sin su secreto.

## Punto de restauración

Referencia de fuente: `recovery/integridad-20261025` en ambos repositorios. Directorio privado de intranet: `restore-points/integridad-20261025/`, excluido de Git y Vercel.

- `intranet-anterior.bundle` y `portal-anterior.bundle`: historia y código previo.
- `datos-negocio.aes`, `clave-base64` y `datos-negocio.json.gz`: instantánea consistente cifrada AES-256-GCM, descifrada, descomprimida y verificada por SHA-256.
- `manifest.json`: 29 tablas de negocio, tamaños, fragmentos y conteos. SHA-256 original: `3a44cde8aa08e4bf1ed8fcb1dd7826fed73886748fd080d9ce3eef862422d5ed`.

La instantánea se obtuvo mediante una compilación privada sin reasignar el dominio y sin exponer credenciales. Incluye las nuevas tablas vacías preparadas aditivamente; no contiene cambios de negocio de esta entrega. Excluye autenticación y no copia los bytes del hosting ni la BD independiente del portal. El despliegue no elimina anuncios o documentos reales para comprobar funcionamiento.

Para volver al código anterior, usar los bundles/referencias en un checkout separado y verificar antes de publicar. No es necesario eliminar las tablas nuevas. Antes de un rollback, detener el cron y resolver/revisar las tareas pendientes: el código anterior no las procesa y podría permitir cambios a expedientes protegidos. No restaurar toda la BD sobre trabajo posterior. La recuperación de archivos o anuncios que se eliminen posteriormente requiere su respaldo propio; una recuperación de código no recrea esos datos.

## Verificación

- 41 archivos unitarios de la intranet y tres archivos del portal aprobados.
- Compilación webpack/TypeScript de la intranet (63 rutas estáticas/dinámicas generadas) y Vite del portal aprobadas; ESLint de los archivos modificados sin advertencias y `git diff --check` correcto.
- Integración MySQL local: subida abandonada, conservación de archivos referenciados, fallo de borrado con tarea conservada, reintento, expediente cerrado, eliminación del portal y sus relaciones/FK, repetición idempotente y prevención de recreación por una entrega tardía.
- Integración HTTP de archivos y cron: subida registrada consume la tarea; fallo del hosting devuelve 202; el documento deja de contar; el cron autenticado limpia el archivo y consume la tarea; sin token devuelve 401.
- Eliminación de extremo a extremo: solicitud desde intranet, caída simulada del portal con respuesta 202 y tarea conservada, reintento confirmado, ficha pública y relaciones eliminadas, archivos del hosting y metadatos locales retirados. [Evidencia de integración](evidencia-integridad/PORTAL.json).
- Navegador en 1440 y 375 px: expediente cerrado con aviso de protección, edición deshabilitada, eliminación no ofrecida, consulta/descarga disponibles y sin desbordes.
- Integración HTTP de cierres: instantánea documental creada, cambios de condiciones, alta y borrado documental rechazados tras el cierre; se conservan moneda uniforme, poderes condicionados, permisos del operador y retirada web voluntaria.

No se afirma una auditoría del inventario real de producción ni una limpieza masiva de datos antiguos. Las escrituras de verificación fueron exclusivamente sobre bases locales de ensayo.

## Publicación y código

Portal: código `aa171d1`, despliegue `dpl_EsV5dYoj1cub9UhHDxL3uacV324o`, READY en production; alias https://app-alfaro-git-smoky.vercel.app. El bundle privado `portal-actualizado.bundle` conserva también el código publicado.

La cuenta GitHub conectada rechazó con HTTP 403 el push del portal tanto a origin como a upstream. Esto no impidió el despliegue directo autorizado en Vercel. El commit y su referencia de recuperación se conservan localmente y en los bundles. El [parche del portal](portal-integridad-20261025.patch) se guarda además en este repositorio de intranet para poder aplicar el mismo commit mediante `git am` cuando se disponga de permisos. No se declara que el commit esté publicado en el GitHub del portal; un despliegue futuro desde su rama antigua debe incorporar primero este parche.

Intranet: código funcional `e8a6d5ccaaabb2c9d271ea91a15fbcf3b87efb44`, enviado a `origin/main` junto con la referencia remota `recovery/integridad-20261025`. El commit documental posterior conserva ese mismo código funcional.

## Confirmación de producción

Intranet: despliegue `dpl_B33e54tpH6Qo9sgVrv5LpMRs7Mg9`, **READY**, entorno **production**, código funcional `e8a6d5ccaaabb2c9d271ea91a15fbcf3b87efb44`. Versión https://inmobiliaria-alfarov2-f2j586zsa-puma19.vercel.app. La API de Vercel confirmó los alias https://intranet.inmobiliariaalbertoalfaro.com.pe y https://inmobiliaria-alfarov2-umber.vercel.app, además del cron diario `0 8 * * *` y su ruta protegida.

El dominio real respondió 200 en `/login`, 401 en `/api/mantenimiento/archivos` sin secreto y 401 en `/api/portal-web` sin sesión. No se ejecutó el mantenimiento autenticado ni se eliminaron inmuebles, anuncios o archivos reales para verificar el despliegue. Las verificaciones autenticadas completas se hicieron localmente, incluida la eliminación de extremo a extremo y su recuperación tras una caída simulada del portal. [Evidencia de producción](evidencia-integridad/PRODUCCION.json).

Las bases ficticias creadas para esta entrega se eliminaron y el contenedor de MySQL de ensayo se dejó detenido, como estaba antes. Las capturas privadas del expediente protegido se inspeccionaron en móvil y escritorio.
