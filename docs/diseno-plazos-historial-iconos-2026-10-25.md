# Diseño de plazos, historial e iconos — 25 de octubre de 2026

## Cambios

- Plazos generales presenta una cabecera, una explicación del alcance y tarjetas por etapa con los días configurables.
- Visita, tasación, texto comercial, publicación y expediente documental tienen una nota que explica la actividad afectada.
- Se aclara que cada plazo se cuenta desde la activación de su etapa y que las fechas particulares prevalecen sobre los valores generales.
- La ficha muestra primero el historial, abierto inicialmente, con fecha, usuario y detalle de cada movimiento.
- Los plazos particulares conservan la actividad actual y agrupan los ajustes en «Ajustar fechas de este inmueble», con descripción y estado por etapa.
- Cada opción del menú tiene un icono propio; se conserva el estilo de trazo y se ocultan los SVG decorativos a lectores de pantalla.
- Se adapta la prueba de integración existente para abrir el bloque de ajustes antes de editar.

## Validación

- ESLint de los archivos de aplicación modificados: correcto.
- TypeScript (`npx tsc --noEmit`): correcto.
- Pruebas existentes `workflow-deadline.test.mjs`, `workflow-dates.test.mjs` y `workflow.test.mjs`: tres archivos aprobados.
- `git diff --check`: correcto.
- Compilación de producción con Webpack y TypeScript: 62 páginas, correcta. Se usó una URL de base local de prueba porque la configuración local contenía un valor inválido; no se modificó la configuración de producción.
- Revisión de componentes reales en Chromium a 1440 y 375 px, con API, sesión y contexto de zona simulados: cinco etapas, guardado general, guardado de fecha particular y retorno al plazo general correctos; historial abierto, 24 iconos distintos, sin errores JavaScript ni desbordamiento horizontal.
- Capturas y resultado privado en `output/diseno-plazos/`, excluido de Git y Vercel. Esta revisión de componentes no sustituye una prueba autenticada contra la base de datos.
- La prueba de integración de base de datos `workflow-deadline.integration.mjs` fue adaptada, pero no ejecutada.

No se cambian las reglas de cálculo, las API ni los datos de inmuebles.

## Publicación

- Código funcional: `325dec9790da5599e521bcbb1cb13966f8812a00`, publicado en `main`.
- Vercel: `dpl_HeM1jb4hNViFvxbCQHtkz5xzqp7c`, **Ready**, entorno **production**. GitHub confirmó `success` el `2026-10-25T13:43:27Z`.
- [Despliegue en Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/HeM1jb4hNViFvxbCQHtkz5xzqp7c).
- Versión: https://inmobiliaria-alfarov2-j6jx5pars-puma19.vercel.app.
- Dominio de producción confirmado por Vercel: https://intranet.inmobiliariaalbertoalfaro.com.pe.

La comprobación HTTP en producción verificó login disponible y acceso privado protegido. Las pruebas de edición y diseño se realizaron con datos simulados, sin modificar inmuebles ni plazos reales.

El commit documental posterior registra esta evidencia y conserva el mismo código funcional.
