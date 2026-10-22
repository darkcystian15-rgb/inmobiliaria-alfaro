# Guardado y navegación en Información de inmuebles

22 de octubre de 2026. Solicitud: reducir botones repetidos y su énfasis visual, revisar los enlaces y mantener el proceso al usar Atrás.

## Cambios

- Una sola acción «Guardar condiciones» por expediente, visible únicamente con cambios. Guarda conjuntamente las condiciones modificadas; «Descartar» restaura las guardadas. Se retiraron los botones repetidos dentro de vendedor, comprador y renta.
- Barra de acciones discreta y compacta, disponible al desplazarse en móvil/escritorio. Los fallos de guardado se muestran junto a la acción y conservan lo escrito. El aviso de éxito desaparece al editar de nuevo.
- Subida, edición y descarga usan controles neutros; las zonas de carga del expediente pierden el fondo rojo. Otras pantallas que usan el mismo componente mantienen su presentación.
- Orden visual: ubicación, título de carpeta, regreso a sus carpetas, contenido y acciones contextuales. Se retira de esta cabecera el regreso general a Cartera, que competía con los regresos internos; Cartera sigue accesible en el menú.
- Cada zona, inmueble y carpeta crea un paso del historial. Atrás/Adelante restauran URL y contenido. Los enlaces directos a una carpeta incluyen sus niveles anteriores, por lo que el primer Atrás lleva al inmueble en lugar de salir del proceso.
- Con condiciones o archivos seleccionados pendientes, Atrás permite cancelar o descartar antes de continuar. Los enlaces a otros módulos también piden resolver los cambios. Durante una operación, se bloquea el cambio interno y se conserva la protección de cierre/recarga del navegador.

No hay migraciones ni cambios en expedientes reales. Se conservan archivos, categorías, límites, orden documental, validaciones del servidor y permisos: FASE 1 editable para administrador y consulta para operador.

## Verificación

Pruebas unitarias de carpetas, condiciones y permisos aprobadas. ESLint y compilación final con TypeScript aprobados.

Navegador autenticado con condiciones ficticias y guardados interceptados: 44 escenarios/vistas con administrador y operador, 1440/375 px; venta y alquiler. Comprobados guardado único, habilitación de archivos, comprador, Paga/No paga, fallo 409 simulado sin pérdida, Atrás/Adelante, cancelación/descarte de selección y bloqueo durante guardado. Cero errores y escrituras de negocio; cuentas técnicas eliminadas al finalizar. La revisión final compacta de la barra pasó los mismos 44 escenarios; vista móvil inspeccionada visualmente. Evidencia agregada: `evidencia-flujo-expediente/LOCAL.json`.

Revisión independiente pendiente, sin revisor disponible en esta sesión. Despliegue y comprobación del dominio se realizan mediante la integración Git de Vercel.
