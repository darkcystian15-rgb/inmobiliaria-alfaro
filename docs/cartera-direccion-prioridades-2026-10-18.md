# Dirección referencial en Cartera y prioridades sin duplicación — 18 de octubre de 2026

## Cambios

- Cartera → seleccionar inmueble → Datos del inmueble → Editar datos incluye **Dirección referencial**, cargada desde la ficha, obligatoria y con máximo de 350 caracteres.
- El PATCH de Cartera permite `direccion` para el administrador. Conserva la validación existente, el registro de cambios y los aliases del código anterior cuando cambia la referencia. La geografía, zona y posición no se modifican al editar la dirección.
- Al guardar se recarga la cartera y el inmueble seleccionado, actualizando descripción e ID visible. Cancelar restaura los valores consultados. La dirección sigue siendo editable también desde Información de inmuebles.
- En Panel de control → Prioridades de trabajo se conserva el contacto y una única descripción de operación, tipo y dirección. Se retira de ese bloque el ID que repetía esos datos. Los demás listados mantienen su presentación.
- Sin migraciones ni modificaciones automáticas de datos de negocio.

## Validación y publicación

- 27 archivos de pruebas unitarias correctos, incluido el permiso de edición parcial de dirección desde Cartera y la conservación de restricciones de campos y operación.
- ESLint con cero advertencias y compilación Webpack/TypeScript correctos.
- Código publicado: `9eff04fbac0e0efb99009b8caa2b0cfcaa17bdb2`, sincronizado mediante subida atómica en `main` y `feat/registro-simplificado`.
- Vercel informó a GitHub despliegue **Production** `7150999944`, estado `success`, «Deployment has completed», el `2026-10-18T06:36:06Z`.
- URL de versión: https://inmobiliaria-alfarov2-benaa69b7-puma19.vercel.app.
- Evidencia consultada: API de despliegues GitHub para el SHA y `/repos/darkcystian15-rgb/inmobiliaria-alfaro/deployments/7150999944/statuses`.
- `tests/file-list.production.smoke.mjs` pasó contra https://intranet.inmobiliariaalbertoalfaro.com.pe: Dirección referencial aparece editable con el dato actual; modificarla sin guardar y cancelar restaura el valor; Prioridades de trabajo conserva una descripción bajo cada contacto y no muestra el ID duplicado. Se comprobaron también permisos, filtros, archivos privados y navegación de escritorio/móvil.
- La primera ejecución de la nueva aserción de prioridades confundió la tipografía del número de posición con el ID. Se corrigió el selector a los párrafos de ID y se repitió satisfactoriamente la prueba completa.
- No se guardaron cambios de dirección ni se eliminaron inmuebles reales durante la verificación. Las cuentas y sesiones temporales fueron eliminadas al terminar cada ejecución. La escritura de dirección reutiliza la ruta transaccional existente; esta comprobación en producción valida la interfaz y cancelación, sin ensayar un guardado real.
- Los commits posteriores de evidencia y corrección del selector de prueba no cambian el código de aplicación publicado.
