# Resumen de avances y contexto para continuar

Fecha: 15 de octubre de 2026.

## Repositorio y estado de entrega

- Repositorio: https://github.com/darkcystian15-rgb/inmobiliaria-alfaro.
- Copia local: `/workspaces/app-alfaro-git/inmobiliaria-alfaro`.
- Rama de trabajo y entrega: `feat/registro-simplificado`.
- Código de aplicación publicado: `b69208f`.
- Evidencia de publicación y comprobaciones: `4f05af9`.
- Se confirmó que GitHub y la copia local coincidían en `4f05af90a6a002a30c960fd119d02a30eb75043f` antes de añadir este resumen.
- `main` conserva la versión anterior. No se hizo merge ni se forzó el historial.
- Este resumen y las correcciones de estado posteriores son documentación; no requieren otro despliegue para actualizar el comportamiento de la intranet.

## Funcionalidad acumulada

1. Flujo de captación, visita, precios acordados, documentación, preparación/confirmación de publicación y cierre por venta o alquiler. Contratos, renovación manual y reingreso conservan antecedentes.
2. Registro simplificado con posición disponible, operación, tipo, ubicación referencial y contacto independiente por inmueble. DNI adjunto como archivo; sin dependencia del DNI numérico para publicar.
3. Cartera organizada por zonas comerciales, separadas de departamento, provincia y distrito. Posiciones y navegación operativa contextualizadas por zona.
4. Gestión unificada en Administración → Zonas de cartera, ruta `/ubicaciones`. Crear una zona solicita nombre y genera diez posiciones. Se conservan los cupos existentes.
5. Departamento, provincia y distrito opcionales e independientes en Información de inmuebles. Editarlos no cambia la zona ni la posición.
6. Operación, tipo y contacto editables por el administrador desde Cartera. Información de inmuebles los muestra para consulta. Cambiar operación exige inmueble activo sin precios ni publicación preparada, con validación del servidor.
7. Filtros de Cartera reducidos a texto, estado, operación y tipo. Se conserva contexto de zona y vistas de tarjetas/lista. Se oculta el contador de vínculos en el catálogo de tipos, conservando la protección contra eliminación de tipos utilizados.
8. Mejoras anteriores de navegación, borradores, móvil, mapas, documentos privados, reportes, permisos y concurrencia para evitar doble ocupación de posiciones.

## Revisión y documentación realizadas

Se revisaron los Markdown de avances y el estado de Git. Se sustituyó el README genérico por una guía del proyecto, se añadió una referencia consolidada y se marcaron los documentos anteriores como registros de su versión para que sus pendientes históricos no se interpreten como tareas actuales.

Referencias principales:

- [Estado actual](estado-actual-2026-10-15.md).
- [Publicación y comprobaciones](publicacion-revision-2026-10-15.md).
- [Seguimiento de cambios](seguimiento-cambios-2026-10-15.md).
- [Zonas unificadas](zonas-cartera-unificadas-2026-10-15.md).
- [Edición desde Cartera](edicion-desde-cartera.md).
- [Contexto anterior de migración](contexto-retomar-2026-10-15.md).

## Producción confirmada durante esta sesión

- Proyecto Vercel: `puma19/inmobiliaria-alfarov2`.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Despliegue: `dpl_4Ccej2A1cEUCn3ejQCVBnkFbYwir`.
- URL de versión: https://inmobiliaria-alfarov2-38s439yki-puma19.vercel.app.
- Estado: READY, production. Vercel confirmó el dominio asignado a esta versión.
- Despliegue previo: `dpl_97m1Y3ZewN36uaNupv5GrT8mUKxi`.

## Validaciones completadas

- 23 archivos de pruebas unitarias, cero fallos.
- ESLint con cero advertencias.
- Compilación local de producción con Webpack y TypeScript correctos. El primer intento restringido falló; la ejecución fuera del sandbox completó correctamente.
- Compilación remota en Vercel con Turbopack y TypeScript correctos.
- `git diff --check` correcto.
- HTTP en producción: `/login` y `/branding/logo.png` respondieron 200; `/`, `/cartera` y `/ubicaciones` redirigieron con 307 a `/login`; `/api/zonas` y `/api/cartera` rechazaron acceso anónimo con 401.
- No se comprobó el recorrido autenticado completo en producción ni se crearon datos ficticios para validar esta entrega.

## Base de datos y recuperación

Esta revisión y publicación no ejecutaron migraciones ni modificaron datos de negocio. Las migraciones de registro simplificado y cartera por zonas constan como aplicadas en documentos anteriores: no repetir `--apply` para comprobar su estado.

La consulta anterior documentó siete zonas, 200 posiciones, 14 ocupadas y 186 disponibles. Son cifras históricas de aquella consulta, no conteos actualizados en esta sesión.

Punto privado anterior a esta revisión: `restore-points/revision-publicacion-20261015T184712Z/`, con fuente, diferencias y manifiesto de hashes. No contiene una nueva copia de BD. Verificar hashes, recuperar en otro directorio y revisar trabajo posterior antes de restaurar. Se conservó el cambio previo de guardas de `scripts/adapt-zones.mjs`; el despliegue no ejecutó ese script.

## Autenticación de GitHub: incidencia resuelta

Git devolvía 403 usando el token automático del Codespace. La API confirmó que `Cystian` ya tenía permiso de escritura. El usuario renovó el acceso con `gh auth login` y `gh auth setup-git`.

La sesión del agente conservaba variables con el token anterior. Se usó la autenticación guardada de GitHub CLI mediante:

```sh
env -u GITHUB_TOKEN -u GH_TOKEN git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin feat/registro-simplificado
```

Se verificó la coincidencia del commit remoto con el local. No registrar ni imprimir tokens, contraseñas o archivos de entorno. Las instrucciones TXT se guardaron en `/workspaces/app-alfaro-git/instrucciones-renovar-github.txt`, fuera del repositorio de la intranet.

## Para continuar

Revisar primero este resumen y el estado de Git. La aplicación está publicada y los cambios se entregan en la rama de trabajo; integrar en `main` es una acción pendiente separada. Antes de modificar datos, comprobar estado actual y copias. Las verificaciones aquí descritas corresponden a esta sesión y no garantizan ausencia de actividad posterior.
