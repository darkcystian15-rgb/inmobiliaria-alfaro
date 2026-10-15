> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Diseño de los submenús

Punto de restauración previo: `recuperacion-antes-diseno-submenus-20261011`, commit `d0cadb3`. Copia ZIP: `output/recuperacion-cartera/antes-diseno-submenus.zip` en el espacio de trabajo.

- Documentación: categorías como carpetas azules con contadores, vista general, búsqueda y estado vacío. Se mantienen apertura, descarga, eliminación y formulario de subida. La categoría se reinicia al cambiar de inmueble. Categorías adicionales existentes siguen visibles.
- Contratos: contadores y filtros por los estados entregados por la API, búsqueda, filas con icono de documento y renovaciones/reingresos con sus confirmaciones actuales. Se conserva el apartado sin fecha de fin; los contadores no dependen de la búsqueda.
- Reportes: tarjetas de informe con icono de archivo y categoría visible. Se mantienen selección, filtros, tablas y exportación.
- Registrar visitas y tasaciones: acentos ámbar y violeta acordes con sus bandejas, sin añadir pasos ni cambiar datos o reglas de guardado.
- Liberar inmueble: acción de salida destacada y mejor separación del listado, con búsqueda y confirmaciones conservadas.

Restauración de código: crear una nueva rama desde la etiqueta o revertir el commit de este diseño en main. La etiqueta y el ZIP contienen el código anterior; los cambios son de interfaz y no migran ni modifican registros de la base de datos.
