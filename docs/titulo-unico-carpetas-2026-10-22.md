# Un solo título al abrir carpetas documentales

22 de octubre de 2026. Base 08fb472. Corrección solicitada durante la prueba del inmueble 024-CASA-TRAPECIO, Chimbote.

La carpeta Impuestos y constancias mostraba el mismo título en tres encabezados: el explorador, la cabecera del expediente y su grupo documental. Se conserva únicamente la cabecera del explorador. El componente de expediente admite ocultar su título cuando se integra en una pantalla que ya lo muestra; al visualizar una sola carpeta tampoco repite el nombre del grupo.

Se conservan los grupos Impuestos y constancias del vendedor y del comprador, la ruta de navegación, el orden 7/3, las condiciones de renta, las cargas por ítem y todos los documentos. El mismo criterio evita títulos duplicados en las demás carpetas documentales.

Cambio exclusivamente visual en PropertyInformation.tsx y TransactionDossier.tsx. Sin migraciones, cambios de configuración, archivos ni datos de negocio. El componente conserva su título por defecto cuando se usa de forma independiente.

## Validación

ESLint sin advertencias y comprobación TypeScript aprobados. Compilación de producción Webpack correcta. Navegador contra la compilación local a 1440/375 px aprobado en el inmueble indicado, con una sola cabecera, sin desbordes ni errores; cero escrituras de negocio y cuenta temporal eliminada. La comprobación de navegador exige exactamente un encabezado 4. Impuestos y constancias y conserva el orden, los grupos y las condiciones guardadas. Revisión independiente pendiente.
