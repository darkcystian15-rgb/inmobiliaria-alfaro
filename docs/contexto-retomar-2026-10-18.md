# Contexto vigente para retomar — 18 de octubre de 2026

Leer primero este archivo y después [REPOSITORIO.md](../REPOSITORIO.md). Esta guía sustituye como punto de entrada al contexto del 15 de octubre; los documentos anteriores conservan sus evidencias históricas.

## Dónde trabajar y qué está sincronizado

- Repositorio: https://github.com/darkcystian15-rgb/inmobiliaria-alfaro.
- Carpeta de aplicación: `/workspaces/app-alfaro-git/inmobiliaria-alfaro`. El padre es otro repositorio; ejecutar Git dentro de esta carpeta.
- Ramas `main` y `feat/registro-simplificado` iguales en local y en GitHub. Punto comprobado antes de añadir esta guía: `e4cfa41b52f5836a93b178407f760d2fcb77495a`, sin cambios pendientes.
- Código operativo de la última entrega: `6885fdab4f47e31785374c174387221b1414cedd`. Los commits posteriores solo registran documentación, incluida esta guía; no vuelven a cargar datos.
- Vercel: `puma19/inmobiliaria-alfarov2`. Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Para `e4cfa41`, Production GitHub `7155765057` y Preview `7155760668`, ambos `success`, «Deployment has completed». Production confirmado el `2026-10-18T14:15:09Z`; URL de versión https://inmobiliaria-alfarov2-21yzvg9ui-puma19.vercel.app.
- Esta guía genera un commit documental posterior. Al retomar, consultar las referencias y los estados de ese último SHA; no confundir el SHA del código operativo con el último commit documental ni usar cifras antiguas como inventario vivo.

## Cargas de Drive ya realizadas

| Zona | Altas realizadas desde Drive | Entrega |
| --- | ---: | --- |
| Chimbote | 43 | [Detalle](carga-chimbote-2026-10-18.md) |
| Nuevo Chimbote | 68 | [Detalle y pendientes](carga-nuevo-chimbote-2026-10-18.md) |
| Tortugas | 11 | [Detalle](carga-cinco-zonas-2026-10-18.md) |
| Huarmey | 1 | [Detalle](carga-cinco-zonas-2026-10-18.md) |
| Casma | 2 | [Detalle](carga-cinco-zonas-2026-10-18.md) |
| Lima | 1 | [Detalle](carga-cinco-zonas-2026-10-18.md) |
| Trujillo | 3 | [Detalle](carga-cinco-zonas-2026-10-18.md) |

Se realizaron 129 altas en total, cada inmueble en la posición del número de su carpeta. Son cifras de las cargas, no un recuento garantizado después de nuevas acciones del usuario. Las siete zonas ya tienen cargada la selección aprobada; esto no implica haber importado todo el contenido de Drive.

Se eliminó la data anterior de cada zona reemplazada con sus relaciones, historial y archivos privados exclusivos. No quedó en Histórico ni papelera. Hay respaldos privados de recuperación en Codespaces, fuera de Git y Vercel; no confundirlos con fichas todavía existentes. No se modificó Google Drive.

Los nuevos registros se crearon activos, con visita pendiente, un evento normal de registro y sin actividades completadas ni archivos heredados. No se cargaron documentos interiores de Drive. Los nombres con operación faltante recibieron alquiler y contacto terminado en `-FTO`, por instrucción del usuario. Esos contactos se pueden corregir luego; no convertir automáticamente esas operaciones en definitivas ni alterar las correcciones posteriores del usuario.

En Nuevo Chimbote: 17 nombres completos y 51 sin operación explícita, 3 ventas y 65 alquileres, 68 visitas pendientes y 22 posiciones libres al verificar el `2026-10-18T14:08:02.111Z`. Las 61 fichas y relaciones de las otras seis zonas se conservaron idénticas, comprobadas con hashes antes/después. Se respetaron también las ediciones de Chimbote realizadas durante la preparación de la entrega anterior.

## Nuevo Chimbote: siguiente trabajo posible, todavía no ejecutado

- **3, 10 y 13:** aclarar ubicación y contacto.
- **11 y 65:** definir tipo de inmueble.
- **37 y 38:** aclarar ubicación y contacto de Interseguro.
- **58:** venta de local Tumbao, sin contacto. No cargado: quedó como caso opcional pendiente de confirmar `CONTACTO58-FTO` o recibir el contacto real.
- **37A:** numeración especial; definir posición y relación con 37 antes de registrarlo.
- Carpetas solo con X: 19, 23, 28, 49, 53, 54, 57, 59, 82 y 86, excluidas. No aparecen 16 y 77.
- Todas las carpetas sin numeración y la carpeta 0 de modelo permanecen excluidas. No incluirlas ni renumerarlas automáticamente.

No volver a proponer migrar toda la zona desde cero: los 68 ya están cargados. Si se autoriza completar casos pendientes, partir del estado vigente y agregar únicamente lo aprobado, sin borrar las fichas importadas ni sus avances posteriores.

## Catálogo, interfaz y validación

- Última mejora: [búsqueda automática y orden numérico por posición](busqueda-orden-seguimiento-2026-10-18.md) en Registrar visitas, Visitas pendientes, Registrar tasaciones y Tasaciones y textos pendientes. Búsqueda al escribir por contacto/dirección/ID/posición, sin tildes y con equivalencia Meiggs/Meigss. Se conserva el contenido de los formularios al filtrar; no altera datos ni requiere cargas o migraciones. Consultar el documento para evidencia de publicación y comprobación.

- Activos Módulo, Condominio, Colegio y Almacén, además de los tipos anteriores. [Catálogo y comprobación](tipos-inmueble.md).
- Operación contiene Cartera de inmuebles. Seguimiento: Registrar inmueble, Liberar inmueble, Visitas pendientes, Registrar visitas, Tasaciones y textos pendientes, Registrar tasaciones. Opciones por zona y permisos vigentes. [Orden](orden-menu-seguimiento-2026-10-18.md).
- Fichas de venta/alquiler, documentos en Inmueble, fotos en Visitas, seguimiento documental y cinco grupos específicos de alquiler. [Organización](ficha-ventas-alquileres-2026-10-18.md).
- Las entregas registran 27 archivos unitarios correctos, ESLint sin advertencias, compilación Webpack/TypeScript completa, integraciones MySQL 8.4 desechables y comprobación autenticada de producción en escritorio/móvil sin errores JavaScript ni desbordes. En cada carga se verificaron posiciones, estado inicial y conservación de zonas ajenas.
- Cuentas/sesiones temporales eliminadas y contenedores/volúmenes de prueba retirados. Las capturas privadas y comprobadores están en `output/`, excluido de Git y Vercel.

## Respaldos y comprobaciones para una nueva sesión

- `restore-points/chimbote-20261018/`: respaldo previo a Chimbote.
- `restore-points/cinco-zonas-20261018-v3/`: respaldo aplicado para las cinco zonas; v1/v2 son copias de preparación sin reemplazos adicionales.
- `restore-points/nuevo-chimbote-20261018/`: respaldo previo a los 68 de Nuevo Chimbote, con 25 tablas y un archivo privado; fuente/bundle previos `7575abe`, manifiesto de importación, resultado, verificación y hashes.
- No publicar respaldos, manifiestos con datos personales, capturas, `.env.local` ni credenciales. Los respaldos son locales; comprobar su existencia al abrir otro Codespace.
- No ejecutar `--apply`, instaladores, cargas ni restauraciones para comprobar un despliegue. Los scripts `replace-*-from-drive.mjs` son operaciones manuales ya ejecutadas y no forman parte del despliegue automático.
- Restaurar código no restaura los datos eliminados. Cualquier recuperación exige verificar hashes, conciliar actividad posterior y restaurar coordinadamente solo el alcance afectado; no sobrescribir otras zonas ni reiniciar la secuencia global.

Comprobación inicial de solo lectura desde la carpeta de aplicación:

```sh
git status --short
git rev-parse main feat/registro-simplificado origin/main origin/feat/registro-simplificado
git ls-remote origin refs/heads/main refs/heads/feat/registro-simplificado
gh api repos/darkcystian15-rgb/inmobiliaria-alfaro/commits/main/status
```

Consultar después los despliegues GitHub para el SHA remoto completo y sus `statuses`, verificando Production `success`. Un estado agregado de Preview por sí solo no acredita Production. Revisar antes de corregir cualquier cambio nuevo que aparezca; no descartar trabajo ajeno ni repetir migraciones.
