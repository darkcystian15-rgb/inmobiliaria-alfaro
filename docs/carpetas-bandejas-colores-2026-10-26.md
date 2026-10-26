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

Publicación pendiente de confirmar. No se ha realizado una comprobación visual autenticada con datos actuales de producción.
