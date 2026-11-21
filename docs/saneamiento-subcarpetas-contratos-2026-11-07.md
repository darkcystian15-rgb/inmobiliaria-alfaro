# Saneamiento: un nivel de subcarpetas y nueva estructura de Contratos

## Alcance acordado

En FASE 2 de cada inmueble de venta, la carpeta 6. Saneamiento físico legal permite crear subcarpetas con nombres libres, renombrarlas, subir varios documentos directamente en ellas y mover archivos existentes entre ellas o a la carpeta principal. Solo hay un nivel, sin estados ni requisitos adicionales por subcarpeta. Se pueden eliminar únicamente subcarpetas vacías.

Cada archivo conserva nombre y descripción propios. La descripción del documento principal de saneamiento es opcional; la de «Otros documentos» sigue siendo obligatoria. Las cargas anteriores permanecen en la principal: se reubican mediante el selector «Ubicación» de cada archivo, sin volver a subirlo. No se inventan subcarpetas ni se clasifica por conjetura el contenido de documentos existentes.

La casilla «Requiere saneamiento físico legal» mantiene su comportamiento: al activarla, al menos una carga alojada de la categoría principal completa el requisito global. Las subcarpetas solo ordenan los documentos; no generan obligaciones ni estados por trámite. Los documentos se conservan si se desactiva la casilla. Los expedientes cerrados permiten consultar y descargar, sin editar archivos, nombres, condiciones ni ubicaciones.

## Contratos de venta: orden y obligatoriedad

1. Contrato de Intervención Inmobiliaria — obligatorio.
2. Estructura de Contrato Promesa-Venta — opcional.
3. Estructura de Minuta — obligatorio.
4. Contrato de Promesa de Venta — opcional.
5. Minuta — obligatorio; admite múltiples archivos.
6. Escritura Pública — obligatorio.
7. Otros documentos — opcional; descripción obligatoria por archivo.

## Contratos de alquiler: orden y obligatoriedad

1. Contrato de Intervención Inmobiliaria — obligatorio.
2. Estructura de Contrato de Alquiler — obligatorio.
3. Contrato de Alquiler — obligatorio.
4. Otros documentos — opcional; descripción obligatoria por archivo.

La obligatoriedad controla el cierre, no impide preparar un expediente incompleto. Los documentos «Estructura» se exigen por control interno aun cuando ya esté el documento final. Cada categoría permite varios archivos con nombre independiente. Un enlace externo no completa un requisito obligatorio.

## Conservación de archivos y compatibilidad

- `PROMESA_ARRAS` se presenta como Contrato de Promesa de Venta.
- `MINUTA_COMPRAVENTA` se presenta como Minuta; se conservan todos sus archivos.
- `ESCRITURA_PUBLICA` conserva su categoría y se presenta como Escritura Pública.
- `CONTRATO_ALQUILER` se mantiene como Contrato de Alquiler en alquiler; en venta se muestra en Otros documentos. Se conserva su descripción; si no tenía, se identifica visualmente como contrato de alquiler anterior y al editar se propone esa descripción.
- Los tipos genéricos desconocidos siguen en Otros archivos conservados hasta identificarlos.
- No se modifican bytes, rutas de hosting, nombres, descripciones ni categorías persistidas de archivos antiguos. La distribución nueva se resuelve mediante compatibilidad de lectura; no hace falta migración masiva.
- Las categorías nuevas no se completan con documentos de otras categorías por semejanza del nombre.

## Persistencia y seguridad

Las subcarpetas y la relación archivo/subcarpeta se guardan en `configuracion.saneamiento` del expediente JSON existente. Se usa el mismo bloqueo del inmueble y se incrementa la versión al crear, renombrar, mover o eliminar carpetas, y al subir archivos a una subcarpeta. Las condiciones generales preservan esa metadata para evitar sobrescribirla desde otros formularios.

El servidor comprueba permisos, estado editable, versión actual, operación de venta, destino existente y pertenencia del archivo al saneamiento de ese inmueble. Rechaza nombres vacíos, repetidos o con barras, y estructuras anidadas. Renombrar conserva el identificador de la subcarpeta. La carga y su ubicación se confirman en la misma transacción; si falla el registro, se revierte y se mantiene la limpieza de cargas huérfanas existente. Eliminar o recategorizar archivos limpia sus referencias de ubicación. Los movimientos registran historial legible y auditoría.

Al revisar la ruta de archivos se corrigió un acceso preexistente a `uploadJob` antes de declararlo en el registro de enlaces antiguos; esa limpieza solo corresponde a una carga alojada.

No se añade tabla ni columna, ni se requiere actualizar el PHP de hosting.

## Punto de restauración

Directorio privado e ignorado por Git/Vercel: `restore-points/saneamiento-contratos-20261107/`.

- `source.tar.gz`: código previo a esta actualización, incluidos los cambios locales anteriores del usuario, sin `.env`, credenciales, dependencias ni archivos de hosting.
- `manifest.json`: commit base, SHA-256 del archivo de código y deployment anterior.
- `git-status.txt`: cambios locales que ya existían antes de comenzar.
- Deployment anterior: `dpl_EAQk6n9UTVGkkTxKoVNTaJbaQjSb`, `https://inmobiliaria-alfarov2-n05c0393m-puma19.vercel.app`.

Para recuperar código, extraer el archivo a un directorio temporal y copiar desde allí únicamente los archivos afectados; no ejecutar una limpieza general del repositorio. Para revertir producción, usar el deployment anterior verificado dentro del mismo proyecto/equipo. No se ejecutó restauración.

**Límite del respaldo:** se intentó el respaldo de negocio con el script existente, pero `DATABASE_URL` local está enmascarada y no es una URL utilizable. El punto creado respalda código y referencia de producción, no contiene una copia nueva de la base de datos ni del hosting. Esta actualización no ejecuta migraciones de datos ni cambios masivos sobre documentos existentes. Si se revierte después de que los usuarios organicen carpetas, preservar también la metadata `saneamiento` actual antes de guardar condiciones con versiones antiguas de la aplicación.

## Validación y despliegue

- TypeScript: `npx tsc --noEmit`, correcto.
- ESLint de los componentes, rutas, lógica y pruebas modificados: correcto.
- Pruebas de expediente, carpetas, archivos y auditoría: seis archivos correctos (`node --test tests/saneamiento-folders.test.mjs tests/saneamiento-api.test.mjs tests/transaction-dossier.test.mjs tests/property-folders.test.mjs tests/document-files.test.mjs tests/file-activity.test.mjs`).
- Ejecución directa adicional: 30 casos de expediente, cuatro de organización y tres del endpoint, correctos.
- Cobertura nueva: orden y obligatoriedad de contratos, múltiples minutas, enlaces que no completan cierre, conservación de metadata y categorías antiguas, nivel único, duplicados, nombres inválidos, movimientos y retorno a principal, borrado solo vacío, aislamiento por inmueble, permisos, expediente cerrado, alquiler excluido y conflictos de versión.
- Revisión React: etiquetas, claves estables, actualización funcional de estado, navegación bloqueada con carga/edición pendiente, modo solo lectura y persistencia de metadata al guardar condiciones.
- No se ejecutan cargas ni movimientos de documentos reales como prueba. La verificación funcional usa datos aislados; la base local enmascarada impide verificar una sesión con datos reales.

## Despliegue de producción verificado

- Proyecto: `inmobiliaria-alfarov2` (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`).
- Equipo: `team_qcKFQOeqeLWTJFsCLGnZvPiL`.
- Entorno: producción. Estado final **READY**, `aliasError: null`.
- Deployment: `dpl_GigKqDkC3tv7TutSVMvAxar1zVGk`.
- Dominio activo: https://intranet.inmobiliariaalbertoalfaro.com.pe
- Versión: https://inmobiliaria-alfarov2-oolzfsbyb-puma19.vercel.app
- Fuente: código actual del workspace sobre base `288e706`, con cambios locales previos preservados. No se creó commit ni se enviaron variables `.env` o archivos privados del respaldo.
- Manifiesto de fuente: SHA-256 `618d7a61619c1a944fdaba3bb84c84d06fc65b062514eb916a509f4c0de0dd81`, 368 archivos. Copia exacta del paquete de fuentes previo al despliegue en `release-source.tar.gz` del punto de restauración; este MD se completa localmente después de verificar producción.
- Compilación de Next.js y TypeScript de Vercel correctas; aproximadamente 108 segundos desde la creación hasta READY.
- Vercel confirmó la asignación del dominio de intranet y del alias `inmobiliaria-alfarov2-umber.vercel.app`.
- Comprobación posterior de `/login` en el dominio de producción mediante la conexión Vercel: HTTP 200 y formulario de acceso presente.
- Logs del deployment en los primeros 10 minutos: sin entradas de nivel error/fatal.
- Límite de verificación: no se inició sesión de usuario ni se subieron/reubicaron documentos reales en producción. Los flujos de edición, compatibilidad y permisos se verificaron con pruebas aisladas; el acceso y estado del despliegue se comprobaron en producción.

## Comprobación posterior del 7 de noviembre de 2026

- Se consultó nuevamente Vercel: el dominio de intranet sigue asignado al deployment `dpl_GigKqDkC3tv7TutSVMvAxar1zVGk`, en producción, estado READY y sin error de alias. `/login` responde HTTP 200 y contiene el formulario de acceso.
- Se compararon los 368 archivos del paquete `release-source.tar.gz` con el workspace: todos coinciden salvo este Markdown, completado después del despliegue. No se necesitó publicar de nuevo el mismo código.
- Se repitieron los seis archivos de pruebas indicados arriba: seis correctos, cero fallos.
- La compilación local adicional con `npm run build -- --webpack` compiló el código y terminó TypeScript correctamente. Se detuvo al recopilar datos de `/api/alquileres` porque la URL de base de datos local está enmascarada y no es válida. No se alteraron credenciales ni se sustituyeron por datos ficticios. Esta limitación local no cambia el estado READY de la compilación publicada en Vercel.
- El intento local con Turbopack encontró restricciones del entorno al descargar fuentes y abrir un puerto interno; se usó Webpack para la comprobación adicional.

