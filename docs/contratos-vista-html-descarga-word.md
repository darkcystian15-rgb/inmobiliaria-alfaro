# Vista previa y descarga Word en Contratos

Estructura de Minuta, Estructura de Contrato Promesa-Venta y Contrato de Promesa de Venta tienen los botones **Vista previa** y **Descargar Word**. Estructura de Alquiler comparte el mismo editor y recibe las mismas opciones.

La vista previa muestra el borrador actual en HTML dentro del editor. Incluye el título, el logo, el encabezado, el texto con sus formatos, las imágenes y el pie. Es una lectura continua y la numeración muestra un ejemplo de una página. El botón **Volver al editor** permite seguir trabajando en el texto.

El Word se descarga como DOCX editable, con negrita, tamaño, resaltado, sombreado, logo, encabezado, pie y campos de numeración. Las imágenes se incorporan con su posición en el contenido, dimensiones y descripción. En Word se muestran individualmente y la paginación la calcula Word. La marca de agua pertenece a la exportación PDF.

Ambas opciones usan el contenido en pantalla y funcionan con cambios pendientes de guardar. **Generar PDF** sigue disponible para adjuntar al expediente. La descarga Word no crea un adjunto.

El servidor valida el borrador y verifica que cada imagen pertenezca al inmueble y a la categoría del editor. La exportación usa JSZip, ya utilizado por las dependencias del proyecto y declarado directamente para generar el DOCX.

## Verificación y publicación

TypeScript, ESLint y cinco suites pasaron. Las pruebas en navegador cubrieron minuta, alquiler y ambos editores de promesa a 375 y 1440 px. Se leyó el DOCX generado y se comprobaron el texto, el formato, el encabezado y el pie.

Vercel confirmó la intranet en el despliegue de producción dpl_A3cVt1Wv35JH4BQ9HWJQbfjcZ6Ae, estado READY. La ruta de Contratos respondió con el inicio de sesión esperado antes de activar el dominio.
