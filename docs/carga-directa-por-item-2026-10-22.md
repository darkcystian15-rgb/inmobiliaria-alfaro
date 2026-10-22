# Carga completa dentro de cada ítem — 22 de octubre de 2026

## Problema y resultado

El explorador admitía arrastrar o seleccionar archivos en cada requisito, pero
trasladaba la revisión de nombres y la confirmación a un formulario común al pie.
El usuario pidió que todo el procedimiento se complete directamente en el ítem,
tanto en venta como en alquiler.

Ahora cada requisito aplicable reúne el selector/arrastre, los nombres editables,
la observación opcional y los botones Subir archivos y Quitar selección.
La categoría se toma del ítem; no se vuelve a seleccionar y no hay formulario
común al final ni salto de desplazamiento hacia él. Se aplica también a los
enlaces antiguos de vendedor/comprador y arrendador/arrendatario.

Una selección pendiente bloquea otras categorías y los cambios de condiciones
hasta subir o quitar esa selección. El mismo ítem permite reemplazar su lote;
un formato rechazado conserva el lote y los nombres previos. Se mantienen los
límites de tamaño, compresión, control de concurrencia y permisos existentes.

Venta conserva sus condiciones: tipo de persona, comprador asignado, renta y
cargas. Alquiler conserva sus categorías específicas. Esta corrección cambia la
ubicación de los controles, sin eliminar las condiciones del expediente.

## Conservación y respaldo

Sin cambios en APIs, esquema, categorías persistidas, enlaces o archivos existentes.
No se requieren migraciones ni reclasificaciones de documentos reales.

Base: `fc04ea524e08006c986543c91ce0ccd2901ec98f`.
Copia privada de los archivos fuente anteriores en
`restore-points/carga-por-item-20261022T053956Z/` con extensión `.bak`, fuera de Git.
El respaldo completo previo de código, base y documentos se mantiene en
`restore-points/informacion-carpetas-20261022T022052Z/`; su fecha y límites constan
en [la entrega del explorador](informacion-inmueble-carpetas-2026-10-22.md).
La base continúa en uso; no se confunden sus conteos históricos con datos actuales.

## Validación y publicación

- 34 archivos unitarios aprobados, TypeScript y ESLint sin errores.
- Compilación Next.js/Webpack aprobada.
- Integración MySQL/HTTPS/navegador aislada: aprobada. Comprueba selector de
  archivo y arrastre dentro del ítem de venta, nombre/observación persistidos,
  categoría correcta, DNI de comprador y arrendador/arrendatario, condiciones,
  formatos rechazados, límite de tamaño y conservación de documentos.
- Venta y alquiler comprobados a 1440 y 375 px, sin errores ni desbordes.
- Despliegue y verificación autenticada de producción: pendientes.

Revisión independiente pendiente; no se atribuye una revisión externa.
