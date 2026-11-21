# Liquidaciones editables con formato de celda

## Interfaz

La referencia visual es el editor de Estructura de minuta del apartado 3. Las liquidaciones conservan su hoja tipo Excel, con una barra compacta de Negrita, Tamaño (8–24 pt), Resaltar amarillo, Sombrear gris y Limpiar. El formato se aplica al contenido de la celda seleccionada: concepto, importe en USD/PEN u observación. Resaltado y sombreado son alternativas de fondo, igual que en el editor de minuta; no se introducen formatos HTML arbitrarios.

La hoja muestra concepto, US$, S/ y observación. Las opciones de tipo de fila, moneda, tratamiento, pagado, porcentaje y organización quedan en el botón ··· de cada fila. Tab avanza por las celdas; Enter y Mayús+Enter recorren la misma columna. Se pueden agregar, duplicar, mover y quitar conceptos o secciones.

Datos de la operación y Datos del documento quedan plegados cuando se dispone de la información. Los campos precargados del expediente se pueden editar sin cambiar la ficha original. Al usar un modelo personal se toma el tipo de persona actual del expediente.

## Modelos y cálculos

Los modelos nuevos conservan conceptos base para vendedor, comprador y alquiler, pero parten de importes manuales. Los totales se suman automáticamente por moneda. Las fórmulas de porcentaje y los cálculos existentes siguen disponibles en las opciones de fila; los documentos guardados no se convierten ni se alteran automáticamente.

Guardar modelo base conserva estructura y formato para futuros expedientes. El modelo personal elimina nombres, identificaciones, representantes, importes, bases, notas y pagos del caso, manteniendo el comportamiento existente de las plantillas. Se guarda por usuario, parte y operación. Los documentos actuales no cambian al guardar un modelo.

## Guardado y exportación

El formato se persiste como formats opcional en cada fila y se valida en el servidor. Los documentos antiguos sin formato siguen siendo válidos. El guardado conserva versiones, control de concurrencia y solo lectura para operaciones cerradas. No se requiere migración.

La vista previa, el Excel y el PDF conservan negrita, tamaño y fondo de cada celda. La exportación muestra importes separados en US$ y S/. El PDF repite logo, título y línea de encabezado en todas las páginas; el pie lleva inmobiliaria, código del inmueble y número de página. Se reservan márgenes para evitar superposición. Excel conserva sus fórmulas, logo y configuración de impresión con encabezado y pie.

## Verificación

- TypeScript y ESLint de los cuatro archivos de implementación: correctos.
- Cuatro suites: validación/cálculos, exportación real PDF/XLSX, API y modelos personales correctos. Verifican compatibilidad con cálculos previos, estilos persistidos, rechazo de formatos inválidos y conservación del formato en el modelo.
- PDF multipágina: encabezado, pie y título presentes en cada página; tamaño 18 pt comprobado mediante lectura del PDF. Excel real: negrita, tamaño y fondos comprobados en celdas; fórmulas y totales comprobados.
- Navegador con API simulada en 375 y 1440 px: edición manual, porcentaje opcional, navegación, negrita, tamaño, resaltado, sombreado, guardado, filas/secciones, generación, comprador y alquiler correctos.
- Inspección visual de hoja y PDF. Sin escrituras de prueba en expedientes reales.

## Publicación

Producción Next.js, proyecto inmobiliaria-alfarov2, equipo team_qcKFQOeqeLWTJFsCLGnZvPiL. Despliegue dpl_4QCekX735p2o9W9DN2ciJsmLzNqT, READY; URL https://inmobiliaria-alfarov2-ilp8syokj-puma19.vercel.app. Preparado sin asignar dominio, comprobado GET del módulo de liquidaciones (401 JSON de inicio de sesión esperado), promovido a https://intranet.inmobiliariaalbertoalfaro.com.pe. Fuente: estado local sobre base Git 288e7060b41df8f9eafc2bfa67c102ff186a35b7, sin commit nuevo ni migración.
