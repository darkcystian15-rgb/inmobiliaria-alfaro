# Búsqueda documental, guardado y colores de Cartera

Entrega del 31 de octubre de 2026 sobre la versión publicada `dpl_7FiQHxS98WFsnRs5qgCMDHKB1Gd6`.

## Cambios

El editor separa el estado de guardar texto/publicación del estado ocupado por análisis documental o revisión de áreas. El bloqueo de botones y navegación se conserva mientras haya una operación en curso, pero **Guardando…** se muestra únicamente durante el guardado de texto/publicación. Al analizar, el botón superior muestra **Buscando…** y el panel presenta **Buscando datos en los documentos…** con el avance por documento y página antes del inventario y los resultados.

El contador de pendientes sigue detectando marcadores reales dentro del texto. Si no quedan, no muestra aviso. Al editar un texto marcado como realizado que aún conserva marcadores, el aviso explica que debe revisar esas partes antes de publicar, en lugar de invitar a completar un borrador después. Los textos guardados no se regeneran ni se borran marcadores automáticamente.

En Cartera, etiquetas de filas, tarjetas y leyenda distinguen las etapas:

| Estado | Color |
| --- | --- |
| Visita pendiente | Ámbar |
| Tasación pendiente / por revisar | Violeta |
| Texto pendiente / seguimiento | Azul |
| Publicación pendiente | Naranja |
| Publicación registrada | Verde |

La paleta se aplica a las vistas de Cartera. Las bandejas de trabajo conservan su diseño específico. No se modifican estados de negocio, precios, reglas de publicación, permisos, base de datos ni hosting PHP.

## Validación

- Componente real en Chromium, 375 y 1440 px, APIs simuladas con respuesta demorada: **Buscando…** y avance encima del texto; ausencia de **Guardando…** durante análisis; botones de guardar bloqueados sin cambiar su etiqueta; **Guardando…** presente durante guardado real simulado.
- Texto realizado sin marcadores: ningún aviso de datos pendientes. Texto realizado con marcador: aviso de revisión, que desaparece inmediatamente al quitar el marcador.
- Filas y tarjetas reales de Cartera: etiquetas de tasación, texto y publicación pendiente con colores correspondientes, fondos distintos y consistentes entre ambas vistas.
- Se conservan las pruebas de análisis por bloques/individual, documentos sin propuestas o con fallo, enlaces al original, revisión de áreas, edición manual, borrador, realizado y copia exacta. Sin errores de página ni desbordamiento horizontal.
- TypeScript independiente y ESLint de archivos afectados: aprobados.
- La prueba de interfaz es local con APIs simuladas; no acredita una sesión autenticada en producción de Doris Moreno u otro inmueble. No se escribieron datos de negocio para comprobar esta entrega.

## Respaldo y restauración

Punto previo: `restore-points/busqueda-estados-colores-20261031T184415Z/`, con copia de los archivos afectados y referencia de producción anterior. El respaldo conserva los cambios locales que ya existían; deben revisarse antes de recuperar archivos completos. El punto completo original sigue en `restore-points/documentos-niveles-20261031T155154Z/` y el ajuste de enlaces en `restore-points/enlaces-documentos-20261031T182227Z/`.

La entrega reutiliza las fuentes aisladas de la versión anterior y modifica únicamente cinco archivos de interfaz. Las diferencias locales previas de precio de cierre se excluyen de la fuente enviada, aunque se conserven en el workspace. No requiere migraciones ni restauración de base. Para recuperar, preferir la versión publicada anterior o extraer y comparar los respaldos en otra carpeta, sin sobrescribir trabajo posterior.

## Publicación

Proyecto `puma19/inmobiliaria-alfarov2`, ID `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`. Dominio: `intranet.inmobiliariaalbertoalfaro.com.pe`. Despliegue final `dpl_kMud4oDLLfddCjZitjsf7zo4gted`, estado **READY**, producción. Vercel compiló el código y TypeScript y confirmó el alias de la intranet asociado a esta versión. [Versión publicada](https://inmobiliaria-alfarov2-n46hkqs25-puma19.vercel.app). Fuentes y documentación conservadas localmente; despliegue directo, sin nuevo commit remoto.
