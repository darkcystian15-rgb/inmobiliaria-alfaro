> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

# Expediente de la operación — 16 de octubre de 2026

## Alcance confirmado

Información de inmuebles separa un vendedor, un comprador y la documentación del inmueble. El comprador se asigna al cerrar la operación mediante una opción expresa; no se crean varios compradores ni vendedores. Por indicación del usuario, las mismas reglas se aplican a venta y alquiler hasta definir las diferencias del alquiler.

Los datos solicitados son archivos, sin añadir campos personales no pedidos. Todos admiten PDF, Word, Excel e imágenes JPG/PNG/WebP; máximo 4 MB por archivo después de comprimir imágenes. Se pueden cargar varios archivos, con nombres individuales. Las imágenes y PDF tienen vista previa privada; Word y Excel se descargan para abrirlos con su aplicación. Cada archivo permite consulta y descarga, edición de nombre/categoría y eliminación por administrador.

## Organización

- **Vendedor / Comprador — DNI y poderes:** selección independiente de persona natural o jurídica. Natural: DNI obligatorio; poder, vigencia y separación patrimonial opcionales; búsqueda nacional mediante archivo o nota escrita obligatoria si no hay archivo. Jurídica: ficha RUC, DNI del gerente y vigencia de poder del gerente obligatorios.
- **Documentos del inmueble:** copia literal o CRI-PU (uno basta), HR del año de venta y título archivado de la última transferencia.
- **Contratos:** promesa de venta con arras opcional; minuta de compraventa y escritura pública obligatorias.
- **Impuestos del vendedor:** liquidación, formulario/voucher del impuesto a la renta cuando corresponde pagarlo, liquidación de autoavalúo y arbitrios y comprobante de impuestos municipales. Exonerar renta excluye formulario/voucher; dejarla sin definir genera alerta.
- **Impuestos del comprador:** liquidación y comprobante de alcabala obligatorios cuando se asigna el comprador.
- **Servicios del vendedor:** recibos de luz, agua, gas e internet obligatorios, conforme al requerimiento; no se añadieron excepciones no solicitadas.
- **Levantamiento de cargas:** sección opcional; al activarla debe tener al menos un archivo y admite varios con nombres individuales.
- **Tasaciones:** express obligatoria; tasaciones del propietario opcionales y con varios archivos.

## Estado del expediente

Pestaña independiente con porcentaje documental, conteos por cada uno de los siete grupos, requisitos pendientes y avisos de configuración. El comprador no asignado permanece como aviso y no genera archivos ficticios. Los opcionales, las condiciones no aplicables y la exoneración no cuentan como faltantes. Los enlaces antiguos no sustituyen archivos cargados. Un aviso resumido se muestra también en la cabecera de la ficha.

Los pendientes del expediente generan alertas y **no bloquean el cierre**. Se mantienen las reglas anteriores de preparación/publicación, independientes del nuevo expediente de cierre, reconociendo DNI del vendedor/gerente y tasación express en las nuevas categorías.

## Código y base de datos

- `lib/transaction-dossier.mjs`: catálogo y reglas compartidas por cliente/servidor.
- `app/components/TransactionDossier.tsx`: condiciones, documentos, consulta y estado.
- `GET/PUT /api/inmuebles/[id]/expediente`: consulta y guardado con permisos de Información de inmuebles, validación de origen e historial. El guardado usa versión para rechazar sobrescrituras concurrentes con HTTP 409.
- Nueva tabla aditiva `inm_expedientes`, una fila por inmueble, con configuración, versión y fecha. No se renombran ni eliminan columnas existentes porque no es necesario para este alcance.
- Los archivos siguen en `inm_archivos` y el hosting privado. Las categorías documentales se validan también en servidor; no se acepta documentación del comprador antes de asignarlo ni documentos incompatibles con las condiciones guardadas.
- Se conserva el filtro de zona al consultar la lista de inmuebles desde la ficha.
- Los paneles de seguimiento, historial y material de publicación quedan en Resumen para facilitar el acceso a los nuevos apartados.
- PDF se incrusta únicamente desde el mismo origen, manteniendo la protección contra incrustación externa y la autenticación de los archivos.

## Migración y recuperación

Fuente anterior respaldada en `restore-points/expediente-20261016/`, commit `ee3adb027deb7551ddc31cd27103cd32642df115`, con SHA-256 y referencia del despliegue anterior. Las copias son privadas y están excluidas de Git y Vercel.

`scripts/install-transaction-dossier.mjs` previsualiza por defecto; no repetir escrituras para comprobar estado. Se usa `--schema-only --apply --checkpoint <directorio>` antes de desplegar para añadir la tabla sin alterar documentos. Después de publicar, `--apply --checkpoint <otro-directorio>` reorganiza categorías con respaldo privado previo, hash, bloqueo y verificación de que cada fila no cambió desde la copia.

Clasificación segura: DNI anterior → DNI del vendedor; copia literal → copia literal/CRI-PU; tasación → express. Los archivos ambiguos se conservan como **Por clasificar** y se pueden reasignar desde Estado del expediente. Se retiran las categorías vacías del formulario nuevo; no se borran archivos ni rutas del hosting al migrar.

La recuperación exige verificar hashes, comparar cambios posteriores y restaurar coordinadamente las categorías desde `dossier-database.json` y el despliegue anterior. La tabla nueva es aditiva y puede conservarse al volver al código previo. No ejecutar restauraciones automáticas sobre expedientes ya editados o documentos posteriores.

## Validación

- 24 archivos de pruebas unitarias pasan, incluido `transaction-dossier.test.mjs`.
- ESLint con cero advertencias y compilación local de producción con Webpack/TypeScript correctos.
- Integración real contra MySQL 8.4 temporal, sin datos de producción: previsualización sin escrituras, respaldo, migración idempotente, documentos ambiguos conservados, roles, HTTP 409 por conflicto, validaciones condicionales, archivos PDF/imagen/Word/Excel, varias tasaciones, reclasificación, descargas privadas y eliminación con actualización del estado.
- Navegador autenticado en escritorio y móvil de 375 px: pestañas, filtro de zona, cambio y guardado de condiciones, carga real desde el formulario con nombre individual, actualización de alertas, vista previa de imagen/PDF y ausencia de errores JavaScript/desbordes.
- Capturas locales privadas en `output/dossier-local/`.

## Publicación confirmada

- Código de aplicación: `f76b31c5e7401c0cd7994f91085fe63b8a5d3cdf`, sincronizado con GitHub en `feat/registro-simplificado`. `main` no se modifica.
- Despliegue Vercel: `dpl_DKnnyeZGpPs3gZEPy8P53a8h93KM`, **READY**, production. La API confirmó el commit y la asignación del dominio.
- URL de versión: https://inmobiliaria-alfarov2-fywebwkx7-puma19.vercel.app.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Despliegue anterior recuperable: `dpl_BJDo8yKXNLnAtfQeWAFUto85LHbM`, commit `a4b33cf`.
- Antes de publicar se añadió únicamente la tabla mediante `--schema-only`, con respaldo de los ocho registros de archivos existentes. Tras confirmar READY y el dominio, se aplicó la reclasificación de dos archivos; no se borraron archivos, no quedaron categorías ambiguas en esta consulta y las fotos se conservaron.
- Respaldos de metadatos y constancias de transacción: `restore-points/expediente-20261016/schema/` y `restore-points/expediente-20261016/datos/`. Se comprobaron los SHA-256 de ambas copias y de la fuente original.
- `tests/transaction-dossier.production.smoke.mjs`: comprobación autenticada real de API de expediente/ficha, siete grupos, categorías nuevas, acceso a archivo privado, rechazo anónimo HTTP 401 y pestañas en escritorio/móvil sin errores ni desbordes. No se editaron inmuebles, expedientes ni documentos para probar producción. Cuenta y sesión temporales eliminadas en el bloque de limpieza.
- Capturas privadas de producción: `output/dossier-production/estado-desktop.png` y `estado-mobile.png`, excluidas de Git y Vercel.
- MySQL temporal de integración detenido y retirado al terminar. Los datos ficticios se mantuvieron exclusivamente en ese entorno aislado.

Los cambios posteriores de evidencia/documentación y del selector de inmueble de la prueba de humo no alteran el comportamiento publicado ni requieren otro despliegue. No se ha integrado la rama en `main`.
