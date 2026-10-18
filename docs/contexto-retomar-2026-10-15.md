> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Contexto para retomar — 15 de octubre de 2026

## Repositorio y trabajo actual

- Repo: https://github.com/darkcystian15-rgb/inmobiliaria-alfaro
- Copia local: `/workspaces/app-alfaro-git/inmobiliaria-alfaro`.
- Rama de trabajo: `feat/registro-simplificado`.
- Commit de la actualización por zonas: `be270493ce1853152804325d96475755177ba4b5`.
- Se verificó por `git ls-remote` que la rama remota apunta a ese commit. `main` seguía en `cf4f5f0f55be5fe400c5e823861f89cfb4bcd868`.
- Existe una modificación local pendiente en `scripts/adapt-zones.mjs`: las guardas consultan `inm_zona_cutover` mediante una variable y `FOR SHARE`. No descartarla ni atribuirla a esta revisión; ya existía al empezar.

## Producción confirmada

Se consultó directamente la API de Vercel, en modo lectura:

- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe
- Proyecto: `puma19/inmobiliaria-alfarov2`.
- El dominio resuelve al despliegue `dpl_BaXJ6xgRy7YxBpQDCjorPzsoNtgH`.
- URL del despliegue: https://inmobiliaria-alfarov2-4t12j1pvu-puma19.vercel.app
- Estado: `READY`, entorno `production`, commit `be270493ce1853152804325d96475755177ba4b5`, rama `feat/registro-simplificado`.
- El dominio respondió HTTP 307 hacia `/login`. No se hizo una revisión visual autenticada en esta sesión.

**La actualización por zonas ya está publicada y la migración está aplicada.** Las últimas líneas de `docs/cartera-zonas-contexto.md` quedaron desactualizadas cuando indican que producción sigue pendiente. Usar este archivo como actualización de estado.

## Base de datos verificada

Consulta directa a la base externa configurada en `.env.local`, sin exponer credenciales:

| Zona | Capacidad | Posiciones | Ocupados |
| --- | ---: | ---: | ---: |
| Chimbote | 50 | 50 | 6 |
| Nuevo Chimbote | 90 | 90 | 3 |
| Tortugas | 20 | 20 | 1 |
| Casma | 10 | 10 | 1 |
| Huarmey | 10 | 10 | 1 |
| Lima | 10 | 10 | 1 |
| Trujillo | 10 | 10 | 1 |

- Total: 200 cupos, 14 ocupados, 186 disponibles al consultar.
- `inm_zona_cutover.activo = 1`.
- Punto privado: `restore-points/cartera-zonas-20261015T080139Z/`.
- Su manifiesto registra `zonesMigration: committed`; `zones-journal.json` registra `status: committed`, fecha `2026-10-15T08:36:02.126Z`.
- Se verificaron los hashes de `source.tar.gz`, `repository.bundle`, `database.json` y `zones-journal.json`: correctos.
- No repetir la migración ni ejecutar `--apply` para verificar el estado.

## Tres contactos corregidos con autorización del usuario

El usuario detectó tres contactos vacíos. Se consultó la base y se contrastó con la copia anterior al registro simplificado: los tres ya carecían de propietario asociado, por lo que no había nombre para convertir. Los nombres presentes en los códigos se propusieron al usuario, quien confirmó que eran correctos y pidió guardarlos.

Se actualizó exclusivamente `inm_inmuebles.nombre_contacto` en una transacción, bloqueando y validando ID, código y contacto todavía vacío antes de escribir. Tras confirmar la transacción se volvieron a consultar las filas:

| ID | Código | Nombre guardado | Zona | Posición |
| --- | --- | --- | --- | ---: |
| 477 | 013-OFICINA-CHRISTIAN-PUMARICRA | Christian Pumaricra | Nuevo Chimbote | 13 |
| 481 | 014-CASA-MARIO-MAZZINI | Mario Mazzini | Chimbote | 01 |
| 482 | 015-LOCAL-MARTHA-FIGUEROA | Martha Figueroa | Chimbote | 14 |

Las tres escrituras quedaron confirmadas y verificadas. No se requiere desplegar código para verlas; se indicó recargar la intranet.

## Validación y herramientas

- `npm run test:zones`: tres archivos de pruebas pasaron, cero fallos.
- Esta revisión no ejecutó migraciones ni nuevos despliegues.
- `vercel` no estaba disponible como ejecutable; la comprobación se hizo con la API y la autenticación local existente. Nunca imprimir tokens ni archivos de entorno.
- `rg` no estaba disponible en los últimos comandos; se usó `grep` como alternativa.
- Los accesos de red desde shell necesitaron ejecución con permisos ampliados tras errores de sandbox. Las comprobaciones de estado fueron de solo lectura; la única escritura externa fue la corrección de los tres contactos expresamente autorizada.

## Para continuar

Leer este archivo junto con `docs/cartera-zonas-contexto.md` para recuperar requisitos y ensayos anteriores. Revisar el estado de Git antes de editar y conservar los cambios locales existentes. Los datos y despliegues aquí registrados describen lo comprobado en esta sesión, no garantizan que no haya actividad posterior.
