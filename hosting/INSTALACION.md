# Documentos en cPanel

1. Confirma que `https://media.inmobiliariaalbertoalfaro.com.pe` llega a cPanel y tiene SSL válido.
2. En Administrador de archivos crea `/home5/inmobi16/documentos-privados` con permisos 0700, fuera de todas las carpetas públicas.
3. Copia `documentos-config.example.php` a `/home5/inmobi16/documentos-config.php` con permisos 0600. Reemplaza el token por un secreto aleatorio: puedes generarlo en Codespaces con `openssl rand -hex 32`. No publiques ni envíes ese secreto por chat.
4. Sube `documentos.php` a la raíz web del subdominio. La URL será `https://media.inmobiliariaalbertoalfaro.com.pe/documentos.php`. Sin autorización debe responder 401 (503 indica que falta configurar el servicio).
5. Configura estas variables de servidor en Vercel y en el entorno local de Codespaces:

```dotenv
DOCUMENT_STORAGE=hosting
DOCUMENT_HOSTING_URL=https://media.inmobiliariaalbertoalfaro.com.pe/documentos.php
DOCUMENT_HOSTING_TOKEN=EL_MISMO_SECRETO_DEL_ARCHIVO_PHP
```

6. Despliega la versión modificada y prueba subir, abrir, descargar y eliminar un PDF ficticio. Comprueba la carpeta `documentos-privados/inmuebles/` en cPanel. Los registros continúan en la base de datos actual; no hace falta modificar su estructura.

La aplicación usa exclusivamente el hosting para los documentos. Si el servicio falla, la subida falla; no se envía a otro almacenamiento. `DOCUMENT_STORAGE=hosting` puede conservarse, pero ya no es necesario.

El almacenamiento queda en cPanel, pero la subida y descarga pasan por las funciones de Vercel y pueden consumir transferencia y ejecución allí. La aplicación conserva su autenticación y admite documentos de hasta 100 MB. No se publica una URL directa de los documentos ni el secreto en el navegador.

Si la autenticación falla aun con el secreto correcto, revisa con el proveedor que PHP reciba el encabezado Authorization. No habilites acceso público como solución.

## Actualización de carpetas y confirmación de borrado

Reemplaza únicamente `/home5/inmobi16/public_html/documentos.php` por la versión nueva. Conserva `documentos-config.php` y su clave actual. El PHP actualizado admite las rutas anteriores y las nuevas: `inmuebles/INM-001-posicion-1/dni-propietario/identificador-dni.pdf`. Sin reemplazarlo, las nuevas subidas serán rechazadas.

Las nuevas carpetas usan el código real del inmueble y su posición al subir el documento. Si cambia de posición, los documentos previos conservan su ruta. Los archivos existentes siguen funcionando; no se mueven automáticamente. Las direcciones de apertura siguen pasando por la aplicación para comprobar la sesión.

## Fotos de visitas y galería

Reemplaza `public_html/documentos.php` por la versión que acepta imágenes JPG, PNG y WebP. Conserva tu clave y configuración. Ejecuta `node scripts/install-documents.mjs` antes de desplegar para agregar `visita_id`, `es_portada` y la referencia a visitas de forma idempotente. La migración Drizzle 0005 representa esos mismos cambios: usa el instalador o la migración, sin aplicarlos dos veces.

Para registrar una visita se requieren entre 1 y 20 fotos recién adjuntadas por el usuario. Las mismas fotos se consultan en la ficha y en la galería de cartera. El sistema permite agregar fotos, editar nombre/descripción, elegir portada y eliminar fotos. Las imágenes de otras categorías, como un DNI, no se muestran en la galería del inmueble. Las imágenes se validan y se guardan como WebP con un máximo de 1920 píxeles de lado.

## Subida directa de documentos

Para archivos grandes, reemplaza documentos.php por la versión de esta entrega. Mantén la configuración y la clave privada. La intranet autoriza una subida directa temporal para documentos de cualquier categoría, hasta 100 MB por archivo. La confirmación valida formato y tamaño en servidor antes de registrar el documento. Consulta docs/copia-literal-50mb-2026-10-22.md para alcance y comprobaciones. Sin esta actualización, la aplicación avisará que falta instalar el servicio para archivos de más de 4 MB.

### Dominios autorizados para subidas directas

El dominio oficial funciona por defecto. Para subir desde un despliegue de Vercel, actualiza `documentos.php` y agrega en la configuración privada una lista de orígenes exactos:

```php
'upload_origins' => [
    'https://intranet.inmobiliariaalbertoalfaro.com.pe',
    'https://inmobiliaria-alfarov2-cpbo90tho-puma19.vercel.app',
],
```

La lista sustituye `upload_origin`, que sigue siendo compatible cuando no se define la lista. No autorices todos los subdominios de Vercel. Cada despliegue nuevo necesita autorización explícita; para uso cotidiano utiliza el dominio oficial. La API comprueba el permiso antes de iniciar una subida grande para evitar el mensaje genérico «Failed to fetch».

## Subidas de documentos de 100 MB

Actualizar `documentos.php` en cPanel junto con la aplicación. El servicio debe anunciar `documentUploadVersion: 2` y `maxDocumentBytes: 104857600`. Permitir solicitudes PUT de al menos 100 MB en el servidor/proxy y memoria PHP suficiente (recomendado 256 MB o más). Todos los documentos grandes usan autorización temporal por archivo, categoría e inmueble.
