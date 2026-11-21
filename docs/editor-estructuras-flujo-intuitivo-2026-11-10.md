# Editor de estructuras: secuencia y presentación más intuitivas

## Objetivo

Reducir el texto permanente y dar prioridad a la edición del documento, conservando todas las funciones del apartado de estructuras de venta/alquiler. Se mantiene una sola pantalla, con opciones desplegables y acciones finales siempre accesibles.

## Organización del apartado

1. **Empezar documento / Cambiar punto de partida:** reúne Usar estructura base y Usar un Word. Se abre inicialmente si el documento está vacío; al reabrir un borrador con contenido permanece recogido. Incorporar una base o texto extraído recoge el panel para continuar editando.
2. **Presentación del PDF:** panel recogido con título, encabezado, pie, referencia y numeración. Todos los campos siguen siendo editables. Los marcadores de numeración y otras explicaciones están en Ayuda de presentación.
3. **Contenido:** ocupa la mayor parte de la pantalla. La barra de formato se mantiene accesible durante el desplazamiento. La ayuda está en un desplegable y las confirmaciones rutinarias son breves, sin grandes bloques de explicación.
4. **Guardar, Ver archivo y Generar PDF:** acciones fijas en el pie del editor, fuera del área de desplazamiento. No se superponen al final del documento. Generar PDF conserva su comportamiento de guardar el borrador y adjuntar el PDF al expediente.

El encabezado del editor muestra únicamente el apartado y el contexto del inmueble. La entrada desde Contratos reduce su descripción a una frase.

## Barra de formato

Se conservan Negrita, Tamaño de letra, Resaltar, Sombrear y Limpiar formato. Negrita se presenta como N, con nombre accesible y ayuda al pasar el cursor. Elegir un tamaño aplica el cambio a la selección, eliminando el segundo botón Aplicar tamaño. El selector refleja tamaños uniformes de la selección o indica Mixto cuando corresponde.

Los botones mantienen nombres accesibles completos y áreas de interacción adecuadas. Los mensajes necesarios, como pedir una selección o explicar un error de formato, continúan visibles. Las explicaciones de uso, atajos y comportamiento al reescribir se encuentran en Ayuda de edición. El contador de caracteres continúa disponible sin repetir instrucciones.

La edición utiliza el desplazamiento central del documento; se retira el segundo contenedor desplazable del contenido. El encabezado y las acciones de entrega permanecen en sus zonas fijas.

## Funciones conservadas

- Base única adaptada automáticamente a la operación, con añadido al final, cancelación y reemplazo que exige confirmación.
- Extracción de Word del apartado. Selección y lectura se muestran al pulsar Usar un Word; texto extraído, notas de lectura e incorporación de encabezado/pie siguen disponibles.
- Edición, negrita, tamaños, resaltados, sombreado, limpieza, escritura, saltos y deshacer/rehacer.
- Edición completa de título, encabezado y todos los datos del pie, incluida su numeración.
- Guardado, apertura del PDF en otra pestaña, generación con adjunto automático y descarga.
- Deshacer incorporación de estructura y descartar cambios sin guardar, trasladados a Más en el encabezado.
- Protección al salir con cambios pendientes, estados de solo consulta, bloqueo durante operaciones, conservación de datos ante fallos/conflictos y controles del servidor existentes.

Al generar, Ver archivo pasa a abrir el archivo adjuntado y aparece el enlace Descargar PDF en el pie. Al editar nuevamente se invalida esa referencia en pantalla y Ver archivo vuelve a preparar el documento actualizado, conservando el guardado previo a la apertura.

## Alcance técnico

Se modifican la composición visual y los textos de `MinuteTextEditor.tsx`, la barra y disposición de `MinuteContentEditor.tsx`, y la introducción en `TransactionDossier.tsx`. Se mantienen los datos guardados, la estructura base, la API, el almacenamiento y el generador PDF. No se requieren migraciones ni cambios de credenciales o de documentos de clientes.

## Verificación

- TypeScript y ESLint de los tres componentes afectados.
- `tests/minute-editor.browser.mjs`, con venta/alquiler en 375 y 1440 px: base en documento vacío, extracción, encabezado y pie, confirmación/cancelación de reemplazo, reversión desde Más, añadido, escritura, saltos, deshacer/rehacer, formato y aplicación inmediata de tamaño, guardado y reapertura, paneles recogidos al reabrir, apertura en otra pestaña, PDF, descarga disponible y conservación ante conflictos.
- Comprobación de que la barra de formato permanece accesible al desplazar y de que las acciones del pie no producen botones de varias líneas.
- Capturas revisadas en `output/minuta-texto/editor-venta-375.png` y `editor-venta-1440.png`, y equivalentes de alquiler. Las pruebas de navegador usan datos sintéticos y API simulada; no acreditan una generación autenticada en el hosting real.
- Revisión de diferencias sin errores de espacios.

## Publicación

Proyecto de producción: `inmobiliaria-alfarov2`, ID `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`, equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. Se preparó un despliegue de producción sin asignación de dominio, se comprobó y se promovió después. Referencia base Git `288e7060b41df8f9eafc2bfa67c102ff186a35b7`, conservando el árbol de trabajo preexistente.

- Despliegue: `dpl_8Ve312e8wANgsSNH64z51DLGj15t`, estado **READY**.
- URL de despliegue: `https://inmobiliaria-alfarov2-jld8628dd-puma19.vercel.app`.
- Compilación remota completada correctamente y confirmada mediante las herramientas de Vercel.
- Comprobación sin sesión de aplicación: HTTP 401 con el mensaje de autenticación esperado en la ruta del editor.
- Versión promovida; el dominio `https://intranet.inmobiliariaalbertoalfaro.com.pe` apunta al despliegue nuevo.
- La revisión de navegador completó las cuatro combinaciones de operación y ancho; TypeScript y ESLint pasaron.

Recargar la intranet para utilizar la organización nueva. Los documentos, sus formatos y los archivos existentes se conservan.
