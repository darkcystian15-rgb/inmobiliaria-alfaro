# Panel de inmueble, moneda única y listados compactos

24 de octubre de 2026. Alcance autorizado: implementación completa de los ajustes acordados, conservación de datos, punto de restauración, Markdown y publicación en Vercel.

## Tasación: una selección de moneda

Registro y editor compartido de tasaciones muestran una sola selección de soles (PEN) o dólares (USD) para los tres importes. El editor se usa desde Información de inmuebles, Cartera y los accesos a precios. Seleccionar una moneda común actualiza las tres monedas del formulario sin convertir ni modificar los números ingresados.

Los registros anteriores con monedas distintas se presentan con su moneda por importe. El selector indica Conservar monedas actuales y permite guardar cambios numéricos sin homogeneizar esas monedas. La elección explícita de PEN/USD aplica la moneda común a los tres importes; cancelar conserva lo guardado. Se mantiene la estructura anterior de borradores y de la API para no perder borradores ni romper clientes anteriores. No se renombra ninguna columna ni se corrigen monedas en lote.

Precio de salida (o renta mensual para alquiler) es el importe comercial que se ajusta para ofrecer el inmueble. Tasación de Inmobiliaria y precio de cierre aceptado conservan sus significados independientes. El precio de anuncios externos, las decisiones del Portal web y los importes de cierre real mantienen sus propios datos.

## Panel completo de Cartera

El detalle del inmueble mantiene identificación, posición, zona, contacto, dirección, tipo, operación, estado, edición de datos, documentación y requisitos de Fase 2, fotografías, ficha, seguimiento/historial, liberación y recuperación de venta suspendida.

La parte superior muestra los tres precios actuales con sus monedas y la fecha de actualización. Actualizar tasación y precios abre directamente el editor correspondiente. Texto y Publicaciones tienen bloques y acciones independientes; se elimina el bloque combinado y el estado de publicación repetido. Liberar inmueble queda al final, separado de las tareas habituales. Se conserva el lenguaje visual de la intranet y las carpetas por zona.

El panel usa diálogo nativo, cabecera y cierre persistentes, desplazamiento interior y distribución adaptable. Cerrar, Escape o navegar desde una edición de datos pendiente requiere descartar expresamente; mientras guarda se bloquean el cierre y los enlaces. Las funciones de edición mantienen sus permisos y reglas anteriores.

La ficha incorpora regreso directo al origen. El regreso a Cartera conserva zona, filtros y `detalle` del inmueble, vuelve a abrir su panel y carga los precios vigentes. Cerrar retira `detalle` para evitar aperturas inesperadas al refrescar. El resumen de un panel abierto también se actualiza al refrescar los datos o recuperar el foco. Los enlaces de precios de las pantallas de texto/publicación consultan la sección de Tasación en lugar de duplicar allí otro editor.

## Bandejas de pendientes

Tasaciones pendientes, Textos pendientes y Publicaciones pendientes comparten filas compactas: posición, contacto, ubicación, operación/tipo, estado y acción. En escritorio hay cabecera de columnas; en móvil el contenido se acomoda sin desplazamiento horizontal. Los botones mantienen área táctil cómoda. La búsqueda, orden por posición, consulta de registrados, filtro por zona y conservación de estados usan las mismas fuentes y reglas anteriores. Se conserva el estilo de carpetas en la navegación por zonas.

## Punto de restauración verificado

Código anterior: `7133f2013b4ad179b66649b4761cce90fbefcdaa`. Directorio privado, excluido de Git: `restore-points/panel-moneda-listados-20261024/`.

- `anterior.bundle`: historial completo y referencia anterior, comprobado con git bundle verify.
- `datos-negocio.aes` y `clave-base64`: instantánea cifrada AES-256-GCM. Captura consistente: `2026-10-24T21:55:05.815Z`.
- `datos-negocio.json.gz`: recuperación privada comprimida y descifrada. Se verificaron descifrado, descompresión, tamaño, hash y conteos de las 27 tablas.
- `manifest.json`: tablas y conteos. SHA-256 del JSON original: `1f9141d2bb79e82452c3d12714f6046c5a42dad032e49424319ca071522b5193`.
- `huella-anterior.json`: hash de valores y conteos de las 27 tablas de negocio, `83948ced7079e97d9ce4fa2e49d49e156e41cf9a6b962f3dbdd5c8c8f03577d1`.

Los archivos de datos y la clave tienen permisos privados. La copia incluye esquemas y referencias a los archivos; sus bytes físicos no se modifican en esta entrega. Excluye tablas de autenticación y secretos. El respaldo se obtuvo en una versión privada de Vercel con --skip-domain, sin reasignar la intranet.

Para recuperar código, extraer/verificar la referencia del bundle en otra carpeta o revertir los commits de esta entrega. No hace falta restaurar datos ni eliminar columnas. Para recuperar datos, revisar primero la actividad posterior al respaldo y restaurar solo las filas/columnas que correspondan; no sobrescribir escrituras posteriores con toda la instantánea. Mantener los archivos físicos existentes.

## Verificación y publicación

- 40 archivos unitarios aprobados, incluidos moneda común, importes sin conversión y conservación de registros mixtos.
- ESLint sin advertencias, TypeScript aprobado y compilación local Next.js webpack aprobada (61 páginas).
- Integración de compatibilidad de monedas aprobada: API anterior, importes mixtos, PATCH parcial, permisos y conservación de anuncios sin tareas automáticas.
- Integración específica con Chromium local en 1440/375 px aprobada: tres bandejas compactas; una selección al registrar; edición de un importe sin cambiar monedas mixtas; elección explícita de moneda común; conservación de textos, confirmaciones, enlaces, fechas y etapa; precios visibles; apertura del editor; regreso automático al mismo panel con precio actualizado; cierre con cambios pendientes y eliminación del parámetro de detalle al cerrar. Capturas de panel y listados inspeccionadas; sin errores ni desbordes.
- Regresión de texto/difusión con HTTP y Chromium local aprobada: borradores, texto realizado, tres combinaciones de medios, confirmaciones parciales, referencias opcionales, edición sin reiniciar publicación, bandejas/contadores, permisos y enlaces anteriores.
- Las escrituras de prueba son exclusivamente ficticias y locales; se retiran sus datos al terminar.

## Producción

Código funcional `e61d212`, despliegue `dpl_4GxyVqhUWjAtASEHT6oLGfbkQqV4`, READY en production. Versión https://inmobiliaria-alfarov2-herdv4lle-puma19.vercel.app. La lista de alias confirmó que el dominio https://intranet.inmobiliariaalbertoalfaro.com.pe apunta a esta versión.

Comprobación autenticada a las 22:15:53 UTC: diez vistas entre escritorio 1440 px y móvil 375 px. Se verificaron las tres bandejas, los tres importes superiores frente a la API, los bloques separados, documentación, seguimiento/historial, liberación, el editor con una sola moneda, cancelación sin guardar, regreso automático al mismo panel y cierre retirando el detalle. El registro de tasación también mostró un solo selector. Administrador consultó y operador mantuvo acceso a la ficha y rechazo 403 de la API de Cartera. Sin errores de ejecución; los métodos de escritura estaban bloqueados en el navegador y no hubo intentos de escritura de negocio.

Evidencia privada: `output/panel-prices/production-summary.json`, logs y archivos del directorio de restauración. La sesión técnica y el respaldo se prepararon en versiones privadas sin reasignar el dominio de la intranet.

Las dos cuentas técnicas y sus sesiones se retiraron a las 22:16:49 UTC; los tokens posteriores devolvieron 401. La comparación de las 22:16:50 UTC mantiene exactamente la huella inicial de las 27 tablas: `83948ced7079e97d9ce4fa2e49d49e156e41cf9a6b962f3dbdd5c8c8f03577d1`. Se conservaron todos los valores y conteos de negocio. Los datos y el contenedor de pruebas locales quedaron retirados/detenidos. El respaldo cifrado y su código anterior permanecen disponibles en el directorio privado documentado.
