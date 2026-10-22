# Fases de procedimientos en el menú lateral

22 de octubre de 2026. Base: `032236b`.

FASE 1 encabeza Panel de control y los grupos existentes hasta Administración.
FASE 2 encabeza Información de inmuebles y su acceso a ficha, documentos y fotos.
Cada fase es una sección semántica independiente del menú, con título de 18 px,
peso 800 y acento lateral rojo. Una línea y espacio separan la segunda fase.
Los títulos de grupo mantienen 12 px y los enlaces 13 px para distinguir los
niveles sin sobrecargar el menú de 288 px. Mismo diseño en escritorio y móvil.

El operador sigue viendo únicamente la sección permitida de Información de
inmuebles, ahora bajo FASE 2. Se conservan permisos, orden, rutas, zona activa,
estado seleccionado y cierre del menú móvil al navegar. Solo presentación;
sin cambios de datos, esquema ni condiciones de los procedimientos.

## Validación

ESLint sin advertencias y compilación de producción Webpack/TypeScript aprobados.
Navegador contra la compilación local: escritorio 1440 px y móvil 375 px;
secciones agrupadas y en orden, encabezados de 18 px, enlaces correspondientes
y cierre del menú móvil al navegar correctos. Cero errores JavaScript y cero
escrituras de negocio del navegador; cuenta y sesión temporales eliminadas.

Revisión independiente pendiente. La publicación se realiza por la integración
Git existente de Vercel. Las capturas de comprobación son privadas en output/.
