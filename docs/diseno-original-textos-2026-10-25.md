# Diseño original y corrección exclusiva de textos duplicados

Instrucción final del usuario: volver al diseño anterior al rediseño y cambiar únicamente la duplicidad de textos. Este documento sustituye como criterio vigente las propuestas de diseño compacto y de recuperación parcial del estilo. Esas entregas se conservan como antecedentes históricos.

## Base restaurada

Referencia `recovery/diseno-20261025`: `e10f151fed225d1df6751854a9fdc15ccca4dce3`. Se recuperan exactamente sus colores, espacios, alturas de tarjetas, anchos de menú, títulos, bienvenida, iconos, carpetas, accesos rápidos y distribución del portal. Se conservan las correcciones de integridad de datos y expedientes cerrados que ya existían en esa revisión.

## Únicas diferencias de interfaz respecto a la base

- Tarjeta de inmueble: operación, tipo y dirección aparecen una sola vez; el ID compuesto se conserva para lectura asistida y sigue disponible en el detalle. Un estado pendiente no se repite si ya aparece en la etiqueta principal. Se conservan las clases, colores y alturas originales.
- Detalle de Cartera: el ID completo, que repite contacto y descripción, queda en un desplegable «ID completo». Se conserva su cálculo y contenido.
- Cabecera de ficha: se conserva Activo/Histórico sin añadir la explicación equivalente «Inmueble en cartera»/«Ficha histórica» al lado.
- Preparación del inmueble: el título permanece en la cabecera de fase; se retira su segunda aparición sobre las carpetas.
- Panel: se conserva «Qué necesita atención» sin la frase equivalente «Tu siguiente acción»; cada tarjeta mantiene su acción específica sin añadir «Abrir carpeta». Bienvenida, descripciones, estados, accesos rápidos y navegación permanecen.

La comparación contra la referencia original debe mostrar diferencias de aplicación solamente en cuatro archivos: el panel, la tarjeta, el detalle de Cartera y la ficha. No se modifican APIs, reglas, permisos, esquema ni datos de negocio.

## Restauración

El bundle privado `restore-points/diseno-20261025/anterior.bundle` y la etiqueta remota `recovery/diseno-20261025` conservan la interfaz original completa. Para recuperar también los textos originales, usar esa referencia o revertir las diferencias textuales de esta entrega. No requiere restaurar base de datos ni eliminar tablas.

## Validación

ESLint completo sin advertencias y compilación Webpack/TypeScript aprobados (63 rutas). Revisión del panel en Chromium con datos ficticios aprobada a 375, 768, 1280 y 1440 px. Se comprobó la presencia de bienvenida, carpetas y cuatro accesos rápidos, y la ausencia de desbordamiento horizontal y errores de navegador. La compilación usa una URL MySQL local ficticia para el análisis de rutas, sin consultas de negocio a producción.

El alcance visual es una vista local de componentes reales con APIs simuladas; no equivale a una prueba autenticada de todos los flujos en producción. El proyecto de publicación es `puma19/inmobiliaria-alfarov2`, dominio https://intranet.inmobiliariaalbertoalfaro.com.pe. El estado del commit publicado se consulta en los checks de GitHub y en Vercel.
