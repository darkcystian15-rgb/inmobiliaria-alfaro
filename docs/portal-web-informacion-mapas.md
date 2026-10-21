# Fase 4: información adicional y mapa público

Entrega del 21 de octubre de 2026. Complementa el módulo Portal web y la gestión del
catálogo anterior. Implementación de Codex; revisión independiente pendiente.

## Uso desde la intranet

En Portal web → Publicaciones activas → Gestionar publicación (también al preparar
un inmueble nuevo) aparecen dos pestañas:

1. **Información adicional:** bloques opcionales con título y contenido. Permite
   agregar, editar, subir/bajar y quitar bloques. El orden se refleja en los
   desplegables de Información adicional del portal. Si se retiran todos, la sección
   desaparece al publicar. Máximo 20 bloques nuevos/editados; título de 50 caracteres
   y contenido de hasta 1000 caracteres contando el formato almacenado. Se admite
   texto y saltos de línea; el HTML introducido se publica como texto, no se ejecuta.
2. **Ubicación y mapa:** conservar el mapa actual, sin mapa, ubicación exacta o
   aproximada. Admite latitud/longitud y extracción de coordenadas de un enlace
   completo de Google Maps. Los enlaces cortos deben abrirse en Maps para copiar el
   enlace completo o las coordenadas; la intranet no los resuelve automáticamente.
   Hay vista previa y enlace al punto que se publicará.

Guardar borrador no cambia la web. Editar estos apartados desmarca la autorización
de datos/fotos. Revisar la vista previa, confirmar permisos, guardar y actualizar
el anuncio. Suspender/retirar conserva los borradores no publicados.

## Condiciones y privacidad

Ambos apartados son opcionales. No tener bloques ni mapa no añade requisitos al
inmueble. Si se agrega un bloque incompleto o se activa un mapa sin coordenadas
válidas, el botón de publicar queda bloqueado y el servidor rechaza el envío.
Se aceptan latitudes de −90 a 90 y longitudes de −180 a 180; (0,0) se considera
sin punto. Una coordenada igual a cero es válida si la otra no es cero.

La ubicación aproximada redondea ambos valores a dos decimales, aproximadamente
1 km de resolución. El borrador privado puede contener el punto preciso ingresado,
pero la instantánea enviada al portal contiene solo los valores redondeados. El
portal identifica el mapa como «Ubicación aproximada» y aclara que es referencial.
Sin mapa publica coordenadas nulas en la API pública y no muestra iframe.
La dirección pública escrita y el punto del mapa se administran por separado;
no se deducen coordenadas ni se usa geolocalización del dispositivo.

## Conservación y compatibilidad

Los bloques anteriores se cargan para consulta y edición. Su HTML almacenado no
se reescribe si no se edita la lista. Al editarla se reemplaza expresamente en una
transacción, respetando el orden y validando los límites reales de mas_info.

La vinculación de una ficha interna a un anuncio anterior conserva mapa e
información adicional por defecto. Se corrigió la asignación incondicional de
latitud/longitud cero. Las entregas antiguas sin los campos nuevos también conservan
esos datos. Las fichas vinculadas pueden cargar sus bloques y punto actuales desde
el receptor autenticado. Si esa lectura falla, se informa y se impide editar estos
apartados con una lista vacía que pudiera reemplazar datos existentes.

No se crean tablas ni columnas. Se reutilizan mas_info, las coordenadas existentes,
el almacén JSON de borradores y portal_intranet_sync. La clave map:{id} registra
el modo público sin ocupar la asociación única de inmueble. La API pública de
ficha expone únicamente coordenadas efectivas y map_mode; los catálogos mantienen
su lista explícita de campos públicos. El receptor autentica los accesos de gestión
con el secreto ya instalado. La lectura de anuncios anteriores incluye bloques y
mapa en su hash para rechazar ediciones desactualizadas.

## Validación

- 33 archivos unitarios de intranet aprobados, incluyendo opcionalidad, coordenadas,
  extracción del punto real frente al centro de cámara y descarte de enlaces inválidos.
- Pruebas del portal y del receptor aprobadas: datos opcionales, límites, ocultación
  y redondeo de coordenadas. Compilaciones de ambos proyectos verificadas.
- Integración MySQL y navegador aislados con registros ficticios: bloques ordenados,
  escape de HTML, retiro completo de bloques, mapas exacto/aproximado/oculto,
  ausencia del punto preciso en la API pública aproximada, rechazo de mapa inválido,
  conservación al vincular y carga de datos del anuncio adoptado.
- Escritorio y móvil, nuevas pestañas, permisos, bloqueo de publicar, reintentos y
  conservación de portada/borrador incluidos. Evidencia en
  [INTEGRACION.json](evidencia-portal-web/INTEGRACION.json).

La verificación de producción se realiza por lectura y navegación autenticada;
no se publican, editan ni importan inmuebles de clientes para demostrar el flujo.
Cuenta/sesiones temporales y capturas reales se gestionan de forma privada. La
verificación de SHA y dominios se realiza después de desplegar ambos repositorios.

## Recuperación

Se pueden recuperar los despliegues previos conservando datos y tablas. No borrar
mas_info ni claves del almacén JSON. Si ya se editaron mapas o bloques, recuperar
código no revierte esas decisiones del administrador: revisarlas expresamente.
No cambiar conexiones MySQL, credenciales ni hosting documental para esta entrega.

## Verificación del portal publicado

21/10/2026, 23:46 UTC: GitHub, Codespaces y Vercel Production coinciden en
1cf51a1, despliegue dpl_4ybD5iLiVaTBUAaP6vai9gobc29Z, READY y alias correcto.
Se consultaron las fichas e información adicional de los 64 anuncios: 134 bloques y
39 mapas visibles; todos coinciden con sus datos previos. Hash de las revisiones
sin cambios antes/después de la lectura, cero escrituras de negocio. Evidencia:
[portal publicado](evidencia-portal-web/INFORMACION-MAPAS-PORTAL.json).
