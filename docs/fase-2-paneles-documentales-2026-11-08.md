# Fase 2: paneles documentales uniformes

## Objetivo y alcance
Extender la presentación de DNI y poderes al resto del expediente: documentos del inmueble, contratos, impuestos, servicios, saneamiento, tasaciones, planos y catálogo. Se aplica a todos los inmuebles; las carpetas disponibles dependen de venta o alquiler.

## Cambios
- Bloques de documentos con fondo blanco y borde rojo suave. El bloque con archivos seleccionados se destaca con mayor intensidad.
- Carga compacta con tamaño máximo siempre visible y formatos en ayuda desplegable.
- Archivos con Ver y Descargar visibles. Edición, eliminación y movimiento quedan en Más acciones, respetando permisos.
- Otros documentos y observaciones opcionales quedan plegados. Las descripciones obligatorias siguen apareciendo al seleccionar archivos adicionales.
- Se elimina la explicación general repetida del expediente al entrar en cada carpeta.
- Impuestos presenta primero las condiciones de renta. Formulario y voucher se muestran al elegir Paga. Exoneración y búsqueda nacional se muestran al elegir No paga. Los demás documentos municipales y del comprador conservan sus reglas.
- Los archivos que dejan de corresponder a las condiciones elegidas se muestran en Documentos anteriores, plegado, sin borrarlos ni habilitar cargas en categorías inactivas.
- Planos y catálogo conservan su activación y guardado previo a las cargas.
- Saneamiento mantiene el explorador, las subcarpetas y los movimientos; adopta bordes suaves y agrupa archivos anteriores si se desactiva.
- Las reglas documentales, requisitos de cierre, límites de archivo y permisos no cambian. La visibilidad de campos se ajusta a las condiciones existentes, sin crear preguntas nuevas en carpetas que no las necesitan.

## Verificación
TypeScript, ESLint y pruebas de reglas de expediente, documentos adicionales y carpetas. Navegador con API simulada en móvil (375 px) y escritorio (1440 px): carga y selección de archivos, límite de 50 MB para copia literal y 4 MB en documentos habituales, campos obligatorios, condiciones de impuestos, conservación de archivos anteriores, activación de planos/catálogo, venta/alquiler y solo lectura. Regresión de DNI/poderes y saneamiento. Sin escrituras de prueba en producción.

El despliegue se realiza sobre el árbol de trabajo actual del proyecto vinculado, conservando los cambios anteriores del repositorio.

## Resultados
- TypeScript, ESLint y revisión de espacios: correctos.
- Pruebas de reglas documentales, documentos adicionales y carpetas: correctas.
- Navegador de fase 2: correcto en 375 y 1440 px, incluida una carga completa con API simulada.
- Regresión de DNI/poderes y saneamiento: correcta en ambos tamaños.
- Revisión visual de impuestos en móvil: bloques legibles y límites visibles.

## Despliegue
- Vercel producción: `dpl_GLursCSFwnowUtXYujq1nKnCGW6A`, estado `READY`.
- Compilación de producción correcta y dominio asignado: https://intranet.inmobiliariaalbertoalfaro.com.pe
- Comprobación del acceso de producción realizada sin iniciar sesión ni cargar archivos reales.
