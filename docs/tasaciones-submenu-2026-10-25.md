# Tasaciones registradas como submenú por zona

25 de octubre de 2026. Sustituye la organización en pestañas descrita en [la entrega anterior](tasaciones-pestanas-2026-10-24.md).

## Comportamiento

- Registrar tasaciones conserva únicamente los pendientes, su buscador, formulario, borradores y confirmación. El título principal aparece una sola vez, sin pestañas ni segundo título repetido.
- Tasaciones negociadas registradas es un submenú inmediatamente debajo de Registrar tasaciones. Reutiliza la zona seleccionada al inicio; solo aparece dentro de una zona válida y solo consulta sus tasaciones aprobadas activas.
- Su buscador filtra al escribir por contacto, dirección o ID completo y ordena por posición. Incluye contador, limpiar búsqueda y mensajes distintos para zona sin registros y búsqueda sin coincidencias. Cambiar de zona reinicia la búsqueda.
- Conserva Actualizar valores e Ir a textos con la zona del inmueble. Después de registrar se ofrecen Registrar texto de este inmueble y Ver tasaciones negociadas registradas.
- Los enlaces anteriores con `pestana=registradas` redirigen al nuevo apartado conservando zona, inmueble y regreso.
- Documentos del expediente: «Copia literal o CRI» y «HR y PU del año de la venta». Conservan las claves internas `COPIA_LITERAL_CRI` y `HR_VENTA`, por lo que los archivos anteriores siguen asociados.

## Punto de restauración

Estado previo: `e7de4b3d6327a71e4b205a7a63f317c2527abf0d`.

Copia privada del historial completo: `restore-points/tasaciones-submenu-20261025/anterior.bundle`, excluida de Git y del despliegue. `git bundle verify` confirmó un historial completo válido. Para recuperar, abrir el bundle en otra carpeta y recuperar el código de la revisión previa, o revertir el commit funcional de esta entrega y volver a desplegar. No hace falta restaurar datos para revertir estos cambios de interfaz.

No se modifican el esquema, los datos comerciales, importes, monedas, permisos, textos ni archivos existentes como parte de esta actualización. Las pruebas con escritura usan exclusivamente MySQL local desechable.

## Verificación y publicación

ESLint y TypeScript aprobados; 40 archivos de pruebas unitarias aprobados. Compilación Next.js 16.3.8 con webpack aprobada: 62 páginas, incluida `/tasaciones-negociadas-registradas`.

Integración autenticada con MySQL local y Chromium aprobada en 1440 y 375 px: registro con moneda USD, título único, buscadores sin pestañas, búsqueda por contacto/dirección, limpiar filtro, contador, recarga, enlaces antiguos, zona vacía, cambio de zona con búsqueda limpia, y entradas sin zona/general/inexistente sin listado ni submenú. Conservados precios, monedas mixtas, etapa, fechas y publicación; edición y retorno a Cartera también aprobados. Sin errores de ejecución ni desbordes. Captura móvil del nuevo apartado inspeccionada. Los inmuebles, zonas y usuarios ficticios se retiraron al terminar.

## Producción

Código funcional `5ef970cbfc14a8df54b675a061ae8427a63a3a25`, subido a `main` junto con la referencia remota de restauración `recovery/tasaciones-submenu-20261025`.

Despliegue automático de Vercel `dpl_DgXtCQF1GvXVez5cCTgnLh2AL4DK`, estado **READY**, entorno **production**, versión https://inmobiliaria-alfarov2-hyf7dssr4-puma19.vercel.app. Vercel confirmó el alias https://intranet.inmobiliariaalbertoalfaro.com.pe.

Verificación HTTP del dominio público: `/login` responde 200; Registrar tasaciones y Tasaciones negociadas registradas con `zona=Chimbote` responden 307 a `/login` sin sesión, conforme al control de acceso. La prueba funcional autenticada se realizó en local; no se crearon usuarios ni registros ficticios en producción. La entrega documental posterior conserva exactamente este código funcional.
