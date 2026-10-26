# Carpetas compactas y colores por bandeja

26 de octubre de 2026.

## Cambios

Los listados de inmuebles usan pequeñas carpetas con pestaña, bordes suaves y disposición adaptable: una columna en móvil y dos en pantallas grandes. Se distinguen con tonos suaves por actividad:

| Apartado | Color |
| --- | --- |
| Visitas pendientes | Ámbar |
| Tasaciones pendientes | Naranja |
| Textos pendientes | Violeta |
| Publicaciones pendientes | Celeste |
| Tasaciones negociadas registradas | Verde |

Tasaciones negociadas registradas conserva la búsqueda, contacto, identificación, ubicación y los tres importes con sus monedas; los valores se presentan separados y se mantienen los accesos a actualizar valores e ir a textos.

Publicaciones pendientes comparte el componente de listado con las otras bandejas: las carpetas celestes se mostrarán al existir registros. No se crean datos ficticios en producción. El mismo componente aplica los colores a los listados de Registrar textos y Registrar publicaciones, incluidos sus registros completados; las etiquetas de completado conservan el verde.

Se mantienen filtros, orden, estados y enlaces. No se modifica la base de datos, los montos ni las reglas del proceso. Las carpetas de selección de zona conservan su diseño existente.

## Restauración

Revisión previa: `9a8f5ec6595fef1758861b7a41fc29ba35234c4e`. Bundle completo en `restore-points/carpetas-bandejas-20261026/anterior.bundle`, excluido de Git y Vercel. Bundle verificado con `git bundle verify`; SHA-256: `33cb3b3abe2635742bfe770aff083b7335294815b9c7c714ff1719a6c2be9e1e`. Para recuperar la presentación anterior, revertir el commit funcional de esta entrega y volver a desplegar. No requiere migraciones ni restaurar datos.

## Verificación

ESLint de los tres archivos modificados, TypeScript y pruebas existentes de búsqueda/listado y flujo de publicación aprobados. `git diff --check` sin errores.

Compilación Next.js 16.3.8 con webpack y TypeScript aprobada: 63 páginas generadas. Se utilizó una URL MySQL local de prueba sintácticamente válida, sin conexión a producción. La ejecución en el sandbox no pudo leer la salida de configuración de TypeScript; la compilación fuera del sandbox terminó correctamente.

No se ha realizado una comprobación visual autenticada con datos actuales de producción.

## Publicación

Commit funcional `309c4ff214172e2f7874a3054395e0f390544cea`, publicado en `origin/main`.

GitHub confirmó el despliegue de Vercel para ese SHA exacto, entorno **Production**, estado **success**, descripción «Deployment has completed», el 26 de octubre de 2026 a las 12:58:43 UTC. Despliegue GitHub `7332412506`; referencia Vercel `BPXYLHRxXMoqwiUVvRUbBAtd22WQ`. Versión: https://inmobiliaria-alfarov2-omjj17maz-puma19.vercel.app.

Dominio comprobado: https://intranet.inmobiliariaalbertoalfaro.com.pe. `/login` responde 200; `/cartera` responde 307 hacia `/login` sin sesión; `/api/tasaciones` responde 401 sin sesión. Estas comprobaciones validan disponibilidad y protección de acceso, no una revisión visual autenticada.

La API directa de Vercel rechazó el token local con 403 (`invalidToken`); la confirmación del despliegue procede de los estados publicados por Vercel en GitHub, incluido el entorno Production y el SHA correspondiente.

La actualización documental posterior conserva el mismo código funcional.

## Corrección: reutilizar las carpetas de Cartera

La primera entrega usaba dos columnas fijas y una composición distinta, por lo que algunas carpetas se veían demasiado anchas. Se sustituye esa composición por el componente real `PortfolioPropertyCard` y la misma cuadrícula `property-position-grid` que usa Cartera. La cuadrícula distribuye columnas según el espacio disponible, con un mínimo de 14 rem (224 px); en móvil mantiene una columna. No se cambia la cuadrícula existente de Cartera.

Visitas pendientes, tasaciones pendientes, textos pendientes, publicaciones pendientes y tasaciones negociadas registradas comparten ahora la forma, pestaña, posición, contacto y resumen de Cartera. Se conservan los cinco colores de esta entrega. Las bandejas sin precio consultado no muestran un importe supuesto ni un bloque vacío de precio; las tasaciones registradas conservan los tres valores con sus monedas y el acceso a textos. Los plazos y la antigüedad de las visitas se mantienen.

El componente permite navegar a la tarea mediante enlace, mientras Cartera conserva su botón para abrir el detalle. Se preservan los datos, filtros, enlaces y estados. La referencia anterior a esta corrección es `7683d25`.

Verificación de la corrección: ESLint de los cuatro archivos y tres pruebas existentes de listado, búsqueda y flujo de publicación aprobados. Compilación webpack y TypeScript aprobada, con 63 páginas generadas y la misma URL local de prueba sin conexión a producción. No se realizó revisión visual autenticada. Corrección publicada en `origin/main`: `d1f5d3f951a320ea4926ca204dec6752a7c8bfa4`. Vercel confirmó ese SHA en **Production**, estado **success**, el 26 de octubre de 2026 a las 13:21:51 UTC. Despliegue GitHub `7332908161`, referencia Vercel `4kEdB31aeDfmiKFuXzrGrA9H1giQ`. Versión: https://inmobiliaria-alfarov2-icjp9rzcb-puma19.vercel.app. El dominio de la intranet respondió 200 en `/login`. La actualización documental posterior conserva el mismo código funcional.
