# 10. Cartas en Fase 2

Disponible en expedientes de venta y alquiler. La carpeta y sus documentos son opcionales para el cierre.

1. Abre **Fase 2 → 10. Cartas**.
2. Elige **Crear carta desde modelo** para editar los párrafos del Word de referencia (Carta Propuesta TOTTUS Alquiler Local Pardo y Aviación). Revisa los datos de ejemplo antes de usar la carta.
3. Usa **Descargar Word** para guardar una copia local, o **Preparar para adjuntar** y confirma con **Subir archivos** para guardarla en el expediente.
4. Si ya tienes una carta, selecciónala o arrástrala al área de carga. Para revisar un Word DOCX adjunto, usa **Editar copia en Word** en las acciones del archivo.

El editor modifica el texto del cuerpo y conserva la estructura del DOCX, incluidos encabezado, pie, imágenes y estilos de párrafo. En texto con varios estilos se conservan los tramos exteriores que no cambian y el tramo editado usa el formato del punto de inserción. La edición de una carta guardada prepara una copia. La carga y los permisos usan el flujo de archivos de Fase 2, sin migración de datos.

## Verificación

- TypeScript y ESLint en los archivos modificados.
- Pruebas de expediente, agrupación por carpetas, adjuntos opcionales y carga.
- Chromium con API simulada para venta y alquiler. Se verificaron edición, exportación DOCX, contenido intacto del encabezado, pie y demás partes del Word, y carga directa y desde el modelo.

## Despliegue

Vercel reportó el estado **READY** para `dpl_Bzn3jEvXxRpHEqH8fp9vYSYmfgrm` en el proyecto `inmobiliaria-alfarov2`. La compilación se ejecutó sin migraciones. La ruta privada del modelo devolvió HTTP 401 con el mensaje esperado sin sesión. Vercel confirmó que el dominio de la intranet quedó asignado a este despliegue. La prueba funcional con navegador usó datos simulados.

- [Despliegue en Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/Bzn3jEvXxRpHEqH8fp9vYSYmfgrm)
- [Intranet](https://intranet.inmobiliariaalbertoalfaro.com.pe)
