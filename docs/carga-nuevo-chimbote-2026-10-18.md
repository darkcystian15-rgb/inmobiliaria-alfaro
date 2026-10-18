# Carga seleccionada de Nuevo Chimbote — 18 de octubre de 2026

## Resultado

Se reemplazó exclusivamente la data anterior de Nuevo Chimbote, por solicitud del usuario. Se eliminaron sus tres fichas anteriores, relaciones, fotos, documentos e historial, y se completó el borrado de su único archivo privado. Se registraron 68 inmuebles como nuevos, en las posiciones de sus carpetas numeradas de Drive.

- 17 nombres completos: posiciones **2, 4, 8, 12, 15, 20, 30, 31, 39, 46, 56, 62, 67, 73, 76, 79 y 81**. Conservan operación, tipo, ubicación referencial y contacto del origen.
- Otras 51 carpetas identificables sin operación explícita: alquiler y `-FTO` al final del contacto, como se acordó para las demás zonas. Todos estos registros tienen contacto de origen; no se inventaron nombres.
- Resultado: **3 ventas, 65 alquileres, 51 contactos con FTO, 68 visitas pendientes y 22 posiciones libres**, sobre capacidad de 90.
- Fichas activas en etapa `visita_pendiente`, con un evento normal de registro por inmueble. Sin visitas realizadas, precios, tasaciones, publicaciones, documentos, fotos, negociaciones, cierres o seguimiento heredados. Sin observaciones o etiquetas adicionales.
- Las 61 fichas de las otras seis zonas y sus relaciones quedaron idénticas al estado vigente antes del reemplazo; hashes comprobados dentro de la transacción y nuevamente en la verificación de producción.

Fuente: [Nuevo Chimbote — Cartera de inmuebles](https://drive.google.com/drive/folders/1Isp0xpprOEnUb_xOZj6Mt29vHKuKVLmd). Se consultaron los nombres de las carpetas. No se modificó Drive ni se importaron documentos interiores.

## Posiciones cargadas

1, 2, 4, 5, 6, 7, 8, 9, 12, 14, 15, 17, 18, 20, 21, 22, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 55, 56, 60, 61, 62, 63, 64, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 78, 79, 80, 81, 83, 84, 85, 87 y 88.

Se normalizan los tipos al catálogo activo (DPTO, OFICINAS, TERRENOS, MODULO y ALMACEN). Las direcciones conservan el texto referencial, sin añadir geografía. La zona proporciona su geografía guardada como en el registro normal. La carpeta 22 se separa como Local / Los Ángeles / Emilio Pérez; la 45 conserva el tramo MZ M6 LT 41 en su dirección, y la 83 se interpreta como Terreno / Av. Pacífico / Miguel. La carpeta 36 representa una ficha en su posición, conservando el nombre completo de origen en el manifiesto privado. La secuencia global de identificadores continúa sin reiniciarse; el número global del ID y la posición son distintos conceptos.

## Pendientes y exclusiones

La selección ejecutada es de **68**, sin añadir el caso opcional 58.

- **58:** venta de local Tumbao Nuevo Chimbote, sin contacto. Pendiente confirmar su inclusión con `CONTACTO58-FTO` o proporcionar el contacto real.
- **3, 10 y 13:** falta distinguir contacto y ubicación en el nombre.
- **11 y 65:** falta tipo de inmueble.
- **37 y 38:** falta distinguir ubicación y contacto de Interseguro.
- **37A:** numeración especial, sin posición entera asignada; pendiente resolver su relación con 37.
- **19, 23, 28, 49, 53, 54, 57, 59, 82 y 86:** nombres compuestos solo por X, excluidos.
- **16 y 77:** no existe carpeta con ese número en la consulta.
- Se excluyen carpetas sin numeración y carpeta 0 de modelo. Las posiciones 89 y 90 quedan libres.

Todas las zonas ya tienen una carga de Drive realizada para la selección aprobada. Permanecen estos casos pendientes de Nuevo Chimbote; no se consideran importados ni completados por esta entrega.

## Operación y respaldo

`lib/zone-replacement.mjs` y `scripts/replace-nuevo-chimbote-from-drive.mjs` añaden el procedimiento manual específico. Exige las 68 posiciones exactas, las tres ventas, los contactos de origen y la marca FTO solo en las 51 operaciones faltantes. Por defecto previsualiza; `--apply` exige respaldo de la misma base y servidor, hashes correctos, posiciones y tipos activos.

La sustitución es transaccional. Se compara Nuevo Chimbote con el respaldo y se conservan las otras zonas en su estado vigente, incluso si fueron editadas después de respaldar. Una referencia desconocida o un cambio en la zona objeto de carga aborta todo. No se deshabilitan claves foráneas ni se modifican otros inmuebles. Se limpian borradores relacionados y se conservan archivos y propietarios compartidos. El archivo anterior exclusivo se eliminó mediante la tarea durable y API autenticada existentes; no quedan trabajos pendientes de Nuevo Chimbote.

Respaldo privado `restore-points/nuevo-chimbote-20261018/`, excluido de Git y Vercel: fuente e historial previos (`7575abe`), instantánea consistente de 25 tablas de negocio, un archivo privado con su hash, manifiesto de importación, resultado y verificación. Archivos 0600. Datos personales, capturas y copias no se incorporan al repositorio.

Restaurar código no revierte esta carga. Para recuperar, verificar hashes y conciliar actividad posterior; restaurar solo las fichas anteriores de Nuevo Chimbote con sus relaciones y archivo, resolviendo sus posiciones frente a los registros importados. No restaurar encima de otras zonas ni reiniciar la secuencia global.

No requiere migraciones ni se ejecuta al compilar o desplegar. No repetir `--apply` para verificar o publicar: el respaldo anterior ya no coincide con la zona después de la carga.

## Validación

- `tests/zone-replacement.integration.mjs` pasó en MySQL 8.4 local desechable: 68 altas, 17 completos y 51 FTO, exclusiones y datos faltantes rechazados, previsualización sin escritura, rollback ante FK desconocida, estado inicial, rechazo de repetición y conservación de las otras seis zonas. Pasaron también las regresiones de Chimbote y las cinco zonas.
- 27 archivos de pruebas unitarias correctos, ESLint sin advertencias y compilación Webpack/TypeScript completa.
- Verificación real en la intranet el `2026-10-18T14:08:02.111Z`: datos de las 68 fichas comparados con el manifiesto, asignaciones exactas, 68 visitas pendientes y 22 posiciones libres en API. Tres fichas anteriores ausentes; limpieza del archivo privado completa.
- Los hashes de las 61 fichas y sus relaciones de otras zonas coinciden con los preservados al ejecutar la transacción. Zonas y posiciones no cambiaron.
- Navegador de escritorio y móvil de 375 px: las 68 tarjetas en su posición, detalle del inmueble, Visitas pendientes y ausencia de errores JavaScript o desbordes. Acceso anónimo rechazado.
- Capturas y comprobador privados en `output/nuevo-chimbote-production/` y `output/nuevo-chimbote-production-smoke.mjs`. Cuentas y sesiones temporales eliminadas y ausencia comprobada.

## Publicación

- Entrega publicada: `6885fdab4f47e31785374c174387221b1414cedd`, sincronizada en `main` y `feat/registro-simplificado` mediante subida atómica.
- Vercel informó a GitHub `success`, «Deployment has completed», entorno Production, despliegue `7155739152`, el `2026-10-18T14:12:59Z`.
- URL de versión: https://inmobiliaria-alfarov2-j9sh9i8wp-puma19.vercel.app.
- Preview `7155734565` también completado: https://inmobiliaria-alfarov2-8jjxr2g3q-puma19.vercel.app.
- La carga se ejecutó una sola vez. Los commits posteriores de evidencia solo modifican Markdown; compilar o desplegar no vuelve a eliminar ni registrar inmuebles.
- Contenedor MySQL de prueba y volumen retirados al terminar la verificación local.
