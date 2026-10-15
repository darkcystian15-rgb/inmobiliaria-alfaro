> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Seguimiento de cambios — 15 de octubre de 2026

## Edición desde Cartera (trabajo anterior)

El panel de detalle permite editar operación, tipo de inmueble y nombre de contacto. Información de inmuebles los muestra solo para consulta. Cambiar operación requiere inmueble activo sin precios ni publicación preparada; el panel incluye la nota y el servidor verifica la regla. Referencia: `docs/edicion-desde-cartera.md`. Publicado en `dpl_8yiEXzUJPeqT6znhE41UsTLQj63K`.

## Simplificación de filtros y catálogo de tipos

Petición: mantener en la búsqueda de Cartera únicamente texto, estado, tipo de operación y tipo de inmueble. Ocultar el número de inmuebles vinculados en cada entrada del catálogo de tipos.

### Punto de restauración previo

`restore-points/filtros-cartera-tipos-20261015T121706Z/`, privado y excluido de Git y Vercel.

- `source.tar.gz`: código previo, incluidos archivos nuevos y cambios locales existentes.
- `repository.bundle`: historial Git.
- `working-tree.patch`: diferencias previas respecto a HEAD.
- `manifest.json`: commit base, despliegue previo y hashes SHA-256 verificados.
- Despliegue previo: `dpl_8yiEXzUJPeqT6znhE41UsTLQj63K`.

No se modifican datos ni esquema: el punto contiene código y referencia de despliegue, sin copia nueva de BD. Para recuperar, verificar hashes, extraer el código en un directorio separado y comparar con trabajo posterior antes de restaurar. También puede recuperarse la versión previa mediante Vercel, comprobando antes que no haya cambios posteriores que conservar.

### Cambios

- Cartera: caja de texto y tres desplegables visibles también en móvil. Se eliminan controles y lógica de posición, distrito y actividad; sus parámetros antiguos no filtran resultados ni se propagan en enlaces de retorno.
- Se conserva el contexto por zona, la consulta de posiciones disponibles y las vistas de tarjetas/lista; el selector de vista pasa fuera de la sección de búsqueda.
- Tipos de inmueble: se retira el contador visible. El conteo interno conserva la deshabilitación de Eliminar cuando existen vínculos activos o históricos. El servidor vuelve a comprobarlos antes de eliminar.
- No se alteran APIs, permisos, datos ni reglas de negocio.

### Validación y despliegue

- TypeScript (`npx tsc --noEmit`): correcto.
- ESLint sin advertencias: correcto.
- `git diff --check`: correcto.
- Compilación de producción y TypeScript en Vercel: correctos.
- Publicado en `puma19/inmobiliaria-alfarov2`, despliegue `dpl_6PzJKsKUMxnCoAQ61CyV589p9GwG`, estado READY.
- Vercel confirmó el dominio `https://intranet.inmobiliariaalbertoalfaro.com.pe` asignado a esta versión.
- No se realizaron pruebas autenticadas de interfaz ni escrituras de prueba en producción.

## Unificación de zonas (actualización posterior)

Se sustituye Ubicaciones por Zonas de cartera, con creación por nombre y diez posiciones nuevas. La geografía de la ficha queda opcional e independiente. Requisitos, recuperación y validación en `docs/zonas-cartera-unificadas-2026-10-15.md`.
