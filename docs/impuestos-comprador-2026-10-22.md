# Impuestos y revisión del comprador — 22 de octubre de 2026

Base: ecbbe5b. Publicación en Vercel autorizada por el usuario; verificación de producción pendiente.

- VENDEDOR_PAGO_MUNICIPAL conserva su clave y archivos; el rótulo pasa a Voucher de Pago de Impuestos Municipales, autovalúo y arbitrios.
- Se agrega VENDEDOR_CONSTANCIA_NO_ADEUDO_MUNICIPAL, constancia independiente obligatoria del vendedor en impuestos. La categoría se admite mediante el catálogo compartido cliente/servidor; no requiere migración.
- Cada carpeta con documentos propios del comprador (actualmente 1 y 4) explica cómo activarlos desde la carpeta 1. La nota confirma la asignación guardada o recuerda guardar cuando hay cambios pendientes. La detección usa el catálogo para incluir futuras carpetas con documentos del comprador.

## Revisión de todas las carpetas

| Carpeta | Comportamiento comprobado en código |
| --- | --- |
| 1. DNI y poderes | Activa documentos propios del comprador según natural/jurídica, al asignarlo y guardar condiciones. |
| 2. Documentos del inmueble | Documentos comunes de la ficha; se conservan al asignar comprador. |
| 3. Contratos | Arras, minuta y escritura son compartidos de la operación; admiten múltiples archivos, sin duplicación por parte. |
| 4. Impuestos y constancias | Liquidación, Alcabala, Formulario de Pago Alcabala y Comprobante de pago de alcabala del comprador se habilitan automáticamente con la asignación guardada. |
| 5. Servicios | El catálogo vigente exige recibos del vendedor. No incluye cambios de titularidad ni documentos del comprador; no se añadieron requisitos no definidos. |
| 6. Cargas | Común al inmueble y condicional a la declaración de cargas. |
| 7. Tasaciones | Común al inmueble; tasación express y tasaciones del propietario. |

La asignación no crea datos personales ni archivos: habilita las categorías correspondientes. Las rutas POST/PATCH validan las mismas condiciones persistidas. Desasignar conserva los archivos existentes.

Validación: pruebas de expediente y carpetas, ESLint del componente y TypeScript aprobados; git diff --check correcto. Nuevas pruebas cubren natural/jurídica, activación de impuestos, conservación al desasignar, documentos compartidos de todas las carpetas, voucher anterior y constancia nueva. Pruebas completas: 34 archivos aprobados, ESLint sin advertencias y compilación de producción Webpack/TypeScript correcta. Revisión independiente pendiente.

Ampliación solicitada: Alcabala y Formulario de Pago Alcabala son dos categorías obligatorias independientes del comprobante anterior, cuya clave y archivos se conservan. Pruebas cubren activación/desactivación natural/jurídica, reconocimiento en DOCUMENT_TYPES y que subir el comprobante no completa los otros documentos.

## Publicación

Se publica por la integración Git existente de Vercel. Respaldo privado previo de fuente y referencia Git en restore-points/impuestos-comprador-20261022/. Sin migraciones, reclasificación de archivos ni cambios de negocio. El tamaño máximo de copia literal se mantiene en 4 MB por archivo.

## Producción comprobada

Código funcional: 3cfcf4638fe12a0dc820136eddf4b830283bda7f (incluye impuestos de 8a6d7d1). Vercel dpl_egLz3mdYQ4fW6LLURaMe81SBaTMC: READY, alias intranet.inmobiliariaalbertoalfaro.com.pe confirmado.

Verificación autenticada: 22/10/2026, 21:28:15 UTC. Seis vistas escritorio/móvil (1440/375 px), categorías nuevas presentes en la API, activación según configuración guardada, notas visibles, buscador de zonas ausente y filas compactas sin desbordes. Cero errores de ejecución y escrituras de negocio del navegador. Cuenta temporal y sesión eliminadas.

La consulta de autorización para archivos grandes, sin subir ni registrar archivos, confirmó que los 50 MB todavía no están activos en el servicio de producción. Se entrega hosting/documentos.php preparado; queda pendiente instalarlo en cPanel y comprobar la configuración y el flujo real.

Evidencia agregada sin datos personales: [PRODUCCION.json](evidencia-impuestos-comprador/PRODUCCION.json).
