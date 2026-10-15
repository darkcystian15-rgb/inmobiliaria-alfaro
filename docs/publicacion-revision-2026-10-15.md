# Publicación de la revisión — 15 de octubre de 2026

## Contenido

Se reúnen los cambios locales de edición desde Cartera, simplificación de filtros y gestión unificada de zonas. Se actualiza README, se añade una referencia consolidada de estado y se identifican las notas anteriores como registros de su revisión. No se ejecutan migraciones ni cambios de datos de negocio.

## Validación previa

- 23 archivos de pruebas unitarias correctos, cero fallos.
- ESLint con cero advertencias.
- Compilación de producción Webpack y TypeScript correctos.
- `git diff --check` correcto.
- Vercel confirmó el proyecto `puma19/inmobiliaria-alfarov2` y el despliegue previo `dpl_97m1Y3ZewN36uaNupv5GrT8mUKxi` READY en el dominio de la intranet.

## Recuperación

Punto privado: `restore-points/revision-publicacion-20261015T184712Z/`. Conserva la fuente anterior y las diferencias sin secretos ni copia nueva de BD. Verificar hashes y extraer en otro directorio antes de restaurar. El despliegue previo permanece como referencia de recuperación; comprobar trabajo posterior antes de promoverlo.

## Entrega

- Commit de código desplegado: `b69208f` (rama `feat/registro-simplificado`).
- Despliegue: `dpl_4Ccej2A1cEUCn3ejQCVBnkFbYwir`, READY, entorno production.
- URL de versión: https://inmobiliaria-alfarov2-38s439yki-puma19.vercel.app.
- Vercel confirmó que https://intranet.inmobiliariaalbertoalfaro.com.pe apunta al nuevo despliegue.
- Compilación remota con Turbopack y TypeScript: correctos.
- Comprobaciones HTTP sobre el dominio: `/login` y `/branding/logo.png` 200; `/`, `/cartera` y `/ubicaciones` 307 a `/login`; `/api/zonas` y `/api/cartera` 401 sin sesión.
- No se realizan escrituras de prueba en producción ni se acredita el recorrido autenticado completo solo comprobando el acceso público.

## Sincronización de GitHub

Los cambios se guardaron en Git local. `git push origin feat/registro-simplificado` fue rechazado con HTTP 403: la cuenta disponible `Cystian` no tiene permiso de escritura sobre `darkcystian15-rgb/inmobiliaria-alfaro`. El despliegue se realizó directamente desde la fuente local validada. La rama remota permanece en `be27049`; hace falta una cuenta con permiso de escritura para sincronizarla. No se modificó `main` ni se forzó el historial.
