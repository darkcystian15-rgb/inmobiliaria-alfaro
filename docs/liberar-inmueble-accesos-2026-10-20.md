# Liberar inmueble desde el menú general, una zona y Cartera

Entrega del 20 de octubre de 2026. Solicitada junto con la publicación del
cambio de nombre de la pestaña Visitas a **Fotos** en Información de inmuebles.

## Funcionamiento

- Sin zona elegida, Seguimiento muestra **Liberar inmueble**. La pantalla
  presenta un selector de zona antes de consultar inmuebles activos.
- Con una zona activa, el menú abre el mismo módulo dentro de esa zona.
  El selector permite cambiar de zona; al cambiar se descarta la selección
  anterior de inmueble y se reinician los formularios de la pantalla.
- Al abrir la tarjeta de un inmueble activo en Cartera aparece **Liberar este
  inmueble**. El enlace abre `/liberar-inmuebles?zona=…&inmueble=…` con la clave
  interna del inmueble, muestra solo esa ficha y despliega sus opciones.
- Funciona también desde el listado general: el enlace usa la zona real de la
  ficha. Se conserva la búsqueda, estado y filtros de Cartera en el enlace de
  regreso. **Ver todos los inmuebles de la zona** retira la selección individual.
- Si una ficha ya no está activa, no existe o pertenece a otra zona, no se abre
  el formulario de otra ficha por sustitución; se muestra el aviso correspondiente.

Las opciones conservan su funcionamiento: cierre de operación a Histórico,
suspensión exclusiva de ventas y eliminación definitiva con dos confirmaciones.
Abrir el enlace no ejecuta ninguna de esas acciones. Los históricos no muestran
el nuevo acceso de liberación; las ventas suspendidas conservan su retorno existente.

## Datos y permisos

No hay migraciones, cargas ni cambios masivos de negocio. La API mantiene su
requisito de administrador y zona tanto para consulta como para escritura.
El selector general no habilita operaciones contra todas las zonas a la vez.
Se conservan transacciones, validaciones y limpieza durable de archivos.

## Pestaña Fotos

El nombre visible **Visitas** pasa a **Fotos** en Información de inmuebles.
Se conserva la clave interna y la compatibilidad de enlaces `pestana=visitas`,
así como la vinculación de fotografías a sus visitas.

## Verificación y entrega

- 32 archivos de pruebas unitarias aprobados; ESLint sin errores ni advertencias.
- Compilación de producción Webpack y TypeScript correcta fuera del sandbox.
  El intento restringido no pudo leer `tsc --showConfig`.
- `tests/sale-suspension.integration.mjs` sobre MySQL 8.4 local aislado y navegador:
  menú sin zona, selector, cambio a una zona vacía, acceso desde listado general,
  ficha única desplegada, opciones de cierre/suspensión/eliminación, regreso con
  búsqueda conservada, retirada del filtro individual y rechazo de ficha ajena
  o inexistente. Pestaña Fotos y enlace antiguo comprobados.
- Vistas de 1440 y 375 px, sin desbordamiento horizontal ni errores JavaScript.
  La navegación no intentó escrituras y conservó las tres fichas ficticias activas.
- La misma integración aprobó suspensión/retorno, Histórico, liberación de posición,
  conservación de relaciones, concurrencia, permisos y cierres de venta/alquiler.
- El primer ensayo arrancó antes de finalizar la compilación y se repitió sobre
  el build completo. Un selector de prueba demasiado estricto se corrigió antes
  de la ejecución satisfactoria; no se modificó la interfaz para satisfacerlo.

Las capturas privadas se guardan en `output/release-navigation/` y los registros
de prueba permanecen fuera de Git.

## Entrega GitHub e incidencia inicial de Vercel

Código `a9096378c58bde89f4c4719509757e02940ae202`, subido de forma atómica a
`main` y `feat/registro-simplificado`. Los commits documentales posteriores
conservan ese código funcional.

Intento autorizado de Production en el proyecto existente `puma19/inmobiliaria-alfarov2`:
`dpl_8aYxqfUHEsxLGX28f2ai4tG16R3j`. Vercel informa **Blocked** porque el autor
Git del commit no tiene permiso de despliegue en el proyecto. La identidad
autenticada de GitHub se comprobó como `Cystian`; la sesión de Vercel es
`darkcystian15-1398`. No se alteró la autoría para eludir el requisito de acceso.

[Detalle del intento](https://vercel.com/puma19/inmobiliaria-alfarov2/8aYxqfUHEsxLGX28f2ai4tG16R3j).
Este intento no acredita una publicación. Al comparar con el despliegue anterior
`dpl_8UCMW5eczaqxBVfzYqM6NgugCtd8`, se comprobó que Vercel había aceptado el mismo
autor y la misma cuenta. Por tanto, no se acreditó una pérdida de permisos y la
indicación inicial de que era necesario cambiar el acceso fue prematura.

Se solicitó después la publicación desde la integración Git existente mediante
`gitSource`, conservando repositorio, SHA y autor reales. Vercel aceptó la solicitud
sin cambiar permisos, cuentas, plan o autoría. La diferencia observada corresponde
a subir la copia local mediante CLI frente a resolver el commit desde GitHub.

## Publicación en Production

- SHA publicado: `d69d1e7c0a8c0cec31db8a771f8bcb36d277d1dc`, con el código
  funcional de `a909637` y su evidencia documental.
- Proyecto existente: `puma19/inmobiliaria-alfarov2`.
- Despliegue: `dpl_3HBhdyNUnp8b3X4UuJnHaSLqmoNj`, estado **READY**, Production.
- [Versión publicada](https://inmobiliaria-alfarov2-1u6xj8r4p-puma19.vercel.app).
- [Detalle Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/3HBhdyNUnp8b3X4UuJnHaSLqmoNj).
- Alias `intranet.inmobiliariaalbertoalfaro.com.pe` y
  `inmobiliaria-alfarov2-umber.vercel.app` confirmados mediante `inspect` y API.
- Los commits documentales posteriores conservan el mismo código funcional.

Comprobación autenticada del dominio terminada el `2026-10-20T02:14:08.201Z`:
siete zonas contrastadas con SQL, permisos de administrador y rechazo de acceso
anónimo/operador, 23 vistas/casos de navegación a 1440 y 375 px. Menú general,
selector, aislamiento por zona, acceso desde tarjeta, formulario desplegado,
regreso con búsqueda, ficha de zona ajena y pestaña Fotos correctos. Sin errores
JavaScript, respuestas HTTP fallidas, desbordes ni intentos de escritura del
navegador. No se confirmaron cierres, suspensiones ni eliminaciones reales.

La primera ejecución del comprobador de producción comprobaba la URL antes de
finalizar la navegación de regreso; se agregó la espera correspondiente y la
ejecución completa pasó, sin cambios del código desplegado. Cuentas y sesiones
temporales eliminadas en ambas ejecuciones. Evidencia privada en
`output/release-navigation/production/result.json`, `deployment.json` y capturas.

El contenedor y volumen MySQL desechables se eliminaron después de las pruebas.
No se modificaron inmuebles ni datos comerciales de producción. Las únicas
altas de verificación fueron cuentas y sesiones temporales, eliminadas al terminar.
