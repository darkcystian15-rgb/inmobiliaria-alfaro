# Tasaciones sin moneda ni importes de ejemplo

26 de octubre de 2026.

Las tasaciones nuevas abren con «Seleccionar moneda» y los tres importes vacíos, sin cantidades de ejemplo ni símbolo S/ predeterminado. Se exige elegir soles o dólares antes de registrar; los símbolos de los tres campos aparecen al seleccionar la moneda. No se adopta silenciosamente la moneda de la ficha.

La edición de tasaciones existentes conserva los importes y monedas guardados, incluida la opción de conservar monedas distintas de registros anteriores. La recuperación voluntaria de borradores conserva los datos escritos por el usuario. No se borran importes existentes ni se cambia el registro inicial del inmueble.

## Restauración

Revisión anterior: `8615d402d3f35e7438a6e919a6433dc2f0bc1c18`. Bundle completo verificado en `restore-points/tasaciones-sin-valores-defecto-20261026/anterior.bundle`, excluido de Git y Vercel. Para volver al comportamiento anterior, revertir el commit funcional de esta entrega y desplegar. No requiere migraciones ni restaurar datos.

## Verificación y publicación

Pruebas existentes de precios, moneda del inmueble y selección de moneda de tasación aprobadas. ESLint de los dos componentes modificados sin errores. Compilación y estado de Vercel se registran al finalizar.
