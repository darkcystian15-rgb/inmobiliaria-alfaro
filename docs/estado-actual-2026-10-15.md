# Estado actual — 15 de octubre de 2026

Referencia consolidada tras revisar los documentos de avances y los cambios locales. La comprobación de despliegue se realiza en Vercel; los conteos de datos corresponden a la consulta anterior indicada, no a una nueva auditoría de la BD.

## Funcionalidad vigente

- Cartera por zona comercial, independiente de la geografía. Cupos existentes: Chimbote 50, Nuevo Chimbote 90, Tortugas 20 y diez para cada una de las demás zonas iniciales.
- Creación unificada en Administración → Zonas de cartera (`/ubicaciones`): nombre y diez posiciones nuevas, con acceso desde Cartera.
- Captación contextual: zona, posición libre, operación, tipo, ubicación referencial y contacto. No exige departamento, provincia ni distrito.
- Geografía opcional en Información de inmuebles, con campos independientes. No reasigna zona ni posición.
- Edición de operación, tipo y contacto reservada al administrador desde Cartera. Cambiar operación exige inmueble activo sin precios ni publicación preparada.
- Filtros de Cartera: texto, estado, operación y tipo. Los antiguos parámetros de posición, distrito y actividad no filtran el resultado.
- DNI mediante archivo. Preparar/confirmar publicación requiere precios acordados y expediente con archivo DNI, archivo de tasación, foto asociada a visita completada y texto.
- Se mantienen cierres por venta/alquiler, contratos, reingreso, documentos privados, historial, reportes y permisos.

## Documentos históricos y precedencia

1. Esta referencia y el seguimiento de publicación prevalecen para estado de entrega.
2. `zonas-cartera-unificadas-2026-10-15.md` y `seguimiento-cambios-2026-10-15.md` describen los últimos ajustes.
3. `contexto-retomar-2026-10-15.md` documenta la migración por zonas aplicada y la corrección de contactos. Su despliegue es anterior a los ajustes de interfaz posteriores.
4. `registro-simplificado-2026-10-15.md` y `cartera-zonas-contexto.md` conservan las instrucciones de preparación y recuperación, pero sus pendientes de migración/despliegue quedaron superados.
5. `mapa-funcional-revisado-2026-10-15.md` describe expresamente la base anterior al registro simplificado. Los documentos previos de visitas/tasaciones por distrito, propietarios compartidos y clasificación de datos de prueba son históricos cuando difieren del flujo actual.

## Datos y recuperación

La consulta registrada en el contexto de recuperación contó siete zonas, 200 posiciones, 14 ocupadas y 186 disponibles. No representa un contador actualizado en tiempo real.

No repetir migraciones para verificar. Esta revisión no necesita modificar esquema ni registros de negocio. Se conserva el cambio previo de guardas de `scripts/adapt-zones.mjs`; desplegar no ejecuta ese script ni reinstala triggers existentes.

Punto privado anterior a esta revisión: `restore-points/revision-publicacion-20261015T184712Z/`, con fuente, diferencias y hashes. No incluye una nueva copia de BD porque no se modifican datos.

## Verificación y publicación

- 23 archivos de pruebas unitarias: correctos.
- ESLint con cero advertencias: correcto.
- Vercel confirmó antes de actualizar: `dpl_97m1Y3ZewN36uaNupv5GrT8mUKxi`, READY, asignado al dominio de la intranet.
- Compilación de producción con Webpack y TypeScript: correctos. El resultado del nuevo despliegue se registra en [Publicación de la revisión](publicacion-revision-2026-10-15.md).
- No se ejecutan integraciones con escrituras contra producción ni se da por verificado el recorrido autenticado completo mediante una comprobación pública de `/login`.

## Entrega confirmada

Código `b69208f` publicado como `dpl_4Ccej2A1cEUCn3ejQCVBnkFbYwir`, READY y asignado al dominio de la intranet. Comprobaciones HTTP correctas. El envío a GitHub está pendiente por rechazo 403 de permisos; los commits se conservan localmente. Ver [evidencia de publicación](publicacion-revision-2026-10-15.md).
