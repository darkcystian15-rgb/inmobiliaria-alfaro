# Reglas acordadas: cierre, moneda y operador

25 de octubre de 2026. Base anterior: `f05738d03aff33c4720c2a8029c38b2bae59d83f`.

## Decisiones del usuario

1. Al cerrar o suspender se ofrece la opción de retirar el anuncio web. No se fuerza su retirada.
2. Una moneda por inmueble, aplicada a todos sus importes. El usuario puede cambiarla y corregir los números manualmente si corresponde convertir; no se calcula un tipo de cambio automático.
3. El expediente puede tener pendientes durante la publicación. Para cerrar una venta o alquiler deben estar cargados todos los documentos obligatorios aplicables y definidas sus condiciones.
4. En alquiler, poder solo para la parte que firme mediante representante.
5. El operador trabaja con Información de inmuebles (FASE 2) y tiene las mismas funciones de Portal web (FASE 3) que el administrador, incluida portada, preparación, publicación, actualización, suspensión y retirada. FASE 1 y administración conservan sus permisos propios.
6. La evidencia del acuerdo de precios puede comentarse voluntariamente en Observación. No se añade un requisito de aceptación ni un archivo obligatorio por ese concepto.

## Cierre y anuncio web

Liberar inmueble muestra el estado documental, los faltantes y un acceso al expediente. El cierre se vuelve a validar en servidor, dentro de la transacción y con bloqueo de los registros documentales; no basta con que el formulario se haya cargado cuando estaba completo. Un rechazo conserva ficha activa, posición y anuncio.

La validación utiliza las condiciones de vendedor/comprador o arrendador/arrendatario y requiere archivos alojados para cada documento obligatorio aplicable. Los documentos opcionales o no aplicables no bloquean. Las notas admitidas durante la preparación no sustituyen archivos exigidos para cerrar. La asignación de comprador se describe como preparación del cierre, evitando exigir que la operación ya esté cerrada para reunir sus documentos.

La suspensión de venta sigue permitida con pendientes, porque no representa una operación concluida.

Cuando existe un anuncio, se muestra una casilla voluntaria para retirarlo. La confirmación indica si se retirará o se conservará. La decisión también está disponible al cerrar un alquiler. Carteles y redes continúan gestionándose por separado.

Si se elige retirada, su intención y versión se guardan en la misma transacción que el cierre/suspensión. El envío al portal ocurre después de confirmar la transacción. Si falla, el cierre permanece válido y se informa que el retiro está pendiente, con acceso a Publicaciones activas para reintentarlo. No se informa una retirada efectiva sin confirmación del portal. El operador también puede reintentar.

## Moneda uniforme, sin conversión automática

El registro inicial incluye Moneda del inmueble. La tasación hereda esa elección. Editar la moneda en tasación, en el cierre o en el borrador web de un inmueble de intranet uniformiza las monedas de sus importes relacionados, conservando los números existentes. Los nuevos montos ingresados expresamente se guardan con la moneda elegida.

Se sincronizan la moneda de la ficha, los tres importes de tasación, los registros de cierre vinculados, los importes de anuncios manuales y el borrador web. El cierre conserva su moneda para mostrar precio final, renta, comisión, garantía y adelanto correctamente; los contratos, la ficha y las exportaciones muestran esa moneda. Los reportes incorporan una columna Moneda del cierre.

Se conserva en el historial el estado anterior de los registros afectados y se indica que no hubo conversión automática. Los registros antiguos con monedas mezcladas no se reinterpretan masivamente al desplegar: requieren una elección explícita cuando se intenta modificarlos sin una moneda común.

La versión pública ya enviada se conserva como constancia de lo que el portal recibió. El borrador cambia de moneda, pierde las autorizaciones de publicación que corresponde revisar y aumenta su versión para rechazar ediciones concurrentes antiguas. La web se actualiza al revisar y publicar la nueva versión. No se sobrescribe una instantánea pública haciéndola pasar por un envío realizado.

Los anuncios antiguos de origen exclusivamente portal mantienen su edición propia, porque carecen de una ficha interna asociada sobre la que uniformizar tasación o cierre.

## Poderes y permisos

El expediente de alquiler incorpora una condición independiente para arrendador y arrendatario: Por verificar, firma personalmente o mediante representante. El poder es obligatorio solo al elegir representante. Una condición por verificar bloquea el cierre hasta definirla. Los archivos existentes se conservan aunque un requisito deje de aplicar.

Portal web tiene su propio layout privado, fuera del grupo exclusivo de administración. Sus API de inmuebles, anuncios anteriores, medios y portada verifican el permiso de Portal web en servidor. El receptor de integración conserva su autenticación independiente mediante token; no se abre como una API de operador.

El menú del operador muestra FASE 2 y FASE 3. La lectura del catálogo de zonas permite conservar el contexto, mientras que crear zonas y las demás acciones administrativas siguen restringidas. Los enlaces para completar datos desde Portal web abren la ficha y carpeta correspondientes.

## Esquema y conservación

Preparación aditiva e idempotente: `scripts/install-property-currency.mjs --apply` incorpora una columna nullable `moneda` en `inm_inmuebles` y otra en `inm_liberaciones`. No modifica importes, monedas anteriores ni documentos al desplegar. Los cierres antiguos sin moneda explícita conservan su interpretación anterior en PEN. Las condiciones de representación se guardan en el JSON existente del expediente, sin inventar respuestas para casos anteriores.

El comando de compilación de Vercel prepara esas columnas antes de compilar la aplicación. Los mecanismos anteriores de instalación se mantienen.

## Punto de restauración

Referencia de código anterior: `recovery/reglas-proceso-20261025`.

Historial completo anterior en `restore-points/reglas-proceso-20261025/anterior.bundle`, verificado con `git bundle verify`. Se conservan también `documentacion-previa.patch` y `estudio-previo.md`, porque el estudio de auditoría ya estaba en preparación antes de estos cambios. El directorio es privado y está excluido de Git y Vercel.

Restaurar código no revierte decisiones de negocio realizadas después. Las columnas nuevas pueden conservarse al volver al código previo; cualquier recuperación de registros debe contrastarse con el historial y con lo efectivamente enviado al portal. No se convierte ni se elimina documentación anterior durante la instalación.

## Verificación y publicación

- 41 archivos de pruebas unitarias aprobados, incluidas moneda heredada, rechazo de monedas mezcladas al editar, conservación de importes, documentos de cierre y poderes condicionados.
- ESLint de todos los archivos modificados sin advertencias. TypeScript y compilación webpack final aprobados (62 páginas), con límite de ejecución de cierre configurado para el envío al portal. Preparación de columnas repetida: idempotente, ambas correctas sin modificar importes.
- `tests/process-rules.integration.mjs`, con MySQL local y portal simulado: cierre incompleto rechazado sin liberar posición ni modificar anuncio; archivo retirado después de cargar pantalla detectado en servidor; conservar anuncio por decisión expresa; retirada confirmada; fallo remoto con cierre válido, solicitud persistida y reintento por operador.
- Moneda USD elegida al captar, heredada al tasar sin reenviarla; cierre y garantía en USD; cambio de moneda aplicado a tasación, anuncios y borrador manteniendo números; versión del borrador incrementada, autorizaciones invalidadas, edición antigua rechazada y versión pública anterior conservada. El cambio desde el borrador del operador también uniformiza la ficha.
- Operador: consulta, guardado y publicación de anuncio y portada aprobados; reintento aprobado; APIs de tasaciones, liberaciones y usuarios siguen rechazadas con 403. Receptor del portal conserva autenticación independiente.
- Expediente incompleto para cierre admite publicación web cuando cumple los requisitos propios del anuncio. Alquiler firmado personalmente puede cerrar sin poderes, con su documentación aplicable cargada.
- Chromium en 1440 y 375 px: FASE 2 y FASE 3 para operador, edición de representación, acceso a portada, cierre bloqueado y documentos faltantes, moneda heredada y casilla de retirar anuncio con confirmación tanto de conservar como retirar. Las confirmaciones visuales se cancelaron y la ficha se mantuvo activa. Capturas de escritorio y móvil inspeccionadas; sin errores de ejecución ni desbordes.
- Integraciones de listas/tarjetas/fases y panel/precios anteriores adaptadas a las nuevas reglas y aprobadas en ambos anchos: búsqueda, zona, historial de navegación, moneda común elegida explícitamente, conservación de importes y publicación, cierre con cambios y regreso al panel.
- Las escrituras fueron exclusivamente locales. Las fichas, archivos de metadatos, zonas, usuarios y sesiones ficticios se retiraron; el estado anterior de la portada local se restauró. No se cerraron operaciones ni se alteraron anuncios reales para probar.

Publicación pendiente de confirmación. La entrega utiliza la integración automática de `main` con el proyecto Vercel existente.
