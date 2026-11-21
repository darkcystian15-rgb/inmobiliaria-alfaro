# Texto por revisar y enlaces de redes sociales

Actualización del 1 de noviembre de 2026, posterior a `dpl_HLfVo3efcxAYKcWNXG1kZgT7FTJj`. Base Git conservada: `288e7060b41df8f9eafc2bfa67c102ff186a35b7`; el workspace contiene las entregas anteriores publicadas directamente desde fuentes locales.

## Texto por revisar

Se añade una señal de calidad calculada al consultar: un texto marcado como realizado o con publicación registrada que todavía contiene «DATO POR CONFIRMAR», «[COMPLETAR…]» o «[AGREGAR…]» se muestra como **Texto por revisar**. Los borradores no se confunden con textos realizados antiguos. No se altera el texto guardado, el indicador de publicación, sus fechas ni el historial al detectar el caso.

Textos pendientes incorpora estos casos y ofrece «Solo textos por revisar» con su contador. Textos registrados incluye los realizados sin marcadores. Publicaciones registradas conserva sus registros y añade un aviso y acceso a revisión cuando corresponde. Los contadores operativos de publicación y reportes conservan sus significados; la revisión es una señal adicional, no una reversión de etapa.

Cartera muestra la etiqueta en filas y tarjetas y el panel ofrece **Revisar texto**. Abre el editor de la ficha conservando zona e inmueble. Al completar o retirar los marcadores y guardar, la alerta desaparece en las consultas siguientes. Se conserva el evento habitual de modificación de texto y la publicación existente. Cambiar el texto no actualiza anuncios externos: revisarlos cuando corresponda.

El resumen de la ficha distingue la publicación registrada de la revisión del texto. En el editor aparece un aviso ámbar con instrucciones; el bloqueo de guardar como realizado mientras existan marcadores continúa vigente. No se inventa información para completar campos ni se elimina texto automáticamente.

Para corregir desde Cartera: abrir el inmueble → Texto Redes Sociales → Revisar texto → completar o retirar los marcadores → Guardar cambios del texto. Al volver a Cartera se consulta nuevamente la información y la etiqueta ya no aparece si no quedan marcadores.

## Redes sociales

«¿Dónde se publicó?» presenta Facebook, Instagram y Otra red con iconos SVG pequeños, acompañados por texto visible. No carga imágenes, fuentes ni servicios externos para los iconos.

Cada fila permite elegir la red y pegar el enlace; Otra red permite conservar o introducir su nombre. Se mantienen el límite de doce referencias, las validaciones HTTP(S) y la prohibición de credenciales en URL. Se admiten varios enlaces de una misma red. Los nombres y enlaces históricos se conservan mientras el usuario no los cambie o retire; las abreviaturas FB/IG se reconocen solo para su presentación.

Los enlaces siguen siendo opcionales. Si se añade una fila, se debe completar o retirar antes de guardar. Añadir un enlace no marca automáticamente «Publicado en redes sociales». Las referencias se presentan al elegir redes o ambos medios, y también si hay referencias anteriores aunque se haya seleccionado cartel, para permitir conservarlas o corregirlas.

## Respaldo, alcance y entrega

Respaldo previo: `restore-points/textos-revision-redes-20261101/fuentes-previas.tar.gz`, con app, lib, tests, docs y configuración, sin credenciales ni base de datos. Recuperar en otra carpeta y comparar antes de restaurar. No se agregan columnas ni se necesitan migraciones; no se hacen correcciones masivas a registros reales.

La entrega aislada conserva las mejoras anteriores y excluye los cambios locales previos de hosting PHP y precio de cierre de la lista. El despliegue compila con `npm run build -- --webpack`, sin instaladores anteriores y manteniendo el cron existente.

## Validaciones y publicación

- Ocho archivos de pruebas de revisión, flujo, API de guardado, difusión, plantillas, listados, carpetas y portal aprobados. Incluyen que un texto antiguo publicado entre a revisión, salga al corregirse y conserve su etapa/publicación; también distinguen borradores y reconocen redes sin cambiar nombres históricos.
- Next.js/webpack, TypeScript y 63/63 páginas: aprobados. ESLint de los archivos modificados y `git diff --check`: aprobados.
- Navegador local con componentes reales y APIs simuladas, 375/1440 px: corrección de texto antiguo, desaparición de la etiqueta en editor y fila de Cartera, conservación de la publicación, iconos, enlaces Facebook/Instagram y referencia anterior de otra red aprobados. Se mantienen las regresiones de extracción documental de la entrega anterior.
- Capturas: `output/textos-modelos/texto-por-revisar-*.png` y `redes-sociales-*.png`.

Destino verificado mediante CLI: `puma19/inmobiliaria-alfarov2`, proyecto `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`, equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. La publicación se creó primero sin cambiar el dominio y se promovió tras comprobar el build y el formulario de acceso de la aplicación.

### Publicación final

- Despliegue `dpl_67uUfoc4YAVA9ehTQdqHfo3doddv`: **READY**, producción, subido por CLI desde fuentes locales.
- [Intranet](https://intranet.inmobiliariaalbertoalfaro.com.pe).
- [Versión publicada](https://inmobiliaria-alfarov2-dpwyk1oao-puma19.vercel.app).
- [Panel de Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/67uUfoc4YAVA9ehTQdqHfo3doddv).
- Build final de Vercel: Next.js/webpack, TypeScript y 63/63 páginas aprobados; build de aproximadamente 48 segundos. No se ejecutaron instaladores ni migraciones.
- La API de Vercel confirmó que el alias de la intranet apunta al despliegue final. Los hashes de las fuentes publicadas de `publication-review.mjs`, el editor, los dos componentes de redes y las API de Cartera/publicaciones coinciden con las fuentes probadas.
- Antes de promover: `/login` respondió 200 mediante `vercel curl`, con formulario de la aplicación y sin pantalla de protección de Vercel.
- Después de promover, en el dominio: `/login` 200; `/cartera`, `/textos-pendientes`, `/registrar-textos` y `/registrar-publicaciones` 307 sin sesión; `/api/publicaciones` y `/api/cartera` 401 sin sesión.
- Logs `error`/`fatal` de esta versión, consulta puntual de 15 minutos a las 23:20 UTC del 1 de noviembre: sin registros.

La interfaz se verificó localmente con componentes reales y APIs simuladas. No se certifica el recorrido completo autenticado en producción. No se crearon usuarios o sesiones de prueba ni se modificaron inmuebles reales para verificar. La detección de textos por revisar es calculada y no requiere alterar registros antiguos.

El código, pruebas, MD y respaldos permanecen locales. Despliegue directo desde fuentes, sin nuevo commit remoto asociado. Conservar estas fuentes para que un despliegue futuro desde Git no retire las funciones publicadas. La configuración aislada sin instaladores se conserva en la entrega; el `vercel.json` original del workspace no se modificó.

