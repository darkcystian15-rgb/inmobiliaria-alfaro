# Editores de Estructura de Contrato Promesa-Venta y Contrato de Promesa de Venta

## Resultado

FASE 2 → Contratos incorpora el editor compartido en dos apartados de venta:

| Apartado | Acción | Categoría de los archivos | Evento del borrador |
| --- | --- | --- | --- |
| Estructura de Contrato Promesa-Venta | Abrir editor de estructura de promesa | ESTRUCTURA_PROMESA_VENTA | estructura_promesa_texto |
| Contrato de Promesa de Venta | Abrir editor de contrato de promesa | PROMESA_ARRAS | contrato_promesa_texto |

Cada apartado tiene su propia base, borrador, versión, extracción de Word, imágenes y PDF adjunto. Se conserva el comportamiento de Estructura de Minuta y de la estructura de alquiler. Los archivos previos permanecen en sus categorías; un Word adjunto no se convierte automáticamente en un borrador.

## Bases generales

Se leyeron los modelos locales `tests/info/ESTRUCTURA  PROMESA DE CV  LALI PINEDO (1).docx` y `tests/info/PROMESA DE COMPRAVENTA  (1).docx`. No se modifica ninguno de los originales.

La estructura generaliza vendedores, compradores, régimen patrimonial, dirección registral y municipal, información del PU, precio, pagos a la promesa/minuta/escritura, plazos, cargas y observaciones para notaría. Conserva el detalle de beneficiarios, medios de pago, liquidación de deuda y condiciones de formalización como campos editables y opcionales según corresponda.

El contrato contiene la identificación de las partes, las nueve cláusulas del modelo reorganizadas en redacción editable —antecedentes, objeto, precio y pagos, destino del pago inicial, gravámenes, plazos, impuestos, conocimiento y entrega, domicilios y controversias—, lugar/fecha y bloques de firmas. Incluye una ubicación identificable para comprobantes en la cláusula 3.1. Las condiciones específicas (tipo de arras, hipoteca, intervención del cónyuge, plazos, deudas y constancias de recepción) deben completarse para la operación correspondiente.

Las bases incorporadas al código no contienen nombres, DNI, cuentas, direcciones, importes, fechas ni comprobantes del cliente de los ejemplos. Solo se toma el tipo y dirección de la ficha actual cuando corresponde, indicando que la dirección está pendiente de cotejo documental. No se asumen pagos realizados ni se arrastran los términos particulares del caso de referencia.

## Edición, imágenes y entrega

Se reutilizan escritura, formato, guardado, reapertura, confirmación de reemplazo, incorporación al final, deshacer incorporación, descarte, protección de salida, Ver archivo en otra pestaña y generación/adjunto de PDF.

El panel de imágenes admite una, dos o tres imágenes por fila. Para agrupar comprobantes se asigna la misma ubicación después de un párrafo. El orden de carga se conserva dentro de cada ubicación. El PDF ajusta las imágenes proporcionalmente al ancho de su celda y reserva espacio para la fila completa y sus descripciones; no parte una imagen entre páginas. La selección de columnas se conserva al guardar. La distribución por filas también queda disponible en el editor de minuta que comparte el componente.

La marca de agua usa el logo institucional, es opcional y está desactivada por defecto. Se aplica detrás del contenido al generar el PDF, con tamaño e intensidad configurables. No se importan imágenes ni la maquetación desde el Word: Usar un Word sigue siendo extracción de texto, con sus notas de lectura. Los comprobantes se cargan directamente para cada operación.

## Persistencia y controles

Se mantiene el endpoint autenticado /api/inmuebles/[id]/minuta-texto. El parámetro document admite minute (implícito), promise-structure y promise-contract. El servidor rechaza valores desconocidos y promesas en inmuebles de alquiler; resuelve la categoría y el evento internamente. El parámetro se conserva en guardado, extracción, generación y apertura del PDF.

Los borradores se guardan como instantáneas inmutables independientes por inmueble y evento, con control de versión y bloqueo transaccional. No requiere migraciones. Los borradores anteriores de minuta y alquiler siguen leyéndose con su evento existente. El historial presenta nombres específicos para los nuevos guardados.

Las imágenes y los Word deben pertenecer al mismo inmueble y categoría. Se mantienen autenticación, permiso informacion, restricciones de escritura por cierre/eliminación, validación de tamaño/MIME y lectura privada del hosting. La huella del PDF incluye categoría y versión de diseño, evitando reutilización entre apartados. El bloqueo de generación se diferencia por inmueble y categoría. Un archivo ausente o inválido produce un error explícito, sin generar un PDF incompleto.

## Verificación

- TypeScript y ESLint de los archivos afectados; git diff --check.
- API: guardado/reapertura y eventos independientes en minuta, estructura y contrato; conflictos de versión; PDFs y reintentos en su categoría; rechazo de alquiler/tipos desconocidos; rechazo de archivos de otra categoría o inmueble; cierre y archivos dañados.
- Bases: apartados, nueve cláusulas, pagos, firmas, límites de contenido, preservación de títulos personalizados, añadir/reemplazar imágenes y ausencia de datos particulares del ejemplo.
- PDF real: nueve cláusulas y firmas, ocho comprobantes de prueba en filas de dos y tres, pies dentro de márgenes, orden de inserción antes del siguiente pago y logo/marca de agua por página.
- Navegador 375/1440 px: acceso desde ambos apartados, Word filtrado por categoría, base, guardado/reapertura, marca opcional, dos imágenes en una ubicación, filas, vista previa con apartado correcto en la URL, generación, conflicto sin pérdida, independencia de minuta y solo consulta.
- Regresión de minuta/alquiler en 375/1440 px y pruebas de expediente, documento y formato.

Las pruebas usan contenido sintético, navegador con API simulada y rutas de API con base/hosting simulados. La revisión no escribe documentos en expedientes de clientes ni acredita una carga autenticada real en producción. Las muestras están en output/promesa-editor y output/minuta-texto, excluidos del despliegue.

Comandos reproducibles:

```bash
npx tsc --noEmit
node --import ./tests/resolve-typescript.mjs --experimental-strip-types --test tests/minute-api.test.mjs tests/promise-template.test.mjs tests/promise-pdf.test.mjs tests/minute-template.test.mjs tests/minute-document.test.mjs tests/minute-format.test.mjs tests/transaction-dossier.test.mjs
node --import ./tests/resolve-typescript.mjs --experimental-strip-types tests/promise-editor.browser.mjs
node --import ./tests/resolve-typescript.mjs --experimental-strip-types tests/minute-editor.browser.mjs
```

El cargador de pruebas resuelve imports TypeScript relativos sin extensión como lo hace el bundler de la aplicación; no modifica la configuración de producción.

## Publicación

Proyecto previsto: inmobiliaria-alfarov2, prj_Y4rkO3CVHKLA2akcLF6rguUJksvG, equipo team_qcKFQOeqeLWTJFsCLGnZvPiL. Se conserva el árbol de trabajo previo y se despliega por CLI desde los archivos locales. Se prepara producción sin asignar dominios, se verifica y se promueve el mismo despliegue.

### Resultado publicado

- Estado: **READY**, producción, framework Next.js.
- Despliegue: `dpl_7Z4ZzzYCBp9kehnKxpacrc7La5H2`.
- URL: https://inmobiliaria-alfarov2-98gb6xxhe-puma19.vercel.app.
- Dominio de intranet: https://intranet.inmobiliariaalbertoalfaro.com.pe; promoción completada y comprobada mediante inspect del dominio.
- Referencia Git base: `288e7060b41df8f9eafc2bfa67c102ff186a35b7`; se publicaron los archivos locales, incluidos los cambios de trabajo previos, sin crear un commit ni alterar los originales de info.
- Compilación remota completada: build de Vercel en 56 segundos; TypeScript y compilación Next.js correctos.
- Antes de promover: GET de los dos valores de document mediante vercel curl devuelve HTTP 401 con el JSON de inicio de sesión esperado, sin fallo de ejecución.
- Revisión de logs de nivel error del despliegue: no se encontraron registros. No hay comprobación autenticada sobre expedientes de clientes; las pruebas funcionales completas usan las fronteras simuladas descritas arriba.
- Evidencias locales finales: siete archivos de pruebas de API/bases/PDF/formato/expediente pasan; ambos editores pasan en 375 y 1440 px; regresión de minuta/alquiler pasa en ambos anchos. PDF final de seis páginas con ocho comprobantes sintéticos en tres columnas y bloques de firma revisado visualmente.
