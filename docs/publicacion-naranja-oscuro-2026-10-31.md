# Publicación pendiente con naranja oscuro

El naranja claro de Publicación pendiente se confundía con el ámbar de Visita pendiente. En Cartera, la etiqueta ahora utiliza fondo naranja oscuro sólido (`orange-700`) con texto blanco; filas, tarjetas, posiciones y leyenda usan el mismo tono. Visita conserva ámbar claro y las demás etapas conservan su color.

Validación: compilación aislada Next.js/webpack y TypeScript aprobados, 63/63 páginas; ESLint y revisión de espacios correctos. Chromium a 375 y 1440 px, componentes y CSS real compilado: visita, tasación, texto y publicación tienen cuatro fondos distintos, coherentes entre filas y tarjetas. Revisión visual del resultado móvil aprobada. Los datos y APIs de la prueba de navegador son simulados.

No cambia datos, estados de negocio, precios ni reglas de publicación. La entrega reutiliza las fuentes aisladas anteriores y modifica únicamente tres archivos de aplicación; conserva excluidos los ajustes locales previos de precio de cierre y hosting PHP.

Respaldo: `restore-points/publicacion-naranja-oscuro-20261031T185656Z/antes.tar.gz`; producción anterior `dpl_kMud4oDLLfddCjZitjsf7zo4gted`. Extraer en otra carpeta y comparar antes de recuperar archivos, porque el respaldo del workspace conserva cambios locales anteriores no publicados. No requiere restauración de base de datos.

Publicación: proyecto `puma19/inmobiliaria-alfarov2`, dominio `intranet.inmobiliariaalbertoalfaro.com.pe`. Despliegue final `dpl_C4DxZhHxYEqQMXBZ8zGdPvXSXb5d`, estado **READY**, producción. La API de Vercel confirmó el dominio de la intranet asociado a esta versión. [Versión publicada](https://inmobiliaria-alfarov2-fp7jigbu6-puma19.vercel.app). Código, prueba y documentación conservados localmente; despliegue directo desde fuentes, sin nuevo commit remoto.
