# Documentos de 100 MB sin aviso permanente de límite

Fecha: 2026-11-09.

## Alcance

Todos los documentos del expediente admiten hasta 104857600 bytes (100 MiB, mostrado como 100 MB en los errores), incluida Copia literal o CRI. Se retiran las etiquetas permanentes de tamaño de los formularios y la ayuda de carga. La validación sigue rechazando archivos mayores al límite.

Los documentos de más de 4 MB usan subida directa al hosting mediante autorización temporal firmada. La autorización vincula usuario, inmueble, categoría, ruta, tamaño, nombre y descripción. Se conservan permisos, condiciones de aplicabilidad, bloqueo de expedientes cerrados y subcarpetas de saneamiento. Las imágenes originales admiten 100 MB y siguen comprimiéndose; las imágenes almacenadas mantienen la validación de dimensiones y del resultado comprimido. La lectura automática/OCR conserva su límite independiente de 12 MB.

## Verificación

- TypeScript: `npx tsc --noEmit`, correcto.
- ESLint en los componentes y módulos modificados: correcto.
- Pruebas de documentos y autorizaciones: correctas, incluido el límite exacto y rechazo por exceso, categoría, ruta, usuario y vencimiento.
- PHP: sintaxis correcta y prueba de integración local con memoria de 256 MB. Subida y descarga real de 100 MB para copia literal y subida de 100 MB para DNI; comprobaciones de acceso privado, CORS, firma, tamaño y prohibición de sobrescritura.
- Sin cambios de esquema ni migraciones necesarias para esta entrega.

## Activación del almacenamiento

El despliegue en Vercel no instala PHP en cPanel. Para habilitar documentos grandes debe actualizarse `hosting/documentos.php` en el servidor de documentos, conservando la configuración privada. Debe anunciar `documentUploadVersion: 2` y `maxDocumentBytes: 104857600`.

Configurar memoria PHP suficiente (mínimo probado 256 MB) y permitir PUT de al menos 100 MB en el servidor/proxy. La aplicación detecta versiones antiguas y avisa antes de iniciar la subida grande. No se ha probado una subida autenticada de 100 MB contra almacenamiento de producción.

## Despliegue

Proyecto: `inmobiliaria-alfarov2` (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`).
Equipo: `team_qcKFQOeqeLWTJFsCLGnZvPiL`.
Destino: Production. Fuente: árbol de trabajo local sobre `288e706` de `main`, con cambios sin commit preexistentes conservados.
Compilación remota con `npm run build -- --webpack`; se omiten las migraciones automáticas del comando habitual mediante configuración temporal exclusiva de este despliegue. No se modifica `vercel.json` del repositorio.

Deployment: `dpl_2NBAjCqvGAK2unWiG3TDEDS5yyc7`.
URL: https://inmobiliaria-alfarov2-oecbr8x16-puma19.vercel.app
Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe
Estado: READY en Production, con ambos dominios asignados y sin error de alias. Compilación remota completada en 54 segundos; TypeScript y generación de páginas correctos.

Verificación posterior: `GET https://intranet.inmobiliariaalbertoalfaro.com.pe/login` devuelve HTTP 200 y el formulario de inicio de sesión esperado. No se ejecutaron subidas sobre expedientes reales.

El Markdown de alcance se incluyó en los archivos enviados a Vercel; este registro final del resultado se completa localmente después de finalizar el despliegue.
Rollback de referencia: `dpl_N8LgvUvYBSBfSySxV5hDvXKYs1nw` (producción anterior).
