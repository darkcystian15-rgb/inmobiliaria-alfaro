# Contrato de intermediación inmobiliaria para alquiler

Desde un inmueble activo de alquiler, abre **Fase 2 → 3. Contratos → Contrato de Intervención Inmobiliaria → Preparar contrato de intermediación**.

1. Selecciona un DNI, poder, ficha RUC, copia literal o CRI del inmueble y elige **Leer documento**. El lector usa el texto del PDF y OCR para escaneos o imágenes. Las propuestas indican el archivo y la página. Puedes continuar con más páginas, abrir el original y consultar el texto leído.
2. Incorpora los datos al propietario o predio que corresponda y revisa la estructura. Se admiten varios propietarios, representantes y partidas. Completa moneda, renta mínima, vigencia, fecha y lugar de firma. Los datos pendientes aparecen como `XXXXX`.
3. Confirma la revisión. **Generar Word en la intranet** abre una vista previa y permite descargar el DOCX o preparar el archivo para adjuntarlo. Pulsa **Subir archivos** para guardarlo en el expediente. **Copiar prompt para ChatGPT** usa los mismos datos revisados. Para ese flujo, se puede descargar el modelo Word desde la misma pantalla.

Las dos opciones aplican una comisión de éxito de una renta mensual del precio final más IGV, pagadera al firmar el arrendamiento, y cuatro (4) meses posteriores al vencimiento para clientes presentados, contactados o captados durante la vigencia.

La plantilla conserva las siete cláusulas y parte de la maquetación de Pardo y Aviación. Los datos particulares del caso se sustituyeron por campos variables y se ajustan los bloques de firmas al número de propietarios. El DOCX de referencia carecía de imagen incrustada, así que se incorporó el logo institucional usado por la intranet. Los archivos de referencia de `tests/info2` se excluyeron del despliegue. El modelo descargable contiene marcadores y los datos institucionales, sin credenciales.

La lectura admite PDF, JPG, PNG y WebP de hasta 12 MB por archivo y hasta 150 páginas por PDF. Se procesa en el servidor de la intranet con reglas de extracción y OCR. La revisión manual permite corregir candidatos ambiguos y completar datos que el lector no reconozca. La estructura se mantiene en la pantalla durante la preparación. El Word se guarda como archivo del expediente al confirmar la carga.

## Verificación

TypeScript, ESLint y pruebas de lectura de documentos, extracción de campos, Word, prompt, expediente y carpetas. En Chromium a 375 y 1440 px se comprobó la disponibilidad solo para alquiler, la incorporación de campos desde un CRI simulado, el prompt, la vista previa del Word y el envío al flujo de adjuntos.

## Despliegue

Vercel reportó **READY** para `dpl_6BXnn1NHYXCEzK6BMipK4Kum9RvL` en producción del proyecto `inmobiliaria-alfarov2`. La compilación incluyó la ruta de intermediación y se ejecutó sin migraciones. La ruta privada devolvió HTTP 401 con el mensaje esperado sin sesión. El dominio de la intranet quedó asignado al despliegue. Las pruebas funcionales se hicieron con datos simulados.

- [Despliegue en Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/6BXnn1NHYXCEzK6BMipK4Kum9RvL)
- [Intranet](https://intranet.inmobiliariaalbertoalfaro.com.pe)
