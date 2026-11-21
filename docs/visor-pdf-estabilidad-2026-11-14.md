# Estabilidad del cuadro de PDF

Se estabiliza la geometría del visor: alto fijo del área de páginas, espacio reservado para el estado de carga, espacio estable de barras de desplazamiento en el visor y el diálogo, canvas en bloque y ancho observado redondeado a píxeles enteros. Se ignoran mediciones de ancho que no cambian. Esto elimina dependencias de tamaño entre el dibujo y el espacio que lo contiene.

La prueba existente se amplía para compilar los estilos reales y observar 60 fotogramas sin interacción; comprueba que las coordenadas y dimensiones se estabilizan y que no se repite el redimensionado del canvas. Se verifica en 375/1440 px de ancho y 650/900 px de alto, junto con páginas, zoom, contenido real del PDF y edición del archivo. TypeScript y diff-check correctos. El temblor informado por el usuario no se reprodujo automáticamente antes del ajuste; las pruebas posteriores verifican la estabilidad bajo los tamaños indicados.

Publicado: producción READY, despliegue dpl_HdJEQgvNsFsAzeb5vzzznEcPzCAZ, https://inmobiliaria-alfarov2-koox9mgrj-puma19.vercel.app. Promoción completada al dominio de intranet. Compilación y TypeScript remotos correctos.
