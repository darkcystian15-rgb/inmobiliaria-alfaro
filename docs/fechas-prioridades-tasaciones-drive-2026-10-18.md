# Fechas de prioridades y contraste de tasaciones con Drive — 18 de octubre

## Cambio de presentación

Prioridades de trabajo deja de mostrar «Automático» y «Asignado» junto al límite. Se conserva la fecha límite de atención y la actividad pendiente. La eliminación de la etiqueta no cambia el cálculo, la antigüedad, la posición, la fecha real de una visita ni los plazos particulares guardados.

La decisión de contar un plazo desde la fecha histórica de la actividad o desde su registro en el sistema se consulta por separado. Esta entrega no modifica esa regla sin una definición del usuario.

## Origen comprobado de las fechas

- Consulta de producción del `2026-10-18T18:55:04.087Z`: 12 visitas completadas de inmuebles activos, ninguna tasación operativa y ningún archivo de tasación registrado en la consulta de esa tabla documental.
- Las visitas incluyen fechas reales guardadas de 2025 y 2026. Se registraron después de la carga, bajo la cuenta administradora habitual. El identificador de la cuenta no demuestra por sí solo quién estaba operándola.
- Los eventos del historial distinguen fecha de registro y fecha de visita. Los límites de 2025 resultan de sumar el plazo de tasación a una visita fechada en 2025; no son fechas de una tasación importada.
- Los scripts de sustitución de zonas crean inmuebles, posiciones y eventos de registro. No crean visitas completadas ni tasaciones. Sus manifiestos solo contienen identificación, operación, tipo, dirección y contacto; no incorporan fechas de los documentos interiores de Drive.
- Plazos encontrados: visita 2 días, tasación 3, material 3 y publicación 2. Se conservan sin modificación.

## Revisión documental

Se inspeccionaron 30 archivos de tasación/valorización mediante el conector de Drive y se obtuvo texto de 29. Es una revisión dirigida, no un inventario exhaustivo de Drive. Se contrastaron las carpetas de origen con los manifiestos de carga y las posiciones actuales: 27 documentos tienen correspondencia por carpeta con 21 inmuebles cargados. Esa correspondencia no equivale a validar el contenido para ese inmueble.

Hallazgos que impiden una actualización masiva fiable:

- Un archivo tiene un contacto y una dirección en el nombre, pero otro inmueble en el encabezado interno.
- Otro archivo nombra al inmueble esperado, pero su cálculo describe una dirección y un contacto diferentes.
- Un PDF situado en una carpeta identifica a otro propietario y dirección. También diferencia fecha de portada, referencia e inspección. No escoger una fecha sin verificar su significado.
- Dos informes contienen fecha explícita de valuación `16/08/2024`, pero corresponden a lotes diferentes dentro de una misma carpeta. No sumar, sustituir ni confundir los dos predios.
- Una comparativa contiene hojas de dos inmuebles. Cada hoja requiere correspondencia propia; el nombre del archivo no identifica todos los valores interiores.
- Hay importes de venta en dólares, valores en soles y estimaciones de renta. No convertirlos automáticamente en los tres precios negociados del formulario ni en rentas mensuales.
- El contenido legible de las primeras 19 hojas revisadas no muestra una fecha de tasación explícita. La fecha de modificación de Drive no se usa como fecha de tasación.
- Un PDF no devolvió texto legible; queda pendiente de lectura visual/OCR. Tres documentos pertenecen a carpetas sin correspondencia en la selección numerada cargada; no se crean fichas por similitud de nombre.

## Resultado y continuidad

No se actualizaron fechas, precios, operaciones, documentos ni etapas de los inmuebles. No se importaron tasaciones ni se repitieron cargas. Se preparó una relación privada de candidatos para completar únicamente los casos con identidad, fecha, moneda y significado de importes confirmados.

Antes de registrar una tasación operativa se debe distinguir el informe de valorización del acuerdo comercial con el propietario. El sistema actual exige tres precios positivos y una fecha válida coherente con la visita. Un documento antiguo no acredita por sí mismo ese acuerdo ni convierte la actividad en completada.

Evidencia privada, excluida de Git y Vercel: `output/investigacion-fechas/database-before.json`, `current-properties.json`, `drive-expanded-matches.json` y `revision-tasaciones.md`. Incluye correspondencias, fuentes y discrepancias; no se publica información documental o comercial de clientes en este informe.

Validación del cambio de interfaz y evidencia de publicación: se registrarán al terminar la entrega. La auditoría previa publicada conserva sus pruebas completas y su recuperación desde `237b9d7`.
