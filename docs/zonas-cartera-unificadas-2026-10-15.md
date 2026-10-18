> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Zonas de cartera unificadas — 15 de octubre de 2026

## Solicitud y comportamiento

Unificar la gestión diaria en Zonas de cartera, sin obligar a registrar departamento, provincia y distrito para crear una zona. Crear una zona debe generar su carpeta de Cartera con 10 posiciones. Conservar información geográfica existente como opcional de la ficha.

- El submenú antes llamado Ubicaciones se presenta como Zonas de cartera, conservando la ruta `/ubicaciones` para compatibilidad.
- El formulario solicita únicamente nombre y utiliza `POST /api/zonas`, que crea zona y diez posiciones en una transacción. Conserva restricciones de nombres duplicados y permiso de administrador.
- La pantalla lista las zonas reales de Cartera, con cupos, ocupación y enlaces para abrir su carpeta. Cartera ofrece Agregar zona y lleva al mismo formulario; ya no hay dos formularios separados.
- Se conservan los cupos existentes, incluidos Chimbote 50, Nuevo Chimbote 90 y Tortugas 20. No se reasignan inmuebles.
- En Información de inmuebles, departamento, provincia y distrito pasan a un apartado opcional, con entradas independientes de máximo 100 caracteres. No necesitan registrarse en un catálogo ni completarse juntos. Editarlos no cambia `zona_id`, cupos ni posiciones.
- Las direcciones para consulta/mapas usan la zona como referencia cuando falta toda la geografía. No se deducen ni guardan coordenadas; los puntos confirmados conservan su comportamiento.
- La tabla y las APIs del catálogo geográfico anterior se conservan por compatibilidad. La navegación habitual usa el nuevo gestor de zonas.
- No se añaden acciones de eliminación, cambio de cupos o renombrado de zonas.

## Punto de restauración previo

`restore-points/zonas-cartera-unificadas-20261015T122555Z/`.

Contiene `source.tar.gz` (incluye cambios locales y archivos nuevos anteriores), `repository.bundle`, `working-tree.patch` y `manifest.json` con hashes SHA-256 verificados. Se excluye de Git y Vercel. No incluye secretos ni una nueva copia de BD: esta actualización no requiere migraciones ni modifica datos existentes.

Despliegue previo: `dpl_6PzJKsKUMxnCoAQ61CyV589p9GwG`.

Para recuperar: verificar hashes del manifiesto, extraer fuente en un directorio separado y comparar cambios posteriores antes de restaurar o desplegar. Vercel permite recuperar la versión previa; comprobar antes que no haya trabajo posterior que conservar. Si se crearon zonas nuevas usando la aplicación, se conservan como datos compatibles con la versión previa; no eliminarlas para revertir la interfaz.

## Validación

Cinco archivos de pruebas unitarias correctos: registro simplificado, direcciones con zona de referencia, política de edición desde Cartera, agrupación y planificación de zonas. Incluyen geografía independiente, conservación de ubicación previa y exclusión de cambios de zona desde la ficha.

TypeScript, ESLint sin advertencias y `git diff --check`: correctos. No se ejecutan pruebas que creen inmuebles, zonas o cuentas en producción.

## Despliegue

Publicado en `puma19/inmobiliaria-alfarov2`, despliegue `dpl_97m1Y3ZewN36uaNupv5GrT8mUKxi`, estado READY, entorno production.

URL de versión: `https://inmobiliaria-alfarov2-pbrj6sg2k-puma19.vercel.app`.

Vercel confirmó el dominio `https://intranet.inmobiliariaalbertoalfaro.com.pe` asignado a esta versión. Compilación de producción y TypeScript remotos correctos. No se hizo una prueba autenticada de creación en producción; no se crearon zonas ni datos ficticios para verificar.
