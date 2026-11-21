# Negrita y tamaños de letra en estructuras

## Resultado

El editor de Estructura de Minuta (venta) y Estructura de Contrato de Alquiler incorpora **Negrita**, **Tamaño de letra** y **Aplicar tamaño**, junto a los resaltados existentes. El usuario selecciona palabras o párrafos, elige el formato y lo ve directamente dentro del editor. El contenido conserva ese formato al guardar, reabrir y generar el PDF de entrega.

Tamaños disponibles: 10, 11,5 (normal), 12, 14, 16, 18, 20 y 24 puntos. Pueden combinarse negrita, tamaño y fondo amarillo o gris. Negrita permite activar/desactivar el estilo para una selección. **Quitar formato de selección** elimina tanto negrita/tamaño personalizados como los resaltados del fragmento, conservando los formatos de los demás fragmentos. Si no hay texto seleccionado, se explica que debe seleccionarse primero.

## Editor

Se reemplaza el campo de texto con capa de resaltado por una superficie editable con segmentos de texto y estilos controlados. El contenido sigue guardándose como texto plano con metadatos de rangos; no se guarda ni se ejecuta HTML proporcionado por el usuario. Pegar incorpora únicamente texto plano. La reconstrucción de los segmentos usa nodos de texto y elementos creados por la aplicación.

Se preservan selección y posición del cursor durante los cambios. Se incorporan escritura, saltos de línea y acciones de deshacer/rehacer dentro del editor, además de Ctrl/Cmd+B para negrita. Se respetan la composición de texto y el modo de consulta de expedientes cerrados. El límite de contenido continúa siendo 20 000 caracteres.

Al insertar o borrar texto fuera de rangos marcados se ajustan sus posiciones. Si se reescribe un fragmento con formato, se retira el formato afectado para evitar aplicarlo a palabras equivocadas; la ayuda explica que debe reaplicarse. La estructura base sigue conservando los formatos al añadir contenido y limpiándolos únicamente al reemplazar el texto con confirmación.

## Persistencia y compatibilidad

Se añade el campo opcional `formats` al documento existente: rangos ordenados y no superpuestos con `start`, `end`, `bold` y/o `size`. Se admiten hasta 200 rangos tipográficos, además de los rangos de fondo existentes. El servidor valida posiciones, booleanos, tamaños permitidos y tamaño total antes de escribir.

Se mantienen las instantáneas de `inm_timeline`, el control de versión, auditoría, permisos y protección de cierre/eliminación existentes. No hay migración. Los borradores anteriores sin `formats` se abren con su presentación normal. No se modifican automáticamente documentos ni PDFs de clientes.

## PDF

La generación compone cada párrafo con segmentos de fuente, tamaño y fondo. Mide el ancho real con las fuentes Liberation incrustadas, envuelve palabras y ajusta la altura de cada línea a su mayor tamaño. Mantiene el contenido dentro de los márgenes y reserva el pie; conserva títulos junto al párrafo siguiente y evita líneas aisladas al continuar párrafos. Los fondos se dibujan detrás de los segmentos, con sus dimensiones y espaciado correspondientes.

Se conserva el encabezado aprobado con logo y el pie completamente editable. El título general, encabezado y pie mantienen su diseño; los nuevos controles corresponden al contenido seleccionado. **Ver archivo** continúa abriendo en otra pestaña. Se actualiza la huella del diseño a `minute-pdf-v5-rich-text` para generar un archivo nuevo con este tratamiento cuando se solicite.

## Archivos

- `lib/minute-format.mjs`: aplicación de formato por selección y composición de segmentos compartida por editor/PDF.
- `lib/minute-document.ts`: datos opcionales, validación y ajuste de rangos durante la edición.
- `app/components/MinuteContentEditor.tsx`: superficie editable, selección, controles y operaciones de texto.
- `app/components/MinuteTextEditor.tsx`: integración y bloqueo de edición durante operaciones o consulta.
- `lib/minute-export.ts`: distribución de fuentes/tamaños y paginación del PDF.
- `lib/minute-template.ts`: conservación de formato al añadir la estructura base y limpieza al reemplazarla.

## Verificación

- `tests/minute-format.test.mjs`: combinación de estilos, eliminación parcial, compatibilidad anterior, validación, desplazamiento de rangos y PDF real multipágina con tamaños grandes. Se comprueban las fuentes incrustadas mediante los operadores de dibujo y los márgenes y posiciones del contenido.
- `tests/minute-api.test.mjs`: guardado/reapertura con formato y rechazo de tamaños no admitidos; regresiones de permisos, cierre, conflictos y generación por operación.
- `tests/minute-document.test.mjs` y `tests/minute-template.test.mjs`: regresiones de documento, pie, resaltados y base única, incluidos conservación y reemplazo de formato.
- `tests/minute-editor.browser.mjs`: venta/alquiler a 375/1440 px; escritura y saltos, deshacer/rehacer, negrita/tamaño junto a resaltados, guardado y reapertura, quitar formato y apertura/generación de PDF. Se utilizan API simulada y datos sintéticos.
- TypeScript y ESLint de los archivos afectados.

Muestra en `output/minuta-texto/negrita-tamanos.pdf`; muestra visual de tipografía en `output/minuta-texto/font-debug.png` y capturas del editor en el mismo directorio. La prueba de navegador no sustituye una generación autenticada contra el almacenamiento real.

## Producción

Proyecto de la intranet: `inmobiliaria-alfarov2`, ID `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`, equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. Publicación realizada mediante despliegue de producción preparado sin asignar dominio, verificación y promoción posterior. Se conserva el árbol de trabajo anterior, con referencia base Git `288e7060b41df8f9eafc2bfa67c102ff186a35b7`.

- Despliegue: `dpl_DFhgftu39QmBEcoNc44mAqq1CB4N`, estado **READY**.
- URL de despliegue: `https://inmobiliaria-alfarov2-fxahr9ndn-puma19.vercel.app`.
- Compilación remota completada correctamente; verificación de ruta privada sin sesión: HTTP 401 con el mensaje de autenticación esperado.
- Versión promovida a producción; dominio confirmado `https://intranet.inmobiliariaalbertoalfaro.com.pe`.
- TypeScript, ESLint, pruebas de formato/API/documento/plantilla y navegador en las cuatro combinaciones de operación y ancho completadas correctamente.

Uso: recargar el editor, seleccionar el texto, aplicar negrita o elegir un tamaño y pulsar Aplicar tamaño. Guardar y generar nuevamente el PDF para obtener el documento con el formato nuevo. Los PDFs anteriores permanecen disponibles.

## Ajuste posterior de la barra

La [reorganización del editor](editor-estructuras-flujo-intuitivo-2026-11-10.md) conserva el formato por selección en una barra compacta. El tamaño se aplica al elegirlo y la explicación se encuentra en Ayuda de edición; no es necesario un segundo botón Aplicar tamaño.
