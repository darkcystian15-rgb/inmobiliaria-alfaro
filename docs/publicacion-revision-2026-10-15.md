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

## Sincronización de GitHub — resuelta

El primer envío fue rechazado con HTTP 403 por la credencial automática del Codespace. Se comprobó que `Cystian` sí tenía permiso de escritura; el problema era la credencial utilizada, no la condición de colaborador.

El usuario renovó la autenticación mediante GitHub CLI. Usando la sesión guardada, sin las variables automáticas `GITHUB_TOKEN` y `GH_TOKEN`, Git confirmó `Everything up-to-date`. Se verificó que HEAD local y `refs/heads/feat/registro-simplificado` remota coincidían en `4f05af90a6a002a30c960fd119d02a30eb75043f`.

Los cambios están sincronizados en el repositorio de Dark. `main` no se modificó. El despliegue contiene el código de `b69208f`; `4f05af9` añade solamente evidencia documental posterior, sin cambios de aplicación.
