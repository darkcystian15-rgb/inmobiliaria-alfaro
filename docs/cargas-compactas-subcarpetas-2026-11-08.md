# Cargas compactas y navegación de subcarpetas

## Objetivo
Reducir texto repetido y contenedores dentro de contenedores, conservando el estilo existente y la información necesaria para cargar archivos.

## Cambios
- Carga compartida: botón «Seleccionar archivos», arrastre y límite de tamaño siempre visible. Formatos e instrucciones en «Formatos y ayuda», accesible con teclado y en móvil.
- Expediente: 4 MB por documento habitual y 50 MB para copia literal, tomados de la configuración real.
- Fotografías: 25 MB por imagen original y 20 fotos por carga visibles.
- Documentos de publicación y portadas: límites de 12 MB y 4 MB visibles; formatos desplegables.
- Saneamiento: menos marcos internos, tarjetas de archivos con menos separación y acciones secundarias agrupadas.
- Crear una subcarpeta abre directamente su contenido. Crear y renombrar mantienen un solo campo de nombre.
- Se conservan validaciones, descripciones obligatorias, restricciones por permisos y las reglas documentales.

## Alcance del despliegue
Se publica el árbol de trabajo actual del proyecto ya vinculado `inmobiliaria-alfarov2`, conservando los cambios anteriores presentes en el repositorio. Esta actualización no crea migraciones ni cambia límites de subida.

## Verificación
- TypeScript y ESLint de los cinco componentes: correctos.
- Pruebas de saneamiento y expediente: correctas.
- Navegador con API simulada en 375 y 1440 px: crear, abrir, subir, descripción obligatoria, mover, renombrar y solo lectura correctos; sin desbordamiento horizontal.
- Compilación local con Webpack: código y TypeScript compilan; la recolección de rutas queda bloqueada por una URL de base de datos local inválida. Turbopack encuentra restricciones de red/puertos del entorno.
- La compilación y publicación de producción se verifican en Vercel con su configuración de entorno.

## Despliegue confirmado
- Vercel: `dpl_75x8V4GYKL9R91mRgigvALDpMVP9`, estado `READY`, entorno producción.
- URL: https://inmobiliaria-alfarov2-umber.vercel.app
- Compilación de producción completa en Vercel.
- Comprobación HTTP: 200 y pantalla de inicio de sesión de la aplicación.
- La verificación funcional de archivos se realizó con API simulada, sin cargar documentos de prueba en producción.

## Corrección de visibilidad del tamaño máximo
El límite de saneamiento se muestra también junto al botón Subir archivos cuando la carga está cerrada. El componente compartido destaca el límite en una etiqueta con fondo y mayor contraste. Los límites reales no cambian.

Corrección desplegada: `dpl_C38GjMANZF33aJ9vxxxFkAi7RG9S`, producción `READY`. TypeScript, ESLint y compilación en Vercel correctos. Dominio confirmado: https://intranet.inmobiliariaalbertoalfaro.com.pe
