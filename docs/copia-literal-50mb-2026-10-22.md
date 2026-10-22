# Copia literal o CRI de hasta 50 MB

22 de octubre de 2026. Base: 8a6d7d1. Implementación y despliegue Vercel autorizados.

Solo COPIA_LITERAL_CRI y su alias histórico COPIA_LITERAL admiten 50 × 1024 × 1024 bytes. Los demás documentos conservan 4 MB. PDF, Word y Excel grandes se suben directamente al hosting privado mediante una autorización firmada de 30 minutos, ligada a usuario, inmueble, ruta única, nombre, tamaño y categoría. No se expone la clave general del hosting. Las imágenes conservan compresión y límites actuales.

Vercel tiene un límite de 4,5 MB por solicitud; el archivo grande no atraviesa su entrada. La API prepara la autorización y confirma la subida descargando y validando formato y tamaño antes de registrar el archivo y su historial. Repetir la confirmación no duplica el registro. Cancelar solo elimina el archivo si no está registrado. Los archivos de hasta 4 MB conservan su ruta de subida actual.

El PHP conserva documentos privados, autenticación para lectura/borrado y compatibilidad con rutas anteriores. Solo una autorización temporal válida permite subir más de 4 MB en copia literal. CORS acepta únicamente el origen configurado de la intranet. La política CSP de Información de inmuebles permite conectar con el origen HTTPS configurado del hosting. La descarga existente transmite el cuerpo por streaming con autenticación.

No se permite reclasificar un archivo mayor de 4 MB a otra categoría; se valida en la interfaz y en servidor. No hay migraciones ni modificaciones de documentos existentes.

## Instalación necesaria en cPanel

**La ampliación no queda activa con Vercel solamente.** Reemplazar el documentos.php de la raíz web del servicio por hosting/documentos.php de esta entrega. Conservar documentos-config.php y su secreto. La ruta de configuración privada existente permanece igual. El origen permitido por defecto es https://intranet.inmobiliariaalbertoalfaro.com.pe; puede definirse upload_origin en la configuración privada si cambia.

La instalación en cPanel fue realizada por el usuario y verificada en producción a las 21:51:48 UTC; la copia literal de hasta 50 MB está habilitada. El código de la intranet no requiere cambios adicionales.

## Validación

Pruebas unitarias de límites reales en 50 MB, rechazo de 50 MB + 1 byte, límites de otras categorías, formato, firmas alteradas, expiración y pertenencia de usuario/inmueble. Integración PHP aislada con un PDF ficticio de 50 MB: subida, lectura idéntica, acceso privado, CORS, no sobrescritura, rechazo de tokens incorrectos y eliminación. Nunca se usan archivos o credenciales de clientes en esta integración.

Referencia de límite de Vercel: https://vercel.com/docs/functions/limitations .

35 archivos unitarios, ESLint y compilación Webpack/TypeScript aprobados.

PHP instalado por el usuario y subida real de 50 MB verificada sin registrar archivos en inmuebles; revisión independiente pendiente.

## Producción comprobada

Código funcional: 3cfcf4638fe12a0dc820136eddf4b830283bda7f (incluye impuestos de 8a6d7d1). Vercel dpl_egLz3mdYQ4fW6LLURaMe81SBaTMC: READY, alias intranet.inmobiliariaalbertoalfaro.com.pe confirmado.

Verificación autenticada: 22/10/2026, 21:28:15 UTC. Seis vistas escritorio/móvil (1440/375 px), categorías nuevas presentes en la API, activación según configuración guardada, notas visibles, buscador de zonas ausente y filas compactas sin desbordes. Cero errores de ejecución y escrituras de negocio del navegador. Cuenta temporal y sesión eliminadas.

En la comprobación inicial de las 21:28 UTC el hosting aún no estaba actualizado. Ese pendiente se resolvió mediante la instalación del usuario y la prueba real de 50 MB descrita al final de este documento.

Evidencia agregada sin datos personales: [PRODUCCION.json](evidencia-impuestos-comprador/PRODUCCION.json).

## Instalación de cPanel verificada — 21:51:48 UTC

El usuario confirmó la sustitución de documentos.php. La comprobación autenticada en producción del 22/10/2026 obtuvo autorización HTTP 200 y subió un archivo PDF técnico ficticio de **52 428 800 bytes (50 MB)** al servicio real, que respondió HTTP 201. CORS y el origen de intranet correctos. La lectura anónima y la lectura con el permiso exclusivo de subida se rechazaron con HTTP 401.

La API canceló la subida y eliminó el archivo temporal. No se confirmó ni registró el archivo en ningún inmueble, no se modificaron expedientes y la cuenta/sesión técnicas se eliminaron al terminar. Esta prueba verifica autorización, transferencia completa de 50 MB, privacidad y cancelación; no introduce documentos de clientes para ensayar la confirmación registral. El límite de las demás categorías sigue siendo 4 MB según las reglas de aplicación y hosting comprobadas en la integración aislada.

El pendiente de instalación y activación del hosting queda resuelto. Evidencia agregada: [LITERAL-50MB-PRODUCCION.json](evidencia-impuestos-comprador/LITERAL-50MB-PRODUCCION.json). No se requirieron cambios de código ni variables de Vercel.
