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

La revisión real quedó completada mediante la autorización posterior de Vercel. Su alcance, las 15 correcciones y los dos casos pendientes se detallan al final. La conexión protegida no se descargó a Codespaces.

## Verificación

- 37 archivos unitarios aprobados; incluyen monedas independientes, compatibilidad de ediciones parciales, rechazo de monedas inválidas y detección de notas ambiguas.
- ESLint sin advertencias y TypeScript aprobado.
- Compilación de producción Next.js webpack aprobada con MySQL local aislado, 57 páginas. Los cambios menores posteriores de mensajes e historial se verificaron con TypeScript y ESLint; el árbol final también completó el build de Vercel.
- Integración HTTP contra MySQL 8.4 desechable: registro mixto PEN/USD, validación, permisos, lectura en APIs de tasación/publicación/ficha/Cartera, edición de los tres montos, conservación en PATCH parcial, etapa intacta y anuncio pendiente al cambiar solo moneda. Aprobada. Las escrituras son exclusivamente ficticias y locales.
- Instalador probado dos veces sobre tablas antiguas ficticias: añade columnas PEN sin modificar números ni notas; segunda ejecución sin cambios.
- Navegador Chromium autenticado, escritorio 1440 px y móvil 375 px: editor con tres selectores, cambio de monedas y guardado real exclusivamente local; sin errores de ejecución ni desbordes. Captura móvil revisada.

## Publicación

- Código funcional: `2ca23691ffc21bebc86accef511811bf0aedbf8a`, enviado a `origin/main`.
- Vercel: `H53SMLfwCkX6nnVJxARWMe6q56HH`; estado GitHub **success**, «Deployment has completed».
- Production GitHub: `7290300509`, **success**, `2026-10-23T22:40:17Z`, para el mismo SHA.
- URL de versión: https://inmobiliaria-alfarov2-dnmz68isn-puma19.vercel.app.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe. Comprobación pública posterior: ruta de registro redirige a /login (307), login responde 200.
- El comando de build configurado ejecuta la preparación aditiva de columnas antes de compilar; la entrega completada implica que esa comprobación/preparación y la compilación terminaron sin errores. La publicación inicial no consultó filas de clientes. La revisión posterior autorizada se detalla al final.
- Sin prueba autenticada de pantallas en producción: no se dispone de credenciales ni sesión en este entorno. Las verificaciones de guardado se realizaron en MySQL local aislado, cuyas cuentas, datos y contenedor se retiraron al terminar.
- La búsqueda posterior de observaciones reales y la corrección de monedas explícitas se completaron según el apartado siguiente; dos notas generales siguen pendientes de aclaración.

Este cierre documental mantiene el código funcional publicado. La comprobación pública del login no sustituye una prueba autenticada de las pantallas ni la revisión de observaciones reales.


## Revisión real y corrección de observaciones — 23 de octubre

El usuario autorizó Vercel mediante su flujo de dispositivo. DATABASE_URL está protegida y no admite descarga; se ejecutaron tareas temporales con la configuración privada de producción y `--skip-domain`, sin sustituir el dominio publicado. El primer intento temporal ejecutó el build habitual porque el archivo de configuración alternativo externo no sustituyó al vercel.json del proyecto; no realizó la búsqueda ni correcciones. Se ajustó la configuración del paquete temporal y se restauró la original local al terminar cada subida.

La lectura de `2026-10-23T22:55:55.901Z` consultó **131 inmuebles, 29 tasaciones y las observaciones de visitas**. Encontró **17 fichas con menciones a dólares**. En **15** la nota identifica expresamente el precio de cierre; las otras **dos** son notas generales o incluyen una negociación propuesta. No se extrapoló la moneda a los tres importes de la ficha.

- Se corrigió únicamente `precio_objetivo_moneda`, de PEN a USD, en las 15 fichas identificadas: **15 monedas corregidas**.
- Se conservaron los tres importes numéricos, las notas y las monedas de tasación/salida. No se aplicó tipo de cambio ni se aceptaron propuestas de importes contenidas en las observaciones.
- Las dos notas generales permanecen pendientes de aclaración sobre a qué montos aplican. La selección de los tres montos en dólares no se presume a partir de silencio del usuario.
- La consulta posterior verificó que las 17 coincidencias mantienen todos sus importes, notas y demás monedas. La misma transacción comprobó que el resto de columnas de cada tasación se mantiene, salvo su fecha técnica de actualización.
- Cada corrección registra `moneda_tasacion_revisada` en el historial con origen técnico explícito, responsable administrador y copia anterior/posterior completa de la tasación. El script no cambia la etapa, las publicaciones ni los anuncios externos.

Ejecución: `scripts/scan-appraisal-observations.mjs` para lectura y `scripts/apply-reviewed-appraisal-currencies.mjs` con un plan privado explícito para corrección. El plan no forma parte del repositorio ni del build habitual. La transacción bloquea inmueble y tasación, comprueba que importes/notas/monedas coincidan con la lectura revisada y revierte todos los cambios ante una discrepancia. Un reintento con un plan anterior detecta las monedas modificadas y no repite la operación.

Prueba MySQL local desechable aprobada: corrección limitada al campo indicado, importes/notas intactos, historial anterior/posterior y rollback completo cuando la segunda fila no coincide. ESLint de los scripts y prueba sin advertencias. Los datos ficticios se retiraron con su contenedor.

Evidencias privadas excluidas de Git: `restore-points/monedas-20261023/antes.json`, `plan.json`, `despues.json` y logs de lectura/aplicación. Contienen las identidades y notas revisadas; no se publican aquí.

Tarea de lectura: `dpl_3rwjMEKAW1knBwQLuQSS154DeMrx`. Tarea de corrección: `dpl_H5iVxagPCYKTUgfiMRZnmgX6eiTt`, versión `https://inmobiliaria-alfarov2-lmmhxzmkx-puma19.vercel.app`, con confirmación de transacción a las **2026-10-23T22:58:47.546Z**. La lectura posterior corresponde a **2026-10-23T22:58:47.821Z**. Ambas usan la base real, sin publicar las configuraciones temporales en el dominio. El dominio conserva el flujo normal y muestra la moneda guardada al volver a cargar.
