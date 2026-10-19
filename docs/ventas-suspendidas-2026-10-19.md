# Ventas suspendidas y retorno a cartera — 19 de octubre de 2026

## Funcionamiento

Liberar inmueble permite **Suspender venta y conservar en Histórico**, exclusivamente para inmuebles con operación venta. Solicita el motivo (obligatorio, hasta 500 caracteres) y confirmación. No requiere precio final, comisión ni fecha de venta, porque no constituye una operación realizada.

La suspensión conserva la misma ficha, código interno, documentos, fotos, visitas, tasaciones, precios, publicaciones, expediente y antecedentes. Cambia el inmueble a inactivo, registra su fecha de salida y termina la asignación activa de posición. La posición queda libre para otro inmueble. El panel y las consultas de actividades activas dejan de incluirlo.

Histórico distingue **Operación concluida** y **Venta suspendida** en el listado y el detalle. Los retiros históricos de versiones anteriores se conservan sin reclasificar sus motivos originales; el nuevo flujo no convierte una suspensión en una venta realizada. Los motivos de suspensión se muestran también en los reportes existentes y exportaciones PDF/Excel, sin importes de cierre inventados.

Desde Cartera → seleccionar zona → Estado Histórico → abrir una Venta suspendida, el administrador dispone de **Retomar en cartera**. Selecciona una posición disponible de la misma zona y confirma el retorno. Se reactiva la misma ficha y se crea una nueva asignación; no se duplica el inmueble ni se sobrescribe su antigua posición. La posición anterior puede haber sido ocupada por otro inmueble. No se reservan posiciones durante la pausa ni se impone la numeración antigua de 1 a 90.

El retorno es manual, cuando el propietario lo solicite. No vence automáticamente a los X meses ni implica una nueva confirmación de publicación. Se conservan etapas, precios, fechas de actividades, material y plazos particulares anteriores; el administrador debe revisar su vigencia al retomar. Esta entrega no introduce un nuevo ciclo de captación ni reinicia actividades completadas.

Los alquileres mantienen cierre, contrato, renovación y reingreso existentes. No pueden suspenderse ni retomarse mediante esta nueva acción. Eliminar definitivamente conserva su flujo independiente con dos confirmaciones y no crea Histórico.

## Integridad y alcance

- Suspensión y retorno exigen administrador; las escrituras validan origen y zona en servidor.
- Solo retorna una venta inactiva con suspensión confirmada y vigente. Una venta concluida o un alquiler se rechazan.
- La posición debe estar activa, libre y pertenecer a la zona del inmueble; se vuelve a comprobar al confirmar.
- Las operaciones usan transacciones y bloqueos del inmueble, suspensión y posición. Peticiones repetidas o concurrentes no crean dos asignaciones activas.
- Cada suspensión y retorno registra usuario, fecha y detalle en el historial, con nombres legibles también en avances recientes del panel.
- Al retomar, el registro técnico de liberación por suspensión se marca finalizado mediante `anulada` y `fechaAnulacion`, conservándolo físicamente y manteniendo sus eventos. Esto permite posteriores suspensiones o un cierre real sin bloquearlo por una liberación todavía vigente.
- No requiere migraciones, cargas ni modificación masiva de datos. Las nuevas acciones solo escriben sobre el inmueble seleccionado cuando el administrador confirma.

## Recuperación

Base anterior: `94d67e5cb7e6e162c2f35bbda7023b6f978f44a2`. Copia privada de fuente anterior en `restore-points/venta-suspendida-20261019/source-before.tar`, excluida de Git/Vercel. La entrega no modifica el esquema y no requiere un respaldo nuevo de datos para instalarse. Volver al código anterior no deshace suspensiones o retornos realizados después: revisar historial y asignaciones antes de cualquier recuperación.

## Validación y publicación

- 32 archivos de pruebas unitarias aprobados, sin fallos.
- ESLint sin errores ni advertencias; compilación de producción Webpack/TypeScript aprobada. El primer intento restringido falló al leer `tsc --showConfig`; la compilación fuera del sandbox terminó correctamente.
- `tests/sale-suspension.integration.mjs`, con MySQL 8.4 local aislado: suspensión, motivo obligatorio, dos tipos de Histórico, liberación de cupo, ausencia en pendientes, retorno con posición nueva, exclusión de alquileres, permisos, zona, posiciones ocupadas, posición 101, preservación de visitas/tasaciones/precios/archivos, ciclos repetidos, cierre de venta posterior y concurrencia sobre una ficha o una posición.
- Navegador local en escritorio y móvil de 375 px: cancelar retorno o suspensión conserva el estado; confirmar completa el cambio. Sin errores JavaScript ni desbordamiento horizontal. Capturas privadas en `output/venta-suspendida/`.
- Las pruebas de suspensión/retorno usan exclusivamente datos ficticios locales. No se suspenden ni reactivan inmuebles reales para comprobar la entrega.

## Entrega publicada

- Código: `56872bb65462dbb0294466e518bd54a7acf7156c`, sincronizado en `main` y `feat/registro-simplificado`, tanto en Codespaces como en GitHub mediante subida atómica.
- Vercel Production GitHub `7165093644`: `success`, «Deployment has completed», el `2026-10-19T03:34:46Z`.
- URL de versión: https://inmobiliaria-alfarov2-n5ja3ac8m-puma19.vercel.app.
- [Despliegue Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/6pdZ29BZvwuPN2AQavGBNUcZQ3ys).
- Vercel Preview GitHub `7165102638`: `success`, el `2026-10-19T03:35:34Z`.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Contenedor y volumen de MySQL local de ensayo retirados después de aprobar la integración.
- Los commits posteriores de documentación conservan el código de esta entrega.

## Contraste autenticado de producción

Verificado el `2026-10-19T03:37:17.588Z` en el dominio de la intranet:

- En Chimbote, las 34 ventas activas consultadas muestran Suspender venta; los alquileres no muestran esa opción. Es el resultado de esa consulta, no un inventario fijo.
- La API de Cartera expone tipo de Histórico y posibilidad de retorno; la navegación a Histórico conserva su filtro.
- El formulario de suspensión presenta motivo y revisión, sin solicitar importes de una venta realizada.
- Acceso anónimo rechazado y operador sin permiso para Liberar inmueble.
- Escritorio y móvil de 375 px sin errores JavaScript ni desbordamiento horizontal.
- Cero escrituras de negocio: el navegador bloqueó métodos de escritura y no se confirmaron suspensiones, retornos, cierres ni eliminaciones reales. El funcionamiento completo conserva la evidencia de integración local ficticia.
- Cuentas y sesiones temporales eliminadas al terminar. El primer intento del comprobador falló por un selector demasiado estricto del filtro Estado; se corrigió el selector de prueba y la comprobación completa pasó sin cambiar el código desplegado.

Evidencia privada excluida de Git/Vercel: `output/sale-suspension-production-smoke.mjs`, `output/venta-suspendida-production/result.json` y capturas de escritorio/móvil.
