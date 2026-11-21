# Publicación pendiente en rojo suave

Se sustituye el naranja oscuro por fondo rojo suave, texto con el rojo de la inmobiliaria `#c80000` y borde rojo claro. Filas y tarjetas de Cartera, posición y leyenda usan la misma categoría cromática; Visita pendiente conserva ámbar y las demás etapas no cambian. Es un ajuste visual sin modificaciones de datos, precios, permisos ni estados de negocio.

TypeScript, ESLint y revisión de espacios: aprobados. Chromium a 375 y 1440 px, componentes reales y APIs simuladas: cuatro fondos distintos para visita, tasación, texto y publicación, coherentes entre filas y tarjetas; regresiones del editor aprobadas.

Respaldo previo: `restore-points/publicacion-rojo-suave-20261031T190402Z/antes.tar.gz`. Producción anterior: `dpl_C4DxZhHxYEqQMXBZ8zGdPvXSXb5d`. La copia del workspace incluye cambios locales anteriores no publicados; comparar siempre en otra carpeta antes de restaurar. La entrega aislada modifica únicamente los tres archivos visuales y conserva excluidos los ajustes locales ajenos de precio de cierre y hosting PHP. No requiere restaurar la base de datos.

Destino: `puma19/inmobiliaria-alfarov2`, dominio `intranet.inmobiliariaalbertoalfaro.com.pe`. Despliegue final `dpl_CA8tFUSZysnHkMh6iw5dLJ65goAf`, estado **READY**, producción. Vercel confirmó el alias de la intranet en esta versión. [Versión publicada](https://inmobiliaria-alfarov2-1a3742jna-puma19.vercel.app). Fuentes, pruebas y MD conservados localmente; publicación directa desde fuentes, sin nuevo commit remoto.
