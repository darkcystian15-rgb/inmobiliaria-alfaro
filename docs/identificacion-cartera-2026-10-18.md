# Identificación y descripción de Cartera — 18 de octubre de 2026

Se uniformiza la identificación visible en Cartera (tarjetas, lista, galería y detalle), Información de inmuebles, visitas, tasaciones, publicaciones, cierres y contratos de alquiler. El panel y las alertas ya usan contacto y dirección referencial. Reportes aplica el mismo identificador y contacto en pantalla y exportación PDF/Excel.

- Formato: número de orden estable del código existente, operación actual, tipo actual y ubicación referencial escrita. Ejemplo: `012-venta-local-av meigss c3`.
- El nombre del contacto permanece como título y deja de formar parte del identificador visible.
- La descripción bajo el contacto muestra operación, tipo y ubicación referencial; no añade distrito, provincia, departamento ni zona como sustituto de una dirección ausente. La utilidad compartida `propertyAddress` aplica esta regla a todos los listados y reportes. La geografía sigue disponible en la ficha y la zona en su contexto independiente.
- Si falta la ubicación, se muestra «Ubicación por completar». No se inventa una dirección desde el nombre del contacto.
- El número de orden no se confunde con la posición reutilizable ni con el ID numérico de base de datos.
- Se mantienen códigos persistidos, rutas, enlaces, historial, zona y geografía almacenada. No requiere migración ni escrituras de negocio.
- La API de listado de inmuebles expone `direccion` por separado para evitar reconstruirla desde la ubicación compuesta. Al recargar una ficha, su fila actualiza dirección, operación y tipo.

## Validación y entrega

Prueba de regresión en `tests/property-panel-id.test.mjs`: ejemplo solicitado, formas de datos de listado/ficha, operación actual, número estable y ausencia de geografía/contacto al faltar dirección. Se verifica también la búsqueda por el ID visible y el código antiguo. Pasan los 25 archivos de pruebas unitarias y ESLint con cero advertencias. Se comprobó directamente que las celdas de ID/contacto compartidas por tabla, PDF y Excel usan la misma presentación y conservan los valores económicos. La compilación final de producción con Webpack y TypeScript terminó correctamente. Los intentos en sandbox fallaron al leer la salida de `tsc --showConfig`; la ejecución con permisos ampliados completó todas las etapas. No se ejecutó la integración de reportes contra la base configurada ni se verificó un recorrido autenticado en navegador.

## Publicación

- Código: `8446fff6a0c6281c9e3652e457f572c55409deff`, subido e integrado mediante fast-forward en `main` y `feat/registro-simplificado`. Ambas referencias remotas quedaron en ese commit tras la subida atómica.
- GitHub recibió del proveedor Vercel un despliegue **Production**, ID GitHub `7148034965`, para ese SHA. Su estado es `success`, descripción `Deployment has completed`, registrado el 18 de octubre de 2026 a las 00:54:05 UTC.
- Evidencia consultada: `GET /repos/darkcystian15-rgb/inmobiliaria-alfaro/deployments?sha=8446fff6a0c6281c9e3652e457f572c55409deff` y `GET /repos/darkcystian15-rgb/inmobiliaria-alfaro/deployments/7148034965/statuses` de GitHub.
- URL de versión declarada por el despliegue: https://inmobiliaria-alfarov2-dswwxroao-puma19.vercel.app.
- El dominio https://intranet.inmobiliariaalbertoalfaro.com.pe/login respondió HTTP 200 con el login de la intranet.
- La URL de versión redirige al login de Vercel. No se pudo comparar sus recursos con los del dominio. La API directa de Vercel había devuelto HTTP 403: no se afirma una comprobación independiente de la asignación del alias ni una revisión visual autenticada de las pantallas en producción.
- No se ejecutaron migraciones ni escrituras de negocio. Los commits posteriores de evidencia documental no cambian el código de aplicación.
