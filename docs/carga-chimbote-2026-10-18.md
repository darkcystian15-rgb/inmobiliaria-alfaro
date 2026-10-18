# Reemplazo de la cartera de Chimbote — 18 de octubre de 2026

## Resultado

Se reemplazó exclusivamente Chimbote, por solicitud expresa del usuario. Se eliminaron sus 14 inmuebles anteriores, relaciones, documentos, fotos e historial, y se registraron 43 inmuebles a partir de los nombres de carpetas numeradas de Google Drive. Las ocho fichas de las demás zonas y sus registros asociados se compararon con el respaldo y permanecen iguales.

Fuente: [Chimbote — Cartera de inmuebles](https://drive.google.com/drive/folders/1zidVP65FO_WVb5sb37manzTFH6NuqRdx). Se consultaron los nombres mediante el conector Google Drive; no se modificó Drive.

- Posiciones del 1 al 46, excepto 35, 40 y 44, que no tienen carpeta numerada. Las posiciones 47–50 también quedan libres: siete disponibles en total.
- 10 ventas y 33 alquileres, activos y en etapa `visita_pendiente`.
- Los 25 inmuebles sin operación explícita se registraron como alquiler y con `-FTO` al final de su contacto, conforme a lo indicado. Los dos sin contacto usan `CONTACTO7-FTO` y `CONTACTO32-FTO`.
- Se normalizaron abreviaturas de tipo al catálogo existente: DPTO → Departamento, OF → Oficina, LOCALES → Local y TERRENOS → Terreno. Casa terreno se registró como Casa, conservando Meiggs como ubicación referencial.
- Datos básicos de operación, tipo, dirección referencial y contacto. Se conservó la geografía configurada de la zona, como en el formulario de registro. Sin etiquetas adicionales ni observaciones añadidas a las fichas.
- Un evento normal de registro por inmueble. Sin visitas realizadas, tasaciones, precios, publicaciones, negociaciones, cierres, documentos, fotos o seguimiento previo. Las 43 fichas aparecen en Visitas pendientes. No se importaron los documentos interiores de Drive ni se marcaron actividades como completadas.
- La posición coincide con el número de carpeta. El número de orden global del ID se asignó con la secuencia existente, sin reiniciarla ni alterar identificadores de otras zonas.

## Ejecución y protecciones

`lib/zone-replacement.mjs` y `scripts/replace-chimbote-from-drive.mjs` implementan una operación manual específica para esta entrega; no se ejecuta al compilar o desplegar.

El script requiere un manifiesto privado con las 43 posiciones acordadas y un respaldo verificado por SHA-256, de la misma base/servidor. Por defecto solo previsualiza. `--apply` bloquea las tablas de negocio, compara el estado con el respaldo y reemplaza en una única transacción. Una referencia desconocida o un cambio posterior al respaldo aborta y revierte todo. No se deshabilitan claves foráneas. Se eliminan borradores relacionados, conservando datos de otras fichas y propietarios compartidos.

La limpieza de los cinco archivos privados exclusivos de las fichas anteriores se guardó como una tarea durable y se completó mediante la API autenticada existente. La comprobación confirmó que no quedan tareas de limpieza de Chimbote. Se conservan los archivos referenciados por otras zonas.

No repetir la carga ni `--apply` para verificar o publicar. El respaldo anterior deja de coincidir tras la primera ejecución, impidiendo repetir accidentalmente el reemplazo. No requiere migraciones.

## Respaldo y recuperación

Punto privado: `restore-points/chimbote-20261018/`, excluido de Git y Vercel, con archivos 0600.

- Fuente e historial anteriores, commit `3196eaf747211d44d58bad6209fc3f9c95d09c40`: `source.tar.gz` y `repository.bundle`.
- `business.json`: instantánea consistente de 25 tablas de negocio y sus esquemas; nueve archivos privados copiados con sus hashes. Sin contraseñas ni sesiones.
- `import.json`: manifiesto privado de Drive y correspondencia de sus nombres con los campos cargados.
- `result.json`, `verification.json`, `business-manifest.json` y `manifest.json`: registros de ejecución, verificación y hashes. Los datos personales y copias no se incorporan al repositorio.

Restaurar código no revierte esta carga de datos. Para recuperar el estado anterior, verificar hashes y revisar actividad posterior; restaurar coordinadamente solo las fichas anteriores de Chimbote, sus relaciones y archivos desde la copia, resolviendo sus posiciones frente a las fichas importadas. No sobrescribir otras zonas ni reiniciar secuencias globales; cualquier nueva actividad posterior requiere conciliación.

## Validación

- `tests/zone-replacement.integration.mjs`, MySQL 8.4 local desechable: posiciones y 43 altas, estado inicial, previsualización sin escritura, rechazo de respaldo desactualizado y repetición, rollback completo ante FK desconocida, limpieza de borradores y conservación de registros, propietarios y archivos compartidos de otra zona. Solo datos ficticios locales.
- 27 archivos de pruebas unitarias correctos, ESLint sin advertencias y compilación Webpack/TypeScript completa.
- Verificación real el `2026-10-18T13:00:11.745Z`: 43 fichas activas, 10 ventas, 33 alquileres, 25 contactos con FTO, 43 visitas pendientes y siete posiciones libres. Las ocho fichas de otras zonas, sus relaciones, zonas y posiciones permanecen iguales al respaldo.
- API autenticada y navegador: las 43 tarjetas en sus posiciones, detalle de CONTACTO7-FTO con ID correcto, Visitas pendientes, permisos anónimos y escritorio/móvil de 375 px sin errores JavaScript ni desbordes.
- Capturas y comprobador privados en `output/chimbote-production/` y `output/chimbote-production-smoke.mjs`, excluidos de Git y Vercel. Las cuentas y sesiones temporales se eliminaron y se comprobó su ausencia.

## Publicación

- Entrega publicada: `3351b6e90d17c4e4b37a65537a5066277dfe1105`, sincronizada en `main` y `feat/registro-simplificado` mediante subida atómica.
- Vercel informó a GitHub `success`, «Deployment has completed», Production `7154933132`, el `2026-10-18T13:02:42Z`.
- URL de versión: https://inmobiliaria-alfarov2-a8o99cbs6-puma19.vercel.app.
- Preview `7154928708` también completado: https://inmobiliaria-alfarov2-5ivfqljpq-puma19.vercel.app.
- La carga se ejecutó una sola vez en la base de producción compartida por la intranet. El despliegue no repite eliminaciones ni registros.
- Los commits posteriores de evidencia solo modifican Markdown y conservan el código operativo indicado arriba. El contenedor y volumen de MySQL de prueba se retiraron al completar la validación.
