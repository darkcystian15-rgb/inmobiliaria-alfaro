El sistema trata todos los inmuebles como registros operativos. Se retiraron los controles, las etiquetas y los filtros de clasificación de prueba de reportes, cartera y fichas. Los indicadores incluyen todos los registros que cumplen los filtros de negocio.

Los códigos siguen `001-CASA-NOMBRE-DEL-INMUEBLE`. El número de orden se asigna una sola vez, de forma correlativa y dentro de la misma transacción que crea la ficha. Se conserva al cambiar nombre, tipo o posición. El tipo y el nombre del código se actualizan al editar la ficha. La numeración también se aplica a los reingresos de alquiler.

La columna de código admite 350 caracteres. Los códigos anteriores se conservan como referencias de acceso a fichas, visitas, documentos, anuncios y seguimiento. Los archivos ya alojados conservan sus rutas. Los borradores de ficha usan el ID permanente del inmueble.

El punto previo está en `restore-points/uniformizar-inmuebles-20261012T233941890Z/`, excluido de Git. Contiene `database.json` con las 23 tablas previas, `source.tar.gz`, un manifiesto con hashes SHA-256 y la relación de códigos modificados. La etiqueta remota `recovery/antes-uniformizar-inmuebles-20261012T233941Z` identifica el código anterior.

La recuperación se puede revisar sin escribir datos:

```sh
node scripts/restore-property-identities.mjs --checkpoint /workspaces/inmobiliaria-alfaro/restore-points/uniformizar-inmuebles-20261012T233941890Z
```

El mismo comando con `--apply` restaura los campos afectados. Se detiene si hay inmuebles nuevos o cambios posteriores en sus códigos. La interfaz anterior se recupera desplegando el commit `25dceb4e162d44899aad0d0a44395c015610f07d`.

Para una instalación nueva, las migraciones crean las tablas de secuencia y códigos anteriores. En una base existente, `scripts/uniform-property-identities.mjs` muestra una vista previa; `--apply --checkpoint CARPETA` aplica la adaptación después de verificar la copia de recuperación.

El dominio de producción se publica desde `darkcystian15-rgb/inmobiliaria-alfaro`, en el proyecto Vercel `puma19/inmobiliaria-alfarov2`: `https://intranet.inmobiliariaalbertoalfaro.com.pe`. La vinculación local de `.vercel` del workspace original corresponde a otro proyecto.
