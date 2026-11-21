# Formatos completos de los modelos Word — 2026-11-11

## Resultado

Los modelos de Estructura de Minuta y Estructura de Contrato de Alquiler incorporan texto y formatos de los originales de `tests/info1`: negritas, subrayado simple, tamaños de letra, listas con letras y viñetas, sangrías, alineación, interlineado, espacios antes/después y párrafos vacíos. Se conserva la tabulación del campo de identificación del comprador/arrendatario. Se mantienen las correcciones de redacción y la eliminación de la condición repetida de firma documentadas anteriormente.

«OBSERVACIONES» conserva 16 pt en venta y 14 pt en alquiler; el cuerpo y título del modelo usan 11 pt. No hay cursiva, tachado ni resaltado de origen en estos Word.

El subrayado se puede aplicar o retirar desde la barra del editor, también con Ctrl/Cmd+U. Guardado, reapertura, vista previa, PDF y Word conservan los rangos. Añadir una base al final conserva los formatos anteriores y desplaza correctamente los nuevos rangos. La edición de texto desplaza y adapta el formato de párrafos. Los borradores anteriores sin estos campos siguen siendo válidos.

## Fuentes y presentación

Word exporta Calibri. Editor y vista previa usan Carlito, compatible métricamente con Calibri, servido localmente desde `/branding/fonts`, junto a los recursos públicos de marca y con su licencia. El PDF incrusta una variante derivada de Carlito con glifos compuestos descompuestos para evitar pérdida de caracteres al generar subconjuntos con jsPDF. Por la licencia OFL y el nombre reservado Carlito, la derivada se denomina ModeloSans y conserva el aviso de copyright/licencia. Los originales de la fuente se conservan intactos. No se descargan fuentes desde servicios externos al abrir el editor.

Se conservan el logo, encabezado y pie de la intranet. Por estas reservas y los saltos automáticos de cada formato, no se promete una réplica idéntica de paginación del Word original. Las listas están representadas con prefijos editables (letras y viñetas); no se renumeran automáticamente.

Las bases se aplican con **Usar estructura base**. Un documento guardado previamente no se reemplaza automáticamente: se utiliza **Cambiar punto de partida → Usar estructura base → Reemplazar contenido** para actualizarlo. No se modifican expedientes reales ni se requieren migraciones.

Estructura de Promesa-Venta continúa sin modelo precargado y Contrato de Promesa de Venta sigue limitado a subir archivo.

## Fuentes de implementación

- `scripts/generate-info1-models.py`: extracción reproducible de ambos Word con correcciones y formatos.
- `lib/minute-source-models.ts`: modelos incorporados, sin lectura de archivos de pruebas en producción.
- `scripts/prepare-model-fonts.py`: preparación reproducible de la fuente de PDF; requiere FontTools solo al regenerar las fuentes, no en producción.
- `assets/pdf-fonts/Carlito-OFL.txt`: licencia de fuentes originales y derivadas.

## Verificación

Comparación de todos los párrafos con los Word originales, validación de formatos y compatibilidad, guardado y reapertura de API con fronteras simuladas, exportación DOCX con atributos de fuente/subrayado/sangría, extracción y representación visual de PDF con acentos y sin glifos perdidos. Evidencias locales: `output/minuta-formatos`.

Pruebas del editor a 375 y 1440 px para venta/alquiler: incorporar, deshacer, añadir al final, escribir, borrar, subrayar, negrita, tamaño, guardar, reabrir, vista previa y descargas. Evidencias: `output/minuta-texto/modelo-original-*`.

Verificación final correcta: `tsc --noEmit`, ESLint de los archivos modificados y siete archivos de pruebas (`minute-source-models`, `minute-template`, `minute-format`, `minute-document`, `minute-api`, `promise-template`, `transaction-dossier`). El test de API cubre 11 escenarios con fronteras simuladas. Prueba de navegador completada para las cuatro combinaciones de operación/ancho. PDFs de venta y alquiler de tres páginas, con revisión visual de inicio y final, sin avisos de glifos perdidos en la representación automatizada.

Proyecto de publicación confirmado: inmobiliaria-alfarov2 (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`), equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. Se despliega el árbol local existente, sin crear commit ni revertir cambios previos. 

## Publicación completada

- Estado: **READY**, producción, Next.js 16.3.8.
- Despliegue publicado: `dpl_AGHH8du1Cv9NUd4tjLe6Fvv3eDmo`.
- URL: https://inmobiliaria-alfarov2-g4vuhv2s5-puma19.vercel.app.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe; promoción completada y destino confirmado mediante inspect.
- Referencia Git base: `288e706`; publicación desde archivos locales, sin commit nuevo.
- Compilación remota: correcta, TypeScript correcto, build de Vercel de 41 segundos.
- Verificación remota previa a promoción: fuente pública devuelve HTTP 200 y coincide por SHA-256 con el archivo local; API devuelve HTTP 401 con el JSON de inicio de sesión esperado.
- Revisión de logs de nivel error del despliegue: cero registros en el intervalo consultado tras la publicación.
- Verificación funcional completa realizada con fronteras simuladas en API y navegador; no se alteraron expedientes reales para probar.

La subida inicial con CLI nativa 65.14 se detuvo al no avanzar; se completó con CLI Node 65.2. Un primer despliegue de comprobación permitió ajustar las fuentes a `/branding/fonts` para evitar su redirección al login. Se promovió únicamente el despliegue final indicado arriba.

