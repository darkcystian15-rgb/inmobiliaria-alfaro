# Dirección referencial en Cartera y prioridades sin duplicación — 18 de octubre de 2026

## Cambios

- Cartera → seleccionar inmueble → Datos del inmueble → Editar datos incluye **Dirección referencial**, cargada desde la ficha, obligatoria y con máximo de 350 caracteres.
- El PATCH de Cartera permite `direccion` para el administrador. Conserva la validación existente, el registro de cambios y los aliases del código anterior cuando cambia la referencia. La geografía, zona y posición no se modifican al editar la dirección.
- Al guardar se recarga la cartera y el inmueble seleccionado, actualizando descripción e ID visible. Cancelar restaura los valores consultados. La dirección sigue siendo editable también desde Información de inmuebles.
- En Panel de control → Prioridades de trabajo se conserva el contacto y una única descripción de operación, tipo y dirección. Se retira de ese bloque el ID que repetía esos datos. Los demás listados mantienen su presentación.
- Sin migraciones ni modificaciones automáticas de datos de negocio.

## Validación y publicación

La evidencia final se incorpora al completar las comprobaciones y el despliegue.
