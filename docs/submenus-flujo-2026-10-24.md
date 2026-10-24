# Seguimiento separado por tarea

24 de octubre de 2026. Reorganización solicitada de las bandejas y registros, conservando los datos existentes y el estilo de la intranet.

## Menú y recorrido

Seguimiento mantiene Visitas pendientes y Registrar visitas. Después ofrece, en este orden:

1. Tasaciones pendientes: inmuebles con visita realizada y sin tasación; abre Registrar tasaciones.
2. Registrar tasaciones: conserva los tres importes y sus selectores PEN/USD. Al guardar, ofrece Registrar textos.
3. Textos pendientes: tasación registrada sin texto realizado, incluidos los borradores.
4. Registrar textos: guardar borrador, realizar el texto y consultar/editar textos registrados. Completar el texto no exige elegir medios de publicación.
5. Publicaciones pendientes: texto realizado y acciones de cartel/redes aún sin completar.
6. Registrar publicaciones: elegir cartel, redes o ambos; confirmar cada acción; referencias de redes opcionales. Incluye consulta y actualización de publicaciones registradas.

El texto realizado sale de Textos pendientes y entra en Publicaciones pendientes. Guardar un borrador no adelanta la etapa. Si se eligen ambos medios, confirmar uno solo mantiene la publicación pendiente. Editar un texto realizado conserva las confirmaciones de publicación; una actualización de publicación es siempre explícita. No se publica automáticamente en Portal web, que conserva sus propias autorizaciones y requisitos.

## Alcance en el sistema

Menú lateral, títulos, selección de zonas, búsqueda por contacto/dirección/ID, orden por posición, Cartera y sus indicadores, panel, agenda, siguiente acción, ficha, plazos, historial y reportes usan el flujo separado. Información de inmuebles muestra carpetas distintas de Texto comercial y Publicación. Administrador registra; operador mantiene su consulta y sus restricciones existentes.

Las pantallas operativas requieren una zona de trabajo válida. Sin zona, con `zona=*` o con una zona inexistente, muestran un selector antes de consultar pendientes o abrir formularios. Los enlaces directos conservan inmueble, tarea, ancla y regreso al elegir zona. Las pantallas de pendientes muestran el listado y el enlace al registro correspondiente. Los registros permiten volver al listado o continuar al siguiente paso. El editor avisa antes de abandonar un formulario abierto sin guardar y bloquea enlaces mientras guarda.

La ruta anterior `/tasaciones-textos-pendientes` conserva zona, inmueble y regreso; redirige a Tasaciones pendientes, Registrar textos o Registrar publicaciones según el ancla/enlace anterior. Se conservan los enlaces de la carpeta anterior `publicacion` y los nombres antiguos de reportes y filtros, incluidos Texto pendiente, Difusión pendiente, Difusión completada, Material pendiente, Listos para publicar y Publicados.

## Conservación

No se cambian tablas, columnas ni valores almacenados para esta reorganización. Se reutilizan las API, permisos y estados existentes. No se ejecutan correcciones masivas ni se convierten monedas, borradores, publicaciones, medios, enlaces o fechas anteriores. La única modificación de la regla de guardado permite realizar el texto sin elegir todavía cartel/redes. Los estados internos `texto_pendiente`, `difusion_pendiente` y `completada` se conservan.

Código anterior: `b0c0186c293184fccd3b4f538658bb41c7120fb4`. Copia privada del historial completo verificada: `restore-points/submenus-flujo-20261024/anterior.bundle`. Los cambios previos de texto/difusión mantienen además su respaldo documentado en `docs/texto-difusion-2026-10-24.md`. La recuperación de código no requiere restaurar datos ni eliminar las columnas existentes.

## Verificación y publicación

- 39 archivos de pruebas unitarias aprobados; separación de etapas, regreso/zona y compatibilidad de registros anteriores.
- TypeScript y ESLint aprobados. Compilación local Next.js webpack aprobada, 61 páginas, con MySQL 8.4 desechable.
- Integración HTTP local aprobada: texto realizado sin medios, borrador pendiente, tres combinaciones de medios, confirmación parcial, referencias opcionales/seguras, fechas conservadas al editar, permisos y coincidencia con panel/reportes. Alias antiguos de reportes también aprobados.
- Chromium autenticado local en 1440 y 375 px: cinco pantallas separadas, registro y edición de texto, borrador, medios elegidos después, ambas confirmaciones, consulta de publicaciones registradas, redirección de la ruta antigua y consulta de las carpetas nueva/antigua por operador sin botones de edición. Sin errores de ejecución ni desbordes; capturas de escritorio y móvil inspeccionadas.
- Todas las escrituras de prueba usan inmuebles y usuarios ficticios en MySQL local; se retiran al terminar.

## Producción

Código funcional `ca0fc7cfa5038c093084b3a08e81c08ee5b58236`, publicado automáticamente desde `main`. Despliegue Vercel `dpl_GwSbvdWDdgWyToQzja9hsheA5oy3`, READY en production, versión https://inmobiliaria-alfarov2-178kvvlsu-puma19.vercel.app. Alias de la intranet confirmado: https://intranet.inmobiliariaalbertoalfaro.com.pe.

Chromium autenticado sobre el dominio público el 24 de octubre a las 21:12 UTC: las cinco pantallas nuevas devolvieron 200 y mostraron sus títulos/listados en 1440 y 375 px. Sin errores de ejecución, avisos de error de aplicación ni desbordes. Las peticiones del navegador se limitaron a GET/HEAD/OPTIONS; cero escrituras de negocio. Administrador obtuvo 200 en inmuebles, publicaciones y el reporte de publicaciones pendientes; operador consultó inmuebles con 200 y tuvo 403 en las dos API administrativas, conforme a los permisos existentes.

La preparación de sesiones y la comparación se ejecutan en versiones privadas con `--skip-domain`, sin sustituir el dominio funcional. Huella de las 27 tablas de negocio previa a esta comprobación: `83948ced7079e97d9ce4fa2e49d49e156e41cf9a6b962f3dbdd5c8c8f03577d1`. Estado: 131 inmuebles, 36 tasaciones, 58 visitas, 13 archivos y cero textos/publicaciones registrados. No se cargaron textos ni publicaciones ficticios en producción. Evidencia privada en `output/submenus-workflow/` y logs de mantenimiento bajo `output/`.

Las dos cuentas técnicas y sus sesiones se retiraron a las 21:12:30 UTC; el acceso posterior con ambos tokens devolvió 401. La comparación de las 21:12:31 UTC conserva exactamente la misma huella de las 27 tablas, incluidos sus conteos y valores. La comprobación autenticada no alteró datos de negocio. El MySQL local de pruebas quedó detenido.


## Corrección: submenús solo dentro de una zona

Registrar inmueble y las parejas de visitas, tasaciones, textos y publicaciones solo se muestran después de seleccionar una zona válida. Se ocultan al volver a Cartera por zonas o al listado general. Menú y entrada a pantallas comparten una misma lista de rutas para evitar diferencias entre visibilidad y acceso directo.

Los resúmenes generales del panel y Cartera se conservan; sus accesos piden elegir zona antes de operar. La agenda conserva la zona concreta de cada inmueble y los accesos del panel mantienen la zona actual. El acceso a publicación desde una ficha de Cartera general utiliza la zona del propio inmueble. Dentro de una bandeja, Todas las zonas regresa a Cartera y retira el contexto de trabajo.

No se alteran esquemas, permisos, monedas ni estados de negocio.

Validación local: 39 archivos unitarios aprobados, ESLint sin advertencias y build Next.js webpack con TypeScript aprobado (61 páginas). Integración con MySQL desechable y Chromium en 1440/375 px aprobada: sin zona, zona general, zona inexistente, elección de zona manteniendo inmueble/regreso, nueve submenús con la zona correcta, inmueble de otra zona sin formulario, rechazo del guardado desde otra zona sin modificar datos, recorrido de texto/publicación, enlace antiguo sin zona y con ancla, regreso a vista general y navegación Atrás/Adelante. Se conservan estados, fechas y permisos; sin errores de ejecución ni desbordes.

Huella de las 27 tablas de producción anterior al despliegue: `83948ced7079e97d9ce4fa2e49d49e156e41cf9a6b962f3dbdd5c8c8f03577d1` (24 de octubre, 21:22:55 UTC). Publicación, verificación de producción y retirada de sesiones pendientes de consignar.
