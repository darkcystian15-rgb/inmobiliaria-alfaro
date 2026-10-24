# Texto y difusión por inmueble

Actualización iniciada el 23 y preparada el 24 de octubre de 2026. Autorizados: implementación, punto de restauración, Markdown y despliegue hasta Vercel.

## Flujo

Tasación registrada → Texto pendiente → Difusión pendiente → Difusión completada.

El texto comercial tiene borrador y realización explícita. Guardar borrador conserva lo escrito sin completar la tarea. Guardar texto y marcar como realizado requiere texto y seleccionar solo cartel físico, solo redes sociales o ambos. Los textos anteriores se conservan como realizados. La edición posterior conserva la realización del texto y las confirmaciones de difusión.

La difusión se completa al confirmar todas las acciones elegidas: Cartel colocado y/o Publicado en redes sociales. No pide fechas ni importes. Las referencias de redes son opcionales y admiten hasta 12 pares red/enlace HTTP(S). No se exige URL para confirmar redes, y añadir un enlace no completa una acción por sí solo. Se pueden corregir las selecciones y marcas expresamente desde Actualizar difusión.

No se generan pendientes de actualización al cambiar texto o tasación. Las publicaciones anteriores conservan su estado; cuando no constan medios, se muestran Sin especificar, sin inventar cartel o redes. Los enlaces históricos se conservan como referencias. Los anuncios anteriores permanecen en su tabla y sus precios y fechas no se alteran.

## Pantallas y documentos

- Cartera, panel, agenda, ficha y reportes comparten Texto pendiente, Difusión pendiente y Difusión completada. Los enlaces anteriores de reportes siguen aceptándose como alias.
- El panel de cada inmueble en Cartera incluye Editar tasación y Registrar/Editar texto, que abren directamente los editores de la ficha conservando el regreso a Cartera.
- Información de inmuebles → Fase 1 → Texto y difusión y la bandeja Tasaciones, texto y difusión usan el mismo editor. Administrador edita; operador consulta.
- El texto y la difusión pueden registrarse sin DNI, archivo de tasación o fotos. Los requisitos documentales siguen visibles de forma independiente.
- Portal web conserva su revisión/autorización de publicación y sus documentos/fotos requeridos. Exige texto realizado; el borrador no satisface ese requisito. Guardar o editar texto no envía ni actualiza automáticamente el portal.
- Las fechas de historial se generan automáticamente. Se guarda internamente la primera realización del texto para que el plazo de difusión no empiece desde un borrador anterior. Editar después no reinicia ese plazo ni la difusión.

## Adaptación y conservación

Se añaden seis columnas en inm_publicaciones: texto_realizado, medios_difusion, cartel_colocado, redes_publicadas, referencias_difusion y fecha_texto_realizado. El instalador scripts/install-text-diffusion.mjs comprueba/agrega solo lo ausente; el build de Vercel lo ejecuta antes de compilar. SQL de referencia: db/adaptations/text-diffusion.sql.

Los registros anteriores reciben texto_realizado=1, medios/primera realización/referencias sin especificar y marcas de cartel/redes en falso; publicado, texto, fechas y autores anteriores se conservan. Los nuevos borradores guardan texto_realizado=false explícitamente. No se cambian tasaciones, monedas, posiciones, documentos físicos ni publicaciones públicas por esta adaptación.

## Punto de restauración

Fuente anterior: cf911a91ae7e77d8d1c4829b8b5f17e36a5e5b97. Directorio privado excluido de Git: restore-points/texto-difusion-20261023/.

- repositorio.bundle, comprobado con git bundle verify: historial completo y referencias anteriores.
- cambios-previos.patch: conserva el cambio previo de package-lock.json, ajeno a esta actualización.
- datos-negocio.aes y clave-base64: instantánea cifrada AES-256-GCM; datos-negocio.json.gz permite la recuperación privada ya descifrada.
- manifest.json: 27 tablas de negocio, sus esquemas y filas. Instantánea consistente del 2026-10-23T23:22:24.061Z. SHA-256 del JSON: c9704365dbcaacec40f6e14051d2f9a86f683e58cae365e76f91fff975de72aa. Se comprobó descifrado, descompresión, hash y conteos.
- La instantánea incluye metadatos/referencias de los 13 archivos, cuyos bytes no se modifican. Las tablas de autenticación y sus secretos se excluyen; las cuentas reales no se cambian.

Para recuperar código, extraer la referencia anterior del bundle en otra carpeta y verificarla antes de publicar. Las columnas añadidas son compatibles con el código anterior y pueden conservarse. Para recuperar datos, revisar primero las escrituras posteriores, contrastar la copia privada y restaurar únicamente las filas/columnas que correspondan; no sobrescribir trabajo posterior con toda la instantánea. No eliminar archivos físicos: esta entrega no los modifica.

## Verificación

- 38 archivos unitarios aprobados; casos de borrador, medios independientes, URL opcional/segura y reglas del portal. TypeScript y ESLint sin errores/advertencias.
- Build local Next.js webpack aprobado, 57 páginas, usando MySQL 8.4 desechable.
- Adaptación de tabla antigua ejecutada dos veces: estados, textos y fechas conservados; medios sin inventar.
- Integración HTTP local: borradores, realización sin documentos, tres combinaciones de medios, referencias opcionales, edición de texto/precio sin reiniciar difusión, estados anteriores, permisos, ficha y coincidencia entre contadores de Cartera/panel/reportes.
- Chromium autenticado local, 1440/375 px: registro y edición de texto, ambas confirmaciones, conservación de estado, accesos desde Cartera y consulta sin controles de edición para operador. Sin errores de ejecución ni desbordes; captura móvil inspeccionada. Todas las escrituras de prueba son ficticias y locales.

## Producción

Preparación de columnas y sesiones técnicas en una versión temporal sin asignación de dominios. Publicación funcional, comprobación autenticada de solo lectura, retirada de cuentas técnicas y contraste con el respaldo pendientes de consignar al terminar.
