# Liquidaciones: modelos Excel con edición libre

Actualización posterior: [encabezado, hoja horizontal y modelos sin montos de ejemplo](liquidaciones-encabezado-horizontal-sin-montos-2026-11-12.md). Esa actualización sustituye la precarga de importes descrita en esta primera entrega.

## Resultado

Las liquidaciones nuevas de comprador y vendedor en FASE 2 → Impuestos y constancias → Generar liquidación abren el modelo correspondiente de `tests/info1/LIQUIDACION DEL COMPRADOR.xlsx` o `tests/info1/LIQUIDACION VENDEDOR.xlsx`.

Se conservan todos los textos, XXXXX, importes y fórmulas originales, incluidas sus inconsistencias, por instrucción expresa del usuario. No se corrigen los ejemplos, EXONERADO, referencias, conversiones ni sumas. Los errores de fórmula se muestran en las celdas. Los resultados se recalculan al cambiar datos, por lo que una fórmula modificada se representa con su resultado actual, no con la caché antigua del archivo.

## Uso

- Hacer clic sobre un texto o importe para escribir directamente. Enter termina la edición; Shift+Enter introduce una línea. Tab permite recorrer controles y celdas.
- La barra aplica negrita, cursiva, fuente, tamaño, fondo y alineación a la celda seleccionada.
- Las celdas automáticas llevan ƒ. Seleccionarlas permite **Editar fórmula** o **Escribir importe manual**. Después de escribir manualmente, **Recuperar fórmula** restaura la última fórmula activa de esa celda.
- **Texto, valor o fórmula** permite introducir una fórmula en cualquier celda, empezando por `=`. Se admiten referencias de celdas, referencias absolutas, operaciones +, -, *, /, ^, %, rangos y SUM, ROUND, MIN, MAX y ABS. No es un motor completo de Excel; otras funciones no se admiten. No se ejecuta JavaScript, macros ni enlaces externos.
- **+ Fila debajo** y **Quitar fila** actualizan las referencias. Si se elimina una fila referenciada, se conserva el error #REF! hasta que el usuario lo edite. **Deshacer** alterna el último cambio.
- El guardado automático, Guardar ahora, Guardar y cerrar y las versiones anteriores conservan las celdas y las fórmulas. Los modelos personales conservan el contenido de la hoja, incluidos los textos e importes introducidos; se debe revisar el contenido antes de reutilizarlos.
- La vista previa presenta la misma hoja sin controles de edición. Los títulos pueden fluir sobre las celdas vecinas vacías, como en Excel. En móvil, la hoja se desplaza horizontalmente dentro del editor.

## Descargas y compatibilidad

**PDF:** contenido y resultados actuales con tamaños, colores, alineación y bordes. La paginación se adapta al documento; no se promete una réplica exacta de la impresión de Excel.

**Excel:** fórmulas originales o editadas en sus celdas, valores actuales, formatos y recálculo al abrir. Las celdas manuales se exportan como valores.

**Word:** tabla editable con textos, resultados y formato. Las fórmulas permanecen en el editor y en Excel; Word recibe sus resultados como texto editable.

PDF y Excel también pueden adjuntarse al expediente mediante la acción existente. Las descargas directas utilizan los cambios actuales y no crean adjuntos. Los errores y campos de ejemplo de los modelos no bloquean su descarga o adjunto: corresponde al operador revisar el contenido.

Los borradores antiguos conservan su hoja anterior. **Usar modelo Excel original** permite reemplazar explícitamente el contenido, con confirmación y opción de deshacer; no se modifica un expediente al desplegar. Alquiler mantiene su editor anterior. Los expedientes cerrados permiten consulta y descarga. No requiere migración de base de datos.

## Implementación

- `scripts/generate-liquidation-models.mjs`: extracción reproducible desde los Excel originales; no modifica los archivos fuente.
- `lib/liquidation-source-models.ts`: modelos incorporados; producción no necesita leer `tests/info1`.
- `lib/liquidation-grid.ts`: validación, evaluación aritmética acotada, edición manual, restauración de fórmulas y referencias al modificar filas.
- `app/components/LiquidationModelEditor.tsx`: edición directa y vista previa.
- `lib/liquidation-grid-export.ts`: PDF, XLSX y DOCX.
- Integración en el editor, API, guardado e historial existentes mediante el campo opcional `grid`.

Se mantienen los límites existentes del borrador (55 000 caracteres y 60 000 bytes en API). Cada hoja admite hasta 200 filas, 12 columnas y 1 200 celdas con contenido; la interfaz no amplía los límites de documentos del expediente.

## Validación

TypeScript y ESLint de los archivos modificados. Pruebas existentes de liquidaciones, exportaciones, API y plantillas, además de cotejo de todas las celdas y fórmulas con ambos originales, dependencias, errores conservados, sustitución manual/restauración, inserción y eliminación de filas, validación y exportaciones reales en tres formatos.

Navegador con componentes reales, datos sintéticos y API simulada a 375 y 1440 px para ambas partes: entrada desde expediente, texto libre, importe, fórmula, resultado manual, recuperación, formato, filas, deshacer, guardado, reapertura, vista previa, descarga real de PDF/Excel/Word y acción de adjuntar simulada. Evidencias: `output/liquidaciones-modelos/`. Las pruebas no modifican expedientes reales ni acreditan una subida autenticada al almacenamiento de producción.

Comandos:

```bash
node scripts/generate-liquidation-models.mjs
npx tsc --noEmit
node --import ./tests/resolve-typescript.mjs --test tests/liquidation-grid.test.mjs tests/liquidation-api.test.mjs tests/liquidation.test.mjs tests/liquidation-export.test.mjs tests/liquidation-templates.test.mjs
node --import ./tests/resolve-typescript.mjs tests/liquidation-models.browser.mjs
```

## Despliegue

Destino verificado: proyecto `inmobiliaria-alfarov2` (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`), equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. Base Git `288e7060b41df8f9eafc2bfa67c102ff186a35b7`; publicación del árbol local existente, con sus cambios previos, sin crear commit ni revertir trabajos anteriores. Publicación completada.

- Estado: **READY**, producción.
- Despliegue: `dpl_Gw1NUeW17PVktYQXgJrm8Ljsxwsx`.
- URL de despliegue: https://inmobiliaria-alfarov2-hao65i9ui-puma19.vercel.app.
- Dominio activo: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Compilación remota completada en 50 segundos; TypeScript y generación de rutas correctos.
- Despliegue preparado inicialmente con `--prod --skip-domain`; promoción realizada después de la comprobación HTTP.
- API del despliegue: HTTP 401, JSON `{"error":"Inicia sesión para continuar."}`, respuesta esperada sin sesión de la intranet. La comprobación se completó con `vercel curl`; la herramienta de consulta de Vercel no superó su protección en el primer intento. No se desactivó la protección.
- Promoción y destino del dominio verificados con `get_alias`: apunta al despliegue indicado. Ambos alias del proyecto figuran con estado `completed`.
- No se hicieron migraciones, cambios en expedientes reales ni commit nuevo.

Las verificaciones funcionales completas se realizaron localmente con API y almacenamiento simulados. No se afirma una edición o un adjunto autenticados sobre datos reales de producción.
