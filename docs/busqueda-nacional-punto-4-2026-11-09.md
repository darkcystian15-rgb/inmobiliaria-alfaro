# Búsqueda nacional en el punto 4

En los expedientes de venta, la Búsqueda nacional del vendedor y del comprador tiene ubicación fija en **FASE 2 → 4. Impuestos y constancias**, dentro del bloque de cada parte. Ya no aparece en **1. DNI y poderes** y no cambia de carpeta al elegir «Si paga», «No paga» o «Seleccionar» en impuesto a la renta.

Se conservan las categorías `VENDEDOR_BUSQUEDA_NACIONAL` y `COMPRADOR_BUSQUEDA_NACIONAL`: los documentos ya cargados se presentan en la nueva carpeta sin modificar archivos físicos, registros, enlaces, nombres ni observaciones. El conteo de archivos y requisitos sigue la misma ubicación, sin duplicación. No requiere migración ni volver a subir documentos.

Las notas alternativas existentes también se conservan y se editan junto a la Búsqueda nacional en el punto 4. Se mantienen las reglas previas: cuando el vendedor indica «No paga», debe adjuntar el documento de búsqueda como sustento y una nota no lo sustituye. En los demás casos aplicables se conserva la nota alternativa durante la preparación, mientras el cierre sigue exigiendo los archivos obligatorios correspondientes. El comprador continúa dependiendo de su asignación y tipo de persona. No se añaden requisitos ni consultas automáticas a servicios externos.

El expediente de alquiler y sus categorías no cambian.

## Verificación

- 30 pruebas de reglas del expediente: correctas.
- Prueba de agrupación de archivos: ambos estados del impuesto muestran el mismo archivo del vendedor en impuestos, una sola vez.
- TypeScript y ESLint del componente: correctos.
- Navegador en 375 y 1440 px: ambas búsquedas y notas en impuestos, ausencia en identificación, persistencia de notas y conservación de documentos al cambiar la condición tributaria.

## Despliegue

- Producción Vercel: `dpl_N8LgvUvYBSBfSySxV5hDvXKYs1nw`, estado **READY**.
- Compilación y despliegue de producción completados correctamente.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Se conserva el árbol de trabajo y los cambios previos existentes.
