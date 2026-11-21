# Textos, extracción documental y cierre de publicación

Actualización del 1 de noviembre de 2026. Base Git: `288e7060b41df8f9eafc2bfa67c102ff186a35b7`. El workspace ya contenía cambios de las entregas del 31 de octubre; se preservaron en el respaldo y se incorporan las fuentes de texto/documentos y colores necesarias para mantener esas funciones.

## Experiencia de uso

El apartado «Completar texto con documentos» presenta tres pasos: documentos, revisar datos e incorporar. Primero permite consultar y seleccionar los archivos, abrir originales y analizar uno o varios. Cada archivo muestra su estado; el análisis individual conserva propuestas de otros archivos. La lectura muestra el archivo y bloque en curso y permite detener al terminar el bloque.

Los resultados se agrupan por campo y muestran fuente, página o celda, selección y valor editable. Los conflictos y las superficies sin clasificar usan ámbar; la baja confianza OCR es visible junto al dato. El azul indica selección o trabajo en curso. El rojo queda para errores y las acciones principales de la marca. Los originales siguen disponibles aunque fallen la lectura o la extracción.

Antes de aplicar, se muestra una vista previa. «Solo el borrador del texto» y «También las áreas de la ficha» son acciones separadas y explican qué queda guardado. La ficha compara valor actual y propuesto. Por defecto se completan marcadores pendientes; reemplazar datos ya escritos requiere activar una opción explícita. El texto conserva su guardado propio.

## Extracción y consistencia

- PDF con texto digital, OCR español local para escaneos, JPG/PNG y Excel XLSX. La opción «Leer también las imágenes de los PDF» fuerza OCR en las páginas analizadas para recuperar tablas escaneadas dentro de páginas con texto digital.
- Áreas techadas/construidas sin identificación explícita de total se presentan como superficie por verificar. Las áreas en páginas con comparables o predio matriz requieren clasificación manual. No se suman pisos ni se elige un valor automáticamente.
- Excel puede proponer también ubicación, distribución, conservación, antigüedad y medidas cuando existen pares literales etiqueta/valor; conserva hoja y celda. No interpreta descripciones libres ni deduce datos personales.
- La incorporación de un área no consume el marcador de un campo contiguo. Los valores existentes se reemplazan solo con opción explícita y la distribución manual se conserva.
- El guardado de áreas mantiene control de concurrencia e historial. El cliente envía la huella del documento analizado; si está presente, el servidor vuelve a leer la fuente y rechaza el cambio si su contenido ya no coincide. Se registra la huella junto al origen.
- La plantilla de casa usa niveles por completar y no afirma que existan piscina, bar, biblioteca u otros ambientes. Los textos guardados anteriormente no se regeneran.

## Cierre de la etapa

Se permite guardar borradores con datos por confirmar. La interfaz y API impiden marcar texto realizado o completar difusión mientras contenga «DATO POR CONFIRMAR», «[COMPLETAR…]» o «[AGREGAR…]».

Los botones distinguen «Guardar avance» de «Completar publicación». Los mensajes explican si quedan acciones pendientes y recuerdan que Portal web tiene su propio proceso. Al reabrir una publicación, se limpia fecha/usuario de confirmación actual y se conserva la fecha anterior en el evento de historial. Completar de nuevo genera la fecha actual. Las publicaciones históricas no se modifican por lote.

Editar texto o precio conserva la etapa y las confirmaciones existentes, conforme a la regla de negocio vigente, y recuerda revisar cartel, redes y Portal web. No se envían cambios a canales externos automáticamente. La difusión de intranet continúa sin exigir expediente documental completo; Portal web conserva sus requisitos.

Texto pendiente utiliza azul, tasación violeta y publicación pendiente rojo suave en bandejas y Cartera; los indicadores del panel y editor siguen los mismos tonos. Verde indica registros completos.

## Límites deliberados

El motor usa extracción por patrones y OCR, con cotejo humano; no garantiza comprensión de cualquier formato. Máximos existentes: 12 MB, 150 páginas, bloques de cuatro páginas, hasta 2000 filas/100 columnas por hoja. Las propuestas se conservan mientras está abierto el editor; no hay expediente de análisis persistente entre sesiones. Cada bloque sigue verificando/descargando el original; no se introduce una caché global de documentos privados. La opción de reemplazo no reescribe una distribución libre manual: esta se edita directamente.

## Respaldo y recuperación

`restore-points/flujo-documentos-20261101/fuentes-previas.tar.gz` conserva app, lib, tests, docs y configuración antes de esta actualización, incluidos cambios locales previos; excluye credenciales, .env, dependencias y base de datos. Extraer en otra carpeta y comparar antes de recuperar. No se requieren cambios de esquema ni migraciones nuevas. Un rollback de código no revierte áreas que se guarden después: consultar `areas_documentales_revisadas` y el historial.

## Verificación y despliegue

- Compilación local y entrega aislada: Next.js/webpack, TypeScript y 63/63 páginas aprobados. La entrega aislada recibió después el ajuste de OCR mixto que conserva las propuestas digitales; su prueba de motor real pasó y el build de Vercel valida la compilación final.
- Once archivos de pruebas de extracción, API, estados, fechas y portal aprobados. Se agregaron regresiones de superficies por piso, reemplazo explícito, campo contiguo, pares de Excel, cierre con marcadores y reapertura de publicación.
- OCR español real sobre PDF generado con texto digital y escaneos: aprobado, incluido forzar OCR y conservar las propuestas digitales. No se usan registros reales para estas pruebas.
- Chromium con componentes reales y APIs simuladas, 375/1440 px: selección de archivos, resultados, análisis individual sin perder otros documentos, vista previa, áreas, borrador, realizado, copia y confirmación parcial/completa aprobados. Capturas en `output/textos-modelos/asistente-revision-375.png`, `asistente-revision-1440.png` y `publicacion-completa-*.png`.
- Empaquetado local aprobado: rutas relativas al entorno de ejecución, worker OCR, WASM, modelo español, canvas nativo y motor PDF.
- ESLint y comprobación de espacios aprobados. El build inicial dentro del sandbox falló en `tsc --showConfig`; la compilación fuera del sandbox terminó correctamente. No se cambiaron variables del proyecto ni datos de negocio para compilar.

La entrega excluye los cambios locales previos de hosting PHP y precio de cierre de la lista. Usa `npm run build -- --webpack` sin los instaladores anteriores, porque no añade columnas ni requiere migraciones. Conserva el cron existente. Despliegue directo de fuentes locales; base Git `288e706`, sin nuevo commit remoto asociado.

Destino verificado por MCP y CLI: `puma19/inmobiliaria-alfarov2`, proyecto `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`, equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. Versión previa `dpl_CA8tFUSZysnHkMh6iw5dLJ65goAf`.

### Publicación final

- Despliegue: `dpl_HLfVo3efcxAYKcWNXG1kZgT7FTJj`, **READY**, entorno producción, fuentes subidas por CLI.
- [Intranet publicada](https://intranet.inmobiliariaalbertoalfaro.com.pe).
- [Versión de Vercel](https://inmobiliaria-alfarov2-aa415rgqc-puma19.vercel.app).
- [Panel del despliegue](https://vercel.com/puma19/inmobiliaria-alfarov2/HLfVo3efcxAYKcWNXG1kZgT7FTJj).
- Build final en Vercel: compilación, TypeScript y 63/63 páginas aprobados, sin instaladores ni migraciones. Primero se creó sin asignar el dominio; se comprobó el formulario de acceso mediante `vercel curl` con la autenticación existente y se promovió esa misma versión.
- La API de Vercel confirmó que el alias de la intranet apunta al despliegue final. Se contrastaron también los hashes de las fuentes publicadas del asistente, API de publicaciones, motor documental y aplicación de propuestas con los archivos locales: coinciden.
- Comprobación del dominio después de promover: `/login` 200 con formulario de la aplicación; `/registrar-textos` y `/registrar-publicaciones` 307; `/api/publicaciones` y `/api/inmuebles/1/texto-documentos` 401 sin sesión.
- Consulta puntual de logs `error`/`fatal` de esta versión, ventana de 15 minutos al 1 de noviembre de 2026 a las 23:01 UTC: sin registros. No sustituye una prueba del flujo autenticado.

No se hicieron escrituras de prueba en inmuebles, archivos o publicaciones de producción, ni se fabricaron usuarios/sesiones para verificar. La prueba visual del editor y sus API corresponde al navegador local con datos simulados; el OCR se ejecutó localmente con documentos generados. El flujo autenticado completo en producción no se certifica en esta entrega.

El código, las pruebas, el MD y los respaldos se conservan localmente. No hay nuevo commit remoto de esta entrega; conservar estas fuentes para que un futuro despliegue desde Git no reemplace las mejoras. La carpeta aislada final usa la configuración sin instaladores descrita arriba; el `vercel.json` original del workspace se conserva sin modificaciones.

