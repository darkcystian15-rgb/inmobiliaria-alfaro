# Preparación para publicar: documentos y material

## Qué se ajustó

El bloque compartido de requisitos dejó de presentarse como una lista plana. Ahora guía la preparación del inmueble con cuatro tarjetas: identificación del propietario o contacto, archivo de tasación, fotos de una visita completada y texto del anuncio.

La cabecera muestra cuántos requisitos están listos y una barra de progreso. Los pendientes reciben un énfasis moderado; los completos quedan en segundo plano y ofrecen acceso para consultar el registro. Cada tarjeta conserva el destino de trabajo existente: ficha del contacto, documentación del inmueble, visitas o publicación. En la ficha, las acciones cambian de apartado sin sacar al usuario del inmueble. En las otras pantallas, los enlaces abren la misma ficha con el apartado correspondiente.

El pie aclara la diferencia entre preparar el material y confirmar una publicación. Completar los cuatro requisitos deja el material listo, pero el estado «Publicado» sigue dependiendo del registro de publicación existente. El enlace general para abrir la ficha solo aparece fuera de la ficha; así se evita repetir una acción redundante.

## Alcance y datos

- No se añadieron requisitos ni se cambió la regla de preparación en `lib/publication-checklist.mjs`.
- Los archivos continúan en sus apartados actuales; no se crean copias ni cargas nuevas.
- El componente se usa en Información de inmuebles, Cartera y Tasaciones y textos pendientes; el ajuste conserva esos usos compartidos.
- No se modificaron fechas, estados, publicaciones ni registros de inmuebles.

## Verificación y publicación

ESLint del componente pasó y `tsc --noEmit` terminó sin errores. La compilación local de Next no llegó a compilar la aplicación: su proceso de lectura de `tsc --showConfig` recibió una salida vacía y terminó con «Could not parse output from TypeScript's --showConfig»; el comando directo de TypeScript sí devolvió configuración JSON válida. El estado de la compilación remota de Vercel para el SHA publicado se añadirá al cerrar el despliegue.
