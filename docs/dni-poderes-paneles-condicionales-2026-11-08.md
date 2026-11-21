# DNI y poderes: paneles y cargas según condiciones

## Alcance
Cambio general para los inmuebles que usan el expediente, no limitado al inmueble de ejemplo. No modifica archivos existentes ni requiere migraciones.

## Interfaz
- Vendedor y comprador reúnen sus condiciones y documentos en paneles diferenciados por un borde rojo sutil y fondo blanco.
- Cada documento de identificación tiene un borde suave; al seleccionar archivos se destaca el bloque activo.
- Se conserva la carga compacta con el tamaño máximo visible y formatos en ayuda desplegable.
- El vendedor comienza por tipo de persona y propietarios. Los documentos naturales se revelan al elegir propietarios.
- Matrimonio muestra partida matrimonial y régimen patrimonial. Separación de bienes muestra «Partida registral de separación de bienes».
- La excepción de firma del cónyuge se oculta únicamente para Matrimonio + Separación de bienes, después de elegir propietarios. Vuelve a aparecer al elegir Soltero u otra condición, como se solicitó.
- La aplicabilidad documental de la excepción conserva su alcance matrimonial y se desactiva en separación de bienes. No se borran las selecciones anteriores al ocultar el campo.
- Poder y vigencia del vendedor aparecen al indicar representación.
- Documentos existentes que dejan de corresponder se conservan en «Documentos anteriores», plegado.
- Notas alternativas de búsqueda nacional y documentos adicionales quedan plegados para reducir información inicial.
- Una sola barra de Guardar condiciones sustituye los botones repetidos. Las cargas se habilitan tras guardar las condiciones.

## Validación
Pruebas de reglas documentales, TypeScript, ESLint y navegador con API simulada en 375 y 1440 px. Se comprueban las transiciones de condiciones, conservación de documentos anteriores, carga compacta, comprador, permisos de solo lectura y ausencia de desbordamiento horizontal. Resultados: pruebas documentales, TypeScript, ESLint y navegador correctos. Revisión visual realizada en móvil. La compilación de producción se verifica en Vercel.

## Despliegue
- Producción Vercel: `dpl_BbGaZxuV1qSeRS2k7o2ziUZDP32W`, estado `READY`.
- Compilación de producción completada correctamente.
- Dominio asignado: https://intranet.inmobiliariaalbertoalfaro.com.pe
- Se despliega el árbol de trabajo actual conservando los cambios previos existentes.
