# Diseño compacto y colores de la intranet

Actualización del 25 de octubre de 2026, basada en `e10f151fed225d1df6751854a9fdc15ccca4dce3` y en la [auditoría de diseño](auditoria-diseno-2026-10-25.md).

## Cambios

- Cartera: tarjetas sin el mínimo forzado de 345 px, posiciones vacías compactas y pendientes sin etiquetas duplicadas. Contacto y descripción aparecen una sola vez. El ID completo continúa en el detalle, en un desplegable legible; se mantienen su cálculo, búsqueda e identificación.
- Carpetas: superficies blancas y bordes neutros, conservando iconos y pestañas. Pendientes en ámbar, completados en verde, seguimiento en azul e información en gris. La zona usa un contexto más compacto.
- Panel: bienvenida en una franja, «Pendientes» como único encabezado y una acción por categoría. Se retiran accesos redundantes de bienvenida y el bloque de acciones rápidas; las pantallas siguen accesibles por el menú.
- Navegación: lateral de escritorio de 256 px en lugar de 288 px, con espacio de contenido ajustado al mismo ancho. Menos separadores y lemas, manteniendo usuario, rol y cierre de sesión.
- Ficha: una etiqueta Activo/Histórico, títulos de fases compactos y sin repetir «Preparación del inmueble». La ayuda general del expediente deja de repetirse dentro de cada carpeta; los avisos de bloqueo, cierre y guardado permanecen.
- Portal web: ancho máximo coherente con los listados y columna lateral de requisitos desde 1536 px, para dar espacio al editor y las pestañas en anchos intermedios.

No se cambian APIs, reglas del negocio, permisos, registros ni almacenamiento. No hay migración nueva. Se conserva el comando de compilación de Vercel existente, incluidos sus preparadores idempotentes de esquema; no se ejecutaron manualmente instaladores contra producción para esta entrega.

## Punto de restauración

- Referencia Git: `recovery/diseno-20261025`, sobre el commit base completo indicado arriba.
- Bundle privado: `restore-points/diseno-20261025/anterior.bundle`, verificado con `git bundle verify`.
- SHA-256 del bundle: `ee09cf8b1aa84adbc8994df6ec645b64335db1f7e1ad8a89c59a1b0ff3d30356`.
- Copia del informe previo: `restore-points/diseno-20261025/auditoria-previa.md`.

El bundle y las capturas están excluidos de Git y del despliegue. Es un respaldo de código; no se presenta como una copia nueva de la base de datos o los archivos. Al ser una actualización visual, restaurar el código no requiere restaurar datos.

Para volver al diseño previo, comprobar la etiqueta o el hash y preparar un checkout separado de esa revisión. Revisar los cambios posteriores antes de publicar ese código en el mismo proyecto Vercel. También puede revertirse únicamente el commit funcional de esta entrega si existen cambios posteriores que deban conservarse. No borrar tablas ni restaurar bases completas para revertir esta interfaz.

## Validación

- ESLint completo sin errores ni advertencias.
- 41 archivos de pruebas unitarias aprobados.
- Compilación de producción con Webpack y TypeScript aprobada; 63 rutas generadas. Se empleó una URL MySQL local ficticia para permitir el análisis de rutas, sin conectar a producción ni ejecutar sus consultas.
- Revisión en Chromium de componentes reales renderizados con datos ficticios a 375, 768, 1280 y 1440 px: sin desbordamiento horizontal del contenido. Se incluyeron nombres y direcciones largos, precio por definir, histórico y varios pendientes. Capturas y mediciones privadas en `output/diseno-20261025/`. Se revisó la composición aislada de lateral, contexto de zona, carpetas, tarjetas y lista; no una sesión autenticada con toda la navegación por zona.
- Producción: commit funcional `b1d14bc7d4e3694405a3d9070130d88eb5560185`, despliegue `dpl_A1JfjGUZv6JXWJ7csadzAMqf7g5C`, estado **READY** y entorno **production**, comprobados el 25 de octubre a las 21:22 UTC.
- Dominio https://intranet.inmobiliariaalbertoalfaro.com.pe asignado al despliegue. `/login` y su CSS devuelven 200; el CSS publicado contiene el lateral y margen de contenido de 256 px. Las rutas `/api/portal-web` y `/api/mantenimiento/archivos` devuelven 401 sin autorización.
- Commit y etiqueta de recuperación enviados a `origin/main` y `origin/recovery/diseno-20261025`, respectivamente. [Evidencia de Vercel y HTTP](evidencia-diseno/PRODUCCION.json).
- Versión comprobada: https://inmobiliaria-alfarov2-dk47el9n9-puma19.vercel.app. Los commits documentales posteriores conservan el mismo código funcional.

La revisión visual aislada no sustituye una comprobación autenticada de todos los flujos en producción.
