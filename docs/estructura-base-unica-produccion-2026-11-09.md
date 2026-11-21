# Estructura base única para venta y alquiler

## Entrega

Se sustituyen los dos modelos genéricos del editor por una sola acción **Usar estructura base**. La estructura parte de la organización y nivel de detalle del Word real `tests/info/ESTRUCTURA  MINUTA DE CV  LALI PINEDO.docx`, leído durante la preparación. Se generalizan los apartados, manteniendo el contenido completamente editable. Los datos personales, direcciones, cuentas, importes y circunstancias particulares del cliente no se incorporan a la base.

El documento de referencia está en elaboración; eso no limita su utilidad como punto de partida. La base puede seguir perfeccionándose en próximas entregas, sin crear un catálogo de modelos.

## Ubicación y funcionamiento

- Venta: FASE 2 → Contratos → Estructura de Minuta → **Abrir editor de minuta**.
- Alquiler: FASE 2 → Contratos → Estructura de Contrato de Alquiler → **Abrir editor de alquiler**.
- Dentro del editor, una sola acción **Usar estructura base**, sin selector de modelos ni pregunta adicional sobre la operación.

La operación procede de la ficha consultada en servidor. El tipo de predio y la dirección de la ficha se incorporan como información editable; la dirección se identifica expresamente como pendiente de cotejo documental. No se utiliza el contacto de captación como supuesto propietario o firmante. Casa, departamento, terreno, local y otros predios utilizan la misma organización, ajustable manualmente al caso.

La base desarrolla once apartados: partes y firmantes de ambos lados; dirección e identificación del predio; información municipal y registral; condiciones económicas; pagos; plazos y entrega; cargas y trámites; gastos y obligaciones; observaciones; acuerdos adicionales y revisión final.

En venta incluye precio total, pagos previos, pagos a la firma de minuta y escritura, y cancelación de deudas cuando corresponda. En alquiler incluye arrendadores, arrendatarios, representación y garante si corresponde; renta, adelantos, garantía y devolución; plazo y entrega; obligaciones de uso y acuerdos de devolución o renovación. La adaptación de alquiler fue elaborada para esta entrega: el original aportado es de compraventa.

Los campos desconocidos quedan visibles para completar. Ninguna carga, régimen patrimonial, condición bancaria, obligación tributaria o acuerdo se presenta como confirmado por deducción.

## Protección del trabajo existente

En un editor vacío, la estructura se incorpora directamente. Si ya hay texto, el usuario elige **Añadir al final** o **Reemplazar contenido…**. Reemplazar exige una segunda acción explícita **Confirmar reemplazo del contenido**. Es posible cancelar o deshacer la incorporación.

Añadir conserva el contenido previo y sus resaltados. Reemplazar limpia únicamente el contenido y sus marcas; conserva el título personalizado, el encabezado y los campos del pie. Los títulos iniciales genéricos se adaptan a la operación. El guardado continúa siendo explícito, con protección de navegación y conflictos de versión.

Se mantienen los borradores e instantáneas anteriores. No se actualizan textos de clientes automáticamente ni se reemplazan sus archivos. No se requiere migración de base de datos.

## Flujo completo hasta el PDF

El usuario puede iniciar desde la estructura base, pegar su propio contenido o subir un Word al apartado y extraerlo. Sigue pudiendo editar, borrar bloques, añadir acuerdos, resaltar en amarillo, sombrear en gris y quitar formato. Se conserva el encabezado con logo y el pie completamente editable, con referencia y numeración opcionales.

**Ver archivo** guarda el texto y abre el PDF en otra pestaña. **Generar PDF y adjuntar** guarda el archivo en la categoría de estructura de la operación; su enlace permite abrirlo en otra pestaña y descargarlo para entrega. La preparación y entrega se realizan dentro del sistema.

La API conserva autenticación, autorización, origen de las escrituras, aislamiento por inmueble/categoría, bloqueo por cierre o eliminación, control de versiones y auditoría. La categoría de extracción/adjunto y la huella de reintento se resuelven con la operación del servidor; un alquiler no se adjunta como estructura de compraventa.

## Archivos principales

- `lib/minute-template.ts`: única definición de estructura y adaptación por operación, categoría y reglas de incorporación. Es el punto de actualización de la base en futuras entregas.
- `app/components/MinuteTextEditor.tsx`: acción única, protección de texto existente, reversión y edición.
- `app/components/TransactionDossier.tsx`: acceso a la estructura correspondiente y apertura de PDF.
- `app/api/inmuebles/[id]/minuta-texto/route.ts`: contexto de ficha y categorías resueltas en servidor.
- `lib/minute-record.ts`: conserva instantáneas existentes y adapta el título inicial de un nuevo borrador.

El Word de referencia y los demás archivos de `tests/info/` están excluidos del despliegue por `.vercelignore`.

## Verificación

- `tests/minute-template.test.mjs`: adaptación por operación y varios tipos de predio, exclusión de datos del cliente, protección de texto y marcas, título/encabezado/pie, límite de longitud y generación de PDFs reales de ambas operaciones.
- `tests/minute-api.test.mjs`: rutas reales con autenticación, base de datos y hosting simulados; regresiones de cierre/conflictos y guardado, extracción y adjunto de alquiler en su categoría.
- `tests/minute-document.test.mjs`: regresiones de Word, PDF, encabezado, pie y resaltados.
- `tests/minute-editor.browser.mjs`: venta y alquiler en 375/1440 px, estructura en documento vacío, cancelación/confirmación de reemplazo, reversión, añadido, extracción, formato, guardado, reapertura, apertura en otra pestaña, PDF y conservación de cambios ante conflicto. API simulada.
- TypeScript y ESLint de los archivos afectados.

Muestras en `output/minuta-texto/estructura-base-venta.pdf` y `estructura-base-alquiler.pdf`, con renders y capturas de navegador en el mismo directorio. Las pruebas usan datos sintéticos; no modifican documentos de clientes ni acreditan un adjunto autenticado al hosting real.

## Publicación en Vercel

Proyecto de producción: `inmobiliaria-alfarov2`, equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`, proyecto `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`. Despliegue de producción preparado sin asignación de dominio, para comprobar su compilación antes de promoverlo a la intranet. La referencia base Git del árbol de trabajo es `288e7060b41df8f9eafc2bfa67c102ff186a35b7`; se conservan los cambios preexistentes.

- Despliegue: `dpl_37VYmtBJKYDLwmb7N4CvqyGoEXPk`.
- URL de despliegue: `https://inmobiliaria-alfarov2-nk3oko7ng-puma19.vercel.app`.
- Estado: **READY**. Compilación remota completada correctamente en 58 segundos.
- Preparado sin asignación de dominio y promovido tras la comprobación de acceso privado.
- Dominio confirmado: `https://intranet.inmobiliariaalbertoalfaro.com.pe` apunta a esta versión.
- La ruta del editor respondió HTTP 401 con el mensaje de autenticación esperado al comprobarla sin sesión de aplicación mediante `vercel curl`.
- Verificaciones locales completadas: TypeScript, ESLint, pruebas de plantilla, API, Word/PDF y regresión de expediente/archivos; navegador de venta y alquiler en 375 y 1440 px.

Para utilizar la entrega, recargar la intranet, abrir el apartado de estructura correspondiente y pulsar **Usar estructura base**. Los documentos ya preparados permanecen disponibles; incorporar la nueva base es una acción explícita del usuario.

## Ampliación del formato del contenido

La entrega de [Negrita y tamaños de letra](negrita-tamanos-estructuras-2026-11-09.md) añade formato por selección al mismo editor de venta/alquiler y conserva la base única, el encabezado, el pie editable y la extracción de Word. Despliegue actualizado `dpl_DFhgftu39QmBEcoNc44mAqq1CB4N`, READY y dominio de la intranet confirmado.

## Reorganización del entorno de edición

La entrega de [Secuencia y presentación más intuitivas](editor-estructuras-flujo-intuitivo-2026-11-10.md) mantiene la base y las funciones, agrupa las opciones de inicio y presentación, prioriza el contenido y fija las acciones de entrega. Producción `dpl_8Ve312e8wANgsSNH64z51DLGj15t`, READY y dominio de la intranet confirmado.
