# Explorador de Información de inmuebles: lista compacta

22 de octubre de 2026. Base: 8a6d7d1.

Se elimina el buscador de zonas en Información de inmuebles de Fase 2; las carpetas de todas las zonas siguen visibles. Se conservan la búsqueda y los filtros de inmuebles dentro de cada zona.

La vista Lista pasa de tarjetas verticales a filas dentro de un solo contenedor, separadas por líneas. Contacto e ID comparten una columna; operación, tipo y dirección se presentan al lado en escritorio y debajo en móvil. Iconos, márgenes y relleno se reducen, manteniendo el estado y toda la fila como acceso al inmueble. La cuadrícula mantiene su presentación actual.

Sin cambios de datos, permisos, selección de zona, filtros, orden ni rutas.

35 archivos unitarios aprobados, ESLint sin advertencias y compilación de producción Webpack/TypeScript correcta. Navegador contra compilación local, 1440 y 375 px: buscador de zonas ausente, filas menores que las tarjetas, sin desbordes y seis vistas de lista/carpetas; cero errores JavaScript y escrituras de negocio. Cuenta temporal eliminada. Revisión independiente pendiente.

## Producción comprobada

Código funcional: 3cfcf4638fe12a0dc820136eddf4b830283bda7f (incluye impuestos de 8a6d7d1). Vercel dpl_egLz3mdYQ4fW6LLURaMe81SBaTMC: READY, alias intranet.inmobiliariaalbertoalfaro.com.pe confirmado.

Verificación autenticada: 22/10/2026, 21:28:15 UTC. Seis vistas escritorio/móvil (1440/375 px), categorías nuevas presentes en la API, activación según configuración guardada, notas visibles, buscador de zonas ausente y filas compactas sin desbordes. Cero errores de ejecución y escrituras de negocio del navegador. Cuenta temporal y sesión eliminadas.

La consulta de autorización para archivos grandes, sin subir ni registrar archivos, confirmó que los 50 MB todavía no están activos en el servicio de producción. Se entrega hosting/documentos.php preparado; queda pendiente instalarlo en cPanel y comprobar la configuración y el flujo real.

Evidencia agregada sin datos personales: [PRODUCCION.json](evidencia-impuestos-comprador/PRODUCCION.json).
