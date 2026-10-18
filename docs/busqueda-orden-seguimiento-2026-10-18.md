# Búsqueda automática y orden por posición — 18 de octubre de 2026

Actualización posterior: [ID por posición y filtros limitados](id-posicion-filtros-2026-10-18.md). La descripción siguiente conserva evidencia histórica; el criterio vigente excluye código anterior, número interno, zona y posición independiente de los campos de búsqueda.

## Comportamiento

Se unifica la búsqueda de inmuebles y el orden de las cuatro pantallas solicitadas: Registrar visitas, Visitas pendientes, Registrar tasaciones y Tasaciones y textos pendientes.

- Orden por **número de posición ascendente**, no por fecha de registro, contacto, número global del ID ni orden de respuesta de la API. La posición 2 precede a la 10, aunque llegue como texto `02`. Las posiciones ausentes se muestran al final; los empates se resuelven por zona e identidad de forma estable.
- Campo visible **Buscar inmueble**, también en móvil, sin botón Buscar: los resultados cambian al escribir por contacto, dirección referencial, identificador visible/código anterior, posición y otros campos de identidad ya mostrados.
- Búsqueda sin distinción de mayúsculas, tildes o puntuación. Varias palabras se combinan: `Campos Meiggs` debe coincidir con ambas. Se equiparan `Av.`/`Avenida` y la variante `Meigss` con `Meiggs`, sin cambiar la dirección guardada ni corregir nombres automáticamente.
- Ejemplos: `Campos` devuelve contactos que contienen Campos; `av meiggs` encuentra las direcciones correspondientes, incluidas las escritas como Av. Meigss.
- Contador de resultados y botón **Limpiar búsqueda**. No se solicitan de nuevo los listados al escribir: se filtra la consulta cargada. Sin coincidencias se indica búsqueda sin resultados, sin dar por realizadas las actividades.
- Se conserva el filtro de antigüedad de Visitas pendientes y se combina con la búsqueda. La bandeja de tasaciones aplica el mismo criterio a pendientes, negociadas, material/textos, listos y publicados, con conteo de inmuebles sin duplicarlos entre grupos.
- Los enlaces que abren un inmueble concreto mantienen ese alcance. Los formularios conservan sus estados por ID: fecha, importes, observaciones y borradores no se descartan al ocultar resultados y volver a mostrarlos. Los botones de guardar conservan sus validaciones y acciones existentes.
- Registrar tasaciones desde la bandeja conserva la zona y el contexto de navegación. Los totales generales no se confunden con el número de resultados de una búsqueda.

## Implementación y alcance

`lib/property-task-list.mjs` concentra comparación de posiciones y coincidencias; `app/components/PropertyTaskSearch.tsx` comparte campo, contador y limpieza. Las cuatro páginas usan ese mismo comportamiento. No se modifica la API, el esquema ni los datos de inmuebles. No se ejecutan migraciones ni cargas de Drive.

Respaldo privado de fuente e historial: `restore-points/busqueda-seguimiento-20261018/`, commit anterior `da08b9f0a68d7227561ac4291b8885c5111888ba`, con fuente, bundle Git y hashes. No hace falta nueva copia de negocio por un cambio de interfaz. Para volver, revisar cambios posteriores y revertir el código de forma revisada; no restaurar una base de datos.

## Validación

- `tests/property-task-list.test.mjs`: orden numérico e inmutabilidad, posiciones vacías, empates entre zonas, contacto y dirección, tildes, puntuación, Meiggs/Meigss, ID visible/código anterior y posición con cero inicial.
- 28 archivos de pruebas unitarias correctos, ESLint sin advertencias y compilación final Webpack/TypeScript completa con salida correcta. Un intento anterior completó las fases de compilación pero terminó con señal 143; se repitió y la ejecución final terminó con código 0.
- `tests/task-search.integration.mjs`: MySQL local desechable para autenticación y respuestas ficticias de las bandejas, desordenadas intencionadamente. Navegador sobre las cuatro páginas: posición 2 antes de 10, Campos y Meiggs, cinco grupos de la bandeja, sin coincidencias, limpieza, antigüedad, conservación de fecha/importe/borrador al filtrar, enlace a inmueble concreto, contador y ausencia de nuevas consultas al escribir. Escritorio y móvil de 375 px sin errores JavaScript ni desbordamiento horizontal. Las pruebas no registran visitas, tasaciones ni publicaciones.
- Capturas locales privadas en `output/task-search-local/`, excluidas de Git y Vercel. Los datos ficticios solo existen en el MySQL desechable.

## Publicación y comprobación real

- Código publicado: `0af8642c2381d0b91ebc40d6a33b921793e27615`, subido atómicamente a `main` y `feat/registro-simplificado`.
- Vercel informó a GitHub `success`, «Deployment has completed», Production `7156330817`, el `2026-10-18T15:02:34Z`.
- URL de versión: https://inmobiliaria-alfarov2-piwcrwn2w-puma19.vercel.app.
- Preview `7156335949` también completado: https://inmobiliaria-alfarov2-pvup0s1bx-puma19.vercel.app.
- Comprobación autenticada real el `2026-10-18T15:08:15.116Z` en los cuatro apartados de Chimbote y Nuevo Chimbote. Se contrastó cada respuesta real con los contactos y el orden mostrado, Campos, Av. Meiggs, ausencia de coincidencias, limpieza y móvil sin desbordes ni errores JavaScript.
- Datos consultados en esa comprobación: Chimbote tenía 37 visitas pendientes y seis tasaciones por registrar; Nuevo Chimbote tenía 68 visitas pendientes y ninguna tasación por registrar. Es actividad vigente del usuario, no una regresión de la carga: no se restablecieron etapas ni registros. Las fases de negociadas/material/listos/publicados vacías en esa consulta conservaron su estado; los cinco grupos con contenido se probaron con las respuestas ficticias locales descritas arriba.
- Sin escrituras de negocio. El comprobador intercepta y bloquea cualquier intento de escritura en visitas/tasaciones/publicaciones. Cuentas y sesiones temporales eliminadas y ausencia comprobada.
- Resultado y capturas privados: `output/task-search-production/` y `output/task-search-production-smoke.mjs`, excluidos de Git y Vercel. Contenedor y volumen MySQL desechables retirados.
- Los commits posteriores de evidencia solo modifican Markdown; no cambian el código publicado ni los datos.
