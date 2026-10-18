# Historial de archivos y limpieza de fechas — 18 de octubre de 2026

## Presentación

Se retiran las aclaraciones repetidas «Hora de Perú», «Fechas de Perú» y «Fecha de Perú» del panel, historial, reportes y registro de seguridad. Las fechas siguen calculándose y mostrándose con el calendario/horario de Perú; no se modifican registros ni plazos.

## Trazabilidad de documentos y fotos

Las operaciones de archivos ya tenían auditoría técnica. Ahora también generan movimientos del inmueble, visibles en su historial y en los cinco avances recientes del panel:

- Archivo subido: nombre registrado, nombre original, categoría, sección, formato, tamaño, observación y visita asociada cuando corresponda.
- Enlace de documento registrado: se distingue de una subida física; no se inventan formato, tamaño ni nombre original.
- Archivo actualizado: se conservan los valores anteriores y nuevos de nombre, descripción, categoría y condición de portada, según la operación.
- Archivo eliminado: conserva la identificación y metadatos del archivo retirado para entender lo que se eliminó.

Cada movimiento guarda el usuario real y la fecha del evento. El panel muestra la identidad del inmueble, la acción, el detalle de archivo y quién la realizó; la ficha ofrece la información completa. Se usan las secciones de venta/alquiler correspondientes, distinguiendo Vendedor/Comprador y Arrendador/Arrendatario. Las fotos pertenecen a Visitas.

La escritura de metadatos, auditoría técnica y movimiento del inmueble comparte transacción. Una carga rechazada no crea un movimiento de éxito. Guardar metadatos sin cambios no añade eventos repetidos. Se conserva el mecanismo existente de limpieza de almacenamiento si falla el registro de una subida.

No se incluyen rutas internas de almacenamiento, enlaces externos ni credenciales en el detalle de actividad. No se reconstruye retrospectivamente la actividad anterior: los movimientos nuevos tienen detalle desde esta entrega, y los anteriores conservan su contenido original.

## Validación

Aprobados lint, compilación Webpack/TypeScript y 31 archivos de pruebas unitarias. `tests/transaction-dossier.integration.mjs` pasó contra MySQL y almacenamiento HTTPS locales: PDF, imágenes, Word y Excel; subidas desde formulario; permisos; cambios y eliminación con historial; resumen detallado del panel; ausencia de eventos para cargas rechazadas o guardados sin cambios; enlaces diferenciados de subidas y portada/visita de fotos. Escritorio y móvil sin errores JavaScript ni desbordamiento horizontal.

## Publicación verificada

- Código `17e8a1dee60785223788ef7b8a7565cc4f832b62` publicado en `main` y `feat/registro-simplificado`.
- Vercel Production `7160383171`: `success`, `2026-10-18T20:37:05Z`; URL técnica `https://inmobiliaria-alfarov2-92kq8xfe1-puma19.vercel.app`.
- Vercel Preview `7160377995`: `success`, `2026-10-18T20:36:38Z`; mismo código.
- Dominio de producción comprobado el `2026-10-18T20:37:45.927Z`: aclaraciones redundantes retiradas de panel/ficha, estructura de detalle y usuario disponible en avances recientes, panel/ficha sincronizados y permisos conservados. Escritorio y móvil aprobados, sin errores JavaScript ni desbordamiento horizontal.
- La comprobación de producción no subió archivos ni modificó inmuebles o límites; se bloquearon escrituras de negocio del navegador. Las pruebas reales de archivo/historial se realizaron únicamente en el entorno local aislado. Cuenta y sesiones temporales retiradas y ausencia comprobada; contenedor local retirado.
- Evidencia privada excluida de Git y Vercel: `output/files-history-production-smoke.mjs` y `output/historial-archivos/production-result.json`.

Punto anterior de recuperación: `b0ff828ad1d824a9eb4698cc00e931cb53976ebb`. Sin migraciones. Los commits posteriores de evidencia solo cambian Markdown.
