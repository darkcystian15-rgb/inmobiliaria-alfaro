> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Mejoras operativas — 5 de octubre de 2026

Alcance autorizado: recomendaciones 1–8, 10–12, 14 y 17. Las recomendaciones 9, 13, 15 y 16 siguen pendientes. No se cambia el módulo de cierre, la organización en pestañas de Tasaciones y textos, los respaldos automáticos ni la política de acceso/infraestructura.

## Respaldo inicial

`output/respaldo-antes-mejoras/` contiene el código completo del estado inicial (incluidos cambios no confirmados), historial Git y diferencias. El manifiesto identifica el commit y las sumas de comprobación. `datos-negocio.json` conserva un respaldo puntual privado de las tablas de negocio y sus estructuras; excluye contraseñas, sesiones y tablas de autenticación. No incluye los archivos físicos del hosting, que no se modifican en esta entrega. La carpeta está excluida de Git y de los despliegues.

## Comportamiento

- Los reportes usan fecha de venta, salida, visita, tasación o publicación según la actividad; los filtros incluyen los días completos. Visitas, tasaciones y ventas conservan su fecha de calendario. Consulta paginada de 50 inmuebles y descargas con el conjunto completo filtrado, hasta 10 000 inmuebles por exportación. Para superar ese límite hay que acotar el período o los filtros. El contexto general se calcula sin filtros y solo con datos reales. Las posiciones físicas permanecen ocupadas aunque su inmueble sea de prueba.
- Preparados con expediente incompleto se devuelven aparte; la bandeja muestra su estado pendiente y solo cuenta los realmente listos. La ficha actualiza su expediente después de cargar/eliminar documentos o fotos. Cada requisito conduce a su apartado.
- Vincular un DNI existente conserva sus datos. Cambiar el DNI exige seleccionar cambio de propietario; una corrección de un propietario compartido exige confirmación y queda registrada para todos sus inmuebles. Se muestran las fichas relacionadas.
- Los datos de prueba se marcan explícitamente o se detectan por DNI de ejemplo, archivos SOLO PRUEBA o eventos históricos de simulación. Un administrador puede validar los datos reales después de revisarlos. Los indicadores comerciales excluyen ejemplos; reportes permite incluirlos expresamente.
- La ficha permite asignar administradores activos y fechas límite por visita, precios, expediente y publicación. Los operadores consultan el seguimiento y conservan sus permisos actuales. Los plazos de alerta son configurables entre 1 y 365 días. La agenda prioriza los próximos pasos por fecha límite.
- Historial visible con fecha de Perú, actor y detalle de cambios. Anuncios externos registran canal, enlace, fecha y precio; una diferencia de precio o una revisión de texto posterior marca actualización pendiente. La confirmación conserva la revisión de texto que el usuario verificó. Corregir texto publicado conserva su estado publicado y registra antes/después.
- Borradores privados por cuenta en el servidor, recuperables durante 14 días. Sin almacenamiento de fichas/DNI en localStorage. Recuperar requiere una acción explícita. Navegar a otro módulo ofrece guardar borrador y salir; recargar/cerrar muestra el aviso del navegador cuando hay cambios. No se puede recuperar el contenido binario de un archivo local no subido.
- Panel más compacto, agenda de tareas, navegación al inmueble seleccionado, búsqueda de visitas por DNI, mensajes diferenciados de error/sin resultados y foco visible de teclado. Auditoría con nombres, filtros, paginación y hora de Perú.

## Instalación

En bases existentes: `node scripts/install-operational-improvements.mjs`. Es idempotente y no inicializa operaciones ficticias. Agrega campos de clasificación y tablas de seguimiento, anuncios y borradores; conserva las tablas de alertas y los permisos existentes. No ejecutar además los ALTER de Drizzle sobre esa misma base. Las migraciones generadas también incluyen diferencias de seguridad preexistentes que estaban presentes en el código y no en el último snapshot; no se aplicaron a esta base. No cambian la exigencia de MFA ni la conexión TLS.

## Verificación

`node --test tests/*.test.mjs`, `npm run lint -- --max-warnings=0`, `npm run build -- --webpack` y `node tests/operational-improvements.integration.mjs`. Esta última crea registros temporales, no usa archivos reales del hosting y limpia sus propios datos al terminar. `PLAYWRIGHT_MODULE_PATH` activa la comprobación en navegador real. No se ejecutan estas pruebas mientras se está compilando.

### Resultado local

- Compilación de producción con webpack y TypeScript: correcta.
- ESLint sin errores ni advertencias: correcto.
- 15 archivos de pruebas unitarias: correctos.
- Integración de las mejoras: correcta. Verifica filtrado de ventas por fecha de venta, fechas inválidas, paginación y exportación completa, exclusión de pruebas, correcciones compartidas y cambio de propietario, roles, seguimiento y borradores privados, expedientes incompletos, precio y texto de anuncios, historial y auditoría.
- Navegador real: sin errores de JavaScript ni desbordes de página a 390, 768 y 1440 píxeles en ocho módulos. Recuperación de borradores y acceso directo a documentación: correctos.
- Regresión de fotos/visitas/tasación/publicación/liberación: correcta, usando HTTPS de archivos aislado.
- Comparación con el respaldo: cierre/liberación, autenticación, política MFA, conexión MySQL y PHP de archivos no fueron modificados por esta entrega.
- Los registros temporales de las pruebas se eliminaron al finalizar.

Las fechas generadas por MySQL se normalizan con el desplazamiento real de la sesión, sin modificar su configuración ni la autenticación. La comprobación de cambios de texto usa revisiones del historial, evitando depender de diferencias de reloj entre la aplicación y el hosting.

### Producción

Despliegue `dpl_Gvq4HA4YgevQSs4JKUmeyQQ4925R`, estado READY. URL estable: https://inmobiliaria-alfarov2-umber.vercel.app . Vercel compiló con Turbopack correctamente. La comprobación posterior verificó diez páginas, seis APIs generales, ficha/seguimiento/anuncios, coherencia de panel y reportes, requisitos de publicación y restricciones del operador. Se usaron únicamente cuentas temporales, eliminadas al terminar; no se modificaron inmuebles ni usuarios existentes.
