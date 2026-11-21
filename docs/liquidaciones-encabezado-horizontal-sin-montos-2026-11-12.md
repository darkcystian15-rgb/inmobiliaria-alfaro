# Liquidaciones: encabezado, hoja horizontal y modelos sin montos de ejemplo

## Resultado

Las liquidaciones del comprador y vendedor basadas en los modelos Excel incluyen encabezado con logo, título y texto editables, además de pie y numeración. La hoja se presenta en A4 horizontal y las descargas PDF, Excel y Word se configuran en horizontal.

Los montos que aparecían inicialmente procedían de los Excel entregados, no de una interpretación del inmueble ni de un cálculo de sus características. A petición posterior del usuario, los campos numéricos manuales del modelo base pasan a **XXXXX**, incluidos precio, monto no bancarizado, tipo de cambio, UIT, índice, comisión e importes cero de ejemplo. Los resultados y totales se muestran **en blanco** mientras falten los datos necesarios. Al completar los campos, las fórmulas recalculan.

El Excel del vendedor contenía un importe fijo dentro de la fórmula de adquisición (`50000*E7`). Ese importe de caso se traslada a una entrada visible **Compra anterior (US$)**, en F15/G15. D15 calcula ahora `G15*E7`. Así no queda un monto oculto precargado. Las tasas y coeficientes que forman parte de las otras fórmulas permanecen como en el original y las fórmulas siguen siendo editables. Se mantienen sus inconsistencias de referencia, conversión, sumas y observaciones, sin corregirlas.

Los archivos originales de `tests/info1` y la extracción reproducible permanecen intactos. `originalLiquidationGrid` permite cotejarlos; `sourceLiquidationGrid` prepara la base para uso operativo con las entradas pendientes.

## Uso y documentos guardados

- **Encabezado y pie** permite cambiar título, texto del encabezado y pie, y activar o desactivar logo y numeración. Los ajustes aparecen en el editor y la vista previa y se conservan al guardar y reabrir.
- Los documentos nuevos utilizan la base con XXXXX. Los documentos ya guardados conservan sus textos y valores; no se eliminan datos reales ni se decide que un importe coincidente con un ejemplo sea incorrecto.
- **Usar modelo base** reemplaza explícitamente la hoja por la base sin importes de ejemplo. Requiere confirmación y conserva la opción de deshacer. Es la acción a utilizar si se guardó la versión anterior con sus importes de ejemplo y se desea reiniciar la liquidación.
- Los modelos personales conservan el contenido que el operador guarde. Si se desea una plantilla vacía, debe guardarse desde la base con XXXXX.
- Los resultados pendientes se ven en blanco, pero mantienen su fórmula y el indicador ƒ. Escribir un importe manual y recuperar la fórmula siguen disponibles.
- Los errores de fórmulas existentes se muestran cuando sus datos permiten evaluarlas; no se corrigen automáticamente.

## Exportación

**PDF:** A4 horizontal; encabezado con logo, texto y título, y pie/numeración en todas las páginas. Se reserva espacio para evitar que el contenido invada esas zonas. La extensión del modelo determina el número de páginas; no se fuerza todo en una sola página.

**Word:** sección A4 horizontal, tabla editable y encabezado/pie nativos que se repiten en las páginas. El logo está incrustado y la numeración utiliza campos PAGE/NUMPAGES. Los resultados se exportan como texto, conservando los pendientes vacíos.

**Excel:** orientación horizontal, ajuste a una página de ancho, cuatro filas iniciales para logo/título/texto y filas de título para impresión. El pie y los campos de numeración se guardan en la configuración de impresión. El contenido se desplaza cuatro filas y sus referencias se desplazan con él, incluidas las referencias absolutas: cambia la ubicación, no la lógica ni las inconsistencias. La hoja original del expediente no se modifica. Excel conserva las fórmulas y utiliza sus propias reglas de recálculo al abrir; se deben completar los XXXXX antes de interpretar sus resultados.

Los borradores anteriores sin el nuevo texto de encabezado usan el nombre de la inmobiliaria como valor predeterminado. No se requiere migración. El editor anterior de liquidaciones sin modelo Excel conserva su comportamiento.

## Verificación

- TypeScript y ESLint de los módulos modificados.
- Pruebas de dominio, exportación, API y plantillas existentes.
- Cotejo de los originales, modelo base sin valores numéricos de ejemplo, importe antes oculto ahora editable, cálculos pendientes vacíos, recálculo al completar datos y conservación de inconsistencias.
- Exportaciones reales: orientación de cada página del PDF y encabezado/pie repetidos; orientación, imágenes y fórmulas desplazadas de Excel; estructura XML, encabezado/pie, imagen y orientación de Word. Opciones sin logo ni numeración y compatibilidad de encabezados antiguos.
- Navegador a 375 y 1440 px para comprador y vendedor: XXXXX y total pendiente vacío al abrir; encabezado/título/pie editables; logo; edición, fórmula, manual/recuperación, filas, guardado/reapertura, vista previa y las tres descargas.
- Pruebas locales con datos sintéticos y API/almacenamiento simulados. No se modifican expedientes reales para verificar.

Evidencias en `output/liquidaciones-modelos/`. Comandos:

```bash
./node_modules/.bin/tsc --noEmit
node --import ./tests/resolve-typescript.mjs --test tests/liquidation-grid.test.mjs tests/liquidation-export.test.mjs tests/liquidation-api.test.mjs tests/liquidation-templates.test.mjs tests/liquidation.test.mjs
node --import ./tests/resolve-typescript.mjs tests/liquidation-models.browser.mjs
```

## Publicación

Destino: `inmobiliaria-alfarov2`, proyecto `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`, equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. Se conserva el árbol de trabajo previo y se despliega el estado local; no se crea commit ni se ejecuta una migración. Publicación completada.

- Despliegue: `dpl_3ZKgYDb6HKTj1H3Z1mRntQVYj3Bj`, estado **READY**, producción.
- URL: https://inmobiliaria-alfarov2-9b9eis7f3-puma19.vercel.app.
- Dominio activo: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Preparado con `--prod --skip-domain` y promovido después de verificar la API.
- Comprobación previa con `vercel curl`: HTTP 401 y JSON `{"error":"Inicia sesión para continuar."}`, respuesta esperada sin sesión de la intranet; protección de Vercel conservada.
- Dominio verificado mediante `get_alias` y promoción mediante los alias del proyecto.
- TypeScript, ESLint y las cinco familias de pruebas completados correctamente; navegador correcto en las cuatro combinaciones de parte y ancho.
- No se modificaron expedientes reales para las pruebas. La verificación funcional fue local con fronteras simuladas; la comprobación remota no equivale a una edición autenticada sobre un cliente real.
