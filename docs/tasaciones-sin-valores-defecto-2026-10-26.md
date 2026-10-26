# Tasaciones sin moneda ni importes de ejemplo

26 de octubre de 2026.

Las tasaciones nuevas abren con «Seleccionar moneda» y los tres importes vacíos, sin cantidades de ejemplo ni símbolo S/ predeterminado. Se exige elegir soles o dólares antes de registrar; los símbolos de los tres campos aparecen al seleccionar la moneda. No se adopta silenciosamente la moneda de la ficha.

La edición de tasaciones existentes conserva los importes y monedas guardados, incluida la opción de conservar monedas distintas de registros anteriores. La recuperación voluntaria de borradores conserva los datos escritos por el usuario. No se borran importes existentes ni se cambia el registro inicial del inmueble.

## Restauración

Revisión anterior: `8615d402d3f35e7438a6e919a6433dc2f0bc1c18`. Bundle completo verificado en `restore-points/tasaciones-sin-valores-defecto-20261026/anterior.bundle`, excluido de Git y Vercel. Para volver al comportamiento anterior, revertir el commit funcional de esta entrega y desplegar. No requiere migraciones ni restaurar datos.

## Verificación y publicación

Pruebas existentes de precios, moneda del inmueble y selección de moneda de tasación aprobadas. ESLint de los dos componentes modificados sin errores. Compilación Next.js 16.3.8 con webpack y TypeScript aprobada, 63 páginas, usando una URL local de prueba válida sin conexión a producción. No se realizó una prueba autenticada de registro.

Commit funcional `ecb9fd49ce6e8857cde1b1bae88c584d26cd7b25`, publicado en `main`. Vercel confirmó ese SHA, entorno **production**, despliegue `dpl_5ufrWNKzJM76jVNUpicihE5Sx8Mz`, estado **READY** y alias https://intranet.inmobiliariaalbertoalfaro.com.pe. Versión: https://inmobiliaria-alfarov2-juueruac5-puma19.vercel.app.

SHA-256 del bundle de restauración: `b3691a9e2838de75c3aad006e9d788f4e1f7fc12a228d1a8f51260fcaf2a4837`.

La actualización documental posterior conserva el mismo código funcional.
