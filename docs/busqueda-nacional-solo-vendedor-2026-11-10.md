# Búsqueda nacional solo para el vendedor

Regla final solicitada para venta, punto 4. Impuestos y constancias:

- Comprador: búsqueda nacional no aplica para persona natural ni jurídica, esté asignado o no. No se muestra como requisito ni como carga disponible; no cuenta en avance ni bloquea el cierre.
- Vendedor: aplica tanto a persona natural como jurídica cuando selecciona No paga impuesto a la renta. Se mantiene la condición de renta existente: con Si paga o pendiente no se solicita.
- Con No paga se adjuntan exoneración y búsqueda nacional por separado. Las notas y enlaces anteriores no sustituyen el archivo requerido.
- Los archivos y notas existentes se conservan. Los adjuntos que dejan de aplicar se consultan en Documentos anteriores, sin convertirse en requisitos.
- Alquiler conserva sus documentos propios. No se requiere migración.

Esta regla reemplaza las versiones anteriores que habilitaban búsqueda para comprador natural o jurídico o excluían al vendedor natural.

## Verificación

Tres suites de expediente, carpetas y documentos adicionales correctas. Matriz de comprador asignado/no asignado y persona sin seleccionar/natural/jurídica: búsqueda no aplicable y sin bloqueo de cierre. Matriz de vendedor natural/jurídico y renta pendiente/paga/no paga: búsqueda aplicable únicamente con No paga. Archivos previos conservados.

Navegador de FASE 2 con API simulada: correcto en 375 y 1440 px, incluidos los cambios de tipo del comprador y el vendedor natural con No paga. TypeScript y ESLint correctos. Sin escrituras de prueba en expedientes reales.

## Publicación

Producción Next.js, inmobiliaria-alfarov2, equipo team_qcKFQOeqeLWTJFsCLGnZvPiL. Despliegue dpl_2WT2QGQ2cPeu5JB9aX2UvvVwPZfg, estado READY; URL https://inmobiliaria-alfarov2-h2ydw8gfr-puma19.vercel.app. Compilación de Vercel completada en 43 s. Preparado con --prod --skip-domain; GET del expediente respondió HTTP 401 y JSON de inicio de sesión esperado; promovido a https://intranet.inmobiliariaalbertoalfaro.com.pe. Fuente local del proyecto sobre base Git 288e7060b41df8f9eafc2bfa67c102ff186a35b7, sin commit nuevo ni migración.
