# Antecedente: rectificación de operación con tasación aprobada

Actualización: el usuario autorizó implementar y desplegar la rectificación conservando los montos. Ver [entrega](rectificacion-operacion-2026-10-26.md). Las notas siguientes conservan la investigación previa.

El usuario pidió recordar este pendiente el 26 de octubre de 2026. No se ha implementado ni autorizado una modificación de datos en esta conversación.

Necesidad: poder rectificar de venta a alquiler aunque ya exista una tasación aprobada. Se propuso una acción para el administrador que conserve la tasación y registre el cambio en el historial; su comportamiento definitivo está pendiente de resolver e implementar.

Caso identificado en el respaldo `restore-points/integridad-20261025/datos-negocio.json.gz`, fechado el 25 de octubre de 2026 a las 19:42 UTC:

- Juan Zúñiga, casa en Jr. Huandoy, Buenos Aires, Nuevo Chimbote.
- Inmueble ID 565, código `098-CASA-JR-HUANDOY-BS-AS`, activo y registrado como venta.
- Tasación ID 57, aprobada. Referencia y objetivo: S/ 2,300; precio de venta registrado: S/ 3,200.
- Observación: «el precio de cierre aceptado por el dueño es de S/. 2,300 mensuales , alquiler 1 x 1».
- Sin registro en `inm_publicaciones` en ese respaldo.

La regla compartida en `lib/property-edit-policy.mjs` bloquea el cambio si existe cualquier tasación o publicación, o si el inmueble no está activo. Se aplica en `app/components/PortfolioPropertyEditor.tsx` y en `app/api/inmuebles/[id]/route.ts`.

Al retomar: verificar la ficha vigente, resolver la discrepancia entre S/ 2,300 y S/ 3,200 y definir cómo revisar importes y contenido dependientes de la operación antes de habilitar la rectificación. No asumir que los importes de venta son rentas mensuales válidas.

La consulta en vivo no pudo completarse: la conexión local contiene un marcador en lugar de la URL de base de datos y Vercel respondió 403 al consultar las variables. Los hallazgos de la ficha corresponden al respaldo, no a una lectura actual de producción. Existen otros inmuebles con el mismo contacto; usar el ID 565 para identificar esta casa.
