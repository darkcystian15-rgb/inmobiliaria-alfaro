# Liquidaciones editables dentro de FASE 2

## Objetivo y acceso

Preparar liquidaciones sin abrir Excel ni volver a escribir los datos disponibles en el expediente. Los modelos de `tests/info/` sirven como referencia de estructura, no como datos predeterminados de nuevas operaciones.

- Venta: **FASE 2 → 4. Impuestos y constancias → Liquidación del vendedor / Liquidación del comprador → Generar liquidación**. El segundo apartado conserva la categoría interna `COMPRADOR_LIQUIDACION` y los documentos anteriores; cambia su etiqueta de «Liquidación de alcabala» a «Liquidación del comprador».
- Alquiler: **FASE 2 → 5. Recibos y pagos de servicios → Liquidación del arrendador / Liquidación del arrendatario**. Las dos categorías nuevas son opcionales; no aumentan los requisitos de cierre.
- Se conserva la carga manual de documentos. Los expedientes cerrados permiten consultar las liquidaciones guardadas sin modificarlas.

## Recorrido

1. Abrir el editor desde la parte correspondiente. Se propone un primer documento cuando esa parte aún no tiene uno.
2. Revisar los datos compartidos: inmueble, partes, precio o renta de referencia, moneda y tipo de cambio opcional con fecha.
3. Completar el destinatario, DNI/RUC, persona natural o jurídica y representantes o participantes adicionales.
4. Completar y organizar conceptos; revisar totales y vista previa.
5. Confirmar la revisión y elegir **Generar Excel y adjuntar** o **Generar PDF y adjuntar**. Cada botón genera un formato y lo adjunta directamente a la categoría de la parte. Después aparece el enlace de descarga.

La pantalla es un diálogo amplio con foco nativo, desplazamiento interno, encabezado y barra de guardado visibles. Se adapta a móvil y escritorio y evita desplazar el fondo mientras está abierta.

## Datos y edición

Los datos compartidos se completan una sola vez para los documentos del inmueble. Inicialmente se proponen dirección, precio aceptado y moneda de tasación; las identidades pueden proponerse desde el cuestionario de contratos si existen. La interfaz pide revisar estas propuestas. El nombre de contacto de captación **no se convierte automáticamente en propietario legal**. Las correcciones en liquidaciones no modifican ficha, tasación ni contratos.

Cada documento tiene fecha, título, destinatario, condición de persona y notas propios. Permite varias secciones, renombrarlas, moverlas, agregar o quitar filas, y deshacer el último cambio. Quitar una fila o sección exige confirmación. Las filas pueden ser:

- Importe manual.
- Porcentaje de una base explícita, independiente de la posición de la fila.
- Texto o nota.
- Cálculo de renta o alcabala, disponibles en venta.

Los importes admiten PEN o USD; los cálculos tributarios se expresan en PEN. Cada concepto puede ser gasto/cargo, abono/crédito o informativo, y registrar si ya se pagó. Los totales distinguen gastos, gastos pendientes y abonos por moneda; los abonos se muestran por separado y no se descuentan silenciosamente de los pendientes. Las equivalencias requieren un tipo de cambio positivo. El resumen de venta añade precio de referencia menos gastos para el vendedor y más gastos para el comprador, cuando existe precio y se dispone de conversión si hay gastos en otra moneda; no afirma que ese saldo corresponda a cobros reales.

Los documentos de alquiler empiezan con renta de periodo, garantía, adelanto y comisión; todos son editables. Se admiten hasta 12 documentos, 15 secciones por documento y 150 conceptos en total por inmueble, dentro del límite de almacenamiento de cada versión.

## Plantillas personales y varios documentos

Se pueden crear varias liquidaciones por parte, duplicar una existente y quitar documentos adicionales del borrador, conservando los archivos ya adjuntos. **Guardar como plantilla** conserva la estructura y los porcentajes en una plantilla personal por operación y parte, reutilizable en otros inmuebles mediante **Mis plantillas**. Al guardarla se borran identidades, importes manuales, bases de porcentaje, pagos anteriores y notas del caso. No se guardan parámetros tributarios comunes. Guardar nuevamente reemplaza la plantilla personal anterior de esa combinación; se indica antes de pedir el nombre.

## Cálculos y revisión

No se asumen valores de UIT, tasas, corrección monetaria ni tipo de cambio vigentes. El ingeniero introduce y confirma los parámetros del caso. Renta y alcabala tienen bases independientes.

- Renta del modelo: `máximo(0, base de renta − costo de adquisición × índice) × tasa / 100`.
- Si la condición es «No paga», la fila de renta resulta cero y no descuenta un impuesto supuesto. Se exige sustento de la condición.
- Alcabala del modelo: `máximo(0, base de alcabala − UIT × número de UIT deducibles) × tasa / 100`.
- Cada concepto monetario se redondea a dos decimales antes de totalizar.

Son cálculos explícitos basados en los modelos, no una determinación tributaria automática ni reglas exhaustivas para todas las personas u operaciones. Para otra metodología se puede utilizar un importe manual y explicar su sustento. No se reproduce la fórmula que resta efectivo del precio real para determinar el precio declarado. El sistema bloquea generación con datos necesarios pendientes y requiere revisión explícita del documento.

## Borradores, versiones y recuperación

El borrador se guarda automáticamente tras 1,6 segundos sin cambios y también mediante **Guardar ahora**. **Guardar y cerrar** espera el guardado; no cierra si falla. Hay aviso al intentar abandonar una pantalla con cambios pendientes, y una acción explícita para descartar y cerrar si un error impide guardar. Los errores conservan los datos en pantalla.

Las versiones son instantáneas inmutables en `inm_timeline`, evento `liquidaciones_guardadas`; las 15 últimas se pueden consultar sin restauración automática. Se audita el actor de cada guardado. El historial general muestra un resumen legible, no el JSON completo. No se requieren migraciones.

Las escrituras bloquean la fila del inmueble y comprueban su disponibilidad y versión. Un conflicto con otro usuario impide sobrescribir sus cambios y conserva la pantalla para comparar. Las plantillas personales usan `inm_borradores` con claves específicas fuera de las claves del endpoint genérico de borradores; no se les aplica la ventana de lectura de 14 días de ese endpoint.

## Generación y almacenamiento

El servidor genera XLSX con ExcelJS y PDF con jsPDF/autotable, incorporando `public/branding/logo.png`, inmueble, fecha, partes, conceptos, resumen y observaciones. El Excel incluye fórmulas de porcentaje y suma con resultados guardados. Los cálculos tributarios se exportan como resultados de la instantánea revisada; editar parámetros en el archivo descargado no recalcula esos resultados. La edición principal ocurre en la intranet, donde se vuelve a generar una versión.

El servidor usa la carga existente de archivos, conservando permisos, comprobación de categoría, bloqueo por cierre, validación de formato, límite de tamaño, almacenamiento, auditoría y tareas de integridad. Un bloqueo de generación por inmueble evita ejecuciones concurrentes; la huella del contenido y formato permite reutilizar el archivo ya registrado en un reintento. Un borrador guardado no completa requisitos documentales hasta adjuntar correctamente el archivo.

Un fallo del hosting no se anuncia como éxito y permite reintentar desde el borrador. Excel y PDF se generan por separado: un fallo de un formato no borra el otro.

## Verificación

- Pruebas de aritmética con los importes de ambos modelos, exoneración, monedas mixtas, pagos previos, abonos, importes cero, fechas e identificadores inválidos y plantillas de alquiler/persona jurídica.
- Rutas reales con fronteras de base de datos/autenticación/hosting aisladas: permisos, cierre, conflictos, instantáneas inmutables, categoría de adjunto, reintento, bloqueo de generación y errores de almacenamiento.
- Generación real de XLSX y PDF: logo, fórmulas, resultados, resumen, persona jurídica y paginación.
- Navegador con componentes reales y API simulada en 375 y 1440 px: entrada desde FASE 2, edición, reordenación, guardado, generación, descarga, segunda parte y alquiler; capturas en `output/liquidaciones/`.
- TypeScript, ESLint y 30 pruebas de regresión de reglas de expediente. Las 15 pruebas nuevas de dominio, rutas, plantillas y exportación pasaron. La compilación local de Turbopack está limitada por el entorno al intentar abrir un puerto auxiliar; la compilación de producción se verifica en Vercel.

No se usan operaciones ni archivos de clientes reales para las pruebas. La prueba con API simulada no acredita un envío real al hosting; este reutiliza el mecanismo existente y sus controles.

## Despliegue

- Producción Vercel: `dpl_23GkWoJ9Go54jNpsEoTgnjuBB3QH`, estado **READY**.
- Compilación remota completada correctamente; salida de construcción en 56 segundos.
- Versión de producción preparada sin asignar dominios y promovida después de revisar el resultado de compilación.
- Dominio confirmado mediante consulta del alias: https://intranet.inmobiliariaalbertoalfaro.com.pe apunta a este despliegue.
- La ruta de liquidaciones responde en producción con el mensaje de autenticación esperado al consultarla sin sesión de la intranet. La protección de Vercel no se desactivó.
- Consulta de registros de error/fatal del despliegue tras la promoción: sin entradas en la ventana revisada. Esto no sustituye una prueba autenticada con almacenamiento real.
- Se despliega el árbol de trabajo actual, conservando los cambios previos existentes. La referencia Git del despliegue es `288e706`; los cambios locales de esta entrega se enviaron con el despliegue por CLI.
- Las pruebas funcionales emplearon datos aislados y API/hosting simulados; no se generaron liquidaciones ni se adjuntaron archivos a expedientes reales de clientes.

## Revisión posterior a la ampliación de documentos a 100 MB

Se repitieron las pruebas de dominio, exportación, API y plantillas con el código actual. Los cuatro archivos de pruebas finalizaron correctamente. Se generaron muestras reales PDF y XLSX en `output/liquidaciones/`; el Excel conserva logo, fórmulas, resultados y totales separados. El PDF de muestra tiene tres páginas; se verificó que sus textos no ocupan el área del pie.

La prueba de navegador del editor pasó en anchos de 375 y 1440 px: edición, guardado, generación, enlace de descarga y creación para la segunda parte y alquiler. Esta prueba intercepta las API, por lo que no acredita una subida real al hosting.

Consulta de registros de Production para liquidaciones, niveles error/fatal y ventana de 10 minutos: sin entradas coincidentes. No acredita ausencia de fallos en otras ventanas ni los errores devueltos sin registro por las rutas.

No se reprodujo un fallo de generación en las comprobaciones anteriores y no se modificó la lógica ni se realizó un nuevo despliegue durante esta revisión. Las liquidaciones generadas reutilizan la validación general de documentos de 100 MB; las muestras ocupan menos de 1 MB. Queda sin probar una generación autenticada y su adjunto sobre almacenamiento real de producción.

## Actualización 2026-11-10 · Editor en hoja de cálculo

La edición de conceptos cambia del formulario por tarjetas a una tabla con letras de columna y números de fila, basada en los modelos de comprador (Jhonny Saavedra) y vendedor (Lali Pinedo) de `tests/info/`. Los datos personales e importes de esos ejemplos no se cargan en nuevas operaciones.

- Columnas: concepto, tipo de cálculo/moneda, base, porcentaje, US$, S/, observaciones, tratamiento y pagado.
- Edición directa de celdas; Tab sigue el orden del navegador, Enter avanza a la misma columna y Mayús + Enter retrocede cuando existe una celda editable. Los selectores conservan su teclado nativo.
- Las celdas calculadas aparecen en azul y muestran la fórmula en observaciones. Renta y alcabala usan los parámetros revisados, visibles al abrir el editor; las tasas no se presuponen vigentes.
- Cada fila registra un importe en una moneda. La otra columna queda vacía para evitar contabilizar dos veces una equivalencia. El resumen conserva conversiones opcionales con tipo de cambio explícito.
- Permite añadir, duplicar, reordenar y quitar conceptos, con confirmación al quitar y deshacer desde el documento. Cada sección muestra subtotales de gastos por moneda, separados de créditos e informativos.
- En pantallas pequeñas la hoja se desplaza horizontalmente dentro del diálogo; no ensancha la página.
- Se conservan plantillas, borradores, historial, controles de revisión, permisos y generación/adjunto de Excel y PDF. Los formatos exportados mantienen su estructura anterior; no se incorpora un motor de fórmulas libres ni importación de archivos Excel.

Implementación: `app/components/LiquidationSheet.tsx`, integrada en `LiquidationEditor.tsx`. No requiere migraciones ni nuevas dependencias.

Verificación: TypeScript y ESLint; pruebas de dominio, API, plantillas y exportaciones reales; navegador a 375 y 1440 px con API simulada para entrada desde FASE 2, edición, teclado, duplicación, reordenación, guardado, generación, comprador y alquiler. Capturas de la hoja en `output/liquidaciones/hoja-375.png` y `hoja-1440.png`. La simulación no acredita subidas reales a almacenamiento de producción.

### Despliegue de la hoja de cálculo · 2026-11-10

- Proyecto confirmado: `puma19/inmobiliaria-alfarov2` (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`).
- Despliegue: `dpl_FUEYHjYcEjXo7ag6YVYhnrwPDk9w`, estado **READY**, entorno **production**. Compilación remota aproximada de 79 segundos.
- URL de la versión: https://inmobiliaria-alfarov2-rjpm0vsw5-puma19.vercel.app
- Promoción completada y alias verificado: https://intranet.inmobiliariaalbertoalfaro.com.pe apunta a esta versión.
- Se desplegó el árbol de trabajo local, incluidos los cambios previos conservados. Referencia Git: `288e706`; esa referencia no incluye por sí sola los archivos locales enviados por CLI.
- Comprobación HTTP de `/api/inmuebles/1/liquidaciones`: 401 con `Inicia sesión para continuar.`, respuesta esperada sin sesión. No se modificaron expedientes reales.
- Consulta de registros error/fatal del despliegue en ventana de diez minutos: sin coincidencias. No hay drains configurados; esta consulta no sustituye una prueba autenticada de generación y almacenamiento real.
