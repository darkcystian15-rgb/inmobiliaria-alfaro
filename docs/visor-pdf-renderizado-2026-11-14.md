# PDF dentro de la intranet sin visor nativo

La vista anterior usaba object/application-pdf: abrir el diálogo no garantizaba que el navegador mostrara su contenido. Se sustituye por PDF.js y canvas, con navegación por páginas, ajuste al ancho y zoom. Se renderiza una página a la vez, se cancela el render anterior y se destruye el documento al cerrar. El visor permite descargar o abrir aparte como acciones opcionales.

PDF.js se carga bajo demanda en el cliente. Worker, fuentes, CMaps y WASM se sirven desde public/pdfjs, copiados de pdfjs-dist 5.7.284 con su licencia. Al actualizar pdfjs-dist se deben actualizar estos recursos a la misma versión. No se usan servicios externos para convertir documentos. El archivo mantiene el acceso autenticado existente.

Verificación: TypeScript correcto. Prueba de navegador con PDF válido de dos páginas y navigator.pdfViewerEnabled=false; se comprueban los píxeles rojo/azul de cada página, navegación, zoom, ausencia de pestañas nuevas y regresión de edición de datos a 375 y 1440 px. Las pruebas utilizan archivos sintéticos, sin escribir expedientes reales.

La comprobación del primer despliegue preparado (dpl_G5Z9b1QhQ4W9ciCf5U81oUFZW4Rj, sin promover) identificó que proxy.ts aplicaba autenticación a los recursos PDF.js. Se excluye /pdfjs/ del matcher como recurso estático público; los documentos mantienen la autenticación de sus APIs. La CSP permite worker-src self y compilación WASM; object-src sigue bloqueado. El visor recibe los bytes ya descargados, sin volver a consultar URLs blob. La prueba de navegador usa esta CSP y pasa en ambos tamaños.

Corrección final publicada: dpl_5dRzvuyZej7uvZWQrynrEMUs2DkG, https://inmobiliaria-alfarov2-hteppywld-puma19.vercel.app, producción READY. Worker comprobado HTTP 200 (1 232 303 bytes). Promoción realizada y dominio intranet confirmado mediante inspect. Compilación y TypeScript remotos correctos. No se comprobó un expediente real autenticado.
