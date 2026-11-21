# Documentos existentes, OCR y distribución por niveles

Entrega solicitada el 31 de octubre de 2026. Base Git: `288e7060b41df8f9eafc2bfa67c102ff186a35b7`. Conserva las plantillas previamente publicadas y añade las dos mejoras autorizadas.

## Resultado funcional

En el editor de textos, **Analizar documentos del inmueble** recorre las copias literales, CRI, HR/PU y tasaciones ya subidas, sin seleccionar cada archivo. Admite PDF, Excel XLSX, JPG y PNG, hasta 12 MB por documento y 150 páginas por PDF. Los PDF se procesan en bloques de cuatro páginas y el navegador continúa automáticamente. Muestra el avance, permite detener después del bloque en curso y conserva propuestas parciales si otro documento falla.

El lector recupera texto nativo y utiliza OCR español local para páginas sin contenido suficiente. Detecta también PDF con encabezados SUNARP seleccionables y asientos escaneados. Excel se lee directamente conservando hoja y celda. El modelo de idioma, el motor OCR y los binarios se incluyen en el despliegue; no requiere claves de IA ni envía documentos a un proveedor externo de IA.

Las propuestas se agrupan por campo, con documento, página/celda, evidencia y observaciones. Los valores diferentes se señalan; no se elige ni se suma automáticamente entre parcelas, plantas, antecedentes y comparables. La superficie sin clasificación exige elegir su correspondencia después de revisar el lote. La lectura de Excel busca la fila del inmueble valuado y su columna de área; excluye las cabeceras de comparables y de superficies por piso del cálculo de un total.

El usuario selecciona y puede corregir un valor por campo. **Incorporar seleccionados al borrador** completa campos pendientes sin sobrescribir texto real o ajustes manuales. Puede reemplazar la guía de distribución únicamente si sigue exactamente intacta.

Para guardar áreas en la ficha se muestran los valores actuales y los seleccionados. Se exige cotejo explícito. La API valida permisos de administrador y origen, ámbito de zona, inmueble activo, documento vinculado y expediente editable. Una transacción bloquea la ficha y las fuentes, compara las áreas con los valores vistos al comenzar y rechaza cambios concurrentes. Actualiza exclusivamente las áreas seleccionadas y deja historial con usuario y documentos/página/celda. No guarda ni marca realizado el texto automáticamente. No requiere migraciones de base de datos.

## Venta de casa

Cuando no existe distribución ni características registradas, el modelo inicial incluye la guía editable del usuario: primer nivel con sala principal, comedor, bar, sala de estar, biblioteca, cocina, baño de visitas, dos dormitorios, cochera, lavandería, terraza con parrillas y piscina; segundo nivel con dormitorio principal, walk-in closet, baño completo y dos dormitorios. El editor indica modificar ambientes y borrar los que no existan.

La distribución registrada tiene prioridad. Los textos guardados no se regeneran. Para borradores anteriores con **DATO POR CONFIRMAR** justo bajo **DISTRIBUCIÓN POR NIVELES**, el botón **Insertar guía de distribución por niveles** incorpora solo ese bloque, manteniendo el resto. La guía no se añade a alquileres ni a otros tipos de inmueble.

## Validación

- Pruebas de extracción y revisión: separadores ambiguos, encabezados SUNARP, diferencias de áreas, evidencia, comparables, plantilla y conservación de ajustes: aprobadas.
- Lector real con Excel XLSX y PDF mixto generado localmente: aprobado, incluido OCR español sin red.
- Handlers reales con límites de autenticación/base aislados: rechazo de campos fuera de alcance, falta de revisión, falta de permisos, fuente eliminada, expediente cerrado y área cambiada; actualización parcial correcta: aprobados. No equivale a una integración con MySQL real.
- Regresiones de plantillas, extracción, requisitos de publicación, flujo y portal: siete archivos de pruebas aprobados.
- Editor real en Chromium a 375 y 1440 px, APIs simuladas: análisis por bloques y de varios documentos, diferencia de valores, continuidad ante archivo protegido, selección explícita, guardado revisado, borrador, texto realizado, copia exacta y conservación ante cambios del origen; sin errores de página ni desbordamiento horizontal: aprobado.
- TypeScript independiente y ESLint de los módulos/componentes/API afectados: aprobados.
- Build completo local Next.js 16.3.8/webpack: código y TypeScript aprobados, 63/63 páginas, salida 0. Se usó una URL MySQL local ficticia solo para compilar. El sandbox impidió abrir el puerto de la prueba de navegador y analizar `tsc --showConfig`; ambas comprobaciones se completaron con ejecución autorizada fuera del sandbox.
- Paquete final compilado y comprobación `tests/document-runtime-package.test.mjs`: rutas OCR resueltas desde el directorio de ejecución, sin rutas congeladas de la máquina de build; contiene worker Node, WASM, modelo español, binario canvas y runtime PDF. La prueba detectó y motivó la corrección de la resolución de rutas antes de cerrar la entrega. La comprobación final se hizo con dependencias físicas en la carpeta aislada, sin enlace global a `node_modules`.
- Nuevo motor ejecutado dentro de Vercel con documentos reales, solo lectura: archivo 162, área de terreno **356,50 m²**, Hoja1/E19; archivo 179, **144 m²**, página 1 por OCR. Comprobación `dpl_CyBaBzfufjC64mbqbLAX2NFPSF1Q`, marcador `RELEASE_DOCUMENT_CHECK_COMPLETE`. Terminó deliberadamente con error después de comprobar, para no publicar una aplicación de diagnóstico.

## Límites prácticos

OCR no garantiza cifras exactas. Los decimales ambiguos se rechazan al guardar y las propuestas requieren cotejo. La confianza global de una página no valida un dígito. Documentos borrosos, tablas complejas, distintos lotes y modificaciones registrales pueden requerir revisión manual. El resultado del análisis permanece en el editor durante la sesión; se conservan de forma duradera el texto que se guarde y las áreas aplicadas con su historial. Al cerrar la página, el análisis pendiente se puede repetir.

El análisis previo de los 30 archivos y sus casos reales está en [Análisis documental](analisis-documentos-existentes-2026-10-31.md). No se actualizaron datos de negocio en producción para probar esta entrega ni se fabricaron sesiones de usuario. El navegador autenticado en producción no se ha probado; la interfaz se verificó con APIs simuladas y el motor con dos documentos reales dentro de Vercel.

## Punto de restauración

Directorio privado excluido de Git: `restore-points/documentos-niveles-20261031T155154Z/`.

- `fuentes-antes.tar.gz`: 583 archivos previos, incluidos cambios locales existentes, sin `.env`, credenciales, dependencias ni build.
- `manifest.json`: SHA-256 de cada archivo y base Git; todos los archivos del tar se verificaron contra el manifiesto.
- `historia.bundle`: historia Git previa.
- `estado-antes.diff`: diferencias locales previas.
- Versión publicada anterior: `dpl_8ACJX1XeDuFgQJAi1i2VczCHBGRj`.

Para recuperar código, extraer el respaldo en una carpeta separada, verificar su manifiesto y revisar los cambios posteriores antes de copiar o publicar. No extraer sobre el árbol actual ni restaurar toda la base. Como no se modificó el esquema, el rollback de código no requiere migraciones inversas. Las áreas que se apliquen después de publicar son datos de negocio: su recuperación exige revisar el historial `areas_documentales_revisadas` y las escrituras posteriores.

## Publicación

Destino: proyecto `puma19/inmobiliaria-alfarov2`, ID `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`; intranet `https://intranet.inmobiliariaalbertoalfaro.com.pe`.

La entrega se prepara en una carpeta aislada desde la base Git y superpone las plantillas ya publicadas y los archivos de esta mejora. Se excluyen los cambios locales anteriores de precio de cierre en el listado y del hosting PHP. El build de esta entrega no ejecuta instaladores ni migraciones, pues no necesita cambios de esquema; mantiene el cron existente.

Despliegue final publicado: `dpl_6tQhid4Ypk6n5oNuEELXLUHqbuhd`, [versión](https://inmobiliaria-alfarov2-api64p5iu-puma19.vercel.app). **Estado final READY, producción**. La API de Vercel confirmó que el alias de la intranet apunta a esta versión, sin error de asignación. Comprobación de `/login`: HTTP 200 y formulario de acceso presente. Consulta puntual de logs de este despliegue, niveles error/fatal y ventana de 15 minutos a las 18:01 UTC: sin registros. Estas comprobaciones no sustituyen una sesión autenticada del editor en producción. La primera publicación de la entrega, `dpl_yMBA1gTcHAxMuhxK2hMKyZxSMCv7`, se sustituye para corregir la resolución de rutas del motor OCR detectada en la inspección del bundle. El despliegue es directo desde fuentes locales; no representa un nuevo commit en GitHub. Conservar los cambios locales hasta sincronizarlos para que una futura entrega desde Git no elimine estas funciones.


El paquete aislado final volvió a compilar con 63/63 páginas y pasó la prueba de rutas y dependencias de ejecución. La documentación y los archivos de pruebas se conservan en el workspace y en el respaldo de la entrega; el paquete enviado a Vercel contiene las fuentes y recursos necesarios para ejecutar la aplicación.
