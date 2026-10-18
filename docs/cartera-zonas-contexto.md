> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Cartera por zonas — contexto y recuperación

## Solicitud y decisiones confirmadas

- Solo administrador; conservar acceso de operadores.
- Diseño existente tipo Google Drive: conservar colores, carpetas, tarjetas y estilo.
- Cupos activos simultáneos: Chimbote 50, Nuevo Chimbote 90, Tortugas 20; cada zona pequeña adicional 10.
- Posiciones independientes 01–cupo por zona. Conservar códigos e historial de inmuebles.
- Cartera como entrada por zonas. Seleccionar zona habilita menú operativo contextual; volver a todas lo oculta.
- Captación hereda zona; ya no solicita departamento/provincia/distrito. Conservar geografía existente separada de la zona comercial.
- Indicadores, tareas, posiciones y reportes deben usar el contexto seleccionado; reportes generales siguen disponibles.
- Adaptar datos existentes, con copia y validación previas. Nunca omitir inmuebles ni sobreasignar cupos silenciosamente.

## Punto de restauración

- Carpeta privada excluida de Git/Vercel: `restore-points/cartera-zonas-20261015T080139Z`.
- Commit previo: `ba841344b213b69f40c34689fb84f906e3f5d4f5`.
- Código: `source.tar.gz`; historial: `repository.bundle`; hashes: `manifest.json`.
- Producción previa: `dpl_Awmpd1AWzDnXgw8mNmSnmE36ekUq`.
- La copia de BD aún está pendiente. No se autoriza ejecutar cambios sin completarla y verificarla.

## Estado de implementación

Inspección inicial. Todavía no se modificaron esquema ni datos.

## Recuperación

1. Leer `manifest.json` y verificar SHA-256 de los archivos antes de usarlos.
2. Recuperar código en un directorio separado desde el archivo o bundle; no sobrescribir trabajo posterior.
3. Revisar el diario de migración y cambios posteriores antes de revertir datos.
4. Revertir código y BD coordinadamente; promover el despliegue previo solo si el esquema sigue siendo compatible.
5. Este MD se actualizará con migración, pruebas, estado real y despliegue.

## Diseño implementado y ensayo (en curso)

- Tablas nuevas: `inm_zonas`, `inm_posiciones_zona`, `inm_asignaciones_zona`; relación aditiva `inm_inmuebles.zona_id`.
- Las dos tablas de posiciones globales se conservan completas y sin modificaciones como referencia histórica y recuperación.
- La zona comercial queda separada de departamento/provincia/distrito. La geografía original se conserva; las captaciones heredan los valores disponibles de la zona, sin pedirlos en el formulario ni inventarlos si faltan.
- El administrador entra por Cartera, selecciona zona y ve sus acciones. El contexto se transporta en `?zona=...` y desaparece al volver a la cartera general; no queda una selección global oculta.
- Posiciones y borradores de captación se separan por zona. Las consultas operativas y reportes reciben el mismo contexto. Los operadores mantienen su menú y acceso de información.
- Crear otra zona desde Cartera asigna 10 posiciones; no puede sobrescribir los cupos de las zonas existentes.
- Protección de concurrencia: bloqueo de zona/posición al registrar y restricciones únicas para una posición activa y un inmueble activo por asignación.
- Durante el corte se bloquean las escrituras a las posiciones antiguas y los registros sin zona. La versión anterior puede seguir leyendo mientras se promueve el nuevo despliegue.

### Distribución comprobada en la copia

| Zona | Cupo | Activos |
|---|---:|---:|
| Chimbote | 50 | 6 |
| Nuevo Chimbote | 90 | 3 |
| Tortugas | 20 | 1 |
| Casma | 10 | 1 |
| Huarmey | 10 | 1 |
| Lima | 10 | 1 |
| Trujillo | 10 | 1 |

Total: 200 posiciones, 14 ocupadas, 186 disponibles y 1 inmueble histórico. El usuario confirmó asignar a **Chimbote** el inmueble sin distrito. No se inventó ni alteró su dirección geográfica.

### Evidencia de ensayo

- Copia privada completada y verificada: 25 tablas.
- Réplica aislada: contenedor `alfaro-zones-rehearsal`, puerto local 33317, BD `alfaro_zones_test`.
- Adaptación aplicada solo en la réplica con `scripts/adapt-zones.mjs --missing-zone Chimbote --apply`.
- Reconciliación de todas las filas y columnas originales: sin pérdidas ni alteraciones; la única relación añadida es `zona_id`.
- Validación de reversión con `scripts/restore-zones.mjs`: correcta y sin escribir.
- Pruebas unitarias de cupos, alias, posiciones repetidas entre zonas, conservación de posiciones válidas y rechazo de datos inconsistentes: correctas.
- Integración y revisión visual: en curso. Producción todavía no migrada ni desplegada.

## Secuencia de publicación y recuperación

1. Terminar pruebas sobre la réplica y registrar sus resultados aquí.
2. Construir despliegue de producción preparado **sin asignar dominios** (`vercel deploy --prod --skip-domain`).
3. Comprobar hashes de copia y comparar datos vivos con la copia. Si hay deriva relevante, detenerse y crear otro punto; no forzar la aplicación.
4. Aplicar `scripts/adapt-zones.mjs --checkpoint <punto> --missing-zone Chimbote --apply`. El diario privado se escribe antes de confirmar la transacción.
5. Promover el despliegue preparado y verificar dominio, cupos, datos y restricciones.
6. No ejecutar migraciones SQL aisladas ni repetir `--apply`: el script coordina DDL aditivo, validación, datos y guardas de transición.
7. Para recuperar, ejecutar primero `scripts/restore-zones.mjs --checkpoint <punto>` sin `--apply`. Si detecta trabajo posterior se detiene; requiere recuperación revisada para preservar nuevas operaciones. Solo si valida puede desactivar el corte y revertir la relación de zona, coordinadamente con el despliegue anterior. Las tablas y diarios nuevos permanecen para auditoría.

### Integración completada en la réplica

- Cartera y posiciones: capacidad y disponibilidad correctas en las cuatro zonas verificadas; sin mezcla de inmuebles.
- Visitas, tasaciones, publicaciones, liberaciones y contratos: API filtrada por zona.
- Reportes de cartera, posición ocupada, posiciones disponibles e histórico: datos y totales consistentes con la zona, también en descarga completa.
- Nuevas zonas pequeñas: 10 posiciones. Se rechazaron captaciones sin zona, fuera de cupo y con zona del formulario distinta del contexto.
- Dos captaciones simultáneas para la misma posición: exactamente una creada y otra rechazada. Al ocupar las diez posiciones de ensayo no se admitieron duplicados ni un undécimo espacio.
- Operador: mantiene consulta de información; no puede consultar ni crear zonas.
- Las pruebas de integración exigen `TEST_DATABASE_URL` local, nombre exacto `alfaro_zones_test`; nunca aceptan producción.

### Orden seguro de una eventual reversión

Validar primero sin escribir. Si no hay trabajo posterior, promover la versión previa **mientras las guardas antiguas siguen activas**, volver a validar y ejecutar la restauración con `--apply`. Así la versión nueva no puede registrar operaciones durante el cambio. Si existe trabajo nuevo, el script se detiene: no descartar registros ni forzar una restauración automática.

### Verificación final previa a publicar

- Compilación de producción local, TypeScript, lint y pruebas unitarias: correctos.
- Navegador sobre la aplicación compilada y la réplica: menú operativo oculto en general, visible al seleccionar zona y oculto al regresar; tarjetas de 50 y 90 espacios; captación sin geografía; selector de reportes; móvil sin desbordes; menú del operador intacto.
- Capturas privadas de ensayo en `output/zones-browser/` (excluidas de Git/Vercel).
- Ciclo de alquiler ensayado: libera espacio en la misma zona, reingreso conserva zona/origen, bloquea otra zona y duplicados; tablas de posiciones globales intactas.
- Producción comprobada solo en lectura antes del corte: la copia sigue vigente y el usuario MySQL dispone de permisos para las guardas.
- Se preparará primero la versión de Vercel sin modificar sus dominios. No se ha ejecutado todavía la adaptación en producción.
