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

Las pantallas nuevas aceptan una zona, todas las zonas o acceso directo por inmueble. Las pantallas de pendientes muestran el listado y el enlace al registro correspondiente. Los registros permiten volver al listado o continuar al siguiente paso. El editor avisa antes de abandonar un formulario abierto sin guardar y bloquea enlaces mientras guarda.

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

Publicación y comprobación final de producción pendientes de consignar.
