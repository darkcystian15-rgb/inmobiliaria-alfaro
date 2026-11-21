# Contrato de intermediación inmobiliaria para venta

En un inmueble activo de venta, abre **Fase 2 → 3. Contratos → Contrato de Intervención Inmobiliaria → Preparar contrato de intermediación**.

1. Selecciona DNI, poderes, copia literal o CRI para leer el texto o usar OCR. Incorpora las propuestas de cada archivo y página al propietario o predio correspondiente.
2. Revisa la estructura y completa el primer precio de cierre, moneda, vigencia, porcentaje de comisión, domicilio y datos de firma. Los datos pendientes se indican con `XXXXX`.
3. **Generar Word en la intranet** abre una vista previa y permite descargar el DOCX o preparar su carga en el expediente. **Copiar prompt para ChatGPT** utiliza los mismos datos. El modelo Word para adjuntar al prompt se descarga desde la misma pantalla.

La plantilla de venta de `info3` mantiene las seis cláusulas, con numeración correlativa del primero al sexto. El primer precio de cierre admite ofertas y contraofertas por medio de la inmobiliaria. La comisión es el porcentaje acordado sobre el precio final de venta más IGV y se paga al firmar la escritura. Se mantienen cuatro (4) meses posteriores al vencimiento para operaciones con clientes presentados por la inmobiliaria.

El Word usa el logo institucional arriba a la derecha y una marca de agua en el encabezado. Se sustituyeron los datos de ejemplo por campos de la estructura. Los originales de `info3` se excluyen del despliegue. Venta y alquiler comparten el editor, la lectura y la carga de archivos. Cada operación usa su propia plantilla y condiciones.

## Verificación

Pasaron TypeScript, ESLint y las pruebas de lectores de campos, generación de contratos, expediente y carpetas. Se comprobó en Chromium a 375 y 1440 px, con datos simulados, la lectura de un CRI, incorporación de propuestas, generación y vista previa del Word, copia del prompt y carga del adjunto para venta y alquiler.

## Despliegue

Vercel marcó **READY** el despliegue de producción `dpl_HHC1PtUg3QNjkMFsym91ThcXY1MY` y confirmó su asignación al dominio de la intranet. La compilación incluyó la ruta compartida de intermediación y se ejecutó sin migraciones. La ruta de venta respondió con HTTP 401 y el mensaje esperado sin sesión.

- [Despliegue en Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/HHC1PtUg3QNjkMFsym91ThcXY1MY)
- [Intranet](https://intranet.inmobiliariaalbertoalfaro.com.pe)

## Corrección de la carga inicial

La consulta de posición especifica la tabla del inmueble al comparar su ID con la asignación de zona. Se comprobó el SQL generado por Drizzle para la selección de una sola tabla. La corrección aplica a **Preparar contrato** en venta y alquiler y al lector de **Planos**, que comparte la consulta.

Vercel confirmó la publicación de la corrección en el dominio de la intranet mediante el despliegue `dpl_2cXAxd6iovtjegRCYcX8dnkctuju`. Pasaron las pruebas de intermediación, planos y listado de archivos. La comprobación de la consulta se hizo con el SQL generado, sin abrir expedientes reales.
