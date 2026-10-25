# Auditoría de diseño de la intranet

Fecha: 25 de octubre de 2026. Código revisado: `e10f151`.

Alcance: colores, aprovechamiento del espacio, jerarquía visual y texto redundante. Revisión de los componentes y estilos actuales; no se realizó una inspección autenticada en navegador. Los hallazgos describen lo comprobado en el código y propuestas de diseño. No certifican contraste global, ausencia de desbordes ni comportamiento visual de todos los tamaños. No se modificaron pantallas, reglas ni datos.

## Hallazgos y prioridad

### 1. Tarjetas con demasiada altura mínima — alta

`PortfolioPropertyCard.tsx:26` impone 345 px antes de sumar acciones adicionales. Reserva además altura para el nombre y los estados, aunque el contenido sea corto. Las posiciones vacías de Cartera usan el mismo mínimo.

Efecto previsto: pocos inmuebles por pantalla y mucho desplazamiento, especialmente en móvil y en posiciones disponibles.

Propuesta: altura determinada por el contenido, menos espacio entre identidad, estado y precio; posiciones vacías compactas. Mantener botones de 44 px y la lista compacta como vista inicial. Validar en navegador que las filas de tarjetas conserven orden visual.

### 2. Amarillo decorativo y amarillo de advertencia — alta

`ZoneFolderCard.tsx:13`, `PortfolioPropertyCard.tsx:24` y `StatusBadge.tsx:6` emplean tonos ámbar tanto en carpetas normales como en pendientes. `ZoneContext.tsx:4` también permite rojo, violeta o ámbar para el mismo tipo de contexto.

Efecto previsto: el color distingue menos claramente qué necesita atención.

Propuesta: conservar el icono y la pestaña de carpeta; usar superficie blanca y borde neutro. Concentrar el ámbar en pendientes, verde en completados, azul en proceso y gris en información. Usar rojo de marca en selección y acción principal; acompañar cualquier acción destructiva de su etiqueta explícita.

### 3. Identidad del inmueble repetida — alta

`PortfolioPropertyCard.tsx:35–37` muestra contacto, operación/tipo/dirección y después el ID compuesto, que vuelve a incluir operación, tipo y dirección. `PortfolioDetailPanel.tsx:46` muestra también el ID con contacto debajo de esos mismos datos.

Propuesta: en la vista resumida, contacto como título, operación/tipo/dirección una sola vez y posición como distintivo. Mantener acceso al ID completo en el detalle o mediante una acción de copiar; preservar el identificador y la búsqueda existentes. Esto es una propuesta visual, no un cambio de identificación del sistema.

### 4. Demasiados encabezados antes del trabajo — alta

En `PropertyInformation.tsx:240–251`, cada fase combina un título de 24/30 px, subtítulo, panel de resumen y otro panel de accesos. «Preparación del inmueble» aparece en el encabezado y en el panel de carpetas. El lateral también contiene títulos FASE 1/2/3 de tamaño destacado.

Propuesta: conservar la organización por fases y reducir su peso tipográfico. Un encabezado por fase, resumen compacto y accesos inmediatamente debajo. No renombrar ni reordenar las fases como parte de este ajuste visual.

### 5. Panel de inicio con accesos y mensajes repetidos — media

`app/(privado)/(administracion)/page.tsx:76–114` enlaza a Cartera desde el encabezado, la bienvenida y las acciones rápidas. Reportes también se repite. «Tu siguiente acción», «Qué necesita atención» y «Hay tareas por atender» reiteran la misma idea; cada tarjeta añade «Abrir carpeta», el estado y otra llamada a abrir.

Propuesta: bienvenida en una franja breve, bloque «Pendientes» y una sola llamada por tarjeta. Conservar accesos repetidos solo cuando su ubicación tenga una utilidad comprobable; retirar el bloque de acciones rápidas si duplica enteramente la navegación disponible.

### 6. Lateral con demasiado contenido secundario — media

`Sidebar.tsx` fija 288 px en escritorio. El bloque del logo añade separador, «INTRANET» y «Gestión inmobiliaria». El bloque del usuario añade «Cartera, seguimiento y pendientes en un solo lugar». Cada enlace combina un icono de 32 px de contenedor y relleno vertical.

Propuesta: retirar el lema inferior, compactar la cabecera y los separadores entre grupos. Probar un ancho de 256–272 px con los nombres más largos antes de adoptarlo. Mantener usuario, rol, salida y etiquetas de navegación legibles.

### 7. Estado activo explicado dos veces — media

`PropertyInformation.tsx:231` combina «Inmueble en cartera» con «Activo», o «Ficha histórica» con «Histórico».

Propuesta: mostrar una sola etiqueta de estado. La cabecera debe priorizar contacto, ubicación, posición y precio.

### 8. Ayuda general repetida dentro del expediente — media

`TransactionDossier.tsx:193` muestra la descripción general del expediente incluso dentro de una carpeta concreta. Las vistas de estado incluyen condiciones de cierre, avance general, resumen por sección y listado de pendientes.

Propuesta: descripción general solo al entrar al expediente; ayuda específica junto al campo que la necesita. Un resumen principal y detalle desplegable por sección. Mantener visibles los avisos de expediente protegido, condiciones sin guardar, requisitos para cerrar y errores: no son texto prescindible.

### 9. Tipografía secundaria demasiado tenue en el detalle — media

`PortfolioDetailPanel.tsx:46` utiliza `text-slate-400` para un ID completo sobre blanco. Es un dato extenso y de lectura poco cómoda en ese tratamiento.

Propuesta: si se mantiene visible, usar al menos el tono secundario habitual `slate-600`, tamaño legible y ajuste de línea. Medir el contraste efectivo en navegador antes de afirmar cumplimiento de accesibilidad.

### 10. Espaciado y ancho cambian entre módulos — media

El panel y la ficha usan contenedores de hasta 1500 px; Registro usa `max-w-5xl`; el listado de Portal web no define un ancho máximo equivalente. El editor del portal añade una columna fija de 300 px desde `xl` y seis pestañas que pueden ocupar varias líneas (`PortalWebWorkspace.tsx:55`).

Propuesta: establecer tres usos consistentes: listados amplios, formularios de lectura moderada y editores con ayuda lateral cuando quepa. Unificar márgenes externos y separaciones entre secciones. En el portal, comprobar el ancho disponible descontando los 288 px del lateral; adaptar las pestañas y la columna de requisitos al espacio real. No se ha comprobado un desborde actual.

## Textos concretos para simplificar

| Actual | Propuesta |
| --- | --- |
| Tu siguiente acción / Qué necesita atención / Hay tareas por atender | Pendientes, con contador |
| Abrir carpeta + Revisar visitas → en la misma tarjeta | Revisar visitas → |
| Inmueble en cartera + Activo | Activo |
| Ficha histórica + Histórico | Histórico |
| Mostrando X de Y inmuebles de la zona · Ordenados por posición, activos primero | X de Y inmuebles; orden junto al control correspondiente o en ayuda |
| Cartera, seguimiento y pendientes en un solo lugar | Retirar del pie del lateral |

No acortar etiquetas que perderían su significado fuera de contexto. Conservar las explicaciones de permisos, guardado, cierre, autorización pública y eliminación.

## Criterio visual recomendado

- Fondo de trabajo gris muy claro, paneles blancos y bordes discretos.
- Texto principal oscuro; texto secundario con contraste suficiente.
- Color concentrado en acciones y estados, acompañado de palabras o iconos.
- Una identidad, un estado y una acción principal por resumen de inmueble.
- Separación exterior mayor que la separación entre elementos de una misma sección.
- Mantener los nombres de menú, la metáfora de carpetas y el orden funcional actual.

## Orden sugerido de ajustes y verificación

Primero compactar tarjetas y eliminar duplicación de identidad y encabezados. Después unificar colores y simplificar panel/lateral. Por último ajustar formularios, ayuda y pestañas del portal.

Antes de publicar cambios, comparar las mismas pantallas con datos representativos en 375, 768, 1280 y 1440 px: contactos y direcciones largos, precios sin registrar, muchos pendientes y expediente cerrado. Verificar que la primera lista o acción aparezca antes, que no se oculten datos necesarios, que las acciones sigan siendo cómodas y que no haya desplazamiento horizontal de la página. No se ejecutaron pruebas de aplicación porque esta entrega solo añade el informe.
