# FASE 1 y FASE 2 dentro de Información de inmuebles

22 de octubre de 2026. Base: 4a0aa00. Implementación, Markdown y publicación en Vercel autorizados por el usuario. Revisión independiente pendiente.

## Organización final

La cabecera de identificación y precio permanece general. Debajo se presentan dos bloques con los títulos visibles FASE 1 y FASE 2, dentro de Información de inmuebles.

**FASE 1 — Preparación del inmueble** contiene resumen de fotos, publicación, precio de tasación y precio objetivo; después, Visitas y fotos, Valores de tasación y Publicación. El administrador puede editar; el operador consulta. No se utiliza el rótulo Subfase.

**FASE 2 — Expediente documental** contiene el resumen de documentos y requisitos, seguido por las siete carpetas numeradas de venta o las cinco de alquiler. Al final continúan sin numeración Estado del expediente, Seguimiento e historial (administrador) y Otros archivos conservados (solo si hay archivos sin clasificar). Estado del expediente pertenece a Fase 2 aunque no tenga número.

Los datos de cierre de venta/alquiler y la referencia de captación anterior se conservan en el resumen documental. No se cambian números, requisitos ni identidades por reorganizar la pantalla. Las carpetas se asignan a una fase mediante metadatos de presentación y conservan claves, enlaces antiguos, zona e inmueble seleccionado.

## Edición y permisos

- Administrador: conserva edición de fotos, evidencia de visitas y anuncios externos. Puede modificar precio de venta/renta y observación, y preparar/editar texto desde los apartados de Fase 1, reutilizando las API administrativas existentes. Los registros iniciales de visita/tasación y la gestión adicional mantienen sus menús administrativos. Los formularios de precio y texto bloquean la salida del apartado mientras se editan y permiten cancelar.
- Operador: puede consultar Fase 1, ampliar fotos y descargar; no recibe controles para subir, editar, eliminar o elegir portada, ni para cambiar precio o texto. La galería impide habilitar edición para ese rol incluso si un contenedor solicita editable.
- Servidor: subida de FOTO_INMUEBLE, TEXTO_PUBLICACION y VIDEO_INMUEBLE y cambios de fotos/portada requieren administrador. Se protege también la reclasificación de material anterior de Fase 1. Las API de tasaciones, publicaciones y anuncios conservan su autenticación administrativa. No se amplían accesos a otros menús del operador.
- Fase 2: conserva cargas, observaciones, configuración, vista previa y descarga según los permisos previos; las eliminaciones siguen reservadas al administrador. Los PDF e imágenes documentales (DNI, copia literal, etc.) siguen siendo documentos de Fase 2 y no se confunden con las fotos de Fase 1.

La edición de texto guarda material e historial por las rutas existentes; el envío al portal web mantiene su flujo independiente. Las reglas de estado histórico, condiciones de documentos y publicación permanecen en servidor.

## Conservación

Sin migraciones, reclasificaciones masivas, cambios de datos de clientes ni movimientos físicos de archivos. Copia de referencia Git anterior privada: restore-points/informacion-fases-20261022/antes.bundle. Los ajustes previos de impuestos, cabecera única y copia literal de 50 MB se conservan.

Archivos principales: PropertyInformation.tsx, PropertyVisits.tsx, PhotoGallery.tsx, SalePriceEditor.tsx, PropertyPublicationEditor.tsx, property-folders.mjs, phase-one-access.mjs y API de archivos.

## Validación

36 archivos unitarios aprobados; ESLint y TypeScript correctos; compilación de producción Webpack correcta. Pruebas de clasificación verifican tres accesos de Fase 1, siete/cinco carpetas numeradas, adicionales al final, roles y conservación de todos los archivos. La regla de acceso verifica que el operador mantiene todos los tipos documentales del expediente y no puede escribir material de Fase 1.

Navegador autenticado contra la compilación local: 40 vistas con administrador/operador, venta/alquiler y 1440/375 px. Interfaz con datos ficticios, dos guardados simulados de precio y texto, bloqueo de salida de formularios, galería editable solo para administrador y cargas documentales disponibles para operador. Siete solicitudes directas de Fase 1 del operador fueron rechazadas con 403 por el servidor real de la compilación; los controles administrativos recibieron las respuestas de validación previstas. Los cuerpos eran inválidos/incompletos y no produjeron escrituras de negocio. Cero errores de ejecución y desbordes; cuentas y sesiones técnicas eliminadas.

El escenario MySQL desechable existente se adaptó a las fases y a los permisos de fotos, pero no se ejecutó en esta entrega por no disponer de un servidor MySQL local aislado. Los ensayos de interfaz usan respuestas ficticias para las escrituras; los ensayos HTTP comprueban denegación y validación sin modificar inmuebles reales.

Evidencia agregada: [LOCAL.json](evidencia-informacion-fases/LOCAL.json) y [PRODUCCION.json](evidencia-informacion-fases/PRODUCCION.json).

## Publicación comprobada

Código funcional: `01c64040950d097f0033e09541891708ca84c959`. Vercel `dpl_GXr22GCxTpU1Qa6drREaNaiehDS3`: **READY**, alias `intranet.inmobiliariaalbertoalfaro.com.pe` confirmado.

Comprobación autenticada en producción el 22/10/2026 a las **22:28:03 UTC**: 20 vistas con administrador y operador a 1440/375 px; dos fases visibles, numeración y orden conservados, consulta de Fase 1 para operador, acceso documental de Fase 2 conservado y siete denegaciones de modificación de Fase 1 con HTTP 403. Sin errores de ejecución, desbordes ni escrituras de negocio. Las dos cuentas y sesiones técnicas se eliminaron al terminar. Los guardados de precio/texto se simularon solo en la comprobación local; no se modificaron datos de clientes en producción.

La fuente de aplicación permanece idéntica en la publicación posterior de esta evidencia documental. Revisión independiente pendiente.
