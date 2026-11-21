# Prueba de editor en Estructura de Minuta

Ubicación: FASE 2 → Contratos → Estructura de Minuta → **Abrir editor de minuta**. Los archivos previos siguen en el listado; el editor crea un texto independiente por inmueble de venta.

Permite extraer un Word DOC/DOCX ya alojado en esa categoría, revisar el resultado antes de incorporarlo, pegar o escribir hasta 20 000 caracteres y añadir modelos básicos al final del contenido. Los documentos originales no se modifican. La extracción incluye encabezados, pies, cuerpo y, al final, notas/cuadros de texto; no reproduce el diseño, imágenes ni tablas del Word. Se informa de esos límites. Lectura limitada a 12 MB. No usa IA ni envía documentos a un proveedor de IA.

Encabezado y pie son editables, con hasta 300 caracteres y tres líneas manuales cada uno. El PDF A4 repite ambos, reserva márgenes para evitar superposición, conserva párrafos y añade numeración de páginas. El encabezado incluye el logo de la inmobiliaria, fondo suave y línea roja. **Ver archivo** guarda el texto y abre el PDF en otra pestaña mediante una ruta autenticada; no incrusta un visor. El PDF ya adjuntado también tiene enlace para abrirlo en otra pestaña. **Generar PDF y adjuntar** guarda primero el texto y registra el PDF bajo `ESTRUCTURA_MINUTA`, con el servicio habitual de archivos privados. Un reintento con el mismo contenido reutiliza el archivo existente.

El texto se conserva como instantáneas inmutables de `inm_timeline`, evento `estructura_minuta_texto`; no requiere migración. El guardado exige versión actual y bloqueo del inmueble, comprueba protección por cierre/eliminación, registra auditoría y conserva la pantalla ante errores o conflictos. El historial general muestra un resumen. Se protege la navegación y recarga con cambios pendientes. Expedientes cerrados permiten consulta/vista previa, sin escrituras ni nuevos adjuntos.

API: `/api/inmuebles/[id]/minuta-texto`, autenticación y permiso `informacion`, verificación de origen para escrituras. Extracción verifica inmueble, ID de archivo, almacenamiento y categoría en servidor. PDF y extracción se entregan sin caché pública. La subida reutiliza los controles del endpoint de archivos.

Verificación: `tests/minute-document.test.mjs` prueba DOCX real y PDF multipágina con encabezado/pie; `tests/minute-api.test.mjs` ejecuta rutas reales con límites de autenticación, persistencia y hosting simulados; `tests/minute-editor.browser.mjs` prueba entrada desde el apartado, selección de Word existente, edición, guardado, reapertura, vista previa, adjunto y conflicto en 375/1440 px con API simulada. Capturas y muestra PDF en `output/minuta-texto/`. TypeScript, ESLint de los archivos afectados y regresiones de expediente/archivos pasan. No se ha extraído ni alterado el documento real de Lali Pinedo en estas pruebas.

Pendiente de verificación real: acceso autenticado al Word de cliente y adjunto en hosting de producción. La configuración de base de datos local no permite esa consulta. La extracción DOC binaria usa `word-extractor`; la prueba de extracción automatizada usa un DOCX sintético.

## Publicación

Despliegue de producción `dpl_F4DPCAkvFJHXwmZqPcg6DTo4SvSp`, estado READY, compilación remota completada. Se preparó sin asignación de dominio y luego se promovió. Confirmado que `intranet.inmobiliariaalbertoalfaro.com.pe` apunta a esa versión. La ruta nueva respondió HTTP 401 con el mensaje de autenticación de la aplicación en la comprobación sin sesión, accediendo al despliegue protegido con `vercel curl`.

Se publicó el árbol de trabajo actual, conservando los cambios anteriores; referencia base Git `288e7060b41df8f9eafc2bfa67c102ff186a35b7`, fuente CLI. No se hicieron nuevas migraciones para este editor ni modificaciones de documentos de clientes.

## Ajuste del visor y encabezado

Se retiraron el visor incrustado y la apertura automática del modal tras generar. La acción Ver archivo reserva una pestaña durante el clic y navega al PDF después de guardar; si falla el guardado, cierra la pestaña vacía y conserva el texto. El endpoint GET con `format=pdf&version=...` valida versión y sesión. Los PDF de Estructura de Minuta se abren directamente en otra pestaña desde el listado. El logo se incluye en el rastreo de archivos de la función y se repite en todas las páginas, conservando su proporción. La huella de generación incluye la versión del diseño para evitar reutilizar un PDF anterior sin logo. Pruebas actualizadas de apertura, ausencia de iframe/object, logo multipágina y límites de paginación.

Actualización publicada en `dpl_4m6EPy6vgdSLPntwKCe223YFagtX`, estado READY, compilación de producción correcta (52 s). Promovida al dominio de la intranet después de comprobar autenticación (HTTP 401 sin sesión) en la ruta GET de PDF. Verificación local: TypeScript, ESLint, pruebas de API y PDF, y navegador en 375/1440 px. Muestra con logo revisada en `output/minuta-texto/pdf-con-logo.png`. Los PDF previos conservan su contenido; volver a generar aplica el nuevo encabezado.

## Diseño editorial del PDF

Se mejoró la composición del PDF: márgenes laterales de 24 mm, título principal centrado, encabezado blanco con logo pequeño a la izquierda y título/nombre a la derecha, línea roja fina, cuerpo serif de 11,5 puntos con interlineado de 5,7 mm y separación entre párrafos. Las tipografías Liberation se incrustan en el archivo y su licencia se conserva en `assets/pdf-fonts/LICENSE.txt`; no se depende de fuentes instaladas en el dispositivo del lector.

Los títulos numerados y las secciones habituales de los modelos se distinguen en negrita con un detalle rojo lateral. Los encabezados habituales sin numeración reciben numeración consecutiva en la presentación del PDF; el texto guardado no se modifica. La paginación conserva los títulos junto al inicio del siguiente párrafo y evita una línea aislada al continuar párrafos. El pie muestra texto personalizado, código del inmueble y «Página N de M». Se conserva la apertura en otra pestaña.

El diseño tiene una nueva huella para que generar otra vez no reutilice el PDF anterior. La huella incluye el código del inmueble. Se amplió el rastreo de archivos de la función para incluir las fuentes.

Verificación: TypeScript y ESLint de archivos afectados; pruebas de API y documento; muestra editorial de tres páginas con textos sintéticos, encabezados acompañados de su contenido, código y logo por página. Muestra real en `output/minuta-texto/diseno-editorial.pdf`, render revisado en `output/minuta-texto/diseno-editorial-1.png`. Los documentos de clientes no se modifican durante estas comprobaciones.

Diseño editorial publicado en producción: `dpl_3mxVzAPJJbgQA2bfB2gpWNiETURK`, READY, compilación remota completada en 45 s. Se preparó sin dominio, se verificó la respuesta de autenticación de la ruta PDF (401 sin sesión) y se promovió al dominio de la intranet. Referencia base Git `288e7060b41df8f9eafc2bfa67c102ff186a35b7`, publicación del árbol de trabajo por CLI. Para aplicar el diseño a un documento existente, generar un PDF nuevo desde su texto guardado.

## Pie editable y destacados

Se incorporan `footerReference` y `footerPagination` como campos opcionales del texto guardado. Los registros anteriores mantienen sus valores de presentación iniciales; el editor los expone y permite cambiarlos o vaciarlos explícitamente. El pie principal y los dos campos inferiores admiten los marcadores `{pagina}` y `{total}`. Los campos vacíos no imprimen datos automáticos. El PDF reserva el espacio necesario para pies inferiores extensos y repetidos. El encabezado se conserva.

El editor permite seleccionar texto y aplicar resaltado amarillo, sombreado gris o quitar formato. Se guardan rangos ordenados, no superpuestos y validados junto al texto (hasta 200). El texto se mantiene plano y no se interpreta HTML. La capa de color del editor sigue la posición y desplazamiento del campo de texto. En el PDF se dibujan fondos por fragmento/línea, incluidos títulos, líneas partidas y texto justificado. Al insertar texto fuera de las marcas se ajustan sus posiciones; al reescribir una marca se retira su formato para evitar resaltar palabras equivocadas. La ayuda explica que debe reaplicarse al fragmento reescrito.

Se reutilizan instantáneas, permisos, protección de cierre y generación existentes, sin migración. Cambió la versión del diseño para que regenerar produzca un archivo con el formato nuevo. Verificación: tipos, ESLint, API y PDFs reales; personalización/vaciado del pie, conservación del texto y marcas, ajuste de rangos; navegador en 375/1440 px con aplicación, guardado, reapertura y eliminación de resaltados. Muestra `output/minuta-texto/resaltados-pie-editable.pdf` y render revisado en el mismo directorio. Pruebas de navegador con API simulada y documentos sintéticos.

Publicación de pie editable y destacados: `dpl_CtKoAFtphSMQc3wPtEHjxGZFv4vk`, READY, compilación remota completada. Se verificó la autenticación de la ruta PDF (401 sin sesión), se promovió y se confirmó el dominio de la intranet. Referencia base Git `288e7060b41df8f9eafc2bfa67c102ff186a35b7`; se conserva el árbol de trabajo preexistente. Recargar el editor y generar otra vez aplica los nuevos datos del pie y los destacados al PDF; los archivos anteriores se conservan.

## Consolidación del apartado

La entrega de [Estructura base única para venta y alquiler](estructura-base-unica-produccion-2026-11-09.md) sustituye los dos modelos iniciales por una acción única basada en el documento real aportado y extiende el acceso a la estructura de alquiler. Publicación de producción `dpl_37VYmtBJKYDLwmb7N4CvqyGoEXPk`, READY y dominio de la intranet confirmado. Se conservan extracción, edición, pie, resaltados y PDFs existentes.
