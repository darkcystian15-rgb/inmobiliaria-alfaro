# Planos de ubicación referencial en Fase 2

**Fase 2 → 8. Planos** tiene cuatro apartados en venta y alquiler.

1. **Plano de distribución.** Permite adjuntar los planos de distribución. Los archivos de la categoría anterior «Planos» se conservan aquí y se pueden reclasificar desde las acciones de cada archivo.
2. **Plano de ubicación referencial.** Permite adjuntar el resultado ya revisado.
3. **Modelo de plano de ubicación referencial.** Permite adjuntar el ejemplo gráfico que guiará el formato y achurado.
4. **Prompt para plano de ubicación referencial.** Completa el esquema del Word de instrucciones con los datos del inmueble activo, sin trasladar sus datos de acceso. Permite copiar el prompt y descargar los modelos y planos de distribución que ya estén adjuntos.

Para subir archivos, activa **Incluir planos** y guarda. En una venta con Planos activado, el cierre exige al menos un plano de distribución o de ubicación referencial alojado. El modelo gráfico por sí solo no cumple el requisito. En alquiler la carpeta sigue siendo opcional.

En **Preparar prompt de plano referencial**, la ficha aporta el área de terreno y la dirección para preparar el enlace de Google Maps. Las copias literales, los CRI y los documentos de propiedad compatibles que ya están adjuntos se leen al abrir el prompt. Se pueden leer PDF e imágenes de hasta 12 MB, con OCR para escaneos. Las observaciones aparecen antes del botón de copiar e indican las discrepancias con su fuente y página y los campos pendientes. Los valores coincidentes se incorporan una sola vez sin generar observaciones. Revisa los valores que difieren o completa los datos que falten e indica cómo identificar el lote.

Copia el prompt a ChatGPT y adjunta el modelo y una captura de Google Maps con el lote identificado. El plano de distribución es opcional si aporta medidas, frente o geometría. Revisa el resultado antes de subirlo al apartado 2. La intranet prepara el prompt y permite archivar el plano generado externamente.

## Verificación

Pasaron TypeScript, ESLint y las pruebas de clasificación, requisitos de cierre, carga y contenido del prompt. En Chromium se comprobó a 375 y 1440 px, con API simulada, la presencia de los cuatro apartados, lectura del CRI, incorporación de datos, generación del prompt y carga en la categoría referencial para venta y alquiler.

## Despliegue

Vercel marcó **READY** el despliegue de producción `dpl_5JvVG9xJkUFkrUGoz1yk3MsjzAAB` y confirmó la asignación al dominio de la intranet. La compilación se ejecutó sin migraciones. La ruta de lectura con `uso=plano` respondió HTTP 401 sin sesión.

- [Despliegue en Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/5JvVG9xJkUFkrUGoz1yk3MsjzAAB)
- [Intranet](https://intranet.inmobiliariaalbertoalfaro.com.pe)
