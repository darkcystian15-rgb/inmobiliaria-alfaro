# Fase 4: anuncios anteriores al registro en intranet

## Resultado

«Publicaciones activas» consulta tanto los envíos de intranet como el catálogo
anterior del portal. El catálogo anterior se administra con su información pública
actual: editar texto/precio, seleccionar y ordenar fotos, cambiar portada, destacar,
actualizar, suspender, retirar y republicar. Conserva ID y enlace web. No requiere
crear un inmueble interno, vincularlo ni adjuntar documentos retroactivos.

Los nuevos inmuebles de intranet mantienen sus 21 condiciones. Los anteriores
usan 13 condiciones de contenido público: operación, clasificación conservada o
compatible, título, descripción, ubicación/distrito, precio/moneda o consulta,
modalidad del precio, medidas válidas cuando se indican, fotos existentes,
portada seleccionada, permisos de datos y fotos, y versión de origen revisada.
La ausencia de superficies no confirmadas no bloquea anuncios anteriores.

## Corrección

El listado consultaba únicamente las claves live de envíos nuevos y omitía los
anuncios previos. El aviso de conexión partía de falso antes de resolver la carga.
Ahora se distingue carga, error y conexión configurada. Un fallo al consultar el
catálogo se muestra con reintento y no se confunde con falta de configuración.
Las claves de selección distinguen IDs de portal e intranet. Los anuncios previos
se rotulan «Portal web»; no se les asigna una zona interna por suposición.

El receptor usa lectura autenticada y una lista explícita de campos públicos.
Las escrituras legadas actualizan exclusivamente un anuncio aprobado ya existente;
no insertan propiedades ni alteran datos privados, coordenadas o geografía no
representada en el editor. Una asociación interna posterior sigue siendo voluntaria.
La selección de imágenes se resuelve por IDs existentes en servidor. Cambiar portada
conserva la anterior en la galería si sigue seleccionada. Suspender conserva los
borradores no publicados. Hay control de versión, historial y reintentos idempotentes.
No hay migraciones nuevas, importación masiva ni cambios de credenciales.

## Evidencia y límites

Comprobación autenticada de producción del 21/10/2026 a las 23:11 UTC:

- 64 anuncios anteriores visibles; 63 cumplen las condiciones públicas actuales.
- Un anuncio carece de descripción pública y requiere completarla antes de actualizar.
  Sigue visible y no se suspendió ni se alteró automáticamente.
- 133 fichas internas conservadas. Catálogo público y portada previa conservados.
- Tres pantallas en escritorio y móvil, fotos y acceso a gestión comprobados.
- Sin aviso falso de conexión ni errores de ejecución en navegador.
- Cuenta y sesiones temporales de comprobación eliminadas.
- Cero escrituras sobre inmuebles, anuncios, borradores o documentos de clientes.

Pruebas: 33 archivos unitarios correctos; ESLint sin advertencias; compilaciones de
intranet y portal correctas. Integración MySQL y navegador aislados aprobada a las
23:14 UTC, con datos ficticios: nueva publicación con condiciones, anuncios anteriores
sin alta interna, mismo ID, edición, suspensión, reactivación, borradores preservados,
cambio de portada, autorización, conflictos de versión y reintentos.

Evidencias: [integración](evidencia-portal-web/INTEGRACION.json),
[producción](evidencia-portal-web/PRODUCCION.json) y
[funcionamiento completo](portal-web-fase4.md). Las verificaciones de dominio y SHA
se realizan después de cada despliegue; el reporte conserva su propia fecha y no
pretende representar estados futuros. Capturas reales y credenciales son privadas.
Revisión independiente pendiente; no se atribuye una revisión a Claude.
