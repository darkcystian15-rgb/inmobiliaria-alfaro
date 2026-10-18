# Orden del menú de Seguimiento — 18 de octubre de 2026

## Restauración del acceso por zona

Por indicación del usuario, Visitas pendientes y Tasaciones y textos pendientes vuelven a ocultarse en el menú hasta seleccionar una zona, junto con las otras cuatro opciones de Seguimiento. Se restaura el orden de trabajo: Cartera → elegir zona → consultar pendientes o registrar la actividad. El cambio se aplica al menú compartido de escritorio y móvil; los enlaces mantienen la zona seleccionada. No modifica registros, fechas límite, búsqueda ni permisos. Las vistas generales existentes conservan sus rutas para los enlaces de resumen del panel.

Al entrar en una zona activa, el menú de administración presenta:

- **Operación:** Cartera de inmuebles.
- **Seguimiento**, en este orden:
  1. Registrar inmueble.
  2. Liberar inmueble.
  3. Visitas pendientes.
  4. Registrar visitas.
  5. Tasaciones y textos pendientes.
  6. Registrar tasaciones.

Se reorganiza la configuración compartida del menú de escritorio y móvil. Se conservan las rutas, el contexto de zona y los permisos. Sin zona seleccionada, estas seis opciones siguen ocultas. Los operadores conservan su acceso a Información de inmuebles.

El cambio no requiere migraciones ni cambios de datos. Punto previo de recuperación: commit `b3b51cc26c2b9456b8491cd0e5c2a5d2daeb04ef`.


## Validación y publicación

- ESLint sin advertencias y compilación completa Webpack/TypeScript correctos.
- Código publicado: `ceceefb5de5a71be7642005fecccf1f2cee6ea79`, subido atómicamente a `main` y `feat/registro-simplificado`.
- Vercel informó `success`, «Deployment has completed», entorno Production, despliegue GitHub `7154599205`, el `2026-10-18T12:32:26Z`.
- URL de versión: https://inmobiliaria-alfarov2-j0tgomr04-puma19.vercel.app.
- Comprobación autenticada en https://intranet.inmobiliariaalbertoalfaro.com.pe: orden exacto de Operación y Seguimiento en escritorio y móvil de 375 px; enlaces con zona y navegación a Registrar inmueble; seis opciones ocultas sin zona y para operador. Sin errores JavaScript ni desbordamiento horizontal móvil.
- Capturas y script privado de comprobación en `output/menu-production/` y `output/menu-production-smoke.mjs`, excluidos de Git y Vercel.
- Sin escrituras de negocio. Las cuentas y sesiones temporales se eliminaron al finalizar y se comprobó su ausencia.
- Los commits posteriores de evidencia solo cambian Markdown y conservan este código de aplicación.
