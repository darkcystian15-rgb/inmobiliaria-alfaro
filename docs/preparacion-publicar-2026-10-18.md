# Preparación para publicar: documentos y material

## Qué se ajustó

El bloque compartido de requisitos dejó de presentarse como una lista plana. Ahora guía la preparación del inmueble con cuatro tarjetas: identificación del propietario o contacto, archivo de tasación, fotos de una visita completada y texto del anuncio.

La cabecera muestra cuántos requisitos están listos y una barra de progreso. Los pendientes reciben un énfasis moderado; los completos quedan en segundo plano y ofrecen acceso para consultar el registro. Cada tarjeta conserva el destino de trabajo existente: ficha del contacto, documentación del inmueble, visitas o publicación. En la ficha, las acciones cambian de apartado sin sacar al usuario del inmueble. En las otras pantallas, los enlaces abren la misma ficha con el apartado correspondiente.

El pie aclara la diferencia entre preparar el material y confirmar una publicación. Completar los cuatro requisitos deja el material listo, pero el estado «Publicado» sigue dependiendo del registro de publicación existente. El enlace general para abrir la ficha solo aparece fuera de la ficha; así se evita repetir una acción redundante.

En el panel de Cartera, el estado previo a la aprobación de tasación se muestra como una etiqueta compacta «Disponible tras aprobar la tasación». La cuadrícula del seguimiento reúne Visita, Tasación, Material y Publicación en cuatro tarjetas equilibradas; la preparación de documentos ocupa una fila completa debajo. Así se evita el hueco que dejaba la tarjeta de Material junto al bloque más alto.

## Alcance y datos

- No se añadieron requisitos ni se cambió la regla de preparación en `lib/publication-checklist.mjs`.
- Los archivos continúan en sus apartados actuales; no se crean copias ni cargas nuevas.
- El componente se usa en Información de inmuebles, Cartera y Tasaciones y textos pendientes; el ajuste conserva esos usos compartidos.
- No se modificaron fechas, estados, publicaciones ni registros de inmuebles.
- El estado previo a la aprobación conserva la misma condición; solo cambió su presentación en Cartera.
- En Cartera solo se reorganizaron las tarjetas visuales; el orden de trabajo y las condiciones de cada estado se conservan.

## Verificación y publicación

ESLint de los componentes de publicación y Cartera pasó y `tsc --noEmit` terminó sin errores. La compilación local de Next no llegó a compilar la aplicación: su proceso de lectura de `tsc --showConfig` recibió una salida vacía y terminó con «Could not parse output from TypeScript's --showConfig»; el comando directo de TypeScript sí devolvió configuración JSON válida. Vercel confirmó después el despliegue remoto del SHA publicado.

El cambio de código quedó en el commit `f4ca899f851029c01a08877236c8dd5ca8f439d6`; `main`, `feat/registro-simplificado` y sus ramas remotas quedaron en ese mismo SHA. GitHub recibió de Vercel el estado `success`, «Deployment has completed», a las `2026-10-18 21:38:44 UTC`. [Ver despliegue en Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/HTJM2LMYKpvM8kKokz5sNVRoVXp6).

El ajuste compacto de Cartera quedó en el commit `98c8f0a888c58e72f45a13ba7fa4415fc533de7d`. Vercel confirmó «Deployment has completed» para ese SHA a las `2026-10-18 21:51:03 UTC`. [Ver despliegue](https://vercel.com/puma19/inmobiliaria-alfarov2/4r3Sv3zFXXc4Jrw26WrT1GX68Ei8).

La redistribución de Visita, Tasación, Material y Publicación quedó en `04e4c76d3d50682ea7c31059698abffc6756a1d9`. Vercel confirmó «Deployment has completed» a las `2026-10-18 22:05:34 UTC`. [Ver despliegue](https://vercel.com/puma19/inmobiliaria-alfarov2/6bTYSowPA56sUZcqvwgjZLdxPo2q).
