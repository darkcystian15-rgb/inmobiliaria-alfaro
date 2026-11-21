> Actualización vigente: [Búsqueda nacional solo para el vendedor](busqueda-nacional-solo-vendedor-2026-11-10.md). Comprador: no aplica para natural ni jurídica. Vendedor: aplica para natural y jurídica con No paga. Las reglas distintas descritas más abajo corresponden a versiones anteriores.

# Asignar comprador desde Impuestos y constancias

En venta, FASE 2 → 4. Impuestos y constancias muestra la sección Comprador aunque todavía no esté asignado. Incluye el mismo check Asignar comprador para preparar el cierre y el selector Persona natural / Persona jurídica disponibles en 1. DNI y poderes.

Ambos puntos usan los campos existentes compradorAsignado y compradorTipo del mismo expediente, con el mismo guardado versionado de condiciones. No se crea otra ficha ni un segundo estado. Marcar el check muestra el tipo de persona y los documentos correspondientes; es necesario seleccionar el tipo y guardar para habilitar la carga. Después, en la carpeta 1, se refleja la asignación y se puede completar su identificación. Cambiar el tipo en la carpeta 1 también se refleja al volver al punto 4.

La liquidación y los documentos de alcabala conservan sus reglas; la búsqueda nacional del comprador aparece cuando es persona jurídica. No se modifica la regla recién implementada de búsqueda del vendedor según su condición de renta. Desasignar o cambiar el tipo no elimina los archivos existentes; el descarte de cambios recupera la condición guardada. Solo consulta y operaciones en curso mantienen sus bloqueos. Alquiler conserva sus condiciones propias y no recibe controles de comprador de venta.

El aviso que obligaba a ir a la carpeta 1 se conserva para otras carpetas, pero se sustituye en impuestos por los controles de asignación y una indicación de que la identificación puede completarse después.

Verificación: TypeScript y ESLint; navegador 375/1440 px con API simulada: comprador no asignado sin documentos, asignación desde 4, tipo jurídico, carga bloqueada hasta guardar, reflejo en 1, cambio a natural desde 1 y reflejo en 4, búsqueda según tipo, descarte de desasignación y regresión de impuestos, carpetas y alquiler. No se escriben expedientes reales durante las pruebas y no se requiere migración.

## Publicación

- Producción Next.js en inmobiliaria-alfarov2 (prj_Y4rkO3CVHKLA2akcLF6rguUJksvG), equipo team_qcKFQOeqeLWTJFsCLGnZvPiL; estado READY.
- Despliegue: dpl_25tP57wUR3AwqzKpicz5r6N17ftL.
- URL: https://inmobiliaria-alfarov2-7wox7xfuq-puma19.vercel.app.
- Se preparó sin asignar dominio, se comprobó GET del expediente con 401 y JSON de inicio de sesión esperado, y se promovió el mismo despliegue a la intranet. Inspect del dominio confirma la versión nueva.
- Compilación remota completada en aproximadamente un minuto. Sin registros de nivel error en la consulta posterior.
- TypeScript, ESLint, pruebas de expediente/adjuntos y navegador en ambos anchos pasaron. La comprobación funcional usa datos sintéticos y API simulada; no escribe en expedientes de clientes.
- Referencia Git base 288e7060b41df8f9eafc2bfa67c102ff186a35b7, con archivos locales de trabajo y sin migración ni commit nuevo.
