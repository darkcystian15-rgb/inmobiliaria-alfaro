# Fichas de venta y alquiler por operación y zona — 18 de octubre de 2026

## Organización acordada

- Selector de inmuebles con filtro de zona tomado de la URL al entrar, búsqueda y estado. En todas las zonas se indica la zona en cada fila para distinguir posiciones repetidas. Contacto y una descripción de operación, tipo y dirección; sin otra línea de ID duplicando la descripción.
- Apartados: Resumen, Estado del expediente, Vendedor/Comprador o Arrendador/Arrendatario según operación, Inmueble, Visitas, Seguimiento, Tasación y Publicación.
- **Inmueble** contiene los documentos: reemplaza el nombre Documentación. Se retira la antigua pestaña de datos geográficos, áreas, distribución, características y observaciones. No se borran sus valores almacenados. La dirección referencial y los datos identificativos se editan desde Cartera.
- **Visitas** reúne fechas, observaciones, carga y consulta de evidencia de cada visita. Las fotos antiguas sin visita se conservan al final, sin asignarlas artificialmente. Desaparece la pestaña Fotos. Las galerías conservan visor privado, portada y permisos de administración.
- Los enlaces antiguos `pestana=fotos` llegan a Visitas y `pestana=documentacion` llega a Inmueble.

## Venta

Conserva vendedor y comprador, condiciones de persona natural/jurídica, asignación del comprador, documentos, impuestos/exoneración, servicios, cargas opcionales y tasaciones. Los pendientes y el porcentaje se calculan con estas condiciones. No se convierten documentos de venta en alquiler ni se eliminan archivos.

## Alquiler: cinco grupos

1. DNI y poderes del arrendador y del arrendatario, separados por persona.
2. Documentos del inmueble: copia literal o CRI; basta uno de los dos.
3. Contratos de alquiler: varios archivos, cada uno con nombre particular editable (contrato, adenda, renovación, etc.).
4. Recibos y pagos de servicios: categorías independientes para recibos y comprobantes de pago, con varios archivos nombrados.
5. Tasaciones: tasación express y otras tasaciones.

DNI y poder de ambas partes, copia/CRI, al menos un contrato, recibo, pago y tasación express se siguen como requisitos documentales. Las otras tasaciones son opcionales. No se exigen condiciones de tipo de persona ni impuestos, alcabala, HR, búsqueda nacional o cargas de venta al alquiler. No se añaden bloqueos al cierre por faltantes documentales.

Los documentos antiguos reconocibles se presentan mediante equivalencias en lectura (DNI/poder de vendedor → arrendador, comprador → arrendatario; contrato antiguo y recibos de servicios), sin reescribir la base. Los demás archivos se conservan accesibles en Estado del expediente e Inmueble, con opción de reclasificar. No se deduce un poder desde una vigencia ni un pago desde un recibo.

## Seguimiento y publicación

Seguimiento concentra responsables, plazos e historial de cada ficha. Se añade la actividad `documentacion` para el expediente completo de venta o alquiler, separada de `expediente` (material para publicar). El estado documental usa los requisitos propios de la operación y se actualiza al subir, reclasificar o eliminar un archivo. El enlace muestra los conteos y lleva al estado detallado. Los históricos conservan consulta y las restricciones existentes de edición del seguimiento.

La publicación mantiene DNI del vendedor/gerente o arrendador, archivo de tasación, foto de visita completada y texto; no exige el expediente posterior completo. Se alinean estos tipos también en los indicadores SQL de agenda/reportes para no dejar material pendiente por usar las categorías actuales. Arrendatario y documentos de cierre se siguen sin bloquear prematuramente la publicación.

## Datos y recuperación

Sin migraciones, borrados ni reclasificaciones masivas de producción. Se reutilizan las categorías de texto y la tabla de seguimiento existentes. Respaldo privado de fuente e historial anterior: `restore-points/ficha-ventas-alquiler-20261018T070752Z/`, commit `5fdc2ce`, fuente, bundle y hashes SHA-256, excluido de Git y Vercel. No incluye nueva instantánea de negocio porque este despliegue no modifica registros existentes. Para volver, verificar hashes y revisar actividad y archivos nuevos de alquiler antes de recuperar el código anterior; no restaurar una base sobre actividad posterior.

## Validación y publicación

- 27 archivos de pruebas unitarias correctos. Se añaden regresiones de cinco grupos de alquiler, documentos de ambas partes, exclusión de impuestos de venta, equivalencias de archivos antiguos, varios contratos nombrados y categorías restringidas por operación.
- ESLint sin advertencias y compilación Webpack/TypeScript correctos.
- `tests/transaction-dossier.integration.mjs` pasó en MySQL 8.4 local desechable y hosting HTTPS ficticio. Comprobó condiciones de venta, permisos, concurrencia HTTP 409, PDF/imagen/Word/Excel, cargas múltiples, nombres y reclasificación, expediente de alquiler completo 9/9, DNI de arrendador reconocido para publicación y guardado del responsable/plazo documental.
- Navegador autenticado local: venta y alquiler, filtro de zona y todas las zonas con posiciones repetidas, una descripción por inmueble, pestañas actualizadas, ausencia de campos retirados, fotos de visita y fotos antiguas sin visita en sus apartados, escritorio/móvil de 375 px sin errores JavaScript ni desbordes.
- La primera integración detectó que `requestJson` heredaba la zona al consultar el selector. Se corrigió con una petición explícita `zona=*` y filtro local por la zona elegida; la segunda ejecución completa pasó desde otra base vacía.
- Capturas privadas en `output/dossier-local/`, excluidas de Git y Vercel.

## Publicación verificada

- Código publicado: `d1ebf60c3f566202ef773a2122c1b0a90ff6012c`, sincronizado en `main` y `feat/registro-simplificado` mediante subida atómica. Las referencias remotas se comprobaron contra la copia de Codespaces.
- Vercel informó a GitHub `success`, «Deployment has completed», entorno **Production**, despliegue `7154462534`, el `2026-10-18T12:20:41Z`.
- URL de versión: https://inmobiliaria-alfarov2-8zki94y1q-puma19.vercel.app.
- Preview también completado: despliegue `7154467101`, https://inmobiliaria-alfarov2-2p0qj180d-puma19.vercel.app.
- `tests/file-list.production.smoke.mjs` pasó contra https://intranet.inmobiliariaalbertoalfaro.com.pe: siete zonas activas y un archivo coincidente en esta consulta; filtros, permisos anónimo/operador, apertura privada, ID con contacto, edición de dirección cancelada sin guardar, prioridades sin duplicación y cancelación del primer diálogo de eliminación.
- La misma prueba verificó fichas de venta y alquiler, selector por zona y todas las zonas, pestañas de las partes según operación, Inmueble sin los campos retirados, Visitas con fotos anteriores, Seguimiento y expediente de alquiler con cinco grupos y sin impuestos de venta. Navegador de escritorio/móvil sin errores JavaScript ni desbordes.
- Sin cambios en inmuebles, documentos, cierres o esquema. Las cuentas y sesiones temporales se eliminaron al terminar y se comprobó su ausencia. Capturas privadas en `output/file-list-production/`, excluidas de Git y Vercel.
- Verificación repetida: 27 archivos de pruebas correctos, ESLint sin advertencias y compilación Webpack/TypeScript completa. La compilación dentro del sandbox no pudo interpretar `TypeScript --showConfig`; fuera del sandbox terminó correctamente.
- La credencial activa del entorno recibió HTTP 403 al subir. La cuenta personal ya guardada permitió completar la subida sin cambiar permisos del repositorio.
- Los commits posteriores que registran esta evidencia solo modifican documentación; conservan el código de aplicación indicado arriba.
