# Tasaciones y textos pendientes por zona

Las carpetas por distrito están en «Tasaciones y textos pendientes». «Registrar tasaciones» conserva su vista de registro anterior.

Cada carpeta reúne los inmuebles de la bandeja, sin duplicar su total, y muestra tasaciones por registrar, negociadas, textos pendientes, listos para publicar y publicados. Al abrirla, los cuatro indicadores cuentan tasaciones por registrar, texto pendiente, listos para publicar y publicados, y las listas muestran solo esa zona. Se conservan precios, propietarios, checklist, textos, edición y confirmación de publicación. Los borradores se conservan al cambiar de carpeta.

«Zona actual» destaca la zona abierta. «Volver a zonas» vuelve a las carpetas y «Ver listado general» muestra toda la bandeja. Los accesos por inmueble y los enlaces a secciones siguen disponibles.

El indicador de tasaciones en cartera abre `/tasaciones-textos-pendientes?zona=<zona>`. Las APIs incluyen distrito para filtrar la bandeja, sin cambiar sus reglas de escritura.

El diseño sigue Visitas pendientes: carpetas con pestaña y animación, contexto de zona destacado en violeta y navegación a zonas/listado general. Las cuatro tarjetas tienen iconos, colores por actividad y acceso a su sección, conservando la zona abierta. Desde las carpetas, una tarjeta abre la sección del listado general.

La tarjeta «Tasaciones pendientes» cuenta las pendientes de registro de `/api/tasaciones`, igual que «Por registrar» en Registrar tasaciones. Estas se incluyen en las carpetas y tienen acceso por inmueble al registro. Las tasaciones ya negociadas mantienen su sección separada y no se suman al contador de pendientes.
