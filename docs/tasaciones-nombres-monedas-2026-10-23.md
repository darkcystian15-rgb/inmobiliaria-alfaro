# Tasaciones: nombres y moneda por monto

23 de octubre de 2026. Cambio autorizado sobre `main`, incluido Markdown y publicación en Vercel.

## Comportamiento

En venta se conservan los mismos campos e importes con estos nombres:

| Nombre anterior | Nombre actual | Campo interno conservado |
| --- | --- | --- |
| Precio de tasación | Tasación de Inmobiliaria | valorReferencia |
| Precio objetivo | Precio de cierre aceptado por propietario | precioObjetivo |
| Precio de venta acordado | Precio de salida | precioVenta |

Cada importe tiene su propia moneda: soles (PEN, S/) o dólares (USD, US$). Cambiar la moneda conserva el número: no aplica un tipo de cambio. Los registros anteriores mantienen la interpretación PEN hasta una corrección explícita.

Registro de tasaciones incorpora tres selectores. El editor compartido de Tasaciones y textos pendientes e Información de inmuebles → Fase 1 → Valores de tasación permite editar los tres importes, sus monedas y la observación. Guarda sin cambiar la etapa del inmueble ni su publicación. Los clientes anteriores que envían solo precioVenta conservan los otros importes y monedas.

Ficha, resumen, Cartera, lista compacta, preparación de publicación e historial muestran las monedas. Alquiler conserva sus nombres de renta y admite moneda por monto. Reportes conserva el criterio anterior de su columna de precio objetivo, con el nuevo nombre y moneda explícita; PDF y Excel conservan el símbolo. Los importes de cierre real de venta/alquiler son campos independientes y no se reinterpretan.

Los anuncios externos registran su moneda y detectan diferencias de moneda además del importe. El portal recibe la moneda como referencia para nuevos borradores. Los borradores y publicaciones existentes conservan sus decisiones; no se publica ni modifica automáticamente un anuncio público.

## Preparación de base y despliegue

Se añaden cuatro VARCHAR(3) NOT NULL DEFAULT 'PEN': tres en inm_tasaciones y uno en inm_anuncios. SQL de referencia: db/adaptations/appraisal-currencies.sql. No hay renombrados de columnas ni conversiones de valores.

scripts/install-appraisal-currencies.mjs comprueba columnas por defecto; --apply añade solo las ausentes y verifica la definición existente. Usa exclusión mutua para builds concurrentes, respeta la configuración TLS y admite reintentos después de una preparación parcial. vercel.json lo ejecuta antes del build usando DATABASE_URL privado del proyecto; si falla, no se publica la nueva aplicación. Es un cambio aditivo compatible con la versión anterior; no ejecutar migraciones antiguas ni el instalador histórico de precios simulados.

## Revisión de notas en dólares

Solicitud adicional: buscar observaciones que indiquen dólares americanos y corregir la moneda cuando corresponda. scripts/review-appraisal-currencies.mjs revisa notas de tasación y observaciones del inmueble; detecta dólares/dolares, USD y US$. Es de solo lectura por defecto y guarda candidatos únicamente en un archivo privado mediante --output. Las sugerencias de campos son pistas para revisión, nunca se aplican automáticamente. --apply-plan requiere actorId de administrador activo y un plan revisado y verifica que la nota y monedas no hayan cambiado; modifica solo la moneda a USD y registra historial.

La consulta y corrección de datos reales está pendiente: esta sesión no dispone de DATABASE_URL local ni de una sesión autenticada de producción. No se afirma que no haya candidatos y no se han cambiado monedas de clientes por inferencia.

## Verificación

- 37 archivos unitarios aprobados; incluyen monedas independientes, compatibilidad de ediciones parciales, rechazo de monedas inválidas y detección de notas ambiguas.
- ESLint sin advertencias y TypeScript aprobado.
- Compilación de producción Next.js webpack aprobada con MySQL local aislado, 57 páginas. Los cambios menores posteriores de mensajes e historial se verificaron con TypeScript y ESLint; Vercel compilará el árbol final.
- Integración HTTP contra MySQL 8.4 desechable: registro mixto PEN/USD, validación, permisos, lectura en APIs de tasación/publicación/ficha/Cartera, edición de los tres montos, conservación en PATCH parcial, etapa intacta y anuncio pendiente al cambiar solo moneda. Aprobada. Las escrituras son exclusivamente ficticias y locales.
- Instalador probado dos veces sobre tablas antiguas ficticias: añade columnas PEN sin modificar números ni notas; segunda ejecución sin cambios.
- Navegador Chromium autenticado, escritorio 1440 px y móvil 375 px: editor con tres selectores, cambio de monedas y guardado real exclusivamente local; sin errores de ejecución ni desbordes. Captura móvil revisada.

## Publicación

Pendiente de registrar SHA y estado real de Vercel después de enviar la entrega. La comprobación pública del login no sustituye una prueba autenticada de las pantallas ni la revisión de observaciones reales.
