# Listado de archivos y navegación por zonas — 18 de octubre de 2026

## Alcance

- El grupo «Cierre e información» pasa a **Estadística**, con **Listado de archivos** y **Reportes**.
- «Contratos de alquiler» se retira del menú y se reemplaza por Listado de archivos. La ruta anterior y sus registros se conservan para no perder contratos, renovaciones ni reingresos.
- **Liberar inmueble** pasa a **Seguimiento**. Solo se muestra al trabajar en una zona, mantiene su contexto y muestra únicamente sus inmuebles. La pantalla pide elegir zona si no existe; GET/POST `/api/liberaciones` rechazan peticiones sin zona o con `zona=*`. La validación de servidor impide liberar un inmueble de otra zona.

## Listado de archivos

Ruta `/listado-archivos`, API de consulta `/api/listado-archivos`, acceso de administrador. Usa los archivos ya cargados desde Información de inmuebles; no duplica registros ni añade otra carga.

- Dos filtros desplegables: **Zona** (zonas activas de cartera y «Todas las zonas activas») y **Tipo de archivo** (los cuatro tipos y «Todos los tipos»).
- Los filtros actualizan automáticamente los resultados y la URL, sin botón Buscar. Conservan el contexto de zona al navegar. Un cambio de filtro vuelve a la primera página y cancela la consulta anterior para evitar resultados fuera de orden. La URL se actualiza de forma síncrona con la History API integrada de Next.js, preservando ambos filtros si se cambian rápidamente.
- Una fila por archivo: ID visible del inmueble, tipo numerado y **Ver archivo**. Se muestra también la zona y el nombre guardado para reconocer el documento.
- Numeración por inmueble y tipo, ordenada por ID del archivo; se calcula antes de paginar. Varias tasaciones figuran como Tasación 1, Tasación 2, etc. Cambiar página o filtrar zona no reinicia la numeración. Al eliminar archivos, la consulta renumera los restantes.
- Paginación de 50 archivos, con total y controles Anterior/Siguiente.
- PDF e imágenes tienen vista previa privada. Word/Excel ofrecen descarga y apertura en su aplicación. Se reutiliza el visor de la ficha.
- Se incluyen inmuebles históricos de zonas activas. Se excluyen zonas inactivas, fotos, enlaces antiguos sin archivo privado y categorías ajenas a los cuatro tipos solicitados.
- La respuesta no expone rutas del hosting ni credenciales; consulta y descarga pasan por las rutas autenticadas existentes, sin caché pública.

| Filtro | Categorías almacenadas reconocidas |
| --- | --- |
| Tasaciones | `TASACION`, `TASACION_EXPRESS`, `TASACION_PROPIETARIO` |
| Contratos de alquiler | `CONTRATO_ALQUILER`; `CONTRATO` antiguo únicamente si el inmueble es de alquiler |
| Minutas de compraventa | `MINUTA_COMPRAVENTA` |
| Escrituras públicas de compraventa | `ESCRITURA_PUBLICA` |

Se añade **Contrato de alquiler** como categoría opcional de carga en Información de inmuebles → Documentación, dentro del grupo Contratos. No añade requisitos obligatorios al expediente. Los archivos ambiguos «Por clasificar» no se adivinan: pueden reclasificarse desde la ficha.

## Base de datos

No requiere migración, tablas, columnas ni reclasificaciones de producción. Las categorías ya se guardan como texto y la nueva consulta usa el esquema existente. Una consulta de solo lectura confirmó MySQL 8.0.37 en la conexión configurada, compatible con la numeración mediante funciones de ventana. No se ejecutan `--apply` ni instaladores. El listado es de solo lectura y conserva archivos, contratos y registros previos.

## Punto de respaldo

Directorio privado, excluido de Git y Vercel:

`restore-points/listado-archivos-20261018T015142Z/`

- Commit previo: `c65320bd9e6929d03c4f0fa6fe8c905793b46f35`.
- `source.tar.gz`: fuente versionada anterior.
- `repository.bundle`: historial y referencias Git anteriores.
- `manifest.json`: fecha, commit, rama y SHA-256 de ambos archivos.
- Directorio con permisos privados y archivos con modo 0600. No incluye secretos ni una nueva copia de base de datos porque esta entrega no modifica esquema ni datos de negocio.
- Última publicación funcional anterior acreditada: `8446fff`, URL https://inmobiliaria-alfarov2-dswwxroao-puma19.vercel.app, con éxito Production registrado en GitHub. El commit de respaldo posterior solo añade evidencia documental.

Para recuperar, verificar los SHA-256 contra `manifest.json`, extraer o clonar el bundle en otro directorio y revisar los cambios posteriores. Se puede promover el despliegue anterior desde Vercel o publicar una reversión revisada. No restaurar una base sobre actividad posterior. Si tras esta entrega se subieron documentos con `CONTRATO_ALQUILER`, los archivos permanecen guardados; el código anterior puede mostrarlos como categoría por clasificar hasta recuperar la versión nueva.

## Validación

- 26 archivos de pruebas unitarias correctos.
- Compilación de producción con Webpack y TypeScript correcta.
- ESLint con cero advertencias.
- `tests/file-list.integration.mjs`: MySQL 8.4 temporal, base vacía local protegida por validación de host/nombre. Comprueba los cuatro filtros, categorías antiguas, zonas activas/inactivas, inmuebles históricos, paginación, numeración del 1 al 53, rechazos 401/403, descarga privada, carga real de contrato desde la API de ficha y cierre dentro/fuera de zona.
- Navegador autenticado: filtros sin Buscar, reinicio de página al filtrar, PDF privado, nuevo menú, zona obligatoria, categoría de carga en ficha, escritorio y móvil de 375 px sin errores JavaScript ni desbordes. Las capturas esperan a que termine la transición del menú.
- Capturas privadas: `output/file-list-local/desktop.png` y `mobile.png`.
- Los datos ficticios se usan únicamente en MySQL local desechable, sin leer `.env.local`. No se ejecutan simulaciones de negocio sobre producción.

## Publicación

- Código publicado: `0b8b6815dfeb25655233a6ac70bcec363842d3f5`, sincronizado en `main` y `feat/registro-simplificado` mediante subida atómica.
- Vercel informó a GitHub `Deployment has completed`, estado `success`, entorno **Production**, despliegue GitHub `7148658405`, fecha `2026-10-18T02:03:41Z`.
- URL de versión: https://inmobiliaria-alfarov2-4uwzbw0ux-puma19.vercel.app.
- Dominio comprobado con sesión autenticada: https://intranet.inmobiliariaalbertoalfaro.com.pe/listado-archivos.
- `tests/file-list.production.smoke.mjs` pasó: siete zonas activas y un archivo coincidente en aquella consulta; cuatro tipos, filtros por cada zona, totales contrastados con MySQL, rechazo anónimo 401 y operador 403, apertura de archivo privado, menú actualizado, Liberar inmueble con zona obligatoria y navegador de escritorio/móvil sin errores ni desbordes. Estos conteos son históricos, no cifras actuales garantizadas.
- No se editaron inmuebles, expedientes, archivos ni cierres para probar producción. Solo se crearon dos cuentas y sus sesiones temporales de verificación, eliminadas en `finally`; se comprobó que las cuentas ya no existían.
- La revisión visual detectó que el encabezado fijo móvil tapaba parte del título sin zona seleccionada. Se añade espacio superior en esa vista y una comprobación explícita de que el título quede bajo la barra.
- Capturas privadas: `output/file-list-production/desktop.png` y `mobile.png`, excluidas de Git y Vercel.
- Se verificaron nuevamente los hashes del punto de respaldo. El contenedor MySQL local se detuvo y retiró, junto con las bases de datos ficticias.
- Los commits posteriores de evidencia/documentación no cambian el código de aplicación publicado.
