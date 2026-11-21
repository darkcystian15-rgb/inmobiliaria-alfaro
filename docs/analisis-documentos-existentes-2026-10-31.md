# Análisis de documentos existentes — 31 de octubre de 2026

## Alcance y resultado

Se consultó la base real y se descargaron los documentos ya registrados desde el hosting privado, usando la configuración de Vercel. Finalización: 2026-10-31 15:43:19 UTC.

- 30 archivos de 17 inmuebles: 17 copias literales/CRI, 3 HR/PU, 3 tasaciones del propietario en PDF y 7 tasaciones express en Excel.
- 23 PDF con 230 páginas: 24 páginas procesadas mediante texto nativo y 206 mediante OCR en español.
- 7 Excel leídos directamente, conservando hoja y coordenada de celda.
- Todas las páginas terminaron el procesamiento técnico. Esto **no significa que todas sean legibles ni que todos los datos sean correctos**: algunos escaneos produjeron texto vacío o de baja calidad.
- Consulta de base en transacción de solo lectura. No se modificaron inmuebles, áreas, textos ni archivos.
- El análisis fue puntual; el OCR y la lectura de Excel **no están incorporados a la interfaz de la intranet**.

## Valores encontrados y evidencia

Los valores siguientes son lecturas documentales, no una validación de la superficie vigente ni una aprobación para actualizar la ficha. Los obtenidos mediante OCR necesitan comprobación visual, especialmente decimales y unidades.

| Código | Inmueble | Lectura | Fuente precisa | Tratamiento |
|---|---|---|---|---|
| 024 | Casa Trapecio | Terreno: 120 m² | Tasación express, archivo 161, Hoja1, F16 y D33 | Dato numérico directo de Excel. F16 pertenece a la fila TERRENO VALUADO. |
| 024 | Casa Trapecio | Construcción: primer piso 100 m²; segundo piso 76 m² | Archivo 161, Hoja1, E46 y E47 | Conservar por piso. Una suma sería un valor calculado, no un total leído. |
| 025 | Local Pardo | Terreno: 356,50 m² | Archivo 162, Hoja1, E19 | Fila INMUEBLE VALUADO; excluir superficies de comparables. |
| 027 | Terreno Malecón | Terreno: 367,19 m² | Archivo 163, Hoja1, F23 | Fila TERRENO VALUADO. La copia literal escaneada no permitió corroborar este valor con suficiente claridad. |
| 031 | Local 27 Octubre | Terreno: 800 m² | Archivo 164, Hoja1, F15 | Fila TERRENO VALUADO / INMUEBLE VALUADO. |
| 095 | Terreno Av. Agraria | Terreno: 144 m² | Copia literal, archivo 179, página 1 | OCR: “TERRENO Area: 144 M2”. Las páginas 3 y 4 repiten el área en cuadros de medidas. |
| 096 | Terreno Los Álamos | Parcela 17561-1: 980 m² | Copia literal, archivo 180, página 1 | OCR de descripción del inmueble. Parcela individual. |
| 096 | Terreno Los Álamos | Parcela 17561-2: 389,50 m² | Copia literal, archivo 181, página 1 | OCR de descripción del inmueble. Parcela individual. |
| 096 | Terreno Los Álamos | Parcela 17561: 3.468 m² | Copia literal, archivo 182, página 1 | OCR de descripción del inmueble. Parcela individual. |
| 097 | Terreno Parque Industrial | Área del lote: 1.630 m² | Copia literal, archivo 183, página 2 | El mismo documento menciona 49,8176 ha en otro contexto. No confundir el lote con antecedentes del predio matriz. |
| 103 | Casa Los Álamos | Terreno: 3.202,41 m² | Archivo 191, Hoja1, F21 | Fila TERRENO VALUADO. |
| 105 | Casa Villa del Ingeniero | Terreno: 300 m²; techada total: 460 m² | Tasación, archivo 192, página 1; terreno también en páginas 3 y 8 | Lectura nativa. Hay diferencia con el área techada de un asiento de la copia literal. |
| 105 | Casa Villa del Ingeniero | Techada total: 407,80 m² | Copia literal, archivo 193, página 2 | OCR de “AREA TECHADA TOTAL”. Revisar asiento, fecha, ampliaciones y correspondencia antes de elegir entre este dato y la tasación. |
| 107 | Terreno Kankun | Un lote: 359,80 m²; otro lote: 357 m² | Archivo 195, página 2; archivo 196, página 2 | Dos partidas/lotes. El archivo 195, página 3, rectifica la identificación del lote a 04. No sumar ni asignar como área única automáticamente. |
| 167 | Casa Santa Cristina | Terreno: 129,60 m² | Archivo 200, página 1 | OCR. La página 3 contiene modificación de fábrica con superficies por planta; requiere revisión visual de decimales. |

## Casos donde la automatización puede equivocarse

1. **PDF con encabezado seleccionable y asiento escaneado.** Poder seleccionar el número de partida o la fecha no demuestra que el contenido principal tenga texto. Hay que detectar la necesidad de OCR por página y por contenido.
2. **Comparables en tasaciones.** Los Excel y PDF incluyen terrenos ajenos para valorar el inmueble. Solo se deben proponer datos de la unidad tasada, con identificación de la fila o sección.
3. **Varias parcelas en una ficha.** Los Álamos y Kankun requieren asociar cada superficie a su parcela, partida o lote. El nombre del archivo no basta y no se ha calculado un área conjunta.
4. **Terreno, área ocupada, libre y techada.** No son intercambiables. Tampoco se deben sumar pisos, áreas libres o azoteas para crear un total sin una regla explícita y evidencia.
5. **Área del predio matriz.** No debe confundirse con la superficie del lote independizado ni con porcentajes de participación.
6. **Cambios registrales e históricos.** Una rectificación o modificación de fábrica exige revisar la secuencia y la unidad afectada. No basta con la primera cifra ni con tomar el último número del PDF.
7. **Errores de OCR en decimales.** Santa Cristina, archivo 200, página 3, produjo “1296” y “24294” en determinadas líneas. No se normalizaron como si fueran valores confirmados. La confianza global de OCR tampoco valida un dígito concreto.
8. **Departamentos y predios matrices.** Cipreces, archivo 149, página 1, incluye 147 m² y superficies por piso, pero no se han asignado como área del departamento sin comprobar la unidad y el asiento.
9. **Escaneos con lectura insuficiente.** Se procesaron las HR/PU y documentos de Malecón, Las Praderas, Los Ángeles y otros, pero algunas páginas devolvieron poco texto o ningún dato útil. Requieren mejorar orientación/resolución o revisión visual. No se interpretó la ausencia de una propuesta como ausencia del dato en el documento.

## Flujo que se desprende de la prueba

Para trabajar con los archivos existentes, el sistema debería analizar en conjunto los documentos vinculados al inmueble, leer Excel directamente y aplicar OCR a las páginas que lo necesitan. El resultado debe ser una revisión única por inmueble con:

- Valor literal, tipo de área y unidad.
- Documento, página o celda y fragmento de evidencia.
- Parcela/partida/lote o planta a la que corresponde, cuando se haya identificado.
- Método de lectura y necesidad de comprobación.
- Valores alternativos y diferencias entre documentos.
- Selección y aplicación conjunta de los datos revisados, conservando el historial y evitando sobrescribir valores sin decisión explícita.

No se puede prometer exactitud universal por aplicar OCR o IA. La precisión depende de conservar el contexto y verificar los datos dudosos contra la página original. La siguiente implementación debe probarse con estos mismos casos reales.

## Inventario procesado

“Procesado” describe la ejecución técnica. No acredita que el texto OCR sea correcto.

| Inmueble | ID archivo | Tipo | Formato | Páginas | Texto nativo | OCR |
|---|---:|---|---|---:|---:|---:|
| 024-CASA-TRAPECIO | 161 | TASACION_EXPRESS | Excel | — | — | — |
| 025-LOCAL-PARDO | 162 | TASACION_EXPRESS | Excel | — | — | — |
| 027-TERRENO-MALECON | 150 | COPIA_LITERAL_CRI | PDF | 7 | 0 | 7 |
| 027-TERRENO-MALECON | 163 | TASACION_EXPRESS | Excel | — | — | — |
| 031-LOCAL-27-OCTUBRE | 164 | TASACION_EXPRESS | Excel | — | — | — |
| 056-LOCAL-MOORE-C2 | 157 | COPIA_LITERAL_CRI | PDF | 12 | 0 | 12 |
| 056-LOCAL-MOORE-C2 | 158 | HR_VENTA | PDF | 1 | 0 | 1 |
| 056-LOCAL-MOORE-C2 | 159 | TASACION_PROPIETARIO | PDF | 17 | 7 | 10 |
| 056-LOCAL-MOORE-C2 | 160 | TASACION_EXPRESS | Excel | — | — | — |
| 087-DEPARTAMENTO-CIPRECES | 149 | COPIA_LITERAL_CRI | PDF | 4 | 0 | 4 |
| 092-TERRENO-LAS-PRADERAS-ETAPA-7-MZ-C1-LOTE-7 | 176 | COPIA_LITERAL_CRI | PDF | 7 | 1 | 6 |
| 092-TERRENO-LAS-PRADERAS-ETAPA-7-MZ-C1-LOTE-7 | 177 | HR_VENTA | PDF | 2 | 0 | 2 |
| 095-TERRENO-AV-AGRARIA | 179 | COPIA_LITERAL_CRI | PDF | 7 | 0 | 7 |
| 096-TERRENO-LOS-ALAMOS | 180 | COPIA_LITERAL_CRI | PDF | 2 | 0 | 2 |
| 096-TERRENO-LOS-ALAMOS | 181 | COPIA_LITERAL_CRI | PDF | 2 | 0 | 2 |
| 096-TERRENO-LOS-ALAMOS | 182 | COPIA_LITERAL_CRI | PDF | 2 | 0 | 2 |
| 097-TERRENO-PARQUE-INDUSTRIAL | 183 | COPIA_LITERAL_CRI | PDF | 6 | 0 | 6 |
| 098-CASA-JR-HUANDOY-BS-AS | 185 | COPIA_LITERAL_CRI | PDF | 17 | 0 | 17 |
| 100-LOCAL-LOS-ANGELES | 186 | COPIA_LITERAL_CRI | PDF | 6 | 0 | 6 |
| 100-LOCAL-LOS-ANGELES | 187 | HR_VENTA | PDF | 8 | 0 | 8 |
| 100-LOCAL-LOS-ANGELES | 189 | TASACION_EXPRESS | Excel | — | — | — |
| 100-LOCAL-LOS-ANGELES | 190 | TASACION_PROPIETARIO | PDF | 17 | 0 | 17 |
| 103-CASA-LOS-ALAMOS | 191 | TASACION_EXPRESS | Excel | — | — | — |
| 105-CASA-VILLA-DEL-INGENIERO | 192 | TASACION_PROPIETARIO | PDF | 17 | 13 | 4 |
| 105-CASA-VILLA-DEL-INGENIERO | 193 | COPIA_LITERAL_CRI | PDF | 23 | 0 | 23 |
| 106-TERRENO-VILLA-DEL-INGENIERO | 194 | COPIA_LITERAL_CRI | PDF | 7 | 1 | 6 |
| 107-TERRENO-KANKUN | 195 | COPIA_LITERAL_CRI | PDF | 20 | 1 | 19 |
| 107-TERRENO-KANKUN | 196 | COPIA_LITERAL_CRI | PDF | 22 | 1 | 21 |
| 167-CASA-SANTA-CRISTINA | 199 | COPIA_LITERAL_CRI | PDF | 19 | 0 | 19 |
| 167-CASA-SANTA-CRISTINA | 200 | COPIA_LITERAL_CRI | PDF | 5 | 0 | 5 |

## Ejecución y continuidad

Se ejecutaron compilaciones temporales de consulta en Vercel. Cada script terminó deliberadamente con error después de leer para impedir que generase una nueva versión de la aplicación. La revisión OCR/Excel corresponde a `dpl_75DcEZCLPDMbk8CFDcUkwSZPgSWr`. Su estado ERROR es intencional; el marcador de finalización confirmó los 30 archivos.

La API de Vercel confirmó después de la ejecución que el alias de la intranet sigue asociado a `dpl_8ACJX1XeDuFgQJAi1i2VczCHBGRj`, la versión publicada previamente.

Herramientas utilizadas en el entorno temporal: [unpdf](https://github.com/unjs/unpdf) para lectura/renderizado de PDF, [Tesseract.js](https://github.com/naptha/tesseract.js) para OCR local y [ExcelJS](https://github.com/exceljs/exceljs) para hojas de cálculo. El OCR se ejecutó dentro de Vercel; los documentos no se enviaron a un proveedor externo de IA.

