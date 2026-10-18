> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Ubicación de los inmuebles

La ficha muestra un mapa en Resumen y un selector en Inmueble. El usuario confirma un punto haciendo clic, arrastrando el marcador, marcando el centro del mapa, utilizando la geolocalización del dispositivo o importando un enlace de Google Maps. Guarda el punto con el botón existente «Guardar cambios».

Sin una clave de Google, se utiliza Leaflet con cartografía OpenStreetMap y atribución visible. «Buscar dirección en Google Maps» abre una búsqueda en Google; no realiza una geocodificación automática dentro de la web. El usuario selecciona el inmueble y pega su enlace. Los enlaces que contienen solamente la cámara del mapa se identifican como aproximados y deben ajustarse. Algunos enlaces cortos sin coordenadas identificables necesitan sustituirse por la dirección completa o marcarse manualmente. Nunca se asigna un punto exacto a partir de una zona.

El GPS solicita permiso al pulsar el botón, muestra la precisión y necesita confirmación. No se consulta automáticamente ni se usa la posición del usuario como posición del inmueble sin una acción explícita. Marcar o importar no guarda automáticamente: se mantiene la confirmación de cambios sin guardar al cambiar de inmueble.

## Persistencia

`inm_inmuebles.latitud` y `inm_inmuebles.longitud` son DECIMAL(10,7), nulos hasta que se registra una ubicación. Se envían y validan juntos. Omitirlos en una edición parcial conserva la ubicación; enviar ambos nulos la retira. Coordenadas fuera de los rangos geográficos se rechazan. Los inmuebles existentes conservan sus datos.

Instalación idempotente: `node scripts/install-locations.mjs`. SQL equivalente de una sola ejecución: `db/updates/ubicaciones.sql`. Ejecutar la instalación antes de desplegar el código.

## Google Maps opcional

`NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`, configurada en Vercel y seguida de un despliegue, activa Google Maps Embed en el mapa guardado de Resumen. Habilitar Maps Embed API y restringir la clave a los dominios autorizados y esa API. La clave de Embed es pública por diseño; no usar claves privadas de otras APIs. El selector editable sigue siendo Leaflet. No se promete la búsqueda integrada de direcciones de Google ni su mapa editable sin configurar los servicios adicionales de Google Maps.

Enlaces «Abrir en Google Maps» y «Cómo llegar» utilizan las coordenadas guardadas y Maps URLs, sin requerir clave.

## Seguridad y validación

`POST /api/ubicaciones` requiere sesión válida y mismo origen; admite los roles que ya pueden editar la ficha. Resuelve únicamente HTTPS de hosts explícitos de Google Maps, sin credenciales ni puertos adicionales; verifica cada salto de redirección, limita los saltos y el tiempo de respuesta, y no reenvía cookies ni credenciales. No acepta URLs de otros servicios. Un enlace no identificable devuelve un mensaje para marcar la ubicación manualmente.

Referencias: https://leafletjs.com/examples/quick-start/ ; https://operations.osmfoundation.org/policies/tiles/ ; https://developers.google.com/maps/documentation/urls/get-started ; https://developers.google.com/maps/documentation/embed/get-api-key

## Comprobación realizada

Compilación de producción, TypeScript, ESLint sin advertencias y nueve archivos de pruebas correctos. Una prueba con navegador real y un inmueble/cuenta temporales verificó selección y persistencia, GPS simulado con precisión, importación de enlace, retirada de ubicación, enlaces de navegación, rechazo de coordenadas inválidas, sesión y origen. Comprobó ausencia de desbordes horizontales a 320, 390, 768, 1024, 1280 y 1536 píxeles y ausencia de errores de JavaScript. Se eliminaron los registros temporales al finalizar. Las capturas de demostración están en `output/location/` y no forman parte del despliegue.

## Corrección del primer clic

El selector acepta clics aunque todavía no exista un marcador. La posibilidad de seleccionar depende del estado editable de la ficha, sin consultar el manejador de arrastre de un marcador aún no añadido. Al quitar una ubicación se puede volver a marcar con un clic o toque. El marcador conserva el bloqueo durante operaciones pendientes y se vuelve a habilitar al terminar.

Prueba de regresión: `tests/location.integration.mjs`, con Playwright instalado en el entorno de pruebas. `PLAYWRIGHT_MODULE_PATH` permite indicar una instalación externa. Requiere la compilación de producción y la BD configurada; crea y elimina sus propios registros temporales. Verifica primer clic, arrastre con cambio de coordenadas, toque en celular después de retirar el punto y el resto del flujo de ubicación.

## Identificación de solicitudes del mapa

Las imágenes de OpenStreetMap incluyen explícitamente `referrerPolicy: strict-origin-when-cross-origin`. Esto envía el origen real de la aplicación aun si el documento hereda una política restrictiva, sin revelar la ruta de la ficha. No se utilizan proxies, identidades falsas ni otros servidores para eludir bloqueos. Ante errores de carga se muestra un aviso y un botón manual de reintento; los enlaces de Google Maps y los datos guardados siguen disponibles.

La prueba de navegador simula un documento con `Referrer-Policy: no-referrer`, verifica el origen enviado y los estados HTTP de las imágenes. También simula respuestas 403 para comprobar el aviso y la recuperación con «Reintentar mapa». Un navegador o extensión que elimine los encabezados incluso cuando se solicitan explícitamente, o una restricción del proveedor por otro motivo, puede necesitar revisión adicional.

## Acceso desde cartera

Las tarjetas de posición, la vista de lista y el detalle incluyen un acceso a la ubicación. Un diálogo muestra el mapa con las coordenadas de la ficha y los enlaces de Google Maps, sin cambiar de página. Si faltan coordenadas pero existe una dirección, la tarjeta ofrece «Consultar dirección» y el diálogo precarga una búsqueda en Google Maps con la dirección y la zona guardadas. Con la clave de Embed configurada, también muestra el resultado dentro del diálogo. La búsqueda no guarda coordenadas ni confirma un punto exacto. Sin dirección, el diálogo ofrece registrar la ubicación; no se deduce un punto a partir de la zona. La API de cartera entrega latitud y longitud desde `inm_inmuebles`.

El enlace de registro/edición abre directamente la pestaña Inmueble mediante `pestana=inmueble`. Se verificaron en navegador las acciones en las tres vistas, las coordenadas procedentes de BD, el estado pendiente, la navegación a la ficha, cierre con Escape, conservación de la galería de fotos y el tamaño del diálogo a 320–1536 píxeles. Las capturas de demostración están en `output/location/tarjetas-con-mapa.png` y `output/location/mapa-desde-tarjeta.png`; se eliminaron los registros temporales usados para comprobarlas.

## Referencia aproximada por zona

Sin coordenadas confirmadas, el diálogo identifica la búsqueda como «Ubicación aproximada». «Mostrar zona aproximada» cambia la consulta al distrito, provincia y departamento guardados; permite volver a la dirección. Si falta dirección, utiliza la zona directamente. Google Maps Embed no informa si encontró una dirección: el cambio a zona es manual cuando hay dirección. Sin clave de Embed, la consulta se abre mediante un enlace de Google Maps. No se asignan ni guardan coordenadas a partir de esta referencia.
