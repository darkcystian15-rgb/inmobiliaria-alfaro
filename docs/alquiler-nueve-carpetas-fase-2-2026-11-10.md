# Alquiler: nueve carpetas en FASE 2

Se amplía alquiler para compartir con venta los mismos nombres, orden y números:

1. DNI y poderes.
2. Documentos del inmueble.
3. Contratos.
4. Impuestos y constancias.
5. Recibos y pagos de servicios.
6. Saneamiento físico legal.
7. Tasaciones.
8. Planos.
9. Catálogo y diagnóstico físico legal.

Venta conserva sus categorías, obligatoriedad y condiciones. En alquiler se conservan los documentos propios de arrendador, arrendatario, intervención, estructura/contrato de alquiler, recibos, pagos, liquidaciones y tasaciones.

La carpeta 4 permite adjuntos opcionales con nombre y descripción bajo Otros documentos. No incorpora alcabala, renta por venta, minutas, promesas, escritura ni otros requisitos de compraventa. Las liquidaciones de alquiler permanecen en servicios, conservando su ubicación por categoría.

Las carpetas 6, 8 y 9 son opcionales; se activan mediante las condiciones del expediente para habilitar sus cargas específicas. Incluso activadas, no añaden requisitos de cierre al alquiler. Se permite adjuntar múltiples planos y archivos de diagnóstico con nombres individuales. Saneamiento admite creación/renombrado de subcarpetas de un nivel, ubicación de archivos y borrado de carpetas vacías, con los mismos controles de versión, propiedad, permisos y cierre que venta. Otros documentos de impuestos y saneamiento también están disponibles en alquiler.

Los archivos se agrupan por sus categorías existentes, no por el número visible. Servicios cambia del número 4 al 5 y tasaciones del 5 al 7, conservando sus archivos e identificadores. Los documentos técnicos ya existentes pueden aparecer en su nueva carpeta sin alterar su nombre, categoría, ruta ni bytes. Los documentos exclusivos de venta que se conserven en un expediente de alquiler permanecen consultables en Otros archivos conservados. No se ejecutan migraciones, movimientos físicos ni eliminaciones.

Implementación: se comparte dossierSections para las dos operaciones; rentalDocuments incorpora tipos opcionales y se preserva saleDocuments. El panel de condiciones y los endpoints de carga/organización habilitan saneamiento para alquiler. El panel tributario específico del vendedor continúa restringido a venta.

Verificación completada: tipos y ESLint; requisitos y cierre de venta/alquiler, nueve carpetas, conservación y clasificación única de archivos, extras opcionales, subcarpetas de alquiler y controles de versión/cierre; navegador de carpetas y cargas en 375/1440 px con datos sintéticos y API simulada. No se escriben documentos en expedientes de clientes durante las comprobaciones.


Las cinco suites de expediente, carpetas, adjuntos opcionales, API de saneamiento y subcarpetas pasaron. La prueba de navegador verificó venta y alquiler en 375/1440 px, carga disponible tras guardar las condiciones, impuestos de alquiler sin condiciones del vendedor, documentos técnicos opcionales y creación de subcarpetas. TypeScript y ESLint pasaron. La prueba de integración conectada a base real no se ejecutó; se actualizó su expectativa a nueve carpetas.

## Publicación

- Proyecto: inmobiliaria-alfarov2, prj_Y4rkO3CVHKLA2akcLF6rguUJksvG; equipo team_qcKFQOeqeLWTJFsCLGnZvPiL.
- Producción Next.js, estado READY, despliegue dpl_29LCcKKbHywQiXXrMzXVjnfV2EiN.
- URL: https://inmobiliaria-alfarov2-emrcupujk-puma19.vercel.app.
- Compilación de Vercel completada en 45 s. Se preparó sin asignar dominio y se promovió tras comprobar GET del expediente con HTTP 401 y el JSON esperado sin sesión.
- Inspect de https://intranet.inmobiliariaalbertoalfaro.com.pe confirma el nuevo despliegue. Consulta de logs de nivel error: sin registros encontrados.
- Base Git 288e7060b41df8f9eafc2bfa67c102ff186a35b7; se desplegaron los archivos locales conservando cambios anteriores, sin crear un commit ni ejecutar migraciones.
