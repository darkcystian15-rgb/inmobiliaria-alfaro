> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

# Retirada de mapas y coordenadas — 15 de octubre de 2026

## Solicitud y alcance

El usuario solicita retirar definitivamente de los inmuebles el mapa, el render de Google Maps, la selección de punto, latitud y longitud, incluida su carga posterior; eliminar los datos existentes, conservar un punto de restauración, documentar y desplegar en Vercel.

Se retiran los mapas de Resumen, edición de ficha, tarjetas y detalle de Cartera; la importación de enlaces, geolocalización, el endpoint `/api/ubicaciones`, los componentes y utilidades de mapa, Leaflet y sus tipos. El catálogo `/ubicaciones` y `/api/catalogo-ubicaciones` son funciones distintas y se conservan.

Se conservan la ubicación referencial escrita, departamento, provincia, distrito, zonas comerciales y posiciones. Los alquileres reingresados ya no copian coordenadas. Las APIs de inmuebles no devuelven ni aceptan para persistencia los campos retirados. Los clientes antiguos pueden enviar esos campos, pero se ignoran; los borradores se limpian al leerlos y escribirlos. Se deshabilita el permiso de geolocalización del navegador.

## Punto de restauración

Directorio privado, excluido de Git y de Vercel: `restore-points/retirar-mapas-20261015T222526Z/`.

- `source.tar.gz`: fuente anterior, commit `78532262d4f6a779d0b28ddab107338b4e7f09e7`, rama `feat/registro-simplificado`.
- `manifest.json`: fecha y SHA-256 de la fuente.
- `coordinates-database.json`: filas afectadas de coordenadas, historial y borradores, antes y después de la limpieza; contiene datos privados, no publicar.
- `coordinates-manifest.json`: SHA-256 de la copia de datos y conteos.
- `coordinates-applied.json`: constancia posterior al commit de la transacción, si la aplicación concluyó.

Despliegue previo confirmado READY: `dpl_4Ccej2A1cEUCn3ejQCVBnkFbYwir`, https://inmobiliaria-alfarov2-38s439yki-puma19.vercel.app, asignado al dominio de la intranet antes de esta intervención.

## Limpieza de datos

`scripts/remove-property-coordinates.mjs` previsualiza por defecto. Con `--apply --checkpoint <directorio>` bloquea las filas, escribe la copia privada y sus hashes **antes** de actualizar, vacía las coordenadas y retira sus claves de JSON anidados en historial y borradores. Conserva el resto del contenido y las fechas existentes. Si encuentra JSON dañado con coordenadas, detiene la operación. No elimina inmuebles ni movimientos completos.

Las dos columnas físicas antiguas se mantienen vacías y fuera del modelo de la aplicación para permitir volver al código anterior sin un cambio destructivo del esquema. Las migraciones SQL históricas se conservan; no se vuelven a ejecutar. Las instalaciones nuevas ya no definen estos campos en `db/schema.sql` y se retira su instalador antiguo.

Previsualización inicial: 0 inmuebles con coordenadas, 1 movimiento histórico y 1 borrador afectados. La configuración local usa secretos de producción no exportables desde Vercel; una comprobación autenticada del dominio confirmó el acceso a esta misma base mediante cuenta y sesión aisladas, eliminadas al terminar.

## Recuperación

1. Verificar el SHA-256 de `source.tar.gz` con `manifest.json` y extraer en otro directorio para revisión.
2. Ejecutar `node scripts/remove-property-coordinates.mjs --restore --checkpoint restore-points/retirar-mapas-20261015T222526Z` para previsualizar. Se comprueban hash, identidad de base y ausencia de cambios posteriores en las filas afectadas. No se restaura automáticamente si cambió el historial o borrador limpiado.
3. Añadir `--apply` únicamente al decidir restaurar coordinadamente los datos y el código anterior; promover el despliegue previo tras revisar el trabajo posterior.

## Validación y entrega

- 23 archivos de pruebas unitarias correctos, incluido el rechazo efectivo de persistencia desde clientes antiguos y limpieza de JSON anidado conservando otros datos.
- ESLint con cero advertencias: correcto.
- Compilación local de producción con Webpack y TypeScript: correcta. Se retiraron tipos de desarrollo generados obsoletos que aún referenciaban la ruta eliminada.
- `git diff --check`: correcto.
- Código publicado: commit `73d042c`, rama `feat/registro-simplificado`, sincronizado con GitHub.
- Vercel: `dpl_FBiq3YGd3qcaBQZT5zMZPYnRrAwL`, READY, production. Compilación remota con Turbopack y TypeScript correcta.
- URL de versión: https://inmobiliaria-alfarov2-9l6m044y8-puma19.vercel.app.
- Dominio confirmado por Vercel: https://intranet.inmobiliariaalbertoalfaro.com.pe apunta al nuevo despliegue.
- Limpieza aplicada después de publicar el código: 0 inmuebles con coordenadas en campos principales; se retiraron coordenadas de 1 movimiento histórico y 1 borrador, conservando los demás datos.
- Consulta posterior: 0 inmuebles, 0 movimientos y 0 borradores con coordenadas estructuradas pendientes de limpieza.
- Verificación de recuperación sin escribir: hash e identidad de base correctos, 2 filas JSON restaurables, sin aplicar restauración.
- Prueba autenticada real: ficha Resumen e Inmueble en escritorio y móvil; Cartera en tarjetas; sin componentes ni peticiones a Google Maps/OpenStreetMap, sin errores de navegador ni desborde móvil. APIs de ficha y cartera sin coordenadas; importador retirado devuelve 404. Un borrador aislado enviado con coordenadas se recupera sin ellas.
- Evidencia visual privada: `output/remove-maps-production/ficha-desktop.png`, `ficha-mobile.png` y `cartera-desktop.png`; excluida de Git/Vercel.
- La cuenta, sesión y borrador de prueba se eliminaron al terminar. No se modificaron inmuebles para probar la interfaz.
- `coordinates-applied.json` confirma que la transacción de limpieza quedó comprometida. Fuente y datos respaldados con permisos privados; no se publican secretos ni datos del respaldo.
