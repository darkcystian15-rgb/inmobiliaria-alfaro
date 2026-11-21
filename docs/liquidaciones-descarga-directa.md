# Liquidaciones con descarga directa

La hoja muestra dirección, vendedor, comprador, fecha y tipo de cambio antes de los conceptos. Los datos precargados se pueden editar en la liquidación. El tipo de cambio es opcional y permite calcular equivalencias.

Las filas del modelo permiten editar concepto, importe y observación. Para registrar el importe en otra moneda, escribe en su columna. Si la fila ya tiene un importe, el editor confirma el cambio de moneda. Las flechas mueven las filas y el menú de cada fila permite duplicar, quitar o cambiar el tipo de cálculo. Al pasar un cálculo a importe manual, se conserva el resultado si estaba disponible.

La barra aplica negrita, cursiva, tipografía, tamaño, resaltado amarillo y sombreado gris a la celda seleccionada. El formato se guarda en el borrador y en el modelo. La vista previa, el PDF y el Excel conservan el formato.

**Encabezado y pie** permite cambiar el título y el texto del pie, y elegir si se muestran el logo y la numeración. El PDF repite esos elementos en cada página. El Excel conserva el título en la hoja y el pie en la configuración de impresión.

Los botones **Descargar PDF** y **Descargar Excel** usan lo que se ve en el editor, incluidos los cambios pendientes de guardar. Se puede descargar con datos básicos o importes incompletos. Un importe vacío se exporta como celda vacía y un cero ingresado se exporta como cero. **Adjuntar al expediente** es una acción separada con su validación de datos completos. La descarga no crea adjuntos.

Los nuevos ajustes de formato y de página son opcionales. Las liquidaciones y modelos guardados pueden seguir abriéndose sin migración.

## Verificación y publicación

TypeScript, ESLint y las pruebas de validación, exportación, API y modelos pasaron. El flujo se comprobó en navegador a 375 y 1440 px con datos simulados, incluida la descarga de un borrador incompleto.

Producción en Vercel, proyecto inmobiliaria-alfarov2, despliegue dpl_5aZfAhY54qbD2sziVM1AFaL2L5hP en estado READY. La ruta de liquidaciones respondió con el 401 de inicio de sesión esperado y la intranet apunta a este despliegue.
