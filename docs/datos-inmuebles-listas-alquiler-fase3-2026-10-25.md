# Datos de inmuebles, tasaciones de alquiler y FASE 3 Portal web

25 de octubre de 2026.

## Datos de inmuebles

La entrada a los inmuebles de una zona utiliza el diseño de Cartera: lista compacta por defecto, tarjetas con formato de carpeta, buscador y filtros de estado, operación y tipo. Lista y tarjetas comparten componentes con Cartera, manteniendo sus estilos, foco de teclado y adaptación a móvil.

Ambas vistas conservan la etiqueta Activo (o Histórico cuando se consulta ese estado), posición, contacto, operación, tipo, dirección y precio vigente con su moneda. El precio del alquiler conserva la indicación `/ mes`. La consulta existente de inmuebles incorpora el precio registrado mediante lectura de tasaciones, sin cambiar los permisos del operador.

Al pulsar un inmueble se abre directamente su proceso de FASE 1 y FASE 2 en Datos de inmuebles. No se abre el panel de detalle de Cartera. Se conservan los accesos a carpetas, enlaces directos, archivos, permisos, confirmación de cambios sin guardar, recarga y navegación Atrás/Adelante. Volver al listado de la misma zona conserva la búsqueda y vista; cambiar de zona reinicia los filtros para no arrastrar una búsqueda anterior. La actualización de valores se refleja al regresar al listado.

## Nombres de tasación de alquiler

Venta y alquiler comparten los tres nombres:

- Tasación de Inmobiliaria.
- Precio de cierre aceptado por propietario.
- Precio de salida.

Se aplican a registro, consulta, edición, resumen, Cartera y accesos que usan los nombres comunes. El reporte de alquileres usa también Precio de salida para el importe de tasación. Las claves internas, importes, monedas PEN/USD y periodicidad mensual del alquiler se conservan. Los campos del cierre de alquiler (renta mensual acordada, garantía, adelanto y comisión) mantienen su función.

## Menú lateral

Portal web sale de FASE 1 y pasa a una sección FASE 3, inmediatamente después de FASE 2, con Inmuebles por publicar, Publicaciones activas y Portada del sitio. Sus rutas, permisos de administrador, selección de zona en las publicaciones y gestión general de portada se conservan. No se añaden accesos de Portal web para el operador ni se publica ningún anuncio automáticamente.

## Punto de restauración

Revisión previa `681d268c0fe7da174aeea3d5797691e055c2f2fc`.

Referencia de restauración publicada en GitHub: `recovery/datos-listas-alquiler-fase3-20261025`.

Historial completo privado en `restore-points/datos-listas-alquiler-20261025/anterior.bundle`, excluido de Git y de Vercel. `git bundle verify` confirmó el respaldo completo. Para recuperar, abrir ese bundle en otra carpeta y recuperar la revisión previa, o revertir el commit funcional de esta entrega y volver a desplegar. Esta actualización no requiere restauración de datos porque no modifica registros existentes ni introduce cambios de esquema.

## Verificación

- ESLint sin advertencias, TypeScript y compilación Next.js 16.3.8 con webpack aprobados: 62 páginas.
- Los 40 archivos de pruebas unitarias aprobaron; incluyen los nombres compartidos y la conservación de importes mensuales del alquiler.
- Chromium autenticado con MySQL local, administrador/operador, 1440 y 375 px: lista compacta inicial, tarjetas, Activo/Histórico, búsqueda por contacto/dirección/ID completo, filtros, contador, zona correcta, acceso directo a fases sin panel de detalle, carpetas, recarga, Atrás y regreso al listado. Búsqueda conservada dentro de la misma zona y limpia al cambiar de zona.
- Menú lateral comprobado con FASE 1 → FASE 2 → FASE 3 en ese orden, Portal web una sola vez con sus tres submenús, conservación de zona para publicaciones y ausencia de FASE 3 para operador. Capturas de tarjeta móvil y menú FASE 3 inspeccionadas.
- Registro de tasación de alquiler con los tres nuevos nombres, importes y USD guardados correctamente; registros previos con monedas mixtas intactos. El operador consulta los mismos nombres sin botón de edición.
- Integración anterior de Cartera/tasaciones también aprobada en escritorio/móvil: registro, búsquedas, enlaces antiguos, precios, edición, regreso al panel, conservación de monedas, fechas, publicación y etapa, confirmación al cerrar con cambios. Las tarjetas de Cartera siguen abriendo su panel de detalle.
- Sin errores de ejecución ni desbordes. Todas las escrituras de prueba fueron locales y sus inmuebles, zonas, usuarios y sesiones ficticios se retiraron al terminar.

## Publicación

Código funcional `eb917337f355ac9358319e5c957683f6af7a2df4`, subido a `main`. La metadata del despliegue automático de Vercel confirma ese mismo SHA y la rama `main` del repositorio conectado.

Despliegue `dpl_2KP8JsjCsec5uAp5aW4yDXQSWESy`, estado **READY**, entorno **production**, versión https://inmobiliaria-alfarov2-ntbhbf8sr-puma19.vercel.app. El alias confirmado por Vercel es https://intranet.inmobiliariaalbertoalfaro.com.pe.

Verificación HTTP del dominio: `/login` responde 200; Datos de inmuebles, Registrar tasaciones y los tres accesos de Portal web responden 307 a `/login` sin sesión, conforme a sus permisos. La comprobación funcional autenticada se realizó en local; no se crearon usuarios ni registros ficticios ni se publicaron anuncios en producción.

La entrega documental posterior conserva exactamente este código funcional y se publica por la misma integración automática. El punto de restauración se comprobó también mediante su SHA-256. La base local de pruebas quedó detenida.
