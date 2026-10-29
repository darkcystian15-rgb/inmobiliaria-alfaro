# Otros documentos opcionales en cada carpeta de FASE 2

29 de octubre de 2026.

## Funcionamiento

Cada carpeta numerada de Datos de inmuebles → FASE 2 tiene un bloque **Otros documentos**. Está disponible en las siete carpetas de venta y las cinco de alquiler, incluidas DNI y poderes, Impuestos y constancias y Levantamiento de cargas.

Permite adjuntar varios documentos especiales sin ampliar los requisitos habituales de la operación. Cada archivo tiene su propio nombre y una descripción breve de hasta 500 caracteres, visible al consultar el archivo y editable después. La carga es opcional; si se decide adjuntar un archivo, su descripción es obligatoria.

No adjuntar documentos especiales no genera pendientes ni impide cerrar el expediente. Adjuntarlos tampoco sustituye documentos obligatorios ni modifica el porcentaje de avance documental. El bloque de cargas admite documentos opcionales aunque no se haya activado el requisito de levantamiento de cargas. Se conservan los permisos y la protección de expedientes cerrados.

Los documentos permanecen en la carpeta elegida y se conservan al recargar. Si cambia la operación y una carpeta deja de existir, sus archivos continúan disponibles entre los archivos conservados. La edición permite cambiar nombre, descripción y categoría; las opciones muestran el nombre de la carpeta para distinguir los distintos bloques de Otros documentos.

## Implementación y compatibilidad

Categorías `OTROS_IDENTIFICACION`, `OTROS_INMUEBLE`, `OTROS_CONTRATOS`, `OTROS_IMPUESTOS`, `OTROS_SERVICIOS`, `OTROS_CARGAS` y `OTROS_TASACIONES`. Alquiler utiliza únicamente las cinco categorías de sus carpetas. La API valida la descripción al subir o reclasificar un documento especial.

Se reutilizan el registro de archivos, la observación por archivo, el almacenamiento privado, el historial y las operaciones existentes de consulta, descarga y borrado. Se conserva el límite de 4 MB por archivo para estas categorías y los formatos admitidos por el cargador habitual. No requiere migración de base de datos ni actualización del PHP de almacenamiento. No se modifican archivos anteriores.

La entrega incluye únicamente este ajuste; los cambios locales previos de Cartera, publicaciones y hosting quedan fuera.

## Verificación

- TypeScript y ESLint de los archivos modificados aprobados.
- 44 archivos de pruebas unitarias aprobados en la entrega aislada, incluida la nueva prueba de categorías por carpeta, conservación de nombres/descripciones, clasificación, límites de descripción y ausencia de efecto sobre el avance o cierre.
- Next.js 16.3.8 con webpack: compilación completa y TypeScript aprobados, 63 páginas generadas. Se utilizó una URL local ficticia para cargar la configuración obligatoria, sin conexión con producción.
- Chromium con el componente real y API simulada local: las doce carpetas a 1440 y 375 px, sin desbordes; bloque de Impuestos visible y cargas opcionales sin activar; dos PDFs con descripciones diferentes en venta y alquiler; conservación al recargar, edición, borrado y consulta de expediente cerrado.
- La comprobación de navegador no sustituye una integración real con MySQL y hosting. No se crearon documentos ni registros de prueba en producción.

## Recuperación

Código anterior: `90e02658edcb686fd06c085e5ef0217441e0697d`, despliegue Production GitHub `7411971692`, confirmado success en la entrega de tipos de persona de alquiler.

Para volver al comportamiento anterior, revertir el commit funcional de esta entrega o promover la versión previa tras revisar cambios posteriores. Conservar los archivos especiales que ya se hayan subido; el código previo los reconoce como documentos conservados, sin borrarlos. No es necesario restaurar la base de datos.

## Publicación

Código funcional `a4c475d4f9c0b164338c79568ce22c301bebf0a6`, subido a `main`.

Vercel confirmó «Deployment has completed», estado **success**, entorno **Production**, el 29 de octubre de 2026 a las 12:35:37 UTC. Despliegue GitHub `7412339125`, asociado al mismo SHA. [Panel de Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/6reKRo1XatnNRjaemTjhmjb5UJc7). [Versión desplegada](https://inmobiliaria-alfarov2-2dwmusfbk-puma19.vercel.app).

Después del despliegue, el dominio oficial responde 200 en `/login` y 307 hacia `/login` en `/datos-inmuebles` sin sesión. La comprobación funcional de esta entrega se realizó en el navegador local con la API simulada; no se hicieron subidas reales en producción.

La actualización documental posterior conserva exactamente este código funcional y se publica por la misma integración automática.
